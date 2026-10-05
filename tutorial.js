let currentTutorialStep = 0;

const tutorialSteps = [
    {
        title: "Naziv in osrednji namen",
        text: "Zgoraj levo vidite naslov aplikacije in njen opis. Služi kot hitro prepoznavno okolje za nadzor in zagon testov.",
        elementId: "tutorial-step-header"
    },
    {
        title: "Navigacijski meni",
        text: "Z gumbi 'Testi', 'Zgodovina', 'Nastavitve' in 'Pomoč' preklapljate med glavnim delovnim okoljem, pregledom preteklih rezultatov, prilagoditvami ter centrom za pomoč.",
        elementId: "tutorial-step-nav"
    },
    {
        title: "Prijava v sistem",
        text: "S klikom na gumb 'Prijava' dostopate do prijavnega okna, ki omogoča sinhronizacijo testiranj z vašim uporabniškim računom.",
        elementId: "tutorial-step-auth"
    },
    {
        title: "1. Korak: Dodajanje projekta",
        text: "Tukaj lahko enostavno izberete ZIP datoteko ali mapo s projektom in jo povlečete v območje za nalaganje.",
        elementId: "tutorial-step-1"
    },
    {
        title: "2. Korak: Naloženi projekti",
        text: "Seznam vseh uspešno naloženih projektov, pripravljenih za nadaljnjo obdelavo in testiranje.",
        elementId: "tutorial-step-2"
    },
    {
        title: "3. Korak: Aktivnost in Zagon",
        text: "Izberite projekt, sprožite zagon preverjanj in spremljajte sprotni odstotkovni napredek izvajanja.",
        elementId: "tutorial-step-3"
    },
    {
        title: "4. Korak: Zaključena poročila",
        text: "Ko so testi zaključeni, se tukaj prikažejo končna poročila in rezultati posameznih testiranj.",
        elementId: "tutorial-step-4"
    },
    {
        title: "Desni stolpec: Konzola v živo",
        text: "Na desni strani se v realnem času izpisujejo sistemski izhodi, napake in podatki izvajanja. Zapisnik lahko s klikom na gumb tudi izvozite.",
        elementId: "tutorial-step-console"
    }
];

function startTutorial() {
    currentTutorialStep = 0;
    showStep(currentTutorialStep);
}

function skipTutorial() {
    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) overlay.style.display = 'none';

    const tooltip = document.getElementById('tutorial-tooltip');
    if (tooltip) tooltip.style.display = 'none';

    document.querySelectorAll('.highlighted-element').forEach(el => {
        el.classList.remove('highlighted-element');
        el.style.zIndex = '';
        el.style.position = '';
    });

    const navbar = document.querySelector('.navbar');
    if (navbar) {
        navbar.style.zIndex = '';
        navbar.style.position = '';
    }
}

function nextTutorialStep() {
    currentTutorialStep++;
    if (currentTutorialStep < tutorialSteps.length) {
        showStep(currentTutorialStep);
    } else {
        skipTutorial();
    }
}

function showStep(index) {
    document.querySelectorAll('.highlighted-element').forEach(el => {
        el.classList.remove('highlighted-element');
        el.style.zIndex = '';
        el.style.position = '';
    });

    const overlay = document.getElementById('tutorial-overlay');
    if (overlay) {
        overlay.style.display = 'block';
        const overlayBox = overlay.querySelector('.tutorial-box');
        if (overlayBox) overlayBox.style.display = 'none';
    }

    const step = tutorialSteps[index];
    const tooltip = document.getElementById('tutorial-tooltip');

    // Pameten preklop zavihkov v ozadju glede na korak
    if (index >= 3 && index <= 6) {
        switchView('view-dashboard', document.querySelector('.nav-btn'));
    } else if (index === 2) {
        switchView('view-auth', document.querySelector('.nav-auth-btn'));
    } else if (index === 0 || index === 1) {
        switchView('view-dashboard', document.querySelector('.nav-btn'));
    }

    tooltip.innerHTML = `
        <h2 style="color: var(--primary); font-size: 14px; margin-top: 0;">${step.title}</h2>
        <p style="font-size: 11px; color: var(--text-muted); line-height: 1.4; margin-bottom: 15px;">${step.text}</p>
        <div style="font-size: 10px; color: var(--text-muted); margin-bottom: 10px;">Korak ${index + 1} od ${tutorialSteps.length}</div>
        <div class="tutorial-buttons" style="display: flex; justify-content: space-between; gap: 8px;">
            <button class="btn-secondary" onclick="skipTutorial()" style="flex: 1; padding: 6px;">Zaključi</button>
            <button class="btn-run" onclick="nextTutorialStep()" style="flex: 1; padding: 6px;">${index === tutorialSteps.length - 1 ? 'Konec' : 'Naprej'}</button>
        </div>
    `;

    if (step.elementId) {
        const targetElement = document.getElementById(step.elementId);
        if (targetElement) {
            targetElement.classList.add('highlighted-element');
            targetElement.style.position = 'relative';
            targetElement.style.zIndex = '10005';

            const navbar = document.querySelector('.navbar');
            if (navbar && (index === 0 || index === 1 || index === 2)) {
                navbar.style.position = 'relative';
                navbar.style.zIndex = '10002';
            } else if (navbar) {
                navbar.style.zIndex = '';
            }

            setTimeout(() => {
                const rect = targetElement.getBoundingClientRect();
                const boxWidth = 340;
                const boxHeight = 180;

                let top = rect.bottom + 10;
                let left = rect.left;

                if (step.elementId === 'tutorial-step-console') {
                    left = rect.left - boxWidth - 15;
                    top = rect.top;
                } else {
                    if (top + boxHeight > window.innerHeight) {
                        top = rect.top - boxHeight - 10;
                    }
                    if (top < 10) top = 10;
                    if (left + boxWidth > window.innerWidth) left = window.innerWidth - boxWidth - 15;
                    if (left < 10) left = 10;
                }

                tooltip.style.display = 'block';
                tooltip.style.top = `${top}px`;
                tooltip.style.left = `${left}px`;
                tooltip.style.width = `${boxWidth}px`;
            }, 60);
        }
    }
}