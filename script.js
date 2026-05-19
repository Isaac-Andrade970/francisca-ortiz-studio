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

    const serviceOptions = document.querySelectorAll('.service-option');
    const btnNextStep1 = document.getElementById('next-to-step-2');

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
            fin: fechaFin.toISOString()
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
            <p class="product-price">${producto.precio}</p>
        </article>
    `;
}

// Llena la tienda con TODOS los productos
function cargarTiendaCompleta() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return; // No estamos en la tienda

    grid.innerHTML = PRODUCTOS.map(crearTarjetaProducto).join('');

    // Reconectar los filtros (porque las tarjetas son nuevas)
    conectarFiltros();
}

// Llena el carrusel del home solo con destacados
function cargarCarruselDestacados() {
    const track = document.getElementById('productos-carousel');
    if (!track) return; // No estamos en el home

    const destacados = PRODUCTOS.filter((p) => p.destacado);
    track.innerHTML = destacados.map(crearTarjetaProducto).join('');
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