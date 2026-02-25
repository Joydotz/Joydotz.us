document.addEventListener("DOMContentLoaded", () => {
    loadComponent('header.html', 'header-placeholder', initHeader);
    loadComponent('footer.html', 'footer-placeholder');
});

/**
 * Loads an HTML file into a target element.
 * @param {string} file - The path to the HTML file.
 * @param {string} elementId - The ID of the target element.
 * @param {function} callback - Optional callback to run after loading.
 */
function loadComponent(file, elementId, callback) {
    fetch(file)
        .then(response => {
            if (!response.ok) throw new Error(`Failed to load ${file}`);
            return response.text();
        })
        .then(data => {
            document.getElementById(elementId).innerHTML = data;
            if (callback) callback();
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