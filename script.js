// SPLASH SCREEN \\

(function () {
    const splash = document.getElementById('splash-screen');
    if (!splash) return;

    // Solo mostrar la primera vez en esta sesión
    if (sessionStorage.getItem('splashMostrado')) {
        splash.classList.add('hidden');
        return;
    }

    // Marcar que ya se mostró
    sessionStorage.setItem('splashMostrado', 'true');

    // Quitar el splash del DOM después de la animación
    setTimeout(() => {
        splash.classList.add('hidden');
    }, 3400);
})();

const elementosAnimados = document.querySelectorAll('.fade-in');

const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15
});

elementosAnimados.forEach((elemento) => {
    observer.observe(elemento);
});

// LÓGICA DE LA PÁGINA RESERVAR \\

if (document.querySelector('.booking-page')) {

    const reserva = {
        servicio: null,
        servicioNombre: null,
        servicioPrecio: null,
        duracion: null,
        fecha: null,
        hora: null
    };

    const HORARIOS = {
        0: null,
        1: null,
        2: ['09:00', '11:00', '14:00', '16:00', '18:00'],       
        3: ['09:00', '11:00', '14:00', '16:00'],                 
        4: ['09:00', '11:00', '14:00', '16:00', '18:00'],        
        5: ['09:00', '11:00', '14:00', '16:00'],                
        6: ['09:00', '11:00', '15:00'] 
    };

    let mesActual = new Date();
    mesActual.setDate(1);

    const btnNextStep1 = document.getElementById('next-to-step-2');

    function formatearPrecioReserva(precio) {
        return '$' + Number(precio).toLocaleString('es-CL');
    }
    function formatearDuracionReserva(min) {
        if (min < 60) return `${min} min`;
        const horas = min / 60;
        if (horas === 1) return '1 hora';
        return `${horas} horas`;
    }

    // Conecta el clic a cada tarjeta (se llama DESPUÉS de dibujarlas)
    function conectarOpcionesServicio() {
        const serviceOptions = document.querySelectorAll('.service-option');
        serviceOptions.forEach((option) => {
            option.addEventListener('click', () => {
                serviceOptions.forEach((o) => o.classList.remove('selected'));
                option.classList.add('selected');

                reserva.servicio = option.getAttribute('data-service');
                reserva.duracion = parseInt(option.getAttribute('data-duration'));
                reserva.servicioNombre = option.querySelector('h3').textContent;
                reserva.servicioPrecio = option.querySelector('.price').textContent;

                btnNextStep1.disabled = false;
                actualizarSidebar();
            });
        });
    }

    // Trae los servicios del backend, los dibuja y luego conecta los clics
    async function cargarServiciosReserva() {
        const contenedor = document.querySelector('.services-selection');
        if (!contenedor) return;

        try {
            const respuesta = await fetch('http://localhost:3000/api/servicios');
            const datos = await respuesta.json();
            const servicios = datos.servicios || [];

            contenedor.innerHTML = servicios.map((s) => `
                <article class="service-option" data-service="${s.id}" data-duration="${s.duracion}">
                    <h3>${s.nombre}</h3>
                    <p>${s.descripcion || ''}</p>
                    <p class="service-meta"><span class="price">${formatearPrecioReserva(s.precio)}</span> <span class="duration">· ${formatearDuracionReserva(s.duracion)}</span></p>
                </article>
            `).join('');

            conectarOpcionesServicio();

        } catch (error) {
            console.error('Error al cargar servicios para reservar:', error);
            contenedor.innerHTML = '<p style="color:var(--text-soft); grid-column:1/-1;">No se pudieron cargar los servicios. Recarga la página o escríbenos por WhatsApp.</p>';
        }
    }

    cargarServiciosReserva();

function irAPaso(numeroPaso) {
        document.querySelectorAll('.booking-step').forEach((s) => s.classList.remove('active'));
        document.querySelector(`.booking-step-${numeroPaso}`).classList.add('active');

        document.querySelectorAll('.step').forEach((s) => {
            const numero = parseInt(s.getAttribute('data-step'));
            s.classList.remove('active', 'completed');
            if (numero < numeroPaso) {
                s.classList.add('completed');
            } else if (numero === numeroPaso) {
                s.classList.add('active');
            }
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    document.getElementById('next-to-step-2')?.addEventListener('click', () => {
        irAPaso(2);
        renderCalendario();
    });

    document.getElementById('back-to-step-1')?.addEventListener('click', () => irAPaso(1));
    document.getElementById('next-to-step-3')?.addEventListener('click', () => irAPaso(3));
    document.getElementById('back-to-step-2')?.addEventListener('click', () => irAPaso(2));

    function renderCalendario() {
        const grid = document.getElementById('calendar-grid');
        const monthLabel = document.getElementById('calendar-month');

        const mes = mesActual.getMonth();
        const año = mesActual.getFullYear();

        const meses = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        monthLabel.textContent = `${meses[mes]} ${año}`;

        let diaInicio = new Date(año, mes, 1).getDay();
        diaInicio = diaInicio === 0 ? 6 : diaInicio - 1;

        const diasEnMes = new Date(año, mes + 1, 0).getDate();

        grid.innerHTML = '';

        for (let i = 0; i < diaInicio; i++) {
            const empty = document.createElement('div');
            empty.classList.add('calendar-day', 'empty');
            grid.appendChild(empty);
        }

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        for (let dia = 1; dia <= diasEnMes; dia++) {
            const cell = document.createElement('div');
            cell.classList.add('calendar-day');
            cell.textContent = dia;

            const fechaDia = new Date(año, mes, dia);
            const diaSemana = fechaDia.getDay();

            if (fechaDia.getTime() === hoy.getTime()) {
                cell.classList.add('today');
            }
            if (fechaDia < hoy || HORARIOS[diaSemana] === null) {
                cell.classList.add('disabled');
            } else {
                cell.classList.add('has-availability');

                cell.addEventListener('click', () => seleccionarDia(fechaDia, cell));
            }

            grid.appendChild(cell);
        }
    }

    document.getElementById('prev-month')?.addEventListener('click', () => {
        mesActual.setMonth(mesActual.getMonth() - 1);
        renderCalendario();
    });

    document.getElementById('next-month')?.addEventListener('click', () => {
        mesActual.setMonth(mesActual.getMonth() + 1);
        renderCalendario();
    });

    async function seleccionarDia(fecha, celda) {
        document.querySelectorAll('.calendar-day').forEach((d) => d.classList.remove('selected'));
        celda.classList.add('selected');

        reserva.fecha = fecha;

        const slotsContainer = document.getElementById('time-slots');
        const helpText = document.querySelector('.slots-help');
        helpText.textContent = 'Consultando disponibilidad...';
        slotsContainer.innerHTML = '';

        const HorariosOcupados = await obtenerHorariosOcupados(fecha);
        renderHorarios(fecha);
        actualizarSidebar();
    }

    async function obtenerHorariosOcupados(fecha) {
        try{
            const año = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');
            const fechaTexto = `${año}-${mes}-${dia}`;

            const url = `http://localhost:3000/api/reservas/disponibilidad?fecha=${fechaTexto}`;
            const respuesta = await fetch(url);

            if (!respuesta.ok){
                console.error('Error al consultar disponibilidad');
                return[];
            }

            const datos = await respuesta.json();
            return datos.ocupados || [];

        } catch (error){
            console.error('Error de red al consultar disponibilidad:', error);
            return[];
        }
    }

    function renderHorarios(fecha, horariosOcupados = []) {
        const slotsContainer = document.getElementById('time-slots');
        const helpText = document.querySelector('.slots-help');

        const diaSemana = fecha.getDay();
        const horasDelDia = HORARIOS[diaSemana];

        slotsContainer.innerHTML = '';

        if (!horasDelDia) {
            helpText.textContent = 'Este día no atendemos.';
            return;
        }

        const ocupados = horariosOcupados.map((evento) => ({
            inicio: new Date(evento.inicio),
            fin: new Date(evento.fin)
        }));

        const duracionBloque = Math.max(reserva.duracion, 120);

        let slotsCreados = 0;
        
        const ahora = new Date();

        horasDelDia.forEach((horaTexto) => {
            const [horas, minutos] = horaTexto.split(':').map(Number);

            const inicioSlot = new Date(fecha);
            inicioSlot.setHours(horas, minutos, 0, 0);

            const finSlot = new Date(inicioSlot);
            finSlot.setMinutes(finSlot.getMinutes() + duracionBloque);

            const margenMinimo = new Date(ahora);
            margenMinimo.setHours(margenMinimo.getHours() + 1);
            const yaPaso = inicioSlot < margenMinimo;

            const ocupado = ocupados.some((evento) => {
                return inicioSlot < evento.fin && finSlot > evento.inicio;
            });

            const slot = document.createElement('div');
            slot.classList.add('time-slot');
            slot.textContent = horaTexto;

            if (ocupado || yaPaso) {
                slot.classList.add('disabled');
            } else {
                slot.addEventListener('click', () => seleccionarHora(horaTexto, slot));
            }

            slotsContainer.appendChild(slot);
            slotsCreados++;
        });

        if (slotsCreados === 0) {
            helpText.textContent = 'No hay horarios disponibles este día para este servicio.';
        } else {
            const fechaFormateada = fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' });
            helpText.textContent = `Horarios disponibles para ${fechaFormateada}.`;
        }
    }
        

    
    function seleccionarHora(hora, celda) {
        document.querySelectorAll('.time-slot').forEach((s) => s.classList.remove('selected'));
        celda.classList.add('selected');

        reserva.hora = hora;
        document.getElementById('next-to-step-3').disabled = false;
        actualizarSidebar();
    }

    
    function actualizarSidebar() {
        document.getElementById('sidebar-service').textContent = reserva.servicioNombre || 'Por elegir';
        document.getElementById('sidebar-duration').textContent = reserva.duracion ? `${reserva.duracion} min` : '—';
        document.getElementById('sidebar-date').textContent = reserva.fecha
            ? reserva.fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
            : 'Por elegir';
        document.getElementById('sidebar-time').textContent = reserva.hora || 'Por elegir';
        document.getElementById('sidebar-total').textContent = reserva.servicioPrecio || '$0';
    }

    
        document.getElementById('confirm-booking')?.addEventListener('click', async () => {
        const form = document.getElementById('booking-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const boton = document.getElementById('confirm-booking');
        boton.disabled = true;
        boton.textContent = 'Procesando...';

        const [horas, minutos] = reserva.hora.split(':').map(Number);
        const fechaInicio = new Date(reserva.fecha);
        fechaInicio.setHours(horas, minutos, 0, 0);

        const fechaFin = new Date(fechaInicio);
        const duracionBloque = Math.max(reserva.duracion, 120);
        fechaFin.setMinutes(fechaFin.getMinutes() + duracionBloque);

        const datosReserva = {
            cliente: document.getElementById('client-name').value,
            telefono: document.getElementById('client-phone').value,
            email: document.getElementById('client-email').value,
            servicio: reserva.servicioNombre,
            notas: document.getElementById('client-notes').value,
            inicio: fechaInicio.toISOString(),
            fin: fechaFin.toISOString(),
            website: document.getElementById('client-website').value
        };

        try {
            const respuesta = await fetch('http://localhost:3000/api/reservas', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosReserva)
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.error || 'Error al crear la reserva');
            }

            document.getElementById('summary-service').textContent = reserva.servicioNombre;
            document.getElementById('summary-date').textContent = reserva.fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
            document.getElementById('summary-time').textContent = reserva.hora;
            document.getElementById('summary-name').textContent = datosReserva.cliente;

            irAPaso(4);

        } catch (error) {
            console.error('Error al confirmar reserva:', error);
            alert('Hubo un problema al confirmar tu reserva. Por favor intenta de nuevo o contáctanos por WhatsApp.');

            boton.disabled = false;
            boton.textContent = 'Confirmar reserva';
        }
    });

}

// CARRUSEL DE PRODUCTOS \\

const carouselTrack = document.getElementById('productos-carousel');
const btnPrev = document.querySelector('.carousel-btn-prev');
const btnNext = document.querySelector('.carousel-btn-next');

if (carouselTrack && btnPrev && btnNext) {
    const cardWidth = 280 + 24;
    let intervaloAutoScroll;
    let pausado = false;

    // Funciones de movimiento
    function moverIzquierda() {
        carouselTrack.scrollBy({
            left: -cardWidth,
            behavior: 'smooth'
        });
    }

    function moverDerecha() {
        // Si llegó al final, vuelve al inicio
        const maxScroll = carouselTrack.scrollWidth - carouselTrack.clientWidth;
        if (carouselTrack.scrollLeft >= maxScroll - 10) {
            carouselTrack.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            carouselTrack.scrollBy({
                left: cardWidth,
                behavior: 'smooth'
            });
        }
    }

    // Botones de flecha
    btnPrev.addEventListener('click', () => {
        moverIzquierda();
        reiniciarAutoScroll();
    });

    btnNext.addEventListener('click', () => {
        moverDerecha();
        reiniciarAutoScroll();
    });

    // Auto-scroll
    function iniciarAutoScroll() {
        intervaloAutoScroll = setInterval(() => {
            if (!pausado) {
                moverDerecha();
            }
        }, 3000); // Cada 5 segundos
    }

    function reiniciarAutoScroll() {
        clearInterval(intervaloAutoScroll);
        iniciarAutoScroll();
    }

    // Pausar al pasar el mouse
    carouselTrack.addEventListener('mouseenter', () => {
        pausado = true;
    });

    carouselTrack.addEventListener('mouseleave', () => {
        pausado = false;
    });

    // Pausar también si el usuario está deslizando manualmente (móvil)
    carouselTrack.addEventListener('touchstart', () => {
        pausado = true;
    });

    carouselTrack.addEventListener('touchend', () => {
        setTimeout(() => { pausado = false; }, 3000); // 3s de pausa después de tocar
    });

    // Iniciar todo
    iniciarAutoScroll();
}

// CARGAR RESEÑAS APROBADAS EN EL HOME \\

async function cargarResenas() {
    const grid = document.getElementById('resenas-grid');
    if (!grid) return; // No estamos en el home

    try {
        const respuesta = await fetch('http://localhost:3000/api/resenas');
        if (!respuesta.ok) throw new Error('Error al cargar');

        const datos = await respuesta.json();

        if (datos.resenas.length === 0) {
            grid.innerHTML = '<p class="resenas-loading">Aún no tenemos reseñas publicadas. ¡Sé la primera!</p>';
            return;
        }

        grid.innerHTML = '';

        datos.resenas.forEach((resena) => {
            const card = document.createElement('article');
            card.classList.add('resena-publica');

            // Generar estrellas
            let estrellas = '';
            for (let i = 1; i <= 5; i++) {
                estrellas += i <= resena.calificacion ? '★' : '☆';
            }

            card.innerHTML = `
                <div class="stars">${estrellas}</div>
                <p class="comentario">${resena.comentario}</p>
                <div class="footer-resena">
                    <p class="cliente">${resena.cliente}</p>
                    <p class="servicio">${resena.servicio}</p>
                </div>
            `;

            grid.appendChild(card);
        });

    } catch (error) {
        console.error('Error al cargar reseñas:', error);
        grid.innerHTML = '<p class="resenas-loading">No se pudieron cargar las reseñas en este momento.</p>';
    }
}

cargarResenas();

// CATÁLOGO DE PRODUCTOS \\

const API_PRODUCTOS = 'http://localhost:3000/api/productos';

// El precio ahora viene como número desde el backend, así que lo formateamos
function formatearPrecioProducto(precio) {
    return '$' + Number(precio).toLocaleString('es-CL');
}

// Genera el HTML de una tarjeta de producto
function crearTarjetaProducto(producto) {
    return `
        <article class="product-card" data-category="${producto.categoria}">
            <div class="product-image">
                <img src="${producto.imagen}" alt="${producto.nombre}"
                     onerror="this.parentElement.classList.add('sin-imagen'); this.remove();">
            </div>
            <p class="product-brand">${producto.marca}</p>
            <h3>${producto.nombre}</h3>
            <p class="product-descripcion">${producto.descripcion}</p>
            <p class="product-price">${formatearPrecioProducto(producto.precio)}</p>
        </article>
    `;
}

// Llena la tienda con TODOS los productos (desde el backend)
async function cargarTiendaCompleta() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return; // No estamos en la tienda

    try {
        const respuesta = await fetch(API_PRODUCTOS);
        const datos = await respuesta.json();
        const productos = datos.productos || [];

        grid.innerHTML = productos.map(crearTarjetaProducto).join('');
        conectarFiltros(); // reconectar filtros porque las tarjetas son nuevas
    } catch (error) {
        console.error('Error al cargar productos:', error);
        grid.innerHTML = '<p class="resenas-loading">No se pudieron cargar los productos en este momento.</p>';
    }
}

// Llena el carrusel del home solo con destacados (desde el backend)
async function cargarCarruselDestacados() {
    const track = document.getElementById('productos-carousel');
    if (!track) return; // No estamos en el home

    try {
        const respuesta = await fetch(API_PRODUCTOS);
        const datos = await respuesta.json();
        const destacados = (datos.productos || []).filter((p) => p.destacado);
        track.innerHTML = destacados.map(crearTarjetaProducto).join('');
    } catch (error) {
        console.error('Error al cargar destacados:', error);
    }
}

// Conecta los botones de filtro con las tarjetas
function conectarFiltros() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    const productCards = document.querySelectorAll('.product-card');

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const filter = button.getAttribute('data-filter');

            filterButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');

            productCards.forEach((card) => {
                const category = card.getAttribute('data-category');
                if (filter === 'all' || category === filter) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });
}

// Ejecutar al cargar
cargarTiendaCompleta();
cargarCarruselDestacados();

// MODAL DE TERMINOS Y CONDICIONES \\

(function () {
    const overlay = document.getElementById('modal-terminos');
    const btnAbrir = document.getElementById('abrir-terminos');
    const btnCerrar = document.getElementById('cerrar-terminos');
    const btnAceptar = document.getElementById('aceptar-terminos');
    const checkbox = document.getElementById('client-terms');

    if (!overlay || !btnAbrir) return; // No estamos en reservar

    function abrirModal() {
        overlay.classList.add('open');
        overlay.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-abierto');
    }

    function cerrarModal() {
        overlay.classList.remove('open');
        overlay.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-abierto');
    }

    btnAbrir.addEventListener('click', abrirModal);
    btnCerrar.addEventListener('click', cerrarModal);

    // El botón "Entendido" cierra el modal Y marca el checkbox automáticamente
    btnAceptar.addEventListener('click', () => {
        if (checkbox) checkbox.checked = true;
        cerrarModal();
    });

    // Cerrar haciendo clic en el fondo oscuro (fuera del modal)
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) cerrarModal();
    });

    // Cerrar con la tecla Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('open')) {
            cerrarModal();
        }
    });
})();

// CONTADOR DE CARACTERES EN COMENTARIOS DE RESERVA \\

(function () {
    const textarea = document.getElementById('client-notes');
    const contador = document.getElementById('char-count');
    const contenedor = document.querySelector('.char-counter-reservar');

    if (!textarea || !contador || !contenedor) return;

    textarea.addEventListener('input', () => {
        const largo = textarea.value.length;
        contador.textContent = largo;

        contenedor.classList.remove('casi-lleno', 'lleno');
        if (largo >= 100) {
            contenedor.classList.add('lleno');
        } else if (largo >= 80) {
            contenedor.classList.add('casi-lleno');
        }
    });
})();


// SERVICIOS DESTACADOS EN EL HOME \\

async function cargarServiciosHome() {
    const grid = document.getElementById('servicios-home');
    if (!grid) return;

    function formatearPrecio(precio) {
        return '$' + Number(precio).toLocaleString('es-CL');
    }
    function formatearDuracion(min) {
        if (min < 60) return `${min} min`;
        const horas = min / 60;
        if (horas === 1) return '1 hora';
        return `${horas} horas`;
    }

    try {
        const respuesta = await fetch('http://localhost:3000/api/servicios');
        const datos = await respuesta.json();
        // Mostramos solo los primeros 4 (según el campo "orden")
        const servicios = (datos.servicios || []).slice(0, 4);

        grid.innerHTML = servicios.map(s => `
            <article class="service-card">
                <h3>${s.nombre}</h3>
                <p>${s.descripcion || ''}</p>
                <p class="price">Desde ${formatearPrecio(s.precio)} <span class="duration">· ${formatearDuracion(s.duracion)}</span></p>
            </article>
        `).join('');

    } catch (error) {
        console.error('Error al cargar servicios del home:', error);
    }
}

cargarServiciosHome();