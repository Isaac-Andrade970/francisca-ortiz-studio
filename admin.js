// PANEL ADMIN UNIFICADO \\

const API_RESENAS = API_URL + '/resenas';
const API_SERVICIOS = API_URL + '/servicios';
const API_PRODUCTOS = API_URL + '/productos';
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
    document.getElementById('modal-producto').addEventListener('click', (e) => {
        if (e.target.id === 'modal-producto') cerrarFormProducto();
    });
    // Cerrar el modal al hacer clic fuera de la caja
    document.getElementById('modal-servicio').addEventListener('click', (e) => {
        if (e.target.id === 'modal-servicio') cerrarFormServicio();
    });

    if (tokenSesion) {
        mostrarPanel();
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

const MARCAS = {
    cloe: 'Cloe Professional',
    rouve: 'Rouvé Professional',
    mens: "Men's Work"
};

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
        document.getElementById('producto-marca').value = producto.categoria;
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
        document.getElementById('producto-marca').value = 'cloe';
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

    const categoria = document.getElementById('producto-marca').value;
    const datos = {
        nombre: document.getElementById('producto-nombre').value.trim(),
        categoria: categoria,
        marca: MARCAS[categoria],
        orden: document.getElementById('producto-orden').value,
        precio: document.getElementById('producto-precio').value,
        descripcion: document.getElementById('producto-descripcion').value.trim(),
        destacado: document.getElementById('producto-destacado').checked,
        imagen: document.getElementById('producto-imagen-url').value
    };

    if (!datos.nombre || datos.precio === '') {
        error.textContent = 'Nombre y precio son obligatorios';
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