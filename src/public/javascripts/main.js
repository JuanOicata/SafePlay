// main.js - Archivo principal de la aplicación

class SteamGuardApp {
    constructor() {
        this.animationManager = null;
        this.navigationManager = null;
        this.isInitialized = false;

        this.init();
    }

    // Inicializar la aplicación
    init() {
        // Esperar a que el DOM esté completamente cargado
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    // Configurar todos los componentes
    setup() {
        try {
            console.log('🚀 Inicializando SteamGuard...');

            // Inicializar managers
            this.animationManager = new AnimationManager();
            this.navigationManager = new NavigationManager();

            // Conectar managers
            this.navigationManager.setAnimationManager(this.animationManager);

            // Configurar eventos globales
            this.setupGlobalEvents();

            // Configurar utilidades
            this.setupUtilities();

            // Marcar como inicializado
            this.isInitialized = true;

            console.log('✅ SteamGuard inicializado correctamente');

            // Mostrar mensaje de bienvenida
            setTimeout(() => {
                this.showWelcomeMessage();
            }, 1000);

        } catch (error) {
            console.error('❌ Error al inicializar SteamGuard:', error);
            this.handleInitError(error);
        }
    }

    // Configurar eventos globales
    setupGlobalEvents() {
        // Manejar errores globales
        window.addEventListener('error', (e) => {
            console.error('Error global:', e.error);
            this.handleError(e.error);
        });

        // Manejar resize de ventana
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.handleResize();
            }, 250);
        });

        // Manejar visibilidad de la página
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.onPageVisible();
            } else {
                this.onPageHidden();
            }
        });

        // Prevenir zoom excesivo en móviles
        this.preventMobileZoom();
    }

    // Configurar utilidades adicionales
    setupUtilities() {
        // Configurar tooltips si los necesitas
        this.setupTooltips();

        // Configurar lazy loading para imágenes
        this.setupLazyLoading();

        // Configurar analytics si los necesitas
        this.setupAnalytics();
    }

    // Configurar tooltips
    setupTooltips() {
        const tooltipElements = document.querySelectorAll('[data-tooltip]');
        tooltipElements.forEach(element => {
            element.addEventListener('mouseenter', this.showTooltip.bind(this));
            element.addEventListener('mouseleave', this.hideTooltip.bind(this));
        });
    }

    // Mostrar tooltip
    showTooltip(e) {
        const element = e.target;
        const text = element.getAttribute('data-tooltip');

        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = text;
        tooltip.style.cssText = `
            position: absolute;
            background: #333;
            color: white;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 14px;
            z-index: 10000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        document.body.appendChild(tooltip);

        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + (rect.width / 2) - (tooltip.offsetWidth / 2) + 'px';
        tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + 'px';

        setTimeout(() => tooltip.style.opacity = '1', 10);

        element._tooltip = tooltip;
    }

    // Ocultar tooltip
    hideTooltip(e) {
        const element = e.target;
        if (element._tooltip) {
            element._tooltip.style.opacity = '0';
            setTimeout(() => {
                if (element._tooltip && element._tooltip.parentNode) {
                    element._tooltip.parentNode.removeChild(element._tooltip);
                }
                element._tooltip = null;
            }, 300);
        }
    }

    // Configurar lazy loading
    setupLazyLoading() {
        const images = document.querySelectorAll('img[data-src]');
        const imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        });

        images.forEach(img => imageObserver.observe(img));
    }

    // Configurar analytics (placeholder)
    setupAnalytics() {
        // Aquí puedes agregar Google Analytics, Mixpanel, etc.
        console.log('📊 Analytics configurado');
    }

    // Prevenir zoom excesivo en móviles
    preventMobileZoom() {
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    // Manejar cambio de tamaño de ventana
    handleResize() {
        if (this.animationManager) {
            // Recalcular animaciones si es necesario
            console.log('📱 Redimensionando ventana');
        }
    }

    // Cuando la página se vuelve visible
    onPageVisible() {
        console.log('👁️ Página visible');
        // Reanudar animaciones, actualizar datos, etc.
    }

    // Cuando la página se oculta
    onPageHidden() {
        console.log('🙈 Página oculta');
        // Pausar animaciones, guardar estado, etc.
    }

    // Mostrar mensaje de bienvenida
    showWelcomeMessage() {
        if (this.navigationManager) {
            this.navigationManager.showNotification(
                '¡Bienvenido a SteamGuard! 🎮',
                'success'
            );
        }
    }

    // Manejar errores de inicialización
    handleInitError(error) {
        console.error('Error de inicialización:', error);

        // Mostrar mensaje de error al usuario
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: #dc3545;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            z-index: 9999;
            font-weight: 600;
        `;
        errorDiv.textContent = 'Error al cargar la aplicación. Por favor, recarga la página.';
        document.body.appendChild(errorDiv);
    }

    // Manejar errores generales
    handleError(error) {
        console.error('Error:', error);
        // Aquí puedes enviar errores a un servicio de logging
    }

    // Método para obtener información del sistema
    getSystemInfo() {
        return {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            screenResolution: `${screen.width}x${screen.height}`,
            isInitialized: this.isInitialized,
            timestamp: new Date().toISOString()
        };
    }

    // Método para cleanup cuando se cierre la aplicación
    destroy() {
        if (this.animationManager) {
            this.animationManager.destroy();
        }

        console.log('🧹 Aplicación limpiada');
    }
}

// Inicializar la aplicación cuando se cargue el script
const app = new SteamGuardApp();

// Hacer la app accesible globalmente para debugging
window.SteamGuardApp = app;