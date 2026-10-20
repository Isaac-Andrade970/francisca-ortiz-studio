// PANEL ADMIN UNIFICADO \\

const API_RESENAS = API_URL + '/resenas';
const API_SERVICIOS = API_URL + '/servicios';
const API_PRODUCTOS = API_URL + '/productos';
const API_PROMOCIONES = API_URL + '/promociones';
const API_RESENAS_GOOGLE = API_URL + '/resenas-google';
const CLOUDINARY_CLOUD_NAME = 'dgq8ohuko';        // 👈 tu cloud name
const CLOUDINARY_UPLOAD_PRESET = 's2a10wum';  // 👈 el nombre de tu preset (unsigned)
const API_AUTH = API_URL + '/auth';

// Sesión: token y rol guardados en sessionStorage
let tokenSesion = sessionStorage.getItem('adminToken') || null;
let rolSesion = sessionStorage.getItem('adminRol') || null;

let serviciosCargados = false; // para cargar servicios solo la 1ra vez que se abre la pestaña
let serviciosActuales = []; // guardamos la lista para poder editar
let productosCargados = false;
let productosActuales = [];
let horariosCargados = false;
let promocionesCargadas = false;
let promocionesActuales = [];
let resenasGoogleActuales = [];
let clientesCargados = false;
let clientesActuales = [];
let clientaAbiertaEmail = null;

// LOGIN \\

function mostrarPanel() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-content').style.display = 'block';
    if (rolSesion === 'superadmin') {
        const sec = document.getElementById('superadmin-password');
        if (sec) sec.style.display = 'block';
    }
}

async function hacerLogin() {
    const password = document.getElementById('login-password').value;
    const errorMsg = document.getElementById('login-error');
    const boton = document.getElementById('login-btn');

    if (!password) {
        errorMsg.textContent = 'Escribe la contraseña';
        errorMsg.style.display = 'block';
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Verificando...';
    errorMsg.style.display = 'none';

    try {
        const respuesta = await fetch(`${API_AUTH}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            errorMsg.textContent = datos.error || 'Contraseña incorrecta';
            errorMsg.style.display = 'block';
            boton.disabled = false;
            boton.textContent = 'Ingresar al panel';
            return;
        }

        // Guardamos token Y rol (el rol lo usaremos en la Parte B para el superadmin)
        tokenSesion = datos.token;
        rolSesion = datos.rol;
        sessionStorage.setItem('adminToken', tokenSesion);
        sessionStorage.setItem('adminRol', rolSesion);

        mostrarPanel();
        cargarResenasGoogle();
        cargarPendientes();
        cargarPublicadas();

    } catch (error) {
        console.error('Error de login:', error);
        errorMsg.textContent = 'Error de conexión con el servidor';
        errorMsg.style.display = 'block';
        boton.disabled = false;
        boton.textContent = 'Ingresar al panel';
    }
}

// CAMBIAR CONTRASEÑA DE FRANCISCA (solo superadmin) \\
async function cambiarPasswordFrancisca() {
    const input = document.getElementById('nueva-password-admin');
    const msg = document.getElementById('password-msg');
    const boton = document.getElementById('btn-cambiar-password');
    const nueva = input.value.trim();

    if (nueva.length < 6) {
        msg.textContent = 'La contraseña debe tener al menos 6 caracteres';
        msg.style.color = '#b00020';
        msg.style.display = 'block';
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando...';
    msg.style.display = 'none';

    try {
        const respuesta = await fetch(`${API_AUTH}/cambiar-password-admin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenSesion}`
            },
            body: JSON.stringify({ nuevaPassword: nueva })
        });
        const datos = await respuesta.json();

        if (!respuesta.ok) {
            msg.textContent = datos.error || 'No se pudo cambiar la contraseña';
            msg.style.color = '#b00020';
        } else {
            msg.textContent = '✅ Listo. Francisca ya puede entrar con la nueva contraseña.';
            msg.style.color = 'green';
            input.value = '';
        }
        msg.style.display = 'block';
    } catch (e) {
        console.error('Error:', e);
        msg.textContent = 'Error de conexión con el servidor';
        msg.style.color = '#b00020';
        msg.style.display = 'block';
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar nueva contraseña';
    }
}

// HORARIOS \\

const DIAS_SEMANA = [
    { num: 1, nombre: 'Lunes' },
    { num: 2, nombre: 'Martes' },
    { num: 3, nombre: 'Miércoles' },
    { num: 4, nombre: 'Jueves' },
    { num: 5, nombre: 'Viernes' },
    { num: 6, nombre: 'Sábado' },
    { num: 0, nombre: 'Domingo' }
];

async function cargarHorariosAdmin() {
    const cont = document.getElementById('horarios-editor');
    try {
        const res = await fetch(`${API_URL}/horarios`);
        const data = await res.json();
        const semana = data.semana || {};

        cont.innerHTML = '';
        DIAS_SEMANA.forEach(dia => {
            const horas = semana[dia.num] || [];
            const abierto = horas.length > 0;
            const fila = document.createElement('div');
            fila.classList.add('horario-fila');
            fila.innerHTML = `
                <label class="horario-dia">
                    <input type="checkbox" class="horario-check" data-dia="${dia.num}" ${abierto ? 'checked' : ''}>
                    <span>${dia.nombre}</span>
                </label>
                <input type="text" class="horario-horas" data-dia="${dia.num}" value="${horas.join(', ')}" placeholder="09:00, 11:00, 14:00">
            `;
            cont.appendChild(fila);
        });

        document.getElementById('atencion-editor').value = (data.atencion || []).join('\n');
    } catch (e) {
        console.error('Error al cargar horarios:', e);
        cont.innerHTML = '<p style="color:#b00020;">No se pudieron cargar los horarios.</p>';
    }
}

async function guardarHorariosAdmin() {
    const msg = document.getElementById('horarios-msg');
    const boton = document.getElementById('btn-guardar-horarios');
    const semana = {};
    let error = null;

    DIAS_SEMANA.forEach(dia => {
        const check = document.querySelector(`.horario-check[data-dia="${dia.num}"]`);
        const input = document.querySelector(`.horario-horas[data-dia="${dia.num}"]`);

        if (!check.checked) {
            semana[dia.num] = [];
            return;
        }
        const horas = input.value.split(',').map(h => h.trim()).filter(h => h.length > 0);
        for (const h of horas) {
            if (!/^\d{1,2}:\d{2}$/.test(h)) {
                error = `Hora inválida en ${dia.nombre}: "${h}". Usa el formato HH:MM (ej: 09:00).`;
            }
        }
        semana[dia.num] = horas;
    });

    if (error) {
        msg.textContent = error;
        msg.style.color = '#b00020';
        msg.style.display = 'block';
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando...';
    msg.style.display = 'none';

    try {
        const res = await fetch(`${API_URL}/horarios`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenSesion}`
            },
            body: JSON.stringify({ semana })
        });
        const data = await res.json();
        if (!res.ok) {
            msg.textContent = data.error || 'No se pudo guardar';
            msg.style.color = '#b00020';
        } else {
            msg.textContent = '✅ Horarios guardados. Ya están activos en la página de reservas.';
            msg.style.color = 'green';
        }
        msg.style.display = 'block';
    } catch (e) {
        console.error('Error:', e);
        msg.textContent = 'Error de conexión';
        msg.style.color = '#b00020';
        msg.style.display = 'block';
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar horarios';
    }
}

// Texto del horario que sale en el pie de todas las páginas
async function guardarAtencionAdmin() {
    const msg = document.getElementById('atencion-msg');
    const boton = document.getElementById('btn-guardar-atencion');
    const lineas = document.getElementById('atencion-editor').value
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0);

    if (lineas.length === 0) {
        msg.textContent = 'Escribe al menos una línea de horario';
        msg.style.color = '#b00020';
        msg.style.display = 'block';
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando...';
    msg.style.display = 'none';

    try {
        const res = await fetch(`${API_URL}/horarios/atencion`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenSesion}`
            },
            body: JSON.stringify({ atencion: lineas })
        });
        const data = await res.json();
        if (!res.ok) {
            msg.textContent = data.error || 'No se pudo guardar';
            msg.style.color = '#b00020';
        } else {
            msg.textContent = '✅ Horario de atención guardado. Ya se ve en todas las páginas.';
            msg.style.color = 'green';
        }
        msg.style.display = 'block';
    } catch (e) {
        console.error('Error:', e);
        msg.textContent = 'Error de conexión';
        msg.style.color = '#b00020';
        msg.style.display = 'block';
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar horario de atención';
    }
}

// PESTAÑAS \\

function cambiarTab(nombre) {
    document.querySelectorAll('.admin-tab').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === nombre);
    });
    document.querySelectorAll('.admin-tab-content').forEach(c => {
        c.classList.toggle('active', c.id === `tab-${nombre}`);
    });

    // La primera vez que se abre Servicios, cargamos la lista
    if (nombre === 'servicios' && !serviciosCargados) {
        cargarServicios();
        serviciosCargados = true;
    }

    if (nombre === 'productos' && !productosCargados) {
        cargarProductos();
        productosCargados = true;
    }

    if (nombre === 'promociones' && !promocionesCargadas) {
        cargarPromociones();
        promocionesCargadas = true;
    }

    if (nombre === 'horarios' && !horariosCargados) {
        cargarHorariosAdmin();
        horariosCargados = true;
    }

    if (nombre === 'clientas' && !clientesCargados) {
        cargarClientes();
        clientesCargados = true;
    }
}

// RESEÑAS (migrado de admin-resenas.js) \\

function generarEstrellas(calificacion) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += i <= calificacion ? '★' : '<span class="empty">★</span>';
    }
    return html;
}

function formatearFecha(fecha) {
    if (!fecha) return 'Fecha desconocida';
    let dateObj = fecha._seconds ? new Date(fecha._seconds * 1000) : new Date(fecha);
    return dateObj.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function crearCardResena(resena, esPublicada = false) {
    const card = document.createElement('div');
    card.classList.add('resena-card');
    if (esPublicada) card.classList.add('resena-publicada');

    card.innerHTML = `
        <div class="resena-card-header">
            <div>
                <p class="resena-cliente">${resena.cliente}</p>
                <p class="resena-servicio">${resena.servicio}</p>
            </div>
            <div class="resena-stars">${generarEstrellas(resena.calificacion)}</div>
        </div>
        <p class="resena-comentario">"${resena.comentario}"</p>
        <p class="resena-fecha">Recibida el ${formatearFecha(resena.fechaCreacion)}</p>
        ${!esPublicada ? `
            <div class="resena-actions">
                <button class="btn-aprobar" data-id="${resena.id}">✓ Aprobar y publicar</button>
                <button class="btn-rechazar" data-id="${resena.id}">✗ Rechazar</button>
            </div>` : `
            <div class="resena-actions">
                <button class="btn-eliminar" data-id="${resena.id}">Eliminar reseña</button>
            </div>`}
    `;
    return card;
}

async function cargarPendientes() {
    const lista = document.getElementById('lista-pendientes');
    const loading = document.getElementById('loading-pendientes');
    const empty = document.getElementById('empty-pendientes');
    const count = document.getElementById('count-pendientes');

    try {
        const respuesta = await fetch(`${API_RESENAS}/admin/pendientes`, {
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        const datos = await respuesta.json();

        loading.style.display = 'none';
        lista.innerHTML = '';

        if (datos.resenas.length === 0) {
            empty.style.display = 'block';
            count.textContent = '0';
            return;
        }

        empty.style.display = 'none';
        count.textContent = datos.resenas.length;

        datos.resenas.forEach(resena => lista.appendChild(crearCardResena(resena, false)));

        document.querySelectorAll('.btn-aprobar').forEach(b => {
            b.addEventListener('click', () => aprobarResena(b.getAttribute('data-id')));
        });
        document.querySelectorAll('.btn-rechazar').forEach(b => {
            b.addEventListener('click', () => rechazarResena(b.getAttribute('data-id')));
        });

    } catch (error) {
        console.error('Error al cargar pendientes:', error);
        loading.textContent = 'Error al cargar reseñas';
    }
}

async function cargarPublicadas() {
    const lista = document.getElementById('lista-publicadas');
    const loading = document.getElementById('loading-publicadas');
    const empty = document.getElementById('empty-publicadas');
    const count = document.getElementById('count-publicadas');

    try {
        const respuesta = await fetch(API_RESENAS);
        const datos = await respuesta.json();

        loading.style.display = 'none';
        lista.innerHTML = '';

        if (datos.resenas.length === 0) {
            empty.style.display = 'block';
            count.textContent = '0';
            return;
        }

        empty.style.display = 'none';
        count.textContent = datos.resenas.length;

        datos.resenas.forEach(resena => lista.appendChild(crearCardResena(resena, true)));

        document.querySelectorAll('#lista-publicadas .btn-eliminar').forEach(b => {
            b.addEventListener('click', () => eliminarResenaPublicada(b.getAttribute('data-id')));
        });

    } catch (error) {
        console.error('Error al cargar publicadas:', error);
        loading.textContent = 'Error al cargar reseñas';
    }
}

async function aprobarResena(id) {
    if (!confirm('¿Aprobar esta reseña? Aparecerá en el sitio público.')) return;
    try {
        const respuesta = await fetch(`${API_RESENAS}/admin/${id}/aprobar`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        if (!respuesta.ok) throw new Error('Error al aprobar');
        cargarPendientes();
        cargarPublicadas();
    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un problema al aprobar la reseña');
    }
}

async function rechazarResena(id) {
    if (!confirm('¿Rechazar esta reseña? Se eliminará permanentemente.')) return;
    try {
        const respuesta = await fetch(`${API_RESENAS}/admin/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        if (!respuesta.ok) throw new Error('Error al rechazar');
        cargarPendientes();
    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un problema al rechazar la reseña');
    }
}

async function eliminarResenaPublicada(id) {
    if (!confirm('¿Eliminar esta reseña publicada? Desaparecerá del sitio web permanentemente.')) return;
    try {
        const respuesta = await fetch(`${API_RESENAS}/admin/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        if (!respuesta.ok) throw new Error('Error al eliminar');
        cargarPublicadas();
    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un problema al eliminar la reseña');
    }
}

// SERVICIOS (lista, solo lectura por ahora) \\

function formatearPrecio(precio) {
    return '$' + Number(precio).toLocaleString('es-CL');
}

function formatearDuracion(min) {
    if (min < 60) return `${min} min`;
    const horas = min / 60;
    return Number.isInteger(horas) ? `${horas} h` : `${horas.toFixed(1)} h`;
}

function crearCardServicio(servicio) {
    const card = document.createElement('div');
    card.classList.add('servicio-card');
    if (!servicio.activo) card.classList.add('servicio-inactivo');

    // El botón de borrado permanente SOLO se arma si el rol es superadmin
    const botonEliminar = rolSesion === 'superadmin'
        ? `<button class="btn-eliminar-servicio" data-id="${servicio.id}">Eliminar</button>`
        : '';

    card.innerHTML = `
        <div class="servicio-titulo">
            <h3>${servicio.nombre}</h3>
            <span class="servicio-categoria">${servicio.categoria}</span>
            ${!servicio.activo ? '<span class="servicio-badge-off">Desactivado</span>' : ''}
        </div>
        <p class="servicio-desc">${servicio.descripcion || ''}</p>
        <p class="servicio-meta">${formatearPrecio(servicio.precio)} · ${formatearDuracion(servicio.duracion)}</p>
        <div class="servicio-acciones">
            <button class="btn-editar-servicio" data-id="${servicio.id}">Editar</button>
            <button class="btn-toggle-servicio" data-id="${servicio.id}" data-activo="${servicio.activo}">
                ${servicio.activo ? 'Desactivar' : 'Activar'}
            </button>
            ${botonEliminar}
        </div>
    `;
    return card;
}

async function cargarServicios() {
    const lista = document.getElementById('lista-servicios');
    const loading = document.getElementById('loading-servicios');
    const empty = document.getElementById('empty-servicios');
    const count = document.getElementById('count-servicios');

    loading.style.display = 'block';

    try {
        const respuesta = await fetch(`${API_SERVICIOS}/admin/todos`, {
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        const datos = await respuesta.json();

        loading.style.display = 'none';
        lista.innerHTML = '';

        serviciosActuales = datos.servicios || [];

        if (serviciosActuales.length === 0) {
            empty.style.display = 'block';
            count.textContent = '0';
            return;
        }

        empty.style.display = 'none';
        count.textContent = serviciosActuales.length;

        serviciosActuales.forEach(servicio => lista.appendChild(crearCardServicio(servicio)));

        // Conectar los botones de cada tarjeta
        document.querySelectorAll('.btn-editar-servicio').forEach(b => {
            b.addEventListener('click', () => {
                const servicio = serviciosActuales.find(s => s.id === b.getAttribute('data-id'));
                abrirFormServicio(servicio);
            });
        });
        document.querySelectorAll('.btn-toggle-servicio').forEach(b => {
            b.addEventListener('click', () => {
                const nuevoEstado = b.getAttribute('data-activo') !== 'true';
                cambiarEstadoServicio(b.getAttribute('data-id'), nuevoEstado);
            });
        });
        document.querySelectorAll('.btn-eliminar-servicio').forEach(b => {
            b.addEventListener('click', () => eliminarServicioPermanente(b.getAttribute('data-id')));
        });

    } catch (error) {
        console.error('Error al cargar servicios:', error);
        loading.textContent = 'Error al cargar servicios';
    }
}

function abrirFormServicio(servicio = null) {
    const error = document.getElementById('modal-servicio-error');
    error.style.display = 'none';

    if (servicio) {
        document.getElementById('modal-servicio-titulo').textContent = 'Editar servicio';
        document.getElementById('servicio-id').value = servicio.id;
        document.getElementById('servicio-nombre').value = servicio.nombre;
        document.getElementById('servicio-categoria').value = servicio.categoria;
        document.getElementById('servicio-orden').value = servicio.orden;
        document.getElementById('servicio-precio').value = servicio.precio;
        document.getElementById('servicio-duracion').value = servicio.duracion;
        document.getElementById('servicio-descripcion').value = servicio.descripcion || '';
    } else {
        document.getElementById('modal-servicio-titulo').textContent = 'Nuevo servicio';
        document.getElementById('servicio-id').value = '';
        document.getElementById('servicio-nombre').value = '';
        document.getElementById('servicio-categoria').value = 'peluqueria';
        document.getElementById('servicio-orden').value = '';
        document.getElementById('servicio-precio').value = '';
        document.getElementById('servicio-duracion').value = '';
        document.getElementById('servicio-descripcion').value = '';
    }

    document.getElementById('modal-servicio').style.display = 'flex';
}

function cerrarFormServicio() {
    document.getElementById('modal-servicio').style.display = 'none';
}

async function guardarServicio() {
    const id = document.getElementById('servicio-id').value;
    const error = document.getElementById('modal-servicio-error');
    const boton = document.getElementById('btn-guardar-servicio');

    const datos = {
        nombre: document.getElementById('servicio-nombre').value.trim(),
        categoria: document.getElementById('servicio-categoria').value,
        orden: document.getElementById('servicio-orden').value,
        precio: document.getElementById('servicio-precio').value,
        duracion: document.getElementById('servicio-duracion').value,
        descripcion: document.getElementById('servicio-descripcion').value.trim()
    };

    if (!datos.nombre || datos.precio === '' || datos.duracion === '') {
        error.textContent = 'Nombre, precio y duración son obligatorios';
        error.style.display = 'block';
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando...';
    error.style.display = 'none';

    const esEdicion = id !== '';
    const url = esEdicion ? `${API_SERVICIOS}/${id}` : API_SERVICIOS;
    const metodo = esEdicion ? 'PATCH' : 'POST';

    try {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenSesion}`
            },
            body: JSON.stringify(datos)
        });

        if (!respuesta.ok) {
            const d = await respuesta.json();
            throw new Error(d.error || 'Error al guardar');
        }

        cerrarFormServicio();
        cargarServicios();

    } catch (e) {
        console.error('Error al guardar servicio:', e);
        error.textContent = e.message || 'Hubo un problema al guardar';
        error.style.display = 'block';
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar';
    }
}

async function cambiarEstadoServicio(id, activo) {
    const accion = activo ? 'activar' : 'desactivar';
    if (!confirm(`¿Seguro que quieres ${accion} este servicio?`)) return;

    try {
        const respuesta = await fetch(`${API_SERVICIOS}/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenSesion}`
            },
            body: JSON.stringify({ activo: activo })
        });
        if (!respuesta.ok) throw new Error('Error al cambiar estado');
        cargarServicios();
    } catch (e) {
        console.error('Error:', e);
        alert('Hubo un problema al cambiar el estado del servicio');
    }
}

async function eliminarServicioPermanente(id) {
    if (!confirm('⚠️ Esto BORRA el servicio para siempre y no se puede deshacer.\n\nSi solo quieres ocultarlo del sitio, usa "Desactivar".\n\n¿Continuar con el borrado permanente?')) return;

    try {
        const respuesta = await fetch(`${API_SERVICIOS}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        if (!respuesta.ok) {
            const d = await respuesta.json();
            throw new Error(d.error || 'Error al eliminar');
        }
        cargarServicios();
    } catch (e) {
        console.error('Error:', e);
        alert('Hubo un problema al eliminar el servicio');
    }
}

// CLIENTAS \\

function crearCardClienta(cliente) {
    const card = document.createElement('div');
    card.classList.add('servicio-card');

    card.innerHTML = `
        <div class="servicio-titulo">
            <h3>${cliente.cliente || 'Sin nombre'}</h3>
        </div>
        <p class="servicio-desc">${cliente.email} · ${cliente.telefono || 'sin teléfono'}</p>
        <p class="servicio-meta">${cliente.totalReservas} reserva${cliente.totalReservas === 1 ? '' : 's'} · última: ${formatearFecha(cliente.ultimaReserva)}</p>
        <div class="servicio-acciones">
            <button class="btn-ver-clienta" data-email="${cliente.email}">Ver historial</button>
        </div>
    `;
    return card;
}

function renderClientes(lista) {
    const cont = document.getElementById('lista-clientas');
    const empty = document.getElementById('empty-clientas');
    const count = document.getElementById('count-clientas');

    cont.innerHTML = '';
    count.textContent = lista.length;

    if (lista.length === 0) {
        empty.style.display = 'block';
        return;
    }
    empty.style.display = 'none';

    lista.forEach(cliente => cont.appendChild(crearCardClienta(cliente)));

    document.querySelectorAll('.btn-ver-clienta').forEach(b => {
        b.addEventListener('click', () => abrirClienta(b.getAttribute('data-email')));
    });
}

async function cargarClientes() {
    const loading = document.getElementById('loading-clientas');
    loading.style.display = 'block';

    try {
        const respuesta = await fetch(`${API_URL}/clientes`, {
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        const datos = await respuesta.json();

        clientesActuales = datos.clientes || [];
        renderClientes(clientesActuales);
    } catch (error) {
        console.error('Error al cargar clientas:', error);
        document.getElementById('lista-clientas').innerHTML = '<p style="color:#b00020;">No se pudieron cargar las clientas.</p>';
    } finally {
        loading.style.display = 'none';
    }
}

function filtrarClientes() {
    const texto = document.getElementById('buscar-clienta').value.trim().toLowerCase();
    if (!texto) {
        renderClientes(clientesActuales);
        return;
    }
    const filtradas = clientesActuales.filter(c =>
        (c.cliente || '').toLowerCase().includes(texto) ||
        (c.email || '').toLowerCase().includes(texto) ||
        (c.telefono || '').toLowerCase().includes(texto)
    );
    renderClientes(filtradas);
}

async function abrirClienta(email) {
    clientaAbiertaEmail = email;
    const errorMsg = document.getElementById('modal-clienta-error');
    errorMsg.style.display = 'none';

    const resumen = clientesActuales.find(c => c.email === email);
    document.getElementById('modal-clienta-nombre').textContent = resumen ? resumen.cliente : email;
    document.getElementById('modal-clienta-contacto').textContent = resumen ? `${resumen.email} · ${resumen.telefono || 'sin teléfono'}` : email;
    document.getElementById('modal-clienta-historial').innerHTML = '<p class="admin-loading">Cargando historial...</p>';
    document.getElementById('clienta-observaciones').value = '';
    document.getElementById('modal-clienta').style.display = 'flex';

    try {
        const respuesta = await fetch(`${API_URL}/clientes/${encodeURIComponent(email)}`, {
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        const datos = await respuesta.json();

        const cont = document.getElementById('modal-clienta-historial');
        if (!datos.historial || datos.historial.length === 0) {
            cont.innerHTML = '<p style="color:var(--text-soft);">Sin reservas registradas.</p>';
        } else {
            cont.innerHTML = datos.historial.map(r => `
                <div class="resena-card">
                    <strong>${formatearFecha(r.fecha)}</strong> — ${(r.servicios || []).join(', ')}
                    <span style="color:var(--text-soft);"> (${r.estado})</span>
                    ${r.notas ? `<p style="margin:0.3rem 0 0; color:var(--text-soft); font-size:0.85rem;">${r.notas}</p>` : ''}
                </div>
            `).join('');
        }

        document.getElementById('clienta-observaciones').value = datos.observaciones || '';
    } catch (error) {
        console.error('Error al abrir clienta:', error);
        document.getElementById('modal-clienta-historial').innerHTML = '<p style="color:#b00020;">No se pudo cargar el historial.</p>';
    }
}

function cerrarClienta() {
    document.getElementById('modal-clienta').style.display = 'none';
    clientaAbiertaEmail = null;
}

async function guardarObservacionesClienta() {
    if (!clientaAbiertaEmail) return;

    const boton = document.getElementById('btn-guardar-observaciones');
    const errorMsg = document.getElementById('modal-clienta-error');
    const observaciones = document.getElementById('clienta-observaciones').value;

    boton.disabled = true;
    boton.textContent = 'Guardando...';
    errorMsg.style.display = 'none';

    try {
        const respuesta = await fetch(`${API_URL}/clientes/${encodeURIComponent(clientaAbiertaEmail)}/observaciones`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenSesion}`
            },
            body: JSON.stringify({ observaciones })
        });

        if (!respuesta.ok) {
            const datos = await respuesta.json();
            errorMsg.textContent = datos.error || 'No se pudieron guardar las observaciones';
            errorMsg.style.display = 'block';
            return;
        }

        cerrarClienta();
    } catch (error) {
        console.error('Error al guardar observaciones:', error);
        errorMsg.textContent = 'Error de conexión con el servidor';
        errorMsg.style.display = 'block';
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar observaciones';
    }
}

// INICIO \\

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login-btn').addEventListener('click', hacerLogin);
    document.getElementById('login-password').addEventListener('keypress', e => {
        if (e.key === 'Enter') hacerLogin();
    });

    document.querySelectorAll('.admin-tab').forEach(boton => {
        boton.addEventListener('click', () => cambiarTab(boton.getAttribute('data-tab')));
    });

    document.getElementById('btn-nuevo-servicio').addEventListener('click', () => abrirFormServicio(null));
    document.getElementById('btn-cancelar-servicio').addEventListener('click', cerrarFormServicio);
    document.getElementById('btn-guardar-servicio').addEventListener('click', guardarServicio);
    document.getElementById('btn-nuevo-producto').addEventListener('click', () => abrirFormProducto(null));
    document.getElementById('btn-cancelar-producto').addEventListener('click', cerrarFormProducto);
    document.getElementById('btn-guardar-producto').addEventListener('click', guardarProducto);
    document.getElementById('producto-imagen-file').addEventListener('change', manejarSeleccionImagen);
    document.getElementById('btn-cambiar-password').addEventListener('click', cambiarPasswordFrancisca);
    document.getElementById('btn-guardar-horarios').addEventListener('click', guardarHorariosAdmin);
    document.getElementById('btn-guardar-atencion').addEventListener('click', guardarAtencionAdmin);
    document.getElementById('btn-nueva-promocion').addEventListener('click', () => abrirFormPromocion(null));
    document.getElementById('btn-cancelar-promocion').addEventListener('click', cerrarFormPromocion);
    document.getElementById('btn-guardar-promocion').addEventListener('click', guardarPromocion);
    document.getElementById('promocion-imagen-file').addEventListener('change', manejarImagenPromocion);
    document.getElementById('btn-quitar-imagen-promocion').addEventListener('click', quitarImagenPromocion);
    document.getElementById('modal-promocion').addEventListener('click', (e) => {
        if (e.target.id === 'modal-promocion') cerrarFormPromocion();
    });
    document.getElementById('modal-producto').addEventListener('click', (e) => {
        if (e.target.id === 'modal-producto') cerrarFormProducto();
    });
    // Cerrar el modal al hacer clic fuera de la caja
    document.getElementById('modal-servicio').addEventListener('click', (e) => {
        if (e.target.id === 'modal-servicio') cerrarFormServicio();
    });

    document.getElementById('buscar-clienta').addEventListener('input', filtrarClientes);
    document.getElementById('btn-cerrar-clienta').addEventListener('click', cerrarClienta);
    document.getElementById('btn-guardar-observaciones').addEventListener('click', guardarObservacionesClienta);
    document.getElementById('modal-clienta').addEventListener('click', (e) => {
        if (e.target.id === 'modal-clienta') cerrarClienta();
    });

    document.getElementById('btn-nueva-resena-google').addEventListener('click', () => abrirFormResenaGoogle(null));
    document.getElementById('btn-cancelar-resena-google').addEventListener('click', cerrarFormResenaGoogle);
    document.getElementById('btn-guardar-resena-google').addEventListener('click', guardarResenaGoogle);
    document.getElementById('btn-guardar-google-config').addEventListener('click', guardarConfigGoogle);
    document.getElementById('modal-resena-google').addEventListener('click', (e) => {
        if (e.target.id === 'modal-resena-google') cerrarFormResenaGoogle();
    });

    if (tokenSesion) {
        mostrarPanel();
        cargarResenasGoogle();
        cargarPendientes();
        cargarPublicadas();
    }
});

// PRODUCTOS \\

function crearCardProducto(p) {
    const card = document.createElement('div');
    card.classList.add('servicio-card');
    if (!p.activo) card.classList.add('servicio-inactivo');

    const img = p.imagen
        ? `<img src="${p.imagen}" alt="${p.nombre}" style="width:56px;height:56px;object-fit:cover;border-radius:0.5rem;flex-shrink:0;">`
        : '';

    const botonEliminar = rolSesion === 'superadmin'
        ? `<button class="btn-eliminar-servicio btn-eliminar-producto" data-id="${p.id}">Eliminar</button>`
        : '';

    card.innerHTML = `
        <div style="display:flex; gap:1rem; align-items:flex-start;">
            ${img}
            <div style="flex:1;">
                <div class="servicio-titulo">
                    <h3>${p.nombre}</h3>
                    <span class="servicio-categoria">${p.marca}</span>
                    ${p.destacado ? '<span class="servicio-categoria">★ Destacado</span>' : ''}
                    ${!p.activo ? '<span class="servicio-badge-off">Desactivado</span>' : ''}
                </div>
                <p class="servicio-desc">${p.descripcion || ''}</p>
                <p class="servicio-meta">${formatearPrecio(p.precio)}</p>
                <div class="servicio-acciones">
                    <button class="btn-editar-producto" data-id="${p.id}">Editar</button>
                    <button class="btn-toggle-producto" data-id="${p.id}" data-activo="${p.activo}">${p.activo ? 'Desactivar' : 'Activar'}</button>
                    ${botonEliminar}
                </div>
            </div>
        </div>
    `;
    return card;
}

async function cargarProductos() {
    const lista = document.getElementById('lista-productos');
    const loading = document.getElementById('loading-productos');
    const empty = document.getElementById('empty-productos');
    const count = document.getElementById('count-productos');

    loading.style.display = 'block';

    try {
        const respuesta = await fetch(`${API_PRODUCTOS}/admin/todos`, {
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        const datos = await respuesta.json();

        loading.style.display = 'none';
        lista.innerHTML = '';

        productosActuales = datos.productos || [];
        actualizarListaMarcas();
        renderizarMarcas();

        if (productosActuales.length === 0) {
            empty.style.display = 'block';
            count.textContent = '0';
            return;
        }

        empty.style.display = 'none';
        count.textContent = productosActuales.length;

        productosActuales.forEach(p => lista.appendChild(crearCardProducto(p)));

        document.querySelectorAll('.btn-editar-producto').forEach(b => {
            b.addEventListener('click', () => {
                const producto = productosActuales.find(p => p.id === b.getAttribute('data-id'));
                abrirFormProducto(producto);
            });
        });
        document.querySelectorAll('.btn-toggle-producto').forEach(b => {
            b.addEventListener('click', () => {
                const nuevoEstado = b.getAttribute('data-activo') !== 'true';
                cambiarEstadoProducto(b.getAttribute('data-id'), nuevoEstado);
            });
        });
        document.querySelectorAll('.btn-eliminar-producto').forEach(b => {
            b.addEventListener('click', () => eliminarProductoPermanente(b.getAttribute('data-id')));
        });

    } catch (error) {
        console.error('Error al cargar productos:', error);
        loading.textContent = 'Error al cargar productos';
    }
}

// Convierte el nombre de una marca en una clave simple para "categoria" (ej: filtros de la tienda)
function slugificarMarca(marca) {
    const sinTildes = { a: 'áàä', e: 'éèë', i: 'íìï', o: 'óòö', u: 'úùü', n: 'ñ' };
    let texto = marca.toLowerCase();
    for (const letra in sinTildes) {
        for (const acento of sinTildes[letra]) {
            texto = texto.split(acento).join(letra);
        }
    }
    return texto
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

// Agrega al datalist las marcas que ya existan en los productos guardados.
// Si una marca ya no tiene ningún producto, deja de sugerirse sola.
function actualizarListaMarcas() {
    const datalist = document.getElementById('marcas-existentes');
    if (!datalist) return;
    const marcas = new Set();
    productosActuales.forEach((p) => { if (p.marca) marcas.add(p.marca.trim()); });
    datalist.innerHTML = [...marcas].map((m) => `<option value="${m}"></option>`).join('');
}

// Agrupa los productos actuales por marca (nombre exacto y sin espacios extra)
function agruparPorMarca() {
    const porMarca = new Map();
    productosActuales.forEach((p) => {
        const marca = (p.marca || '').trim();
        if (!marca) return;
        if (!porMarca.has(marca)) porMarca.set(marca, []);
        porMarca.get(marca).push(p);
    });
    return porMarca;
}

function crearCardMarca(marca, productos) {
    const card = document.createElement('div');
    card.classList.add('servicio-card');

    const activos = productos.filter((p) => p.activo).length;

    card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem;">
            <div>
                <h3 style="margin:0;">${marca}</h3>
                <p class="servicio-meta" style="margin:0.2rem 0 0;">${productos.length} producto${productos.length === 1 ? '' : 's'} · ${activos} activo${activos === 1 ? '' : 's'}</p>
            </div>
            <div class="servicio-acciones">
                <button class="btn-renombrar-marca" data-marca="${marca}">Renombrar</button>
                <button class="btn-baja-marca" data-marca="${marca}">Dejar de vender</button>
            </div>
        </div>
    `;
    return card;
}

// Pinta la sección "Marcas" a partir de los productos ya cargados
function renderizarMarcas() {
    const lista = document.getElementById('lista-marcas');
    const count = document.getElementById('count-marcas');
    if (!lista) return;

    const porMarca = agruparPorMarca();

    lista.innerHTML = '';
    count.textContent = porMarca.size;

    porMarca.forEach((productos, marca) => lista.appendChild(crearCardMarca(marca, productos)));

    document.querySelectorAll('.btn-renombrar-marca').forEach((b) => {
        b.addEventListener('click', () => renombrarMarca(b.getAttribute('data-marca')));
    });
    document.querySelectorAll('.btn-baja-marca').forEach((b) => {
        b.addEventListener('click', () => darDeBajaMarca(b.getAttribute('data-marca')));
    });
}

// Renombra una marca en todos sus productos a la vez (sirve para fusionar duplicados o corregir errores de tipeo)
async function renombrarMarca(marcaActual) {
    const nuevoNombre = prompt(`Nuevo nombre para "${marcaActual}":`, marcaActual);
    if (nuevoNombre === null) return;

    const nombreLimpio = nuevoNombre.trim();
    if (!nombreLimpio || nombreLimpio === marcaActual) return;

    const productos = productosActuales.filter((p) => (p.marca || '').trim() === marcaActual);
    if (productos.length === 0) return;

    if (!confirm(`Esto va a renombrar "${marcaActual}" a "${nombreLimpio}" en ${productos.length} producto(s). ¿Continuar?`)) return;

    try {
        await Promise.all(productos.map((p) => fetch(`${API_PRODUCTOS}/${p.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenSesion}`
            },
            body: JSON.stringify({ marca: nombreLimpio, categoria: slugificarMarca(nombreLimpio) })
        })));
        cargarProductos();
    } catch (e) {
        console.error('Error al renombrar marca:', e);
        alert('Hubo un problema al renombrar la marca');
    }
}

// Desactiva de una vez todos los productos de una marca (para cuando ya no se vende)
async function darDeBajaMarca(marca) {
    const productos = productosActuales.filter((p) => (p.marca || '').trim() === marca && p.activo);
    if (productos.length === 0) {
        alert('Esta marca ya no tiene productos activos.');
        return;
    }

    if (!confirm(`Esto desactiva los ${productos.length} producto(s) de "${marca}" (dejan de verse en la tienda). Si cambias de opinión, puedes reactivarlos uno por uno desde "Tus productos". ¿Continuar?`)) return;

    try {
        await Promise.all(productos.map((p) => fetch(`${API_PRODUCTOS}/${p.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenSesion}`
            },
            body: JSON.stringify({ activo: false })
        })));
        cargarProductos();
    } catch (e) {
        console.error('Error al desactivar la marca:', e);
        alert('Hubo un problema al desactivar los productos de la marca');
    }
}

// Sube un archivo a Cloudinary y devuelve la URL final
async function subirImagenCloudinary(file) {
    const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const respuesta = await fetch(url, { method: 'POST', body: formData });
    if (!respuesta.ok) throw new Error('Falló la subida a Cloudinary');
    const datos = await respuesta.json();
    return datos.secure_url;
}

async function manejarSeleccionImagen(evento) {
    const file = evento.target.files[0];
    if (!file) return;

    const estado = document.getElementById('producto-imagen-estado');
    const preview = document.getElementById('producto-imagen-preview');
    estado.textContent = 'Subiendo foto...';

    try {
        const urlImagen = await subirImagenCloudinary(file);
        document.getElementById('producto-imagen-url').value = urlImagen;
        preview.src = urlImagen;
        preview.style.display = 'block';
        estado.textContent = 'Foto subida ✓';
    } catch (error) {
        console.error('Error al subir imagen:', error);
        estado.textContent = 'No se pudo subir la foto. Revisa el cloud name / preset.';
    }
}

function abrirFormProducto(producto = null) {
    const error = document.getElementById('modal-producto-error');
    const estado = document.getElementById('producto-imagen-estado');
    const preview = document.getElementById('producto-imagen-preview');
    error.style.display = 'none';
    estado.textContent = '';
    document.getElementById('producto-imagen-file').value = '';

    if (producto) {
        document.getElementById('modal-producto-titulo').textContent = 'Editar producto';
        document.getElementById('producto-id').value = producto.id;
        document.getElementById('producto-nombre').value = producto.nombre;
        document.getElementById('producto-marca').value = producto.marca || '';
        document.getElementById('producto-orden').value = producto.orden;
        document.getElementById('producto-precio').value = producto.precio;
        document.getElementById('producto-descripcion').value = producto.descripcion || '';
        document.getElementById('producto-destacado').checked = !!producto.destacado;
        document.getElementById('producto-imagen-url').value = producto.imagen || '';
        if (producto.imagen) {
            preview.src = producto.imagen;
            preview.style.display = 'block';
        } else {
            preview.style.display = 'none';
        }
    } else {
        document.getElementById('modal-producto-titulo').textContent = 'Nuevo producto';
        document.getElementById('producto-id').value = '';
        document.getElementById('producto-nombre').value = '';
        document.getElementById('producto-marca').value = '';
        document.getElementById('producto-orden').value = '';
        document.getElementById('producto-precio').value = '';
        document.getElementById('producto-descripcion').value = '';
        document.getElementById('producto-destacado').checked = false;
        document.getElementById('producto-imagen-url').value = '';
        preview.style.display = 'none';
    }

    document.getElementById('modal-producto').style.display = 'flex';
}

function cerrarFormProducto() {
    document.getElementById('modal-producto').style.display = 'none';
}

async function guardarProducto() {
    const id = document.getElementById('producto-id').value;
    const error = document.getElementById('modal-producto-error');
    const boton = document.getElementById('btn-guardar-producto');

    const marca = document.getElementById('producto-marca').value.trim();
    const datos = {
        nombre: document.getElementById('producto-nombre').value.trim(),
        categoria: slugificarMarca(marca),
        marca: marca,
        orden: document.getElementById('producto-orden').value,
        precio: document.getElementById('producto-precio').value,
        descripcion: document.getElementById('producto-descripcion').value.trim(),
        destacado: document.getElementById('producto-destacado').checked,
        imagen: document.getElementById('producto-imagen-url').value
    };

    if (!datos.nombre || !marca || datos.precio === '') {
        error.textContent = 'Nombre, marca y precio son obligatorios';
        error.style.display = 'block';
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando...';
    error.style.display = 'none';

    const esEdicion = id !== '';
    const url = esEdicion ? `${API_PRODUCTOS}/${id}` : API_PRODUCTOS;
    const metodo = esEdicion ? 'PATCH' : 'POST';

    try {
        const respuesta = await fetch(url, {
            method: metodo,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenSesion}`
            },
            body: JSON.stringify(datos)
        });
        if (!respuesta.ok) {
            const d = await respuesta.json();
            throw new Error(d.error || 'Error al guardar');
        }
        cerrarFormProducto();
        cargarProductos();
    } catch (e) {
        console.error('Error al guardar producto:', e);
        error.textContent = e.message || 'Hubo un problema al guardar';
        error.style.display = 'block';
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar';
    }
}

async function cambiarEstadoProducto(id, activo) {
    const accion = activo ? 'activar' : 'desactivar';
    if (!confirm(`¿Seguro que quieres ${accion} este producto?`)) return;
    try {
        const respuesta = await fetch(`${API_PRODUCTOS}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenSesion}` },
            body: JSON.stringify({ activo: activo })
        });
        if (!respuesta.ok) throw new Error('Error al cambiar estado');
        cargarProductos();
    } catch (e) {
        console.error('Error:', e);
        alert('Hubo un problema al cambiar el estado del producto');
    }
}

async function eliminarProductoPermanente(id) {
    if (!confirm('⚠️ Esto BORRA el producto para siempre y no se puede deshacer.\n\nSi solo quieres ocultarlo, usa "Desactivar".\n\n¿Continuar con el borrado permanente?')) return;
    try {
        const respuesta = await fetch(`${API_PRODUCTOS}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        if (!respuesta.ok) {
            const d = await respuesta.json();
            throw new Error(d.error || 'Error al eliminar');
        }
        cargarProductos();
    } catch (e) {
        console.error('Error:', e);
        alert('Hubo un problema al eliminar el producto');
    }
}

// PROMOCIONES \\

// "2026-11-30" -> "30 de noviembre de 2026"
function formatearFechaPromocion(fechaTexto) {
    const [año, mes, dia] = fechaTexto.split('-').map(Number);
    return new Date(año, mes - 1, dia).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

// [2, 4] -> "Solo martes y jueves" · [] -> "Todos los días"
const NOMBRES_DIAS_PROMO = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
function textoDiasPromocion(dias) {
    const nombres = (dias || []).map(d => NOMBRES_DIAS_PROMO[d]).filter(Boolean);
    if (nombres.length === 0) return 'Todos los días';
    if (nombres.length === 1) return `Solo ${nombres[0]}`;
    return `Solo ${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}

function promocionVencida(p) {
    if (!p.validaHasta) return false;
    const hoy = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    return p.validaHasta < hoy;
}

function crearCardPromocion(p) {
    const card = document.createElement('div');
    card.classList.add('servicio-card');
    const vencida = promocionVencida(p);
    if (!p.activo || vencida) card.classList.add('servicio-inactivo');

    const img = p.imagen
        ? `<img src="${p.imagen}" alt="${p.titulo}" style="width:72px;height:56px;object-fit:cover;border-radius:0.5rem;flex-shrink:0;">`
        : '';
    const vigencia = (p.validaHasta
        ? `${vencida ? 'Venció el' : 'Válida hasta el'} ${formatearFechaPromocion(p.validaHasta)}`
        : 'Sin fecha de término') + ` · ${textoDiasPromocion(p.diasValidos)}`;

    card.innerHTML = `
        <div style="display:flex; gap:1rem; align-items:flex-start;">
            ${img}
            <div style="flex:1;">
                <div class="servicio-titulo">
                    <h3>${p.titulo}</h3>
                    ${p.etiqueta ? `<span class="servicio-categoria promo-admin-etiqueta">${p.etiqueta}</span>` : ''}
                    ${!p.activo ? '<span class="servicio-badge-off">Desactivada</span>' : ''}
                    ${p.activo && vencida ? '<span class="servicio-badge-off">Vencida</span>' : ''}
                </div>
                <p class="servicio-desc" style="white-space:pre-line;">${p.descripcion || ''}</p>
                <p class="servicio-meta">${vigencia}</p>
                <div class="servicio-acciones">
                    <button class="btn-editar-promocion" data-id="${p.id}">Editar</button>
                    <button class="btn-toggle-promocion" data-id="${p.id}" data-activo="${p.activo}">${p.activo ? 'Desactivar' : 'Activar'}</button>
                    <button class="btn-eliminar-servicio btn-eliminar-promocion" data-id="${p.id}">Eliminar</button>
                </div>
            </div>
        </div>
    `;
    return card;
}

async function cargarPromociones() {
    const lista = document.getElementById('lista-promociones');
    const loading = document.getElementById('loading-promociones');
    const empty = document.getElementById('empty-promociones');
    const count = document.getElementById('count-promociones');

    loading.style.display = 'block';

    try {
        const respuesta = await fetch(`${API_PROMOCIONES}/admin/todas`, {
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        const datos = await respuesta.json();

        loading.style.display = 'none';
        lista.innerHTML = '';

        promocionesActuales = datos.promociones || [];
        count.textContent = promocionesActuales.length;

        if (promocionesActuales.length === 0) {
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';

        promocionesActuales.forEach(p => lista.appendChild(crearCardPromocion(p)));

        document.querySelectorAll('.btn-editar-promocion').forEach(b => {
            b.addEventListener('click', () => {
                abrirFormPromocion(promocionesActuales.find(p => p.id === b.getAttribute('data-id')));
            });
        });
        document.querySelectorAll('.btn-toggle-promocion').forEach(b => {
            b.addEventListener('click', () => {
                cambiarEstadoPromocion(b.getAttribute('data-id'), b.getAttribute('data-activo') !== 'true');
            });
        });
        document.querySelectorAll('.btn-eliminar-promocion').forEach(b => {
            b.addEventListener('click', () => eliminarPromocion(b.getAttribute('data-id')));
        });

    } catch (error) {
        console.error('Error al cargar promociones:', error);
        loading.textContent = 'Error al cargar promociones';
    }
}

function mostrarImagenPromocion(url) {
    const preview = document.getElementById('promocion-imagen-preview');
    const quitar = document.getElementById('quitar-imagen-promocion');
    document.getElementById('promocion-imagen-url').value = url || '';
    if (url) {
        preview.src = url;
        preview.style.display = 'block';
        quitar.style.display = 'flex';
    } else {
        preview.style.display = 'none';
        quitar.style.display = 'none';
    }
}

async function manejarImagenPromocion(evento) {
    const file = evento.target.files[0];
    if (!file) return;

    const estado = document.getElementById('promocion-imagen-estado');
    estado.textContent = 'Subiendo foto...';

    try {
        mostrarImagenPromocion(await subirImagenCloudinary(file));
        estado.textContent = 'Foto subida ✓';
    } catch (error) {
        console.error('Error al subir imagen:', error);
        estado.textContent = 'No se pudo subir la foto. Intenta de nuevo.';
    }
}

function quitarImagenPromocion() {
    document.getElementById('promocion-imagen-file').value = '';
    document.getElementById('promocion-imagen-estado').textContent = '';
    mostrarImagenPromocion('');
}

function abrirFormPromocion(promo = null) {
    document.getElementById('modal-promocion-error').style.display = 'none';
    document.getElementById('promocion-imagen-estado').textContent = '';
    document.getElementById('promocion-imagen-file').value = '';

    document.getElementById('modal-promocion-titulo').textContent = promo ? 'Editar promoción' : 'Nueva promoción';
    document.getElementById('promocion-id').value = promo ? promo.id : '';
    document.getElementById('promocion-titulo-input').value = promo ? promo.titulo : '';
    document.getElementById('promocion-etiqueta').value = promo ? (promo.etiqueta || '') : '';
    document.getElementById('promocion-orden').value = promo && promo.orden !== 99 ? promo.orden : '';
    document.getElementById('promocion-descripcion').value = promo ? (promo.descripcion || '') : '';
    document.getElementById('promocion-valida-hasta').value = promo ? (promo.validaHasta || '') : '';
    const diasPromo = promo ? (promo.diasValidos || []) : [];
    document.querySelectorAll('#promocion-dias input').forEach(c => { c.checked = diasPromo.includes(Number(c.value)); });
    mostrarImagenPromocion(promo ? promo.imagen : '');

    document.getElementById('modal-promocion').style.display = 'flex';
}

function cerrarFormPromocion() {
    document.getElementById('modal-promocion').style.display = 'none';
}

async function guardarPromocion() {
    const id = document.getElementById('promocion-id').value;
    const error = document.getElementById('modal-promocion-error');
    const boton = document.getElementById('btn-guardar-promocion');

    const datos = {
        titulo: document.getElementById('promocion-titulo-input').value.trim(),
        etiqueta: document.getElementById('promocion-etiqueta').value.trim(),
        orden: document.getElementById('promocion-orden').value,
        descripcion: document.getElementById('promocion-descripcion').value.trim(),
        validaHasta: document.getElementById('promocion-valida-hasta').value,
        diasValidos: [...document.querySelectorAll('#promocion-dias input:checked')].map(c => Number(c.value)),
        imagen: document.getElementById('promocion-imagen-url').value
    };

    if (!datos.titulo) {
        error.textContent = 'El título es obligatorio';
        error.style.display = 'block';
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando...';
    error.style.display = 'none';

    const esEdicion = id !== '';

    try {
        const respuesta = await fetch(esEdicion ? `${API_PROMOCIONES}/${id}` : API_PROMOCIONES, {
            method: esEdicion ? 'PATCH' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokenSesion}`
            },
            body: JSON.stringify(datos)
        });
        if (!respuesta.ok) {
            const d = await respuesta.json();
            throw new Error(d.error || 'Error al guardar');
        }
        cerrarFormPromocion();
        cargarPromociones();
    } catch (e) {
        console.error('Error al guardar promoción:', e);
        error.textContent = e.message || 'Hubo un problema al guardar';
        error.style.display = 'block';
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar';
    }
}

async function cambiarEstadoPromocion(id, activo) {
    const accion = activo ? 'activar' : 'desactivar';
    if (!confirm(`¿Seguro que quieres ${accion} esta promoción?`)) return;
    try {
        const respuesta = await fetch(`${API_PROMOCIONES}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenSesion}` },
            body: JSON.stringify({ activo: activo })
        });
        if (!respuesta.ok) throw new Error('Error al cambiar estado');
        cargarPromociones();
    } catch (e) {
        console.error('Error:', e);
        alert('Hubo un problema al cambiar el estado de la promoción');
    }
}

async function eliminarPromocion(id) {
    if (!confirm('¿Borrar esta promoción para siempre?\n\nSi solo quieres ocultarla por un tiempo, usa "Desactivar".')) return;
    try {
        const respuesta = await fetch(`${API_PROMOCIONES}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        if (!respuesta.ok) {
            const d = await respuesta.json();
            throw new Error(d.error || 'Error al eliminar');
        }
        cargarPromociones();
    } catch (e) {
        console.error('Error:', e);
        alert('Hubo un problema al eliminar la promoción');
    }
}

// RESEÑAS DE GOOGLE \\

function escaparAdmin(texto) {
    const div = document.createElement('div');
    div.textContent = texto || '';
    return div.innerHTML.replace(/"/g, '&quot;');
}

// "2026-03" -> "marzo de 2026"
function formatearMesResena(fecha) {
    if (!fecha) return 'Sin fecha';
    const [año, mes] = fecha.split('-').map(Number);
    return new Date(año, mes - 1, 1).toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
}

function crearCardResenaGoogle(r) {
    const card = document.createElement('div');
    card.classList.add('servicio-card');
    if (!r.visible) card.classList.add('servicio-inactivo');

    card.innerHTML = `
        <div class="servicio-titulo">
            <h3>${escaparAdmin(r.autor)}</h3>
            <span class="servicio-categoria" style="color:#F4B400;">${'★'.repeat(r.estrellas)}${'☆'.repeat(5 - r.estrellas)}</span>
            ${!r.visible ? '<span class="servicio-badge-off">Oculta</span>' : ''}
        </div>
        <p class="servicio-desc" style="white-space:pre-line; display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:3; overflow:hidden;">${escaparAdmin(r.texto)}</p>
        <p class="servicio-meta">${formatearMesResena(r.fecha)} · Orden ${r.orden === 99 ? '—' : r.orden}${r.enlace ? ' · 🔗 con enlace propio' : ''}</p>
        <div class="servicio-acciones">
            <button class="btn-editar-rg" data-id="${r.id}">Editar</button>
            <button class="btn-toggle-rg" data-id="${r.id}" data-visible="${r.visible}">${r.visible ? 'Ocultar' : 'Mostrar'}</button>
            <button class="btn-eliminar-servicio btn-eliminar-rg" data-id="${r.id}">Eliminar</button>
        </div>
    `;
    return card;
}

async function cargarResenasGoogle() {
    const lista = document.getElementById('lista-google');
    const loading = document.getElementById('loading-google');
    const empty = document.getElementById('empty-google');
    const count = document.getElementById('count-google');

    loading.style.display = 'block';

    try {
        const respuesta = await fetch(`${API_RESENAS_GOOGLE}/admin/todas`, {
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        const datos = await respuesta.json();
        loading.style.display = 'none';
        lista.innerHTML = '';

        // Configuración (enlaces y promedio)
        const config = datos.config || {};
        document.getElementById('google-enlace-resena').value = config.enlaceResena || '';
        document.getElementById('google-enlace-perfil').value = config.enlacePerfil || '';
        document.getElementById('google-promedio').value = config.promedio ? String(config.promedio).replace('.', ',') : '';
        document.getElementById('google-total').value = config.total || '';

        resenasGoogleActuales = datos.resenas || [];
        const visibles = resenasGoogleActuales.filter(r => r.visible).length;
        count.textContent = resenasGoogleActuales.length ? `${visibles} de ${resenasGoogleActuales.length} visibles` : '0';

        if (resenasGoogleActuales.length === 0) {
            empty.style.display = 'block';
            return;
        }
        empty.style.display = 'none';

        resenasGoogleActuales.forEach(r => lista.appendChild(crearCardResenaGoogle(r)));

        lista.querySelectorAll('.btn-editar-rg').forEach(b => {
            b.addEventListener('click', () => abrirFormResenaGoogle(resenasGoogleActuales.find(r => r.id === b.getAttribute('data-id'))));
        });
        lista.querySelectorAll('.btn-toggle-rg').forEach(b => {
            b.addEventListener('click', () => cambiarVisibilidadResenaGoogle(b.getAttribute('data-id'), b.getAttribute('data-visible') !== 'true'));
        });
        lista.querySelectorAll('.btn-eliminar-rg').forEach(b => {
            b.addEventListener('click', () => eliminarResenaGoogle(b.getAttribute('data-id')));
        });

    } catch (error) {
        console.error('Error al cargar reseñas de Google:', error);
        loading.textContent = 'Error al cargar reseñas de Google';
    }
}

function abrirFormResenaGoogle(r = null) {
    document.getElementById('modal-resena-google-error').style.display = 'none';
    document.getElementById('modal-resena-google-titulo').textContent = r ? 'Editar reseña' : 'Nueva reseña';
    document.getElementById('resena-google-id').value = r ? r.id : '';
    document.getElementById('resena-google-autor').value = r ? r.autor : '';
    document.getElementById('resena-google-estrellas').value = r ? String(r.estrellas) : '5';
    document.getElementById('resena-google-texto').value = r ? r.texto : '';
    document.getElementById('resena-google-fecha').value = r && r.fecha ? r.fecha.slice(0, 7) : '';
    document.getElementById('resena-google-orden').value = r && r.orden !== 99 ? r.orden : '';
    document.getElementById('resena-google-enlace').value = r ? (r.enlace || '') : '';
    document.getElementById('resena-google-visible').checked = r ? r.visible : true;
    document.getElementById('modal-resena-google').style.display = 'flex';
    document.getElementById('resena-google-autor').focus();
}

function cerrarFormResenaGoogle() {
    document.getElementById('modal-resena-google').style.display = 'none';
}

async function guardarResenaGoogle() {
    const id = document.getElementById('resena-google-id').value;
    const error = document.getElementById('modal-resena-google-error');
    const boton = document.getElementById('btn-guardar-resena-google');

    const datos = {
        autor: document.getElementById('resena-google-autor').value.trim(),
        estrellas: Number(document.getElementById('resena-google-estrellas').value),
        texto: document.getElementById('resena-google-texto').value.trim(),
        fecha: document.getElementById('resena-google-fecha').value,
        orden: document.getElementById('resena-google-orden').value,
        enlace: document.getElementById('resena-google-enlace').value.trim(),
        visible: document.getElementById('resena-google-visible').checked
    };

    if (!datos.autor || !datos.texto) {
        error.textContent = 'Escribe el nombre de la clienta y el texto de la reseña';
        error.style.display = 'block';
        return;
    }
    if (datos.enlace && !/^https:\/\//i.test(datos.enlace)) {
        error.textContent = 'El enlace debe empezar con https:// (cópialo desde "Compartir" en Google Maps)';
        error.style.display = 'block';
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando...';
    error.style.display = 'none';

    const esEdicion = id !== '';
    try {
        const respuesta = await fetch(esEdicion ? `${API_RESENAS_GOOGLE}/${id}` : API_RESENAS_GOOGLE, {
            method: esEdicion ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenSesion}` },
            body: JSON.stringify(datos)
        });
        if (!respuesta.ok) {
            const d = await respuesta.json();
            throw new Error(d.error || 'Error al guardar');
        }
        cerrarFormResenaGoogle();
        cargarResenasGoogle();
    } catch (e) {
        console.error('Error al guardar reseña de Google:', e);
        error.textContent = e.message || 'Hubo un problema al guardar';
        error.style.display = 'block';
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar';
    }
}

async function cambiarVisibilidadResenaGoogle(id, visible) {
    try {
        const respuesta = await fetch(`${API_RESENAS_GOOGLE}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenSesion}` },
            body: JSON.stringify({ visible })
        });
        if (!respuesta.ok) throw new Error('Error al cambiar visibilidad');
        cargarResenasGoogle();
    } catch (e) {
        console.error('Error:', e);
        alert('Hubo un problema al cambiar la reseña');
    }
}

async function eliminarResenaGoogle(id) {
    if (!confirm('¿Quitar esta reseña de tu panel?\n\nEn Google sigue publicada; solo se borra de aquí. Si solo quieres que no se vea en la página, usa "Ocultar".')) return;
    try {
        const respuesta = await fetch(`${API_RESENAS_GOOGLE}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });
        if (!respuesta.ok) throw new Error('Error al eliminar');
        cargarResenasGoogle();
    } catch (e) {
        console.error('Error:', e);
        alert('Hubo un problema al eliminar la reseña');
    }
}

async function guardarConfigGoogle() {
    const msg = document.getElementById('google-config-msg');
    const boton = document.getElementById('btn-guardar-google-config');
    const datos = {
        enlaceResena: document.getElementById('google-enlace-resena').value.trim(),
        enlacePerfil: document.getElementById('google-enlace-perfil').value.trim(),
        promedio: document.getElementById('google-promedio').value.trim(),
        total: document.getElementById('google-total').value
    };

    const malo = [datos.enlaceResena, datos.enlacePerfil].find(e => e && !/^https:\/\//i.test(e));
    if (malo) {
        msg.textContent = 'Los enlaces deben empezar con https:// (cópialos tal cual desde Google)';
        msg.style.color = '#b00020';
        msg.style.display = 'block';
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Guardando...';
    msg.style.display = 'none';

    try {
        const respuesta = await fetch(`${API_RESENAS_GOOGLE}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenSesion}` },
            body: JSON.stringify(datos)
        });
        const d = await respuesta.json();
        if (!respuesta.ok) throw new Error(d.error || 'No se pudo guardar');
        msg.textContent = d.config.enlaceResena
            ? '✅ Guardado. Desde ahora el correo después de la cita invita a dejar la reseña en Google.'
            : '✅ Guardado. (Mientras no pongas el enlace para dejar reseña, el correo sigue usando la página propia.)';
        msg.style.color = 'green';
        msg.style.display = 'block';
    } catch (e) {
        console.error('Error:', e);
        msg.textContent = e.message || 'Error de conexión';
        msg.style.color = '#b00020';
        msg.style.display = 'block';
    } finally {
        boton.disabled = false;
        boton.textContent = 'Guardar enlaces y promedio';
    }
}