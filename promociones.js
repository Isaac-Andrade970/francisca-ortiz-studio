// PÁGINA PROMOCIONES \\
// Las promociones se crean, editan y ocultan desde el panel admin (pestaña Promociones).

(function () {
    const grid = document.getElementById('promos-grid');
    const bloque = document.getElementById('bloque-promos');
    if (!grid || !bloque) return;

    // Las promos las escribe Francisca en el admin: escapamos por si acaso
    function escaparHTML(texto) {
        const div = document.createElement('div');
        div.textContent = texto || '';
        return div.innerHTML;
    }

    // "2026-11-30" -> "30 de noviembre"
    function formatearFechaPromo(fechaTexto) {
        const [año, mes, dia] = fechaTexto.split('-').map(Number);
        return new Date(año, mes - 1, dia).toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
    }

    function crearCardPromo(promo) {
        const card = document.createElement('article');
        card.className = 'promo-card';

        const imagen = promo.imagen
            ? `<div class="promo-card-imagen"><img src="${escaparHTML(promo.imagen)}" alt="${escaparHTML(promo.titulo)}" loading="lazy"></div>`
            : '';
        const etiqueta = promo.etiqueta
            ? `<span class="promo-card-etiqueta">${escaparHTML(promo.etiqueta)}</span>`
            : '';
        const vigencia = promo.validaHasta
            ? `<p class="promo-card-vigencia">Válida hasta el ${formatearFechaPromo(promo.validaHasta)}</p>`
            : '';

        card.innerHTML = `
            ${imagen}
            <div class="promo-card-cuerpo">
                ${etiqueta}
                <h3>${escaparHTML(promo.titulo)}</h3>
                ${promo.descripcion ? `<p class="promo-card-desc">${escaparHTML(promo.descripcion)}</p>` : ''}
                ${vigencia}
                <a href="reservar.html" class="promo-card-link">Reservar con esta promo →</a>
            </div>
        `;
        if (!promo.imagen) card.classList.add('promo-card-sin-imagen');
        return card;
    }

    async function cargarPromociones() {
        try {
            const respuesta = await fetch(`${API_URL}/promociones`);
            if (!respuesta.ok) throw new Error('Respuesta no válida');
            const datos = await respuesta.json();
            const promociones = datos.promociones || [];

            // Sin promociones vigentes la sección no se muestra (la página sigue con el convenio Tarjeta Vecino)
            if (promociones.length === 0) return;

            grid.innerHTML = '';
            promociones.forEach((p) => grid.appendChild(crearCardPromo(p)));
            bloque.hidden = false;
        } catch (error) {
            console.error('Error al cargar promociones:', error);
        }
    }

    cargarPromociones();
})();
