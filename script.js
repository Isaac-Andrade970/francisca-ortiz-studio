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
