// SERVICIOS EN LA WEB PÚBLICA \\
// Pide los servicios al backend y los muestra en servicios.html.
// Para agregar o editar servicios NO se toca este archivo: se hace desde el panel admin.

(function () {
    const API_SERVICIOS = API_URL + '/servicios';

    function formatearPrecio(precio) {
        return '$' + Number(precio).toLocaleString('es-CL');
    }

    function formatearDuracion(min) {
        if (min < 60) return `${min} min`;
        const horas = min / 60;
        if (horas === 1) return '1 hora';
        return `${horas} horas`;
    }

    function tarjetaServicio(s) {
        return `
            <article class="service-card">
                <h3>${s.nombre}</h3>
                <p>${s.descripcion || ''}</p>
                <p class="price">Desde ${formatearPrecio(s.precio)} <span class="duration">· ${formatearDuracion(s.duracion)}</span></p>
            </article>
        `;
    }

    function llenarGrid(id, servicios) {
        const grid = document.getElementById(id);
        if (!grid) return;
        if (servicios.length === 0) {
            grid.innerHTML = '<p style="color:var(--text-soft);">Próximamente.</p>';
            return;
        }
        grid.innerHTML = servicios.map(tarjetaServicio).join('');
    }

    async function cargar() {
        try {
            const respuesta = await fetch(API_SERVICIOS);
            const datos = await respuesta.json();
            const servicios = datos.servicios || [];

            llenarGrid('grid-peluqueria', servicios.filter(s => s.categoria === 'peluqueria'));
            llenarGrid('grid-manicure', servicios.filter(s => s.categoria === 'manicure'));

        } catch (error) {
            console.error('Error al cargar servicios:', error);
            ['grid-peluqueria', 'grid-manicure'].forEach(id => {
                const g = document.getElementById(id);
                if (g) g.innerHTML = '<p style="color:var(--text-soft);">No se pudieron cargar los servicios.</p>';
            });
        }
    }

    // Corre cuando el DOM esté listo (sirva donde sirva el <script>)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', cargar);
    } else {
        cargar();
    }
})();