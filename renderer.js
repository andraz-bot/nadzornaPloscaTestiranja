const { ipcRenderer } = require('electron');
const { initAuth, getCurrentUser } = require('./js/auth');
const { initSettings } = require('./js/settings');
const { initHistory, recordTestResult } = require('./js/history');

let loadedProjects = [];
let activeActivityProjects = [];
let currentActiveProjectPath = null;

let dropZone, fileInput, projectListContainer, activityDropZone, activeProjectsListContainer, completedProjectsListContainer, consoleDiv, consoleCardContainer, mainLayoutContainer, progressContainer, progressBarFill, progressPercentText, progressStatusText;

document.addEventListener('DOMContentLoaded', () => {
    initAuth();
    initSettings();
    initHistory();

    dropZone = document.getElementById('drop-zone');
    fileInput = document.getElementById('file-input');
    projectListContainer = document.getElementById('project-list-container');
    activityDropZone = document.getElementById('activity-drop-zone');
    activeProjectsListContainer = document.getElementById('active-projects-list-container');
    completedProjectsListContainer = document.getElementById('completed-projects-list-container');
    consoleDiv = document.getElementById('console');
    consoleCardContainer = document.getElementById('console-card-container');
    mainLayoutContainer = document.getElementById('main-layout-container');
    progressContainer = document.getElementById('progress-container');
    progressBarFill = document.getElementById('progress-bar-fill');
    progressPercentText = document.getElementById('progress-percent-text');
    progressStatusText = document.getElementById('progress-status-text');

    if (dropZone && fileInput) {
        dropZone.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) handleInputPath(e.target.files[0].path);
        });

        dropZone.addEventListener('dragover', (e) => e.preventDefault());
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                handleInputPath(e.dataTransfer.files[0].path);
            }
        });
    }

    if (activityDropZone) {
        activityDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            activityDropZone.style.borderColor = 'var(--primary)';
        });

        activityDropZone.addEventListener('dragleave', () => {
            activityDropZone.style.borderColor = '';
        });

        activityDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            activityDropZone.style.borderColor = '';
            const projectPath = e.dataTransfer.getData('text/plain');
            if (projectPath) {
                addProjectToActivity(projectPath);
            }
        });
    }
});

function handleInputPath(filePath) {
    ipcRenderer.invoke('load-zip', filePath).then(result => {
        if (result.success) {
            const existingIndex = loadedProjects.findIndex(p => p.projectPath === result.projectPath);
            if (existingIndex === -1) {
                loadedProjects.push(result);
            }
            renderProjectList();
            renderActiveProjectsList();
        } else {
            alert('Napaka: ' + result.error);
        }
    });
}

function renderProjectList() {
    if (!projectListContainer) return;
    projectListContainer.innerHTML = '';

    if (loadedProjects.length === 0) {
        projectListContainer.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 6px;">Seznam je prazen...</div>';
        return;
    }

    loadedProjects.forEach(proj => {
        const item = document.createElement('div');
        item.className = 'project-item';
        item.draggable = true;
        item.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', proj.projectPath);
        });

        let badge = '';
        if (proj.lastStatus === 'PASS' || proj.lastStatus === 'Končano') badge = '<span class="status-badge status-pass" style="background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px;">PASS</span>';
        else if (proj.lastStatus === 'FAIL') badge = '<span class="status-badge status-fail" style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 9px;">FAIL</span>';

        item.innerHTML = `<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">📁 ${proj.projectName}</span> ${badge}`;
        item.onclick = () => addProjectToActivity(proj.projectPath);
        projectListContainer.appendChild(item);
    });
}

function addProjectToActivity(projectPath) {
    const proj = loadedProjects.find(p => p.projectPath === projectPath);
    if (!proj) return;

    if (!activeActivityProjects.some(p => p.projectPath === projectPath)) {
        activeActivityProjects.push({
            ...proj,
            statusState: 'Caka',
            runningBat: proj.batFiles[0] || 'Zagon.bat'
        });
    }

    renderActiveProjectsList();
    selectProject(projectPath);
}

function renderActiveProjectsList() {
    if (!activeProjectsListContainer || !completedProjectsListContainer) return;

    const activeOnly = activeActivityProjects.filter(p => p.statusState === 'Caka' || p.statusState === 'V_TEKU');
    const completedOnly = activeActivityProjects.filter(p => p.statusState === 'PASS' || p.statusState === 'FAIL' || p.statusState === 'Končano');

    // Izris aktivnih / čakajočih
    if (activeOnly.length === 0) {
        activeProjectsListContainer.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 6px;">Ni aktivnih projektov...</div>';
    } else {
        activeProjectsListContainer.innerHTML = '';
        activeOnly.forEach(proj => {
            const row = document.createElement('div');
            row.style.cssText = 'background: var(--bg-input); border: 1px solid var(--border); padding: 8px 10px; border-radius: 6px; display: flex; flex-direction: column; gap: 6px;';
            if (proj.projectPath === currentActiveProjectPath) row.style.borderColor = 'var(--primary)';

            let statusBadge = '<span style="background: #64748b; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Čaka</span>';
            if (proj.statusState === 'V_TEKU') {
                statusBadge = '<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">V teku...</span>';
            }

            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 11px; color: var(--text-main); cursor: pointer;">📁 ${proj.projectName}</strong>
                    <div>${statusBadge}</div>
                </div>
                <div style="font-size: 10px; color: var(--text-muted);">Skripta: ${proj.runningBat}</div>
                <div style="display: flex; gap: 6px; margin-top: 4px;">
                    <button class="btn-run" style="flex: 1; padding: 4px; font-size: 11px;" onclick="runProjectTest('${proj.projectPath.replace(/\\/g, '\\\\')}', '${proj.runningBat}')">🚀 Zaženi</button>
                </div>
            `;
            row.onclick = (e) => { if (e.target.tagName !== 'BUTTON') selectProject(proj.projectPath); };
            activeProjectsListContainer.appendChild(row);
        });
    }

    // Izris zaključenih / stestiranih projektov
    if (completedOnly.length === 0) {
        completedProjectsListContainer.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 6px;">Ni stestiranih projektov...</div>';
    } else {
        completedProjectsListContainer.innerHTML = '';
        completedOnly.forEach(proj => {
            const row = document.createElement('div');
            row.style.cssText = 'background: var(--bg-input); border: 1px solid var(--border); padding: 8px 10px; border-radius: 6px; display: flex; flex-direction: column; gap: 6px;';
            if (proj.projectPath === currentActiveProjectPath) row.style.borderColor = 'var(--primary)';

            let statusBadge = (proj.statusState === 'PASS' || proj.statusState === 'Končano')
                ? '<span style="background: #10b981; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Končano (PASS)</span>'
                : '<span style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 3px; font-size: 10px;">Končano (FAIL)</span>';

            row.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 11px; color: var(--text-main); cursor: pointer;">📁 ${proj.projectName}</strong>
                    <div>${statusBadge}</div>
                </div>
                <div style="display: flex; gap: 6px; margin-top: 6px;">
                    <button class="btn-secondary" style="flex: 1; padding: 4px; font-size: 10px;" onclick="openReport('${proj.projectPath.replace(/\\/g, '\\\\')}', 'html')">📊 Poročilo</button>
                    <button class="btn-secondary" style="flex: 1; padding: 4px; font-size: 10px;" onclick="openReport('${proj.projectPath.replace(/\\/g, '\\\\')}', 'json')">📂 JSON</button>
                    <button class="btn-run" style="flex: 1; padding: 4px; font-size: 10px;" onclick="runProjectTest('${proj.projectPath.replace(/\\/g, '\\\\')}', '${proj.runningBat}')">🔄 Ponovi</button>
                </div>
            `;
            row.onclick = (e) => { if (e.target.tagName !== 'BUTTON') selectProject(proj.projectPath); };
            completedProjectsListContainer.appendChild(row);
        });
    }
}

function selectProject(projectPath) {
    const proj = loadedProjects.find(p => p.projectPath === projectPath);
    if (!proj) return;

    currentActiveProjectPath = projectPath;
    ipcRenderer.send('set-active-project', projectPath);

    ipcRenderer.invoke('get-project-status', projectPath).then(status => {
        if (consoleDiv && status.output) {
            consoleDiv.innerHTML = status.output;
            consoleDiv.scrollTop = consoleDiv.scrollHeight;
        }
    });

    renderActiveProjectsList();
}

window.runProjectTest = function(projectPath, batFileName) {
    const actProj = activeActivityProjects.find(p => p.projectPath === projectPath);
    if (actProj) {
        actProj.statusState = 'V_TEKU';
    }

    // DINAMIČEN PRIKAZ KONZOLE: Ko se test zažene, prikažemo konzolo desno
    if (consoleCardContainer) consoleCardContainer.classList.add('visible');
    if (mainLayoutContainer) mainLayoutContainer.classList.remove('no-console');

    renderActiveProjectsList();
    selectProject(projectPath);

    ipcRenderer.send('run-bat', { projectPath, batFileName });
    recordTestResult(actProj ? actProj.projectName : 'Projekt', 'V TEKU', getCurrentUser());
};

window.openReport = function(projectPath, reportType) {
    ipcRenderer.send('open-specific-report', { projectPath, reportType });
};

ipcRenderer.on('console-data', (event, { projectPath, text, progress, statusText }) => {
    if (projectPath === currentActiveProjectPath) {
        // Poskrbimo, da je konzola vidna, če podatki pritekajo
        if (consoleCardContainer && !consoleCardContainer.classList.contains('visible')) {
            consoleCardContainer.classList.add('visible');
            if (mainLayoutContainer) mainLayoutContainer.classList.remove('no-console');
        }

        if (consoleDiv && text) {
            consoleDiv.insertAdjacentHTML('beforeend', text);
            consoleDiv.scrollTop = consoleDiv.scrollHeight;
        }

        if (progress !== undefined && progressContainer) {
            progressContainer.style.display = 'block';
            if (progressBarFill) progressBarFill.style.width = `${progress}%`;
            if (progressPercentText) progressPercentText.innerText = `${progress}%`;
            if (progressStatusText && statusText) {
                progressStatusText.innerText = `${statusText} (~150 MB RAM)`;
            }

            if (progress === 100) {
                setTimeout(() => {
                    if (progressContainer) progressContainer.style.display = 'none';
                }, 3000);
            }
        }
    }
});

ipcRenderer.on('test-finished', (event, { projectPath, code }) => {
    const proj = loadedProjects.find(p => p.projectPath === projectPath);
    const actProj = activeActivityProjects.find(p => p.projectPath === projectPath);

    const finalStatus = code === 0 ? 'PASS' : 'FAIL';

    if (proj) proj.lastStatus = finalStatus;
    if (actProj) actProj.statusState = finalStatus;

    if (proj) {
        recordTestResult(proj.projectName, finalStatus, getCurrentUser());
    }

    // Ko se test zaključi, lahko konzolo skrijemo, da ima uporabnik več prostora za poročila, ali pa jo pustimo vidno. (Tukaj jo ohranimo vidno za vpogled zadnjega izpisa, ali pa jo skrijemo po želji).
    renderProjectList();
    renderActiveProjectsList();
});

// Dodaj to funkcijo v renderer.js za posodabljanje vizualne niti glede na fazo
function updateSidebarPipeline(stage) {
    const fillLine = document.getElementById('sidebar-pipeline-fill');
    if (!fillLine) return;

    if (stage === 'added') {
        fillLine.style.height = '35%'; // Segreje se do 2. koraka (Naloženi projekti)
    } else if (stage === 'running') {
        fillLine.style.height = '70%'; // Segreje se do 3. koraka (Aktivnost / Tek)
    } else if (stage === 'completed') {
        fillLine.style.height = '100%'; // Celotna pot do poročil zaključena
    } else {
        fillLine.style.height = '15%';
    }
}

// V funkciji handleInputPath ali ko je projekt naložen pokliči:
// updateSidebarPipeline('added');

// V funkciji runProjectTest poskrbi za prikaz konzole in skok niti na 70%:
window.runProjectTest = function(projectPath, batFileName) {
    const actProj = activeActivityProjects.find(p => p.projectPath === projectPath);
    if (actProj) {
        actProj.statusState = 'V_TEKU';
    }

    // Prikaz konzole na desni
    const consoleCard = document.getElementById('console-card-container') || document.querySelector('.console-card');
    const mainLayout = document.querySelector('.main-layout');

    if (consoleCard) consoleCard.classList.add('visible');
    if (mainLayout) mainLayout.classList.remove('no-console');

    updateSidebarPipeline('running'); // Premakni nit na aktivno testiranje
    renderActiveProjectsList();
    selectProject(projectPath);

    ipcRenderer.send('run-bat', { projectPath, batFileName });
};

// Ko se test zaključi:
ipcRenderer.on('test-finished', (event, { projectPath, code }) => {
    // ... obstoječa koda ...
    updateSidebarPipeline('completed'); // Nit se ob zaključku obarva do končnih poročil
});

function exportLogs() {
    if (currentActiveProjectPath) {
        ipcRenderer.send('export-logs', currentActiveProjectPath);
    } else {
        alert('Izberite aktiven projekt za izvoz zapisnika.');
    }
}