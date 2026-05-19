// MENÚ HAMBURGUESA (compartido por todas las páginas) \\

(function () {
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('main-nav');

    if (!menuToggle || !mainNav) return;

    menuToggle.addEventListener('click', () => {
        menuToggle.classList.toggle('active');
        mainNav.classList.toggle('open');
    });

    // Cerrar el menú al hacer clic en un link
    mainNav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            mainNav.classList.remove('open');
        });
    });
})();