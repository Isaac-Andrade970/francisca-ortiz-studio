// ESTADÍSTICAS (contador anónimo para la pestaña Estadísticas del panel) \\
// Cada evento se cuenta una vez por sesión (sessionStorage, no cookies) y no se manda nada de la persona.
// Los dispositivos donde Francisca entró al panel quedan marcados y no se cuentan.

window.registrarEstadistica = function (...eventos) {
    try {
        if (typeof API_URL === 'undefined') return;
        if (localStorage.getItem('fo_no_contar') === '1') return;

        const nuevos = eventos.filter((e) => !sessionStorage.getItem('fo_est_' + e));
        if (nuevos.length === 0) return;
        nuevos.forEach((e) => sessionStorage.setItem('fo_est_' + e, '1'));

        // keepalive: el aviso llega aunque la persona se vaya de la página justo después
        fetch(`${API_URL}/estadisticas/evento`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventos: nuevos }),
            keepalive: true
        }).catch(() => {});
    } catch (error) {
        // Sin sessionStorage (modo privado estricto) simplemente no se cuenta
    }
};

(function () {
    // Cloudflare sirve las páginas con y sin ".html": se aceptan las dos formas
    const ruta = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/index';
    const PAGINAS = { '/index': 'pag_inicio', '/servicios': 'pag_servicios', '/tienda': 'pag_tienda', '/promociones': 'pag_promociones', '/reservar': 'pag_reservar' };
    const pagina = PAGINAS[ruta];
    if (pagina) window.registrarEstadistica('visita_sitio', pagina);
})();

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

// BANNER TARJETA VECINO (arriba de todas las páginas, menos en la de promociones) \\

(function () {
    const header = document.querySelector('body > header');
    if (!header) return;
    // Cloudflare sirve la página como /promociones (sin .html), así que se aceptan las dos formas
    if (/\/promociones(\.html)?\/?$/.test(location.pathname)) return;
    // En el inicio el aviso va como cápsula dentro del hero
    if (document.body.classList.contains('pagina-inicio')) return;

    const banner = document.createElement('a');
    banner.href = 'promociones.html';
    banner.className = 'promo-banner';
    banner.innerHTML = `
        <span class="promo-banner-brillo" aria-hidden="true"></span>
        <span class="promo-banner-texto">
            <span class="promo-banner-icono" aria-hidden="true">✦</span>
            <span class="promo-banner-largo">Descubre beneficios con tu Tarjeta Vecino <strong>«Soy Quinta»</strong></span>
            <span class="promo-banner-corto">Beneficios Tarjeta Vecino <strong>«Soy Quinta»</strong></span>
        </span>
        <span class="promo-banner-boton"><span class="promo-banner-largo">Ver beneficios </span><span class="promo-banner-corto">Ver </span><span aria-hidden="true">→</span></span>
    `;
    header.parentNode.insertBefore(banner, header);
})();

// HEADER TRANSPARENTE EN EL INICIO: se vuelve sólido al bajar \\

(function () {
    if (!document.body.classList.contains('pagina-inicio')) return;
    const header = document.querySelector('body > header');
    if (!header) return;

    const actualizar = () => header.classList.toggle('header-solido', window.scrollY > 40);
    actualizar();
    window.addEventListener('scroll', actualizar, { passive: true });
})();

// HORARIO DE ATENCIÓN EN EL PIE (editable desde el panel admin) \\

(async function () {
    const contenedor = document.getElementById('footer-hours');
    if (!contenedor || typeof API_URL === 'undefined') return;

    try {
        const respuesta = await fetch(`${API_URL}/horarios`);
        if (!respuesta.ok) return;
        const datos = await respuesta.json();
        const lineas = datos.atencion || [];
        if (lineas.length === 0) return;

        // Si falla la carga, queda el horario escrito en el HTML
        contenedor.innerHTML = '';
        lineas.forEach((linea) => {
            const p = document.createElement('p');
            p.textContent = linea;
            contenedor.appendChild(p);
        });
    } catch (error) {
        console.error('No se pudo cargar el horario de atención:', error);
    }
})();