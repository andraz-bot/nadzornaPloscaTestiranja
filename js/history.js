let globalTestHistory = [];

function initHistory() {
    window.openHistoryModal = function() {
        renderGlobalHistoryTable();
        document.getElementById('history-modal').style.display = 'flex';
    };

    window.closeHistoryModal = function() {
        document.getElementById('history-modal').style.display = 'none';
    };
}

function recordTestResult(projectName, status, user) {
    globalTestHistory.unshift({
        projectName,
        user: user || 'Gost (Neznano)',
        time: new Date().toLocaleTimeString(),
        status
    });
}

function renderGlobalHistoryTable() {
    const tbody = document.getElementById('global-history-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (globalTestHistory.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-muted);">Ni podatkov o zgodovini.</td></tr>';
        return;
    }

    globalTestHistory.forEach(item => {
        const tr = document.createElement('tr');
        const badge = item.status === 'PASS'
            ? '<span class="status-badge status-pass">USPEŠNO</span>'
            : '<span class="status-badge status-fail">NAPAKA</span>';

        tr.innerHTML = `
            <td>${item.projectName}</td>
            <td>${item.user}</td>
            <td>${item.time}</td>
            <td>${badge}</td>
        `;
        tbody.appendChild(tr);
    });
}

module.exports = { initHistory, recordTestResult };