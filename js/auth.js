let currentUser = null;

function initAuth(onLoginCallback) {
    const userDisplay = document.getElementById('user-display');

    window.openLoginModal = function() {
        document.getElementById('login-modal').style.display = 'flex';
    };

    window.closeLoginModal = function() {
        document.getElementById('login-modal').style.display = 'none';
    };

    window.submitLogin = function() {
        const username = document.getElementById('username-input').value.trim();
        if (username) {
            currentUser = username;
            if (userDisplay) userDisplay.innerText = `Prijavljen: ${currentUser}`;
            window.closeLoginModal();
            if (onLoginCallback) onLoginCallback(currentUser);
        } else {
            alert('Prosimo, vnesite uporabniško ime.');
        }
    };
}

function getCurrentUser() {
    return currentUser || 'Gost (Neznano)';
}

module.exports = { initAuth, getCurrentUser };