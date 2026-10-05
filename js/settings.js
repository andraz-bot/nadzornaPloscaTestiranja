const translations = {
    sl: {
        step1: "1. Dodaj projekt",
        dropText: "Izberi ZIP ali mapo",
        step2: "2. Naloženi projekti",
        emptyList: "Seznam je prazen...",
        step3: "3. Aktivnost & Zagon",
        step4: "4. Zaključena poročila",
        noReports: "Ni poročil",
        consoleTitle: "Konzola v živo"
    },
    en: {
        step1: "1. Add Project",
        dropText: "Select ZIP or folder",
        step2: "2. Loaded Projects",
        emptyList: "List is empty...",
        step3: "3. Activity & Run",
        step4: "4. Completed Reports",
        noReports: "No reports",
        consoleTitle: "Live Console"
    }
};

function initSettings() {
    window.changeLanguage = function(lang) {
        const t = translations[lang];
        if (!t) return;
        document.getElementById('lbl-step1').innerText = t.step1;
        document.getElementById('lbl-drop-text').innerText = t.dropText;
        document.getElementById('lbl-step2').innerText = t.step2;
        document.getElementById('lbl-empty-list').innerText = t.emptyList;
        document.getElementById('lbl-step3').innerText = t.step3;
        document.getElementById('lbl-step4').innerText = t.step4;
        document.getElementById('lbl-no-reports').innerText = t.noReports;
        document.getElementById('console-header-title').innerText = t.consoleTitle;
    };

    window.changeTheme = function(themeName) {
        document.body.className = '';
        if (themeName === 'light') {
            document.body.classList.add('theme-light');
        } else if (themeName === 'emerald') {
            document.body.classList.add('theme-emerald');
        }
    };
}

module.exports = { initSettings };