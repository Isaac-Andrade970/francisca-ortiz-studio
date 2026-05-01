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

// FILTROS TIENDA \\

const filterButtons = document.querySelectorAll('.filter-btn');
const productCards = document.querySelectorAll('.product-card');

filterButtons.forEach((button) => {
        button.addEventListener('click', () =>{
        const filter = button.getAttribute('data-filter');

        filterButtons.forEach((btn) => btn.classList.remove('active'));
        button.classList.add('active');

        productCards.forEach((card) => {
            const category = card.getAttribute('data-category');

            if (filter === 'all' || category === filter) {
            card.classList.remove('hidden');
            } else{
                card.classList.add('hidden');
            }
        });
    });
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
        2: { inicio: 9, fin: 17 },
        3: { inicio: 9, fin: 17 },
        4: { inicio: 9, fin: 17 },
        5: { inicio: 9, fin: 17 },
        6: { inicio: 9.5, fin: 15 }
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

    function seleccionarDia(fecha, celda) {
        document.querySelectorAll('.calendar-day').forEach((d) => d.classList.remove('selected'));
        celda.classList.add('selected');

        reserva.fecha = fecha;
        renderHorarios(fecha);
        actualizarSidebar();
    }

    function renderHorarios(fecha) {
        const slotsContainer = document.getElementById('time-slots');
        const helpText = document.querySelector('.slots-help');

        const diaSemana = fecha.getDay();
        const horario = HORARIOS[diaSemana];

        slotsContainer.innerHTML = '';

        if (!horario) {
            helpText.textContent = 'Este día no atendemos.';
            return;
        }

        helpText.textContent = `Horarios disponibles para ${fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })}.`;

        for (let h = horario.inicio; h < horario.fin; h += 0.5) {
            const horaTermino = h + (reserva.duracion / 60);
            if (horaTermino > horario.fin) break;

            const horas = Math.floor(h);
            const minutos = (h % 1) * 60;
            const horaTexto = `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;

            const slot = document.createElement('div');
            slot.classList.add('time-slot');
            slot.textContent = horaTexto;

            slot.addEventListener('click', () => seleccionarHora(horaTexto, slot));

            slotsContainer.appendChild(slot);
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

    
    document.getElementById('confirm-booking')?.addEventListener('click', () => {
        const form = document.getElementById('booking-form');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        
        document.getElementById('summary-service').textContent = reserva.servicioNombre;
        document.getElementById('summary-date').textContent = reserva.fecha.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
        document.getElementById('summary-time').textContent = reserva.hora;
        document.getElementById('summary-name').textContent = document.getElementById('client-name').value;

        irAPaso(4);
    });

}
