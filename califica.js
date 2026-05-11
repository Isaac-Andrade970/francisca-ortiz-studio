
// PÁGINA CALIFICAR SERVICIO \\

const API_URL = 'http://localhost:3000/api/resenas';

// Estado actual de la calificación
let calificacionSeleccionada = 0;

// Mensajes según la calificación
const mensajesFeedback = {
    0: 'Selecciona estrellas',
    1: 'No fue lo que esperabas',
    2: 'Podemos mejorar',
    3: 'Una experiencia regular',
    4: 'Te gustó bastante',
    5: '¡Excelente experiencia!'
};

// OBTENER TOKEN DE LA URL \\

function obtenerToken() {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
}

// MOSTRAR ESTADOS \\

function mostrarEstado(estadoId) {
    document.querySelectorAll('.resena-state').forEach((el) => {
        el.style.display = 'none';
    });
    document.getElementById(estadoId).style.display = 'block';
}

// VERIFICAR TOKEN AL CARGAR \\

async function verificarToken() {
    const token = obtenerToken();

    if (!token) {
        mostrarEstado('resena-error');
        return;
    }

    try {
        const respuesta = await fetch(`${API_URL}/verificar?token=${token}`);

        if (!respuesta.ok) {
            mostrarEstado('resena-error');
            return;
        }

        const datos = await respuesta.json();

        // Mostrar formulario con los datos de la reserva
        document.getElementById('cliente-nombre').textContent = datos.cliente;
        document.getElementById('servicio-nombre').textContent = datos.servicio;
        mostrarEstado('resena-form');

    } catch (error) {
        console.error('Error al verificar token:', error);
        mostrarEstado('resena-error');
    }
}

// ESTRELLAS INTERACTIVAS \\

function inicializarEstrellas() {
    const estrellas = document.querySelectorAll('.stars-input .star');
    const feedback = document.getElementById('rating-feedback');
    const botonEnviar = document.getElementById('enviar-resena');

    estrellas.forEach((estrella) => {
        estrella.addEventListener('click', () => {
            const valor = parseInt(estrella.getAttribute('data-value'));
            calificacionSeleccionada = valor;

            // Marcar visualmente las estrellas
            estrellas.forEach((s, indice) => {
                if (indice < valor) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });

            // Actualizar texto feedback
            feedback.textContent = mensajesFeedback[valor];

            // Habilitar botón si hay calificación
            botonEnviar.disabled = false;
        });

        // Hover effect (visual preview)
        estrella.addEventListener('mouseenter', () => {
            const valor = parseInt(estrella.getAttribute('data-value'));
            estrellas.forEach((s, indice) => {
                if (indice < valor) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });

    // Al sacar el mouse, restaurar al estado seleccionado
    document.getElementById('stars-input').addEventListener('mouseleave', () => {
        estrellas.forEach((s, indice) => {
            if (indice < calificacionSeleccionada) {
                s.classList.add('active');
            } else {
                s.classList.remove('active');
            }
        });
    });
}

// CONTADOR DE CARACTERES \\

function inicializarContador() {
    const textarea = document.getElementById('comentario');
    const contador = document.getElementById('char-count');

    textarea.addEventListener('input', () => {
        contador.textContent = textarea.value.length;
    });
}

// ENVIAR RESEÑA \\

async function enviarResena() {
    const token = obtenerToken();
    const comentario = document.getElementById('comentario').value.trim();
    const boton = document.getElementById('enviar-resena');

    if (calificacionSeleccionada === 0) {
        alert('Por favor, selecciona una calificación');
        return;
    }

    if (comentario.length < 10) {
        alert('Escribe un comentario un poco más largo (al menos 10 caracteres)');
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Enviando...';

    try {
        const respuesta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                calificacion: calificacionSeleccionada,
                comentario: comentario
            })
        });

        if (!respuesta.ok) {
            const error = await respuesta.json();
            throw new Error(error.error || 'Error al enviar');
        }

        mostrarEstado('resena-success');

    } catch (error) {
        console.error('Error al enviar reseña:', error);
        alert('Hubo un problema al enviar tu reseña. Intenta de nuevo.');
        boton.disabled = false;
        boton.textContent = 'Enviar reseña';
    }
}

// INICIO \\

document.addEventListener('DOMContentLoaded', () => {
    inicializarEstrellas();
    inicializarContador();
    document.getElementById('enviar-resena').addEventListener('click', enviarResena);

    verificarToken();
});