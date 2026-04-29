document.addEventListener("DOMContentLoaded", () => {
    // Load header and menu in parallel, then initialize functionality
    Promise.all([
        loadComponent('header.html', 'header-placeholder'),
        loadComponent('menu.html', 'menu-placeholder')
    ]).then(initHeader);

    loadComponent('footer.html', 'footer-placeholder');
});

/**
 * Loads an HTML file into a target element.
 * Returns a Promise that resolves when the content is loaded.
 */
function loadComponent(file, elementId) {
    return fetch(file)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load ${file}`);
            return response.text();
        })
        .then(data => {
            const element = document.getElementById(elementId);
            if (element) element.innerHTML = data;
        })
        .catch(error => console.error(error));
}

/**
 * Initializes header functionality (Hamburger menu).
 */
function initHeader() {
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const closeMenuBtn = document.getElementById('close-menu-btn');
    const sideMenu = document.getElementById('side-menu');
    const overlay = document.getElementById('menu-overlay');

    if (!hamburgerBtn || !closeMenuBtn || !sideMenu || !overlay) return;

    function toggleMenu() {
        sideMenu.classList.toggle('open');
        overlay.classList.toggle('active');
    }

    if (hamburgerBtn) hamburgerBtn.addEventListener('click', toggleMenu);
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', toggleMenu);
    if (overlay) overlay.addEventListener('click', toggleMenu);
}