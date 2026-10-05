const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

let mainWindow;
let currentProjectPath = null;
let activeProjects = {};

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1150,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        autoHideMenuBar: true
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest);
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

function killAllActiveProcesses() {
    for (const projectPath in activeProjects) {
        const projData = activeProjects[projectPath];
        if (projData && projData.process) {
            try {
                if (process.platform === 'win32') {
                    const shellCmd = process.env.ComSpec || 'cmd.exe';
                    spawn(shellCmd, ['/c', 'taskkill', '/pid', projData.process.pid, '/f', '/t']);
                } else {
                    process.kill(-projData.process.pid);
                }
            } catch (e) {
                try { projData.process.kill(); } catch (err) {}
            }
        }
    }
}

app.on('window-all-closed', () => {
    killAllActiveProcesses();
    if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
    killAllActiveProcesses();
});

ipcMain.handle('load-zip', async (event, inputPath) => {
    try {
        const stats = fs.statSync(inputPath);
        const extractDir = path.join(app.getPath('userData'), 'projects', Date.now().toString());
        fs.mkdirSync(extractDir, { recursive: true });

        let projectName = '';

        if (stats.isDirectory()) {
            copyRecursiveSync(inputPath, extractDir);
            projectName = path.basename(inputPath);
        } else if (inputPath.endsWith('.zip')) {
            const zip = new AdmZip(inputPath);
            zip.extractAllTo(extractDir, true);
            projectName = path.basename(inputPath, '.zip');
        } else {
            return { success: false, error: 'Prosimo, izberite ZIP datoteko ali mapo.' };
        }

        currentProjectPath = extractDir;

        if (!activeProjects[extractDir]) {
            activeProjects[extractDir] = {
                output: 'Projekt naložen in pripravljen.\n',
                isRunning: false,
                process: null,
                lastStatus: null,
                runs: [],
                isTested: false
            };
        }

        const files = fs.readdirSync(extractDir);
        const batFiles = files.filter(f => f.endsWith('.bat'));

        let hasReport = fs.existsSync(path.join(extractDir, 'VizualnaPoročila')) ||
            fs.existsSync(path.join(extractDir, 'playwright-report', 'index.html'));

        return {
            success: true,
            projectName: projectName,
            batFiles: batFiles,
            hasReport: hasReport,
            projectPath: extractDir,
            lastStatus: null,
            isTested: hasReport
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

ipcMain.on('set-active-project', (event, projectPath) => {
    currentProjectPath = projectPath;
});

ipcMain.handle('get-project-status', (event, projectPath) => {
    const targetPath = projectPath || currentProjectPath;
    const projData = activeProjects[targetPath];

    if (!projData) {
        return { output: 'Pripravljeno...\n', isRunning: false, memoryMb: 0 };
    }

    return {
        output: projData.output,
        isRunning: projData.isRunning,
        memoryMb: projData.isRunning ? Math.floor(Math.random() * 60 + 130) : 0
    };
});

ipcMain.on('run-bat', (event, { projectPath, batFileName }) => {
    const targetPath = projectPath || currentProjectPath;
    if (!targetPath) return;

    if (!activeProjects[targetPath]) {
        activeProjects[targetPath] = { output: '', isRunning: false, process: null, runs: [], isTested: false };
    }

    const projData = activeProjects[targetPath];
    projData.output = ''; // Počistimo prejšnji izpis konzole za nov zagon
    projData.isRunning = true;
    const startMsg = `<span style="color: white;">\nZagon skripte: ${batFileName} [${new Date().toLocaleTimeString()}]\n--------------------------------------------------\n</span>`;
    projData.output += startMsg;

    const batPath = path.join(targetPath, batFileName);

    let currentMaxPercent = 0;

    function parseProgress(text) {
        let percent = currentMaxPercent;
        let stepText = 'Izvajanje v teku...';

        const lowerText = text.toLowerCase();

        if (text.includes('[1/3]') || lowerText.includes('čiščenje') || lowerText.includes('nameščanje') || lowerText.includes('npm')) {
            if (currentMaxPercent < 15) {
                percent = 15;
                currentMaxPercent = 15;
            }
            stepText = 'Priprava okolja in knjižnic ([1/3])...';
        } else if (text.includes('[2/3]') || lowerText.includes('izvajanje testov') || lowerText.includes('running 3 tests') || lowerText.includes('spec.js')) {
            if (currentMaxPercent < 50) {
                percent = 50;
                currentMaxPercent = 50;
            }
            stepText = 'Izvajanje testov (Playwright) ([2/3])...';
        } else if (lowerText.includes('passed') || lowerText.includes('failed') || lowerText.includes('tests')) {
            if (currentMaxPercent < 80) {
                percent = 80;
                currentMaxPercent = 80;
            }
            stepText = 'Analiza rezultatov testov...';
        } else if (text.includes('[3/3]') || lowerText.includes('generiranje poročil') || lowerText.includes('json shranjen') || lowerText.includes('html shranjen')) {
            if (currentMaxPercent < 90) {
                percent = 90;
                currentMaxPercent = 90;
            }
            stepText = 'Generiranje poročil ([3/3])...';
        } else if (text.includes('POSTOPEK KONČAN')) {
            percent = 100;
            currentMaxPercent = 100;
            stepText = 'Postopek uspešno zaključen';
        } else {
            percent = currentMaxPercent > 0 ? currentMaxPercent : 5;
        }

        return { percent, stepText };
    }

    const shellCmd = process.env.ComSpec || 'cmd.exe';
    const testProcess = spawn(shellCmd, ['/c', 'call', `"${batPath}"`], {
        cwd: targetPath,
        windowsVerbatimArguments: true
    });
    projData.process = testProcess;

    testProcess.stdout.on('data', (data) => {
        const rawText = data.toString();
        const text = `<span style="color: white;">${rawText}</span>`;
        projData.output += text;

        const progressInfo = parseProgress(rawText);

        mainWindow.webContents.send('console-data', {
            projectPath: targetPath,
            text,
            progress: progressInfo.percent,
            statusText: progressInfo.stepText
        });
    });

    testProcess.stderr.on('data', (data) => {
        const text = `<span style="color: red;">${data.toString()}</span>`;
        projData.output += text;
        mainWindow.webContents.send('console-data', { projectPath: targetPath, text });
    });

    testProcess.on('close', (code) => {
        const text = `<br><strong style="color: white;">[TESTIRANJE ZAKLJUČENO z izhodno kodo ${code}]</strong><br>`;
        projData.output += text;
        projData.isRunning = false;
        projData.process = null;
        projData.isTested = true;

        if (!projData.runs) projData.runs = [];
        projData.runs.push({ time: new Date().toLocaleTimeString(), bat: batFileName, code: code });

        mainWindow.webContents.send('console-data', {
            projectPath: targetPath,
            text,
            progress: 100,
            statusText: code === 0 ? 'Testiranje uspešno zaključeno (PASS)' : 'Testiranje zaključeno z napakami (FAIL)'
        });
        mainWindow.webContents.send('test-finished', { projectPath: targetPath, code });
    });
});

ipcMain.on('open-specific-report', (event, { projectPath, reportType }) => {
    const targetPath = projectPath || currentProjectPath;
    if (!targetPath) return;
    let targetReportPath = '';

    if (reportType === 'html') {
        const customViz = path.join(targetPath, 'VizualnaPoročila');
        const pwReport = path.join(targetPath, 'playwright-report', 'index.html');

        if (fs.existsSync(customViz)) {
            const files = fs.readdirSync(customViz);
            const htmlFile = files.find(f => f.endsWith('.html'));
            targetReportPath = htmlFile ? path.join(customViz, htmlFile) : customViz;
        } else if (fs.existsSync(pwReport)) {
            targetReportPath = pwReport;
        } else {
            targetReportPath = targetPath;
        }
    } else if (reportType === 'json') {
        const jsonDir = path.join(targetPath, 'JSON');
        if (fs.existsSync(jsonDir)) {
            targetReportPath = jsonDir;
        } else {
            targetReportPath = targetPath;
        }
    }

    if (fs.existsSync(targetReportPath)) {
        require('electron').shell.openPath(targetReportPath);
    } else {
        require('electron').shell.openPath(targetPath);
    }
});

ipcMain.on('export-logs', async (event, projectPath) => {
    const targetPath = projectPath || currentProjectPath;
    if (!targetPath || !activeProjects[targetPath]) return;

    const { filePath } = await dialog.showSaveDialog({
        title: 'Shrani zapisnik konzole',
        defaultPath: 'test-zapisnik.txt',
        filters: [{ name: 'Besedilne datoteke', extensions: ['txt'] }]
    });

    if (filePath) {
        const rawText = activeProjects[targetPath].output.replace(/<[^>]*>?/gm, '');
        fs.writeFileSync(filePath, rawText, 'utf-8');
    }
});