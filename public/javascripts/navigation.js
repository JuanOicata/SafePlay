// navigation.js - Manejo de navegación y routing

class NavigationManager {
    constructor() {
        this.currentPage = 'home';
        this.animationManager = null;
        this.init();
    }

    init() {
        this.setupSmoothScrolling();
        this.setupButtonHandlers();
    }

    // Configurar smooth scrolling para enlaces internos
    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    this.smoothScrollTo(target);
                }
            });
        });
    }

    // Smooth scroll personalizado
    smoothScrollTo(target) {
        const headerHeight = 80; // Altura del header fijo
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
        });
    }

    // Configurar manejadores de botones
    setupButtonHandlers() {
        // Botón de registro
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            registerBtn.addEventListener('click', (e) => this.handleRegister(e));
        }

        // Botón de login
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.addEventListener('click', (e) => this.handleLogin(e));
        }

        // Botón de comenzar
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.addEventListener('click', (e) => this.handleStart(e));
        }

        // Botón de características
        const featuresBtn = document.getElementById('featuresBtn');
        if (featuresBtn) {
            featuresBtn.addEventListener('click', (e) => this.handleFeatures(e));
        }
    }

    // Manejador de registro
    async handleRegister(e) {
        e.preventDefault();
        const button = e.target;

        if (this.animationManager) {
            await this.animationManager.animateButton(button);
        }

        console.log('Navegando a registro...');
        this.showNotification('Redirigiendo a registro...', 'info');

        // Aquí iría la lógica real de navegación
        // window.location.href = '/register';
    }

    // Manejador de login
    async handleLogin(e) {
        e.preventDefault();
        const button = e.target;

        if (this.animationManager) {
            await this.animationManager.animateButton(button);
        }

        console.log('Navegando a login...');
        this.showNotification('Redirigiendo a iniciar sesión...', 'info');

        // Aquí iría la lógica real de navegación
        // window.location.href = '/login';
    }

    // Manejador de comenzar
    async handleStart(e) {
        e.preventDefault();
        const button = e.target;

        if (this.animationManager) {
            await this.animationManager.animateButton(button);
        }

        console.log('Comenzando...');
        this.showNotification('¡Comenzemos!', 'success');

        // Aquí podrías redirigir a registro o dashboard
        // this.handleRegister(e);
    }

    // Manejador de características
    handleFeatures(e) {
        e.preventDefault();
        const featuresSection = document.getElementById('features');
        if (featuresSection) {
            this.smoothScrollTo(featuresSection);
        }
    }

    // Mostrar notificaciones
    showNotification(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Estilos
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 25px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '600',
            zIndex: '9999',
            opacity: '0',
            transform: 'translateX(100px)',
            transition: 'all 0.3s ease'
        });

        // Colores según tipo
        const colors = {
            info: '#87CEEB',
            success: '#28a745',
            error: '#dc3545',
            warning: '#ffc107'
        };
        notification.style.backgroundColor = colors[type] || colors.info;

        // Agregar al DOM
        document.body.appendChild(notification);

        // Animar entrada
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);

        // Remover después de 3 segundos
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100px)';

            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    // Configurar animation manager
    setAnimationManager(animationManager) {
        this.animationManager = animationManager;
    }

    // Navegación programática
    navigateTo(page) {
        console.log(`Navegando a: ${page}`);
        this.currentPage = page;

        // Aquí implementarías la lógica de routing real
        // Ejemplo: cambiar contenido, actualizar URL, etc.
    }

    // Obtener página actual
    getCurrentPage() {
        return this.currentPage;
    }
}

// Exportar para uso global
window.NavigationManager = NavigationManager;