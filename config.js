// CONFIGURACIÓN CENTRAL \\

// Detecta si estás en tu computador (local) o en el sitio publicado
const EN_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';

const API_URL = EN_LOCAL
    ? 'http://localhost:3000/api'
    : 'https://francisca-ortiz-backend.onrender.com/api';