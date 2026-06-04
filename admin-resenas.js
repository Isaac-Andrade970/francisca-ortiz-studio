// PANEL ADMIN - GESTIÓN DE RESEÑAS \\

const API_URL = API_URL + '/resenas';

// AUTENTICACION \\

// El token se guarda en sessionStorage: persiste al recargar
// pero se borra al cerrar el navegador
let tokenSesion = sessionStorage.getItem('adminToken') || null;

function mostrarPanel() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-content').style.display = 'block';
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
        const respuesta = await fetch(API_URL + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            errorMsg.textContent = datos.error || 'Contraseña incorrecta';
            errorMsg.style.display = 'block';
            boton.disabled = false;
            boton.textContent = 'Ingresar';
            return;
        }

        // Login exitoso: guardar token y mostrar panel
        tokenSesion = datos.token;
        sessionStorage.setItem('adminToken', tokenSesion);
        mostrarPanel();
        cargarPendientes();
        cargarPublicadas();

    } catch (error) {
        console.error('Error de login:', error);
        errorMsg.textContent = 'Error de conexión con el servidor';
        errorMsg.style.display = 'block';
        boton.disabled = false;
        boton.textContent = 'Ingresar';
    }
}

// GENERAR HTML DE ESTRELLAS \\

function generarEstrellas(calificacion) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= calificacion) {
            html += '★';
        } else {
            html += '<span class="empty">★</span>';
        }
    }
    return html;
}

// FORMATEAR FECHA \\

function formatearFecha(fecha) {
    if (!fecha) return 'Fecha desconocida';
    
    // Firestore manda timestamps como objeto {_seconds, _nanoseconds}
    let dateObj;
    if (fecha._seconds) {
        dateObj = new Date(fecha._seconds * 1000);
    } else {
        dateObj = new Date(fecha);
    }
    
    return dateObj.toLocaleDateString('es-CL', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// CREAR CARD DE RESEÑA \\

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
            </div>
        ` : `
            <div class="resena-actions">
                <button class="btn-eliminar" data-id="${resena.id}">Eliminar reseña</button>
            </div>
        `}
    `;

    return card;
}

// CARGAR PENDIENTES \\

async function cargarPendientes() {
    const lista = document.getElementById('lista-pendientes');
    const loading = document.getElementById('loading-pendientes');
    const empty = document.getElementById('empty-pendientes');
    const count = document.getElementById('count-pendientes');

    try {
        const respuesta = await fetch(`${API_URL}/admin/pendientes`, {
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

        datos.resenas.forEach((resena) => {
            const card = crearCardResena(resena, false);
            lista.appendChild(card);
        });

        // Conectar botones
        document.querySelectorAll('.btn-aprobar').forEach((boton) => {
            boton.addEventListener('click', () => aprobarResena(boton.getAttribute('data-id')));
        });

        document.querySelectorAll('.btn-rechazar').forEach((boton) => {
            boton.addEventListener('click', () => rechazarResena(boton.getAttribute('data-id')));
        });

    } catch (error) {
        console.error('Error al cargar pendientes:', error);
        loading.textContent = 'Error al cargar reseñas';
    }
}

// CARGAR PUBLICADAS \\

async function cargarPublicadas() {
    const lista = document.getElementById('lista-publicadas');
    const loading = document.getElementById('loading-publicadas');
    const empty = document.getElementById('empty-publicadas');
    const count = document.getElementById('count-publicadas');

    try {
        const respuesta = await fetch(API_URL);
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

        datos.resenas.forEach((resena) => {
            const card = crearCardResena(resena, true);
            lista.appendChild(card);
        });

        // Conectar botones de eliminar
        document.querySelectorAll('#lista-publicadas .btn-eliminar').forEach((boton) => {
            boton.addEventListener('click', () => eliminarResenaPublicada(boton.getAttribute('data-id')));
        });

    } catch (error) {
        console.error('Error al cargar publicadas:', error);
        loading.textContent = 'Error al cargar reseñas';
    }
}

// APROBAR RESEÑA \\

async function aprobarResena(id) {
    if (!confirm('¿Aprobar esta reseña? Aparecerá en el sitio público.')) return;

    try {
        const respuesta = await fetch(`${API_URL}/admin/${id}/aprobar`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });

        if (!respuesta.ok) throw new Error('Error al aprobar');

        // Recargar ambas listas
        cargarPendientes();
        cargarPublicadas();

    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un problema al aprobar la reseña');
    }
}

// RECHAZAR RESEÑA \\

async function rechazarResena(id) {
    if (!confirm('¿Rechazar esta reseña? Se eliminará permanentemente.')) return;

    try {
        const respuesta = await fetch(`${API_URL}/admin/${id}`, {
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

// ELIMINAR RESEÑA \\

async function eliminarResenaPublicada(id) {

    if (!confirm('¿Eliminar esta reseña publicada? Desaparecerá del sitio web permanentemente.')) {
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/admin/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${tokenSesion}` }
        });

        if (!respuesta.ok) {
            const errorData = await respuesta.json();
            throw new Error('Error al eliminar');
        }

        cargarPublicadas();

    } catch (error) {
        console.error('Error:', error);
        alert('Hubo un problema al eliminar la reseña');
    }
}

// INICIO \\

document.addEventListener('DOMContentLoaded', () => {
    // Conectar el botón de login
    document.getElementById('login-btn').addEventListener('click', hacerLogin);

    // Permitir login con Enter
    document.getElementById('login-password').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') hacerLogin();
    });

    // Si ya hay token guardado (recargó la página), entrar directo
    if (tokenSesion) {
        mostrarPanel();
        cargarPendientes();
        cargarPublicadas();
    }
});