class HomePage {
    constructor() {
        this.events = [];
        this.init();
    }

    init() {
        this.loadFeaturedEvents();
        this.setupEventListeners();
        this.setupScrollEffects();
    }

    setupEventListeners() {
        // Buscar eventos ao digitar na search
        const searchInput = document.querySelector('.search-input input');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce(this.searchEvents.bind(this), 300));
        }

        // Menu mobile
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', this.toggleMobileMenu);
        }
    }

    setupScrollEffects() {
        // Animação suave para links âncora
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Navbar scroll effect
        window.addEventListener('scroll', this.debounce(this.handleScroll.bind(this), 10));
    }

    handleScroll() {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(255, 255, 255, 0.95)';
            navbar.style.backdropFilter = 'blur(10px)';
        } else {
            navbar.style.background = 'var(--text-white)';
            navbar.style.backdropFilter = 'none';
        }
    }

    async loadFeaturedEvents() {
        try {
            // Simulação de dados - depois substituir por API real
            this.events = [
                {
                    id: 1,
                    title: "Festival de Rock Nacional",
                    date: "15 de Dezembro, 2024",
                    location: "São Paulo, SP",
                    price: "R$ 120,00",
                    image: "assets/images/event-1.jpg"
                },
                {
                    id: 2,
                    title: "Show de Sertanejo",
                    date: "20 de Dezembro, 2024",
                    location: "Rio de Janeiro, RJ",
                    price: "R$ 80,00",
                    image: "assets/images/event-2.jpg"
                },
                {
                    id: 3,
                    title: "Festival EDM",
                    date: "18 de Dezembro, 2024",
                    location: "Belo Horizonte, MG",
                    price: "R$ 150,00",
                    image: "assets/images/event-3.jpg"
                },
                {
                    id: 4,
                    title: "Peça Teatral - Hamlet",
                    date: "22 de Dezembro, 2024",
                    location: "Brasília, DF",
                    price: "R$ 60,00",
                    image: "assets/images/event-4.jpg"
                }
            ];

            this.renderEvents(this.events);
        } catch (error) {
            console.error('Erro ao carregar eventos:', error);
        }
    }

    renderEvents(events) {
        const eventsGrid = document.getElementById('eventsGrid');
        if (!eventsGrid) return;

        eventsGrid.innerHTML = events.map(event => `
            <div class="event-card" data-event-id="${event.id}">
                <img src="${event.image}" alt="${event.title}" onerror="this.src='assets/images/event-placeholder.jpg'">
                <div class="event-card-content">
                    <h3 class="event-card-title">${event.title}</h3>
                    <div class="event-card-date">${event.date}</div>
                    <div class="event-card-location">${event.location}</div>
                    <div class="event-card-price">${event.price}</div>
                    <button class="btn-event" onclick="home.buyTicket(${event.id})">
                        Comprar Ingresso
                    </button>
                </div>
            </div>
        `).join('');
    }

    searchEvents(event) {
        const searchTerm = event.target.value.toLowerCase();
        
        if (searchTerm.length === 0) {
            this.renderEvents(this.events);
            return;
        }

        const filteredEvents = this.events.filter(event => 
            event.title.toLowerCase().includes(searchTerm) ||
            event.location.toLowerCase().includes(searchTerm)
        );

        this.renderEvents(filteredEvents);
    }

    buyTicket(eventId) {
        // Redirecionar para login ou página de compra
        window.location.href = `login.html?event=${eventId}`;
    }

    toggleMobileMenu() {
        const navLinks = document.querySelector('.nav-links');
        const navActions = document.querySelector('.nav-actions');
        
        navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
        navActions.style.display = navActions.style.display === 'flex' ? 'none' : 'flex';
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Inicializar a página
const home = new HomePage();
