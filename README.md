# Francisca Ortiz Studio 💇‍♀️

Sitio web para **Francisca Ortiz Peluquería y Manicure**, un negocio real. Permite a las clientas reservar horas en línea, reagendar, comprar productos y calificar el servicio, y a la dueña administrar todo desde un panel.

🔗 **Sitio en vivo:** [franciscaortizstudio.cl](https://franciscaortizstudio.cl/)  
⚙️ **Backend:** [francisca-ortiz-backend](https://github.com/Isaac-Andrade970/francisca-ortiz-backend)

<!-- Agrega aquí 1 o 2 capturas o un GIF del sitio funcionando -->

## Funcionalidades

- **Reservas en línea** de servicios, sincronizadas con Google Calendar
- **Reagendamiento** de horas por parte de la clienta
- **Tienda** de productos con flujo de pago
- **Reseñas:** las clientas califican el servicio después de su atención
- **Panel de administración** para gestionar reservas, productos y moderar reseñas

## Tecnologías

- **Frontend:** HTML, CSS y JavaScript
- **Backend:** Node.js y Express (repositorio aparte), Firebase, Google Calendar API
- **Trabajo en equipo:** metodología ágil Scrum

## Estructura

| Archivo | Qué hace |
|---|---|
| `index.html` | Página principal |
| `servicios.html` | Catálogo de servicios |
| `reservar.html` / `reagendar.html` | Reserva y cambio de hora |
| `tienda.html` / `pago-exitoso.html` | Tienda y confirmación de pago |
| `califica-tu-servicio.html` | Formulario de reseñas |
| `admin.html` / `admin-resenas.html` | Panel de administración |
| `config.js` | Detecta si corre en local o en producción y define la URL de la API |

## Cómo ejecutarlo en local

1. Levanta el [backend](https://github.com/Isaac-Andrade970/francisca-ortiz-backend) en `http://localhost:3000`.
2. Abre `index.html` con un servidor local (por ejemplo, la extensión Live Server de VS Code).

## Autor

Isaac Andrade · [LinkedIn](https://www.linkedin.com/in/isaac-andrade-6652142b1/) · [GitHub](https://github.com/Isaac-Andrade970)
