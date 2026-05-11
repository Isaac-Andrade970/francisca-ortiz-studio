// PÁGINA REAGENDAR \\

const API_URL = 'http://localhost:3000/api/reagendar';

// Horarios fijos (igual que en reservar.js)
const HORARIOS = {
    0: null,
    1: null,
    2: ['09:00', '11:00', '14:00', '16:00', '18:00'],
    3: ['09:00', '11:00', '14:00', '16:00'],
    4: ['09:00', '11:00', '14:00', '16:00', '18:00'],
    5: ['09:00', '11:00', '14:00', '16:00'],
    6: ['09:00', '11:00', '15:00']
};

// Estado
let datosReserva = null;
let mesActual = new Date();
mesActual.setDate(1);
let fechaSeleccionada = null;
let horaSeleccionada = null;

// UTILIDADES \\

function obtenerToken() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
}

function mostrarEstado(estadoId) {
    document.querySelectorAll('.reagendar-state').forEach((el) => {
        el.style.display = 'none';
    });
    document.getElementById(estadoId).style.display = 'block';
}

function formatearFecha(fecha) {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    return d.toLocaleDateString('es-CL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function formatearHora(fecha) {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    return d.toLocaleTimeString('es-CL', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// VERIFICAR TOKEN \\

async function verificar() {
    const token = obtenerToken();
    if (!token) {
        mostrarEstado('estado-error');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/verificar?token=${token}`);
        if (!respuesta.ok) {
            mostrarEstado('estado-error');
            return;
        }

        datosReserva = await respuesta.json();

        if (!datosReserva.puedeReagendar) {
            document.getElementById('motivo-no-puede').textContent = datosReserva.motivoNoPuede;
            mostrarEstado('estado-no-puede');
            return;
        }

        // Mostrar formulario
        document.getElementById('cliente-nombre').textContent = datosReserva.cliente;
        document.getElementById('servicio-nombre').textContent = datosReserva.servicio;
        document.getElementById('fecha-actual').textContent = 
            `${formatearFecha(datosReserva.fechaActual)} a las ${formatearHora(datosReserva.fechaActual)}`;
        
        mostrarEstado('estado-formulario');
        renderCalendario();

    } catch (error) {
        console.error('Error al verificar:', error);
        mostrarEstado('estado-error');
    }
}

// CALENDARIO \\

function renderCalendario() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('calendar-month');

    const mes = mesActual.getMonth();
    const año = mesActual.getFullYear();
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
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

    // Mínimo 48h de anticipación
    const minFecha = new Date();
    minFecha.setHours(minFecha.getHours() + 48);
    minFecha.setHours(0, 0, 0, 0);

    for (let dia = 1; dia <= diasEnMes; dia++) {
        const cell = document.createElement('div');
        cell.classList.add('calendar-day');
        cell.textContent = dia;

        const fechaDia = new Date(año, mes, dia);
        const diaSemana = fechaDia.getDay();

        if (fechaDia.getTime() === hoy.getTime()) {
            cell.classList.add('today');
        }

        if (fechaDia < minFecha || HORARIOS[diaSemana] === null) {
            cell.classList.add('disabled');
        } else {
            cell.classList.add('has-availability');
            cell.addEventListener('click', () => seleccionarDia(fechaDia, cell));
        }

        grid.appendChild(cell);
    }
}

document.getElementById('prev-month').addEventListener('click', () => {
    mesActual.setMonth(mesActual.getMonth() - 1);
    renderCalendario();
});

document.getElementById('next-month').addEventListener('click', () => {
    mesActual.setMonth(mesActual.getMonth() + 1);
    renderCalendario();
});

// SELECCIÓN DE DÍA \\

async function seleccionarDia(fecha, celda) {
    document.querySelectorAll('.calendar-day').forEach((d) => d.classList.remove('selected'));
    celda.classList.add('selected');
    fechaSeleccionada = fecha;
    horaSeleccionada = null;

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
        const token = obtenerToken();

        const respuesta = await fetch(`${API_URL}/disponibilidad?fecha=${fechaTexto}&token=${token}`);
        if (!respuesta.ok) return [];
        const datos = await respuesta.json();
        return datos.ocupados || [];
    } catch (error) {
        console.error('Error:', error);
        return [];
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

    const duracionBloque = Math.max(datosReserva.duracionServicio, 120);
    let slotsCreados = 0;

    horasDelDia.forEach((horaTexto) => {
        const [horas, minutos] = horaTexto.split(':').map(Number);
        const inicioSlot = new Date(fecha);
        inicioSlot.setHours(horas, minutos, 0, 0);
        const finSlot = new Date(inicioSlot);
        finSlot.setMinutes(finSlot.getMinutes() + duracionBloque);

        const ocupado = ocupados.some((evento) =>
            inicioSlot < evento.fin && finSlot > evento.inicio
        );

        const slot = document.createElement('div');
        slot.classList.add('time-slot');
        slot.textContent = horaTexto;

        if (ocupado) {
            slot.classList.add('disabled');
        } else {
            slot.addEventListener('click', () => seleccionarHora(horaTexto, slot));
        }

        slotsContainer.appendChild(slot);
        slotsCreados++;
    });

    if (slotsCreados === 0) {
        helpText.textContent = 'No hay horarios disponibles este día.';
    } else {
        helpText.textContent = `Horarios disponibles.`;
    }
}

function seleccionarHora(hora, celda) {
    document.querySelectorAll('.time-slot').forEach((s) => s.classList.remove('selected'));
    celda.classList.add('selected');
    horaSeleccionada = hora;
    actualizarSidebar();
}

function actualizarSidebar() {
    document.getElementById('sidebar-date').textContent = fechaSeleccionada
        ? fechaSeleccionada.toLocaleDateString('es-CL', { day: 'numeric', month: 'long' })
        : 'Por elegir';
    document.getElementById('sidebar-time').textContent = horaSeleccionada || 'Por elegir';

    const boton = document.getElementById('confirmar-reagendamiento');
    boton.disabled = !(fechaSeleccionada && horaSeleccionada);
}

// CONFIRMAR REAGENDAMIENTO \\

document.getElementById('confirmar-reagendamiento').addEventListener('click', async () => {
    if (!fechaSeleccionada || !horaSeleccionada) return;
    if (!confirm('¿Confirmar el reagendamiento? Recuerda que solo puedes reagendar 1 vez.')) return;

    const boton = document.getElementById('confirmar-reagendamiento');
    boton.disabled = true;
    boton.textContent = 'Procesando...';

    const [horas, minutos] = horaSeleccionada.split(':').map(Number);
    const fechaInicio = new Date(fechaSeleccionada);
    fechaInicio.setHours(horas, minutos, 0, 0);

    const duracionBloque = Math.max(datosReserva.duracionServicio, 120);
    const fechaFin = new Date(fechaInicio);
    fechaFin.setMinutes(fechaFin.getMinutes() + duracionBloque);

    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: obtenerToken(),
                nuevaFechaInicio: fechaInicio.toISOString(),
                nuevaFechaFin: fechaFin.toISOString()
            })
        });

        const resultado = await respuesta.json();
        if (!respuesta.ok) throw new Error(resultado.error || 'Error');

        document.getElementById('exito-fecha').textContent = formatearFecha(fechaInicio);
        document.getElementById('exito-hora').textContent = formatearHora(fechaInicio);
        mostrarEstado('estado-exito');

    } catch (error) {
        console.error('Error al reagendar:', error);
        alert('No se pudo reagendar: ' + error.message);
        boton.disabled = false;
        boton.textContent = 'Confirmar reagendamiento';
    }
});

// ===== INICIO =====
verificar();