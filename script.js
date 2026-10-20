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
        servicios: [], // { id, nombre, precio, duracion }
        fecha: null,
        hora: null
    };

    function duracionTotal() {
        return reserva.servicios.reduce((total, s) => total + s.duracion, 0);
    }

    function precioTotal() {
        return reserva.servicios.reduce((total, s) => total + s.precio, 0);
    }

   // El horario ahora viene de la base de datos (editable desde el panel)
    let HORARIOS = {};
    let BLOQUEOS = [];
    let horariosCargados = false;

    async function cargarHorarios() {
        if (horariosCargados) return;
        try {
            const res = await fetch(`${API_URL}/horarios`);
            const data = await res.json();
            HORARIOS = data.semana || {};
            BLOQUEOS = data.bloqueos || [];
        } catch (e) {
            console.error('No se pudieron cargar los horarios:', e);
            HORARIOS = {};
            BLOQUEOS = [];
        }
        horariosCargados = true;
    }

    let mesActual = new Date();
    mesActual.setDate(1);

    const btnNextStep1 = document.getElementById('next-to-step-2');

    function formatearPrecioReserva(precio) {
        return '$' + Number(precio).toLocaleString('es-CL');
    }
    function formatearDuracionReserva(min) {
        if (min < 60) return `${min} min`;
        const horas = Math.floor(min / 60);
        const minutosRestantes = min % 60;
        if (minutosRestantes === 0) {
            return horas === 1 ? '1 hora' : `${horas} horas`;
        }
        return `${horas} h ${minutosRestantes} min`;
    }

    const MAX_SERVICIOS = 3;

    // Marca como deshabilitadas (visualmente) las tarjetas no elegidas
    // cuando ya se llegó al máximo de servicios por reserva.
    function actualizarLimiteServicios() {
        const alcanzoLimite = reserva.servicios.length >= MAX_SERVICIOS;
        document.querySelectorAll('.service-option').forEach((option) => {
            const seleccionado = option.classList.contains('selected');
            option.classList.toggle('disabled', alcanzoLimite && !seleccionado);
        });
    }

    // Conecta el clic a cada tarjeta (se llama DESPUÉS de dibujarlas)
    // Selección múltiple: cada clic agrega o saca ese servicio de la reserva.
    function conectarOpcionesServicio() {
        const serviceOptions = document.querySelectorAll('.service-option');
        serviceOptions.forEach((option) => {
            option.addEventListener('click', () => {
                if (animandoSeleccion) return;

                const id = option.getAttribute('data-service');
                const yaSeleccionado = reserva.servicios.some((s) => s.id === id);

                if (!yaSeleccionado && reserva.servicios.length >= MAX_SERVICIOS) {
                    return;
                }

                if (yaSeleccionado) {
                    reserva.servicios = reserva.servicios.filter((s) => s.id !== id);
                    option.classList.remove('selected');
                } else {
                    reserva.servicios.push({
                        id: id,
                        nombre: option.querySelector('h3').textContent,
                        precio: parseInt(option.getAttribute('data-price')),
                        duracion: parseInt(option.getAttribute('data-duration'))
                    });
                    option.classList.add('selected');
                }

                actualizarEstadoSeleccion();

                // Con el 3.er servicio la grilla se convierte en el ticket de reserva
                if (!yaSeleccionado && reserva.servicios.length === MAX_SERVICIOS) {
                    armarTicket();
                }
            });
        });
    }

    function actualizarEstadoSeleccion() {
        btnNextStep1.disabled = reserva.servicios.length === 0;
        actualizarLimiteServicios();
        actualizarContador();
        actualizarSidebar();
    }

    function actualizarContador() {
        const cantidad = reserva.servicios.length;
        document.querySelectorAll('.contador-puntos i').forEach((punto, i) => {
            punto.classList.toggle('lleno', i < cantidad);
        });
        document.getElementById('contador-texto').textContent = cantidad === 0
            ? `Elige hasta ${MAX_SERVICIOS} servicios`
            : `${cantidad} de ${MAX_SERVICIOS} servicios elegidos`;
    }

    // TICKET DE RESERVA (animaciones con Web Animations API: solo transform/opacity = 60fps) \\

    const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animandoSeleccion = false;

    function esperar(animaciones) {
        return Promise.all(animaciones.map((a) => a.finished.catch(() => {})));
    }

    function escaparTexto(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    function dibujarTicket() {
        const ticket = document.getElementById('ticket-reserva');
        ticket.innerHTML = `
            <div class="ticket-cabecera">
                <p class="ticket-eyebrow">✦ Tu selección</p>
                <h3>Tu <span class="script">ticket</span> de reserva</h3>
            </div>
            <div class="ticket-perforado" aria-hidden="true"></div>
            <ul class="ticket-lista">
                ${reserva.servicios.map((s) => `
                    <li class="ticket-item" data-id="${s.id}">
                        <div class="ticket-item-info">
                            <p class="ticket-item-nombre">${escaparTexto(s.nombre)}</p>
                            <p class="ticket-item-duracion">${formatearDuracionReserva(s.duracion)}</p>
                        </div>
                        <p class="ticket-item-precio">Desde ${formatearPrecioReserva(s.precio)}</p>
                        <button type="button" class="ticket-quitar" data-id="${s.id}" aria-label="Quitar ${escaparTexto(s.nombre)}">✕</button>
                    </li>
                `).join('')}
            </ul>
            <div class="ticket-perforado" aria-hidden="true"></div>
            <div class="ticket-total">
                <div>
                    <p class="ticket-total-label">Total estimado</p>
                    <p class="ticket-total-duracion">${formatearDuracionReserva(duracionTotal())} aprox.</p>
                </div>
                <p class="ticket-total-valor">Desde ${formatearPrecioReserva(precioTotal())}</p>
            </div>
            <p class="ticket-nota">El valor final puede variar según el largo y volumen de tu cabello.</p>
            <button type="button" class="btn btn-primary ticket-continuar">Elegir fecha y hora →</button>
        `;

        ticket.querySelectorAll('.ticket-quitar').forEach((boton) => {
            boton.addEventListener('click', () => quitarDesdeTicket(boton.getAttribute('data-id')));
        });
        ticket.querySelector('.ticket-continuar').addEventListener('click', () => btnNextStep1.click());
    }

    function mostrarModoTicket(activo) {
        document.querySelector('.services-selection').hidden = activo;
        document.getElementById('category-filter').hidden = activo;
        document.getElementById('seleccion-contador').hidden = activo;
        document.getElementById('acciones-paso-1').hidden = activo;
        document.getElementById('ticket-reserva').hidden = !activo;
    }

    async function armarTicket() {
        animandoSeleccion = true;
        const grid = document.querySelector('.services-selection');
        const elegidas = reserva.servicios.map((s) => grid.querySelector(`.service-option[data-service="${s.id}"]`));
        const resto = [...grid.querySelectorAll('.service-option:not(.selected):not(.oculto-por-filtro)')];

        if (reducirMovimiento) {
            dibujarTicket();
            mostrarModoTicket(true);
            animandoSeleccion = false;
            return;
        }

        // 1. Las no elegidas se desvanecen y achican
        await esperar(resto.map((card, i) => card.animate(
            // Un solo keyframe: parte desde su estado actual (ya viene semitransparente por .disabled)
            [{ opacity: 0, transform: 'scale(0.9)' }],
            { duration: 320, delay: Math.min(i * 30, 240), easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
        )));

        // 2. Copias "fantasma" de las 3 elegidas, fijas donde están ahora
        const fantasmas = elegidas.map((card) => {
            const rect = card.getBoundingClientRect();
            const copia = card.cloneNode(true);
            copia.classList.add('ticket-fantasma');
            Object.assign(copia.style, {
                left: `${rect.left}px`, top: `${rect.top}px`,
                width: `${rect.width}px`, height: `${rect.height}px`
            });
            document.body.appendChild(copia);
            return { copia, rect };
        });

        // 3. Cambia la grilla por el ticket
        dibujarTicket();
        mostrarModoTicket(true);
        resto.forEach((card) => card.getAnimations().forEach((a) => a.cancel()));

        const ticket = document.getElementById('ticket-reserva');
        const rectTicket = ticket.getBoundingClientRect();
        const margen = 110; // alto del header fijo
        if (rectTicket.top < margen || rectTicket.top > window.innerHeight * 0.4) {
            window.scrollBy({ top: rectTicket.top - margen - 20, behavior: 'instant' });
        }

        const filas = [...ticket.querySelectorAll('.ticket-item')];
        filas.forEach((fila) => { fila.style.opacity = '0'; });

        const animaciones = [ticket.animate(
            [{ opacity: 0, transform: 'translateY(24px) scale(0.96)' }, { opacity: 1, transform: 'none' }],
            { duration: 550, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' }
        )];

        // 4. Cada fantasma vuela y se pliega hasta su fila del ticket
        fantasmas.forEach(({ copia, rect }, i) => {
            const destino = filas[i].getBoundingClientRect();
            const dx = destino.left - rect.left;
            const dy = destino.top - rect.top;
            const sx = destino.width / rect.width;
            const sy = destino.height / rect.height;
            const retraso = 80 + i * 90;

            animaciones.push(copia.animate([
                { transform: 'none', opacity: 1, borderRadius: '1rem' },
                { transform: `translate(${dx * 0.55}px, ${dy * 0.55}px) scale(${(1 + sx) / 2}, ${(1 + sy) / 2}) rotate(${i % 2 ? 2 : -2}deg)`, opacity: 1, offset: 0.55 },
                { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0, borderRadius: '0.5rem' }
            ], { duration: 720, delay: retraso, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' }));

            animaciones.push(filas[i].animate(
                [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
                { duration: 320, delay: retraso + 520, easing: 'ease-out', fill: 'forwards' }
            ));
        });

        await esperar(animaciones);
        fantasmas.forEach(({ copia }) => copia.remove());
        filas.forEach((fila) => {
            fila.style.opacity = '';
            fila.getAnimations().forEach((a) => a.cancel());
        });
        animandoSeleccion = false;
    }

    // Efecto trituradora: la fila se corta en tiras verticales que caen
    async function triturar(elemento) {
        const rect = elemento.getBoundingClientRect();
        const capa = document.createElement('div');
        capa.className = 'trituradora';
        Object.assign(capa.style, {
            left: `${rect.left}px`, top: `${rect.top}px`,
            width: `${rect.width}px`, height: `${rect.height}px`
        });

        const TIRAS = 12;
        const tiras = [];
        for (let i = 0; i < TIRAS; i++) {
            const tira = elemento.cloneNode(true);
            tira.classList.add('trituradora-tira');
            const desde = (i * 100) / TIRAS;
            const hasta = 100 - ((i + 1) * 100) / TIRAS;
            tira.style.clipPath = `inset(0 ${hasta}% 0 ${desde}%)`;
            capa.appendChild(tira);
            tiras.push(tira);
        }
        document.body.appendChild(capa);
        elemento.style.visibility = 'hidden';

        await esperar(tiras.map((tira, i) => {
            const centro = i - (TIRAS - 1) / 2;
            const separacion = (centro * 2.5).toFixed(1);             // las tiras se abren al cortarse
            const caida = rect.height + 160 + Math.random() * 120;
            const giro = (centro * 1.6 + (Math.random() * 10 - 5)).toFixed(1);
            const deriva = (centro * 7 + (Math.random() * 12 - 6)).toFixed(1);
            return tira.animate([
                { transform: 'none', opacity: 1 },
                // 1. Corte: baja un poco y las tiras se separan
                { transform: `translate(${separacion}px, ${rect.height * 0.18}px)`, opacity: 1, offset: 0.28 },
                // 2. Caída: cada tira cae girando y abriéndose como abanico
                { transform: `translate(${deriva}px, ${caida}px) rotate(${giro}deg)`, opacity: 0 }
            ], { duration: 950, delay: Math.abs(centro) * 18 + Math.random() * 30, easing: 'cubic-bezier(0.55, 0, 0.8, 0.35)', fill: 'forwards' });
        }));
        capa.remove();
    }

    async function quitarDesdeTicket(id) {
        if (animandoSeleccion) return;
        animandoSeleccion = true;

        const ticket = document.getElementById('ticket-reserva');
        const fila = ticket.querySelector(`.ticket-item[data-id="${id}"]`);
        const card = document.querySelector(`.service-option[data-service="${id}"]`);

        reserva.servicios = reserva.servicios.filter((s) => s.id !== id);
        if (card) card.classList.remove('selected');
        actualizarEstadoSeleccion();

        if (reducirMovimiento) {
            mostrarModoTicket(false);
            animandoSeleccion = false;
            return;
        }

        // 1. La fila se tritura
        if (fila) await triturar(fila);

        // 2. El ticket se desarma
        await esperar([ticket.animate(
            [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(12px) scale(0.97)' }],
            { duration: 300, easing: 'cubic-bezier(0.4, 0, 1, 1)', fill: 'forwards' }
        )]);
        mostrarModoTicket(false);
        ticket.getAnimations().forEach((a) => a.cancel());

        // 3. La grilla vuelve en cascada (se puede elegir apenas aparece, sin esperar a que termine)
        const visibles = [...document.querySelectorAll('.service-option:not(.oculto-por-filtro)')];
        visibles.forEach((c, i) => {
            const final = c.classList.contains('selected') ? 'translateY(-4px)' : 'none';
            c.animate(
                [{ opacity: 0, transform: 'translateY(16px) scale(0.96)' }, { opacity: 1, transform: final }],
                { duration: 450, delay: Math.min(i * 45, 540), easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'backwards' }
            );
        });
        animandoSeleccion = false;
    }

    // Filtro por categoría: solo oculta/muestra tarjetas, no toca la selección.
    const CATEGORIAS = [
        { valor: 'todos', etiqueta: 'Todos' },
        { valor: 'peluqueria', etiqueta: 'Peluquería' },
        { valor: 'manicure', etiqueta: 'Manicure' }
    ];

    function renderFiltroCategorias() {
        const contenedor = document.getElementById('category-filter');
        if (!contenedor) return;

        contenedor.innerHTML = CATEGORIAS.map((c, i) => `
            <button type="button" class="category-chip${i === 0 ? ' active' : ''}" data-categoria="${c.valor}">${c.etiqueta}</button>
        `).join('');

        contenedor.querySelectorAll('.category-chip').forEach((chip) => {
            chip.addEventListener('click', () => {
                contenedor.querySelectorAll('.category-chip').forEach((c) => c.classList.remove('active'));
                chip.classList.add('active');
                aplicarFiltroCategoria(chip.getAttribute('data-categoria'));
            });
        });
    }

    function aplicarFiltroCategoria(categoria) {
        document.querySelectorAll('.service-option').forEach((option) => {
            const coincide = categoria === 'todos' || option.getAttribute('data-categoria') === categoria;
            option.classList.toggle('oculto-por-filtro', !coincide);
        });
    }

    // Trae los servicios del backend, los dibuja y luego conecta los clics
    async function cargarServiciosReserva() {
        const contenedor = document.querySelector('.services-selection');
        if (!contenedor) return;

        try {
            const respuesta = await fetch(API_URL + '/servicios');
            const datos = await respuesta.json();
            const servicios = datos.servicios || [];

            contenedor.innerHTML = servicios.map((s) => `
                <article class="service-option" data-service="${s.id}" data-duration="${s.duracion}" data-price="${s.precio}" data-categoria="${s.categoria}">
                    <h3>${s.nombre}</h3>
                    <p>${s.descripcion || ''}</p>
                    <p class="service-meta"><span class="price">Desde ${formatearPrecioReserva(s.precio)}</span> <span class="duration">· ${formatearDuracionReserva(s.duracion)}</span></p>
                </article>
            `).join('');

            conectarOpcionesServicio();
            renderFiltroCategorias();

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

    document.getElementById('next-to-step-2')?.addEventListener('click', async () => {
        await cargarHorarios();
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
            const horasDia = HORARIOS[diaSemana] || [];
            const fechaTexto = `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
            const bloqueado = BLOQUEOS.includes(fechaTexto);

            if (fechaDia < hoy || horasDia.length === 0 || bloqueado) {
                cell.classList.add('disabled'); 
            }    else {
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

        const horariosOcupados = await obtenerHorariosOcupados(fecha);
        renderHorarios(fecha, horariosOcupados);
        actualizarSidebar();
    }

    async function obtenerHorariosOcupados(fecha) {
        try {
            const año = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');
            const fechaTexto = `${año}-${mes}-${dia}`;

            const url = `${API_URL}/reservas/disponibilidad?fecha=${fechaTexto}`;
            const respuesta = await fetch(url);

            if (!respuesta.ok) {
                console.error('Error al consultar disponibilidad');
                return [];
            }

            const datos = await respuesta.json();
            return datos.ocupados || [];

        } catch (error) {
            console.error('Error de red al consultar disponibilidad:', error);
            return [];
        }
    }

    function renderHorarios(fecha, horariosOcupados = []) {
        const slotsContainer = document.getElementById('time-slots');
        const helpText = document.querySelector('.slots-help');

        const diaSemana = fecha.getDay();
        const horasDelDia = HORARIOS[diaSemana] || [];

        slotsContainer.innerHTML = '';

        if (horasDelDia.length === 0) {
            helpText.textContent = 'Este día no atendemos.';
            return;
        }

        const ocupados = horariosOcupados.map((evento) => ({
            inicio: new Date(evento.inicio),
            fin: new Date(evento.fin)
        }));

        const duracionBloque = Math.max(duracionTotal(), 120);

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
        const nombres = reserva.servicios.map((s) => s.nombre).join(', ');
        document.getElementById('sidebar-service').textContent = nombres || 'Por elegir';
        document.getElementById('sidebar-duration').textContent = reserva.servicios.length
            ? formatearDuracionReserva(duracionTotal())
            : '—';
        document.getElementById('sidebar-date').textContent = reserva.fecha
            ? reserva.fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
            : 'Por elegir';
        document.getElementById('sidebar-time').textContent = reserva.hora || 'Por elegir';
        // El precio final depende del largo del cabello, por eso siempre es "Desde"
        document.getElementById('sidebar-total').textContent = reserva.servicios.length
            ? 'Desde ' + formatearPrecioReserva(precioTotal())
            : '$0';
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
        const duracionBloque = Math.max(duracionTotal(), 120);
        fechaFin.setMinutes(fechaFin.getMinutes() + duracionBloque);

        const datosReserva = {
            cliente: document.getElementById('client-name').value,
            telefono: document.getElementById('client-phone').value,
            email: document.getElementById('client-email').value,
            servicios: reserva.servicios.map((s) => s.nombre),
            notas: document.getElementById('client-notes').value,
            inicio: fechaInicio.toISOString(),
            fin: fechaFin.toISOString(),
            website: document.getElementById('client-website').value
        };

        try {
            const respuesta = await fetch(API_URL + '/pagos/iniciar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(datosReserva)
            });

            const resultado = await respuesta.json();

            if (!respuesta.ok) {
                throw new Error(resultado.error || 'Hubo un problema al iniciar el pago. Intenta de nuevo o contáctanos por WhatsApp.');
            }

            // Redirige al cliente a la página de pago de SumUp
            window.location.href = resultado.url_pago;

        } catch (error) {
            console.error('Error al iniciar el pago:', error);
            alert(error.message);

            boton.disabled = false;
            boton.textContent = 'Pagar abono y reservar';
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
        }, 3000);
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
        setTimeout(() => { pausado = false; }, 3000);
    });

    // Iniciar todo
    iniciarAutoScroll();
}

// CARGAR RESEÑAS APROBADAS EN EL HOME \\

async function cargarResenas() {
    const grid = document.getElementById('resenas-grid');
    if (!grid) return; // No estamos en el home

    try {
        const respuesta = await fetch(API_URL + '/resenas');
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

const API_PRODUCTOS = API_URL + '/productos';

// El precio ahora viene como número desde el backend, así que lo formateamos
function formatearPrecioProducto(precio) {
    return '$' + Number(precio).toLocaleString('es-CL');
}

// Genera el HTML de una tarjeta de producto
function crearTarjetaProducto(producto) {
    const marca = (producto.marca || '').trim();
    return `
        <article class="product-card" data-category="${marca}">
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

// Genera los botones de filtro de marca según las marcas que existan en los productos.
// Se agrupa por el nombre real de la marca (no por "categoria") para que dos productos
// de la misma marca nunca generen dos botones de filtro distintos.
function generarFiltrosMarca(productos) {
    const contenedor = document.getElementById('shop-filters');
    if (!contenedor) return;

    // Quita los botones de marca generados antes, dejando el botón "Todos"
    contenedor.querySelectorAll('.filter-btn:not([data-filter="all"])').forEach((btn) => btn.remove());

    const marcasVistas = new Set();
    productos.forEach((p) => {
        const marca = (p.marca || '').trim();
        if (marca) marcasVistas.add(marca);
    });

    marcasVistas.forEach((marca) => {
        const boton = document.createElement('button');
        boton.className = 'filter-btn';
        boton.setAttribute('data-filter', marca);
        boton.textContent = marca;
        contenedor.appendChild(boton);
    });
}

// Llena la tienda con TODOS los productos (desde el backend)
async function cargarTiendaCompleta() {
    const grid = document.getElementById('shop-grid');
    if (!grid) return; // No estamos en la tienda

    try {
        const respuesta = await fetch(API_PRODUCTOS);
        const datos = await respuesta.json();
        const productos = datos.productos || [];

        generarFiltrosMarca(productos);
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
        const respuesta = await fetch(API_URL + '/servicios');
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

// SCROLL SUAVE A SECCIONES INTERNAS (ajustando por el header) \\
(function () {
    const header = document.querySelector('header');

    document.querySelectorAll('a[href*="#"]').forEach((link) => {
        const href = link.getAttribute('href');
        const esAncla = href && (href.startsWith('#') || href.includes('index.html#'));
        if (!esAncla) return;

        link.addEventListener('click', (e) => {
            const id = href.split('#')[1];
            const destino = document.getElementById(id);
            if (!destino) return; // el ancla no está en esta página: navegar normal

            e.preventDefault();
            const offset = (header ? header.offsetHeight : 80) + 16;
            const y = destino.getBoundingClientRect().top + window.scrollY - offset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        });
    });
})();