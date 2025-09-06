// animations.js - Manejo de todas las animaciones

class AnimationManager {
    constructor() {
        this.observer = null;
        this.init();
    }

    init() {
        this.setupScrollAnimations();
        this.setupScrollEffects();
    }

    // Configurar animaciones de scroll
    setupScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible', 'animate');
                }
            });
        }, observerOptions);

        // Observar elementos para animaciones
        this.observeElements();
    }

    // Observar elementos específicos
    observeElements() {
        const elementsToObserve = document.querySelectorAll(
            '.fade-in, .feature-card, .user-card'
        );

        elementsToObserve.forEach(el => {
            this.observer.observe(el);
        });
    }

    // Efectos de scroll en el header
    setupScrollEffects() {
        let ticking = false;

        const updateHeader = () => {
            const scrolled = window.pageYOffset;
            const header = document.querySelector('header');

            if (scrolled > 50) {
                header.style.background = 'rgba(255, 255, 255, 0.98)';
                header.style.boxShadow = '0 2px 30px rgba(135, 206, 235, 0.4)';
            } else {
                header.style.background = 'rgba(255, 255, 255, 0.95)';
                header.style.boxShadow = '0 2px 20px rgba(135, 206, 235, 0.3)';
            }

            ticking = false;
        };

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(updateHeader);
                ticking = true;
            }
        });
    }

    // Animación de botones con loading
    animateButton(button) {
        if (button.classList.contains('loading')) {
            return false;
        }

        button.classList.add('loading');
        button.style.opacity = '0.7';
        button.style.transform = 'scale(0.98)';

        return new Promise(resolve => {
            setTimeout(() => {
                button.classList.remove('loading');
                button.style.opacity = '1';
                button.style.transform = 'scale(1)';
                resolve();
            }, 300);
        });
    }

    // Animación de fade in personalizada
    fadeIn(element, delay = 0) {
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';

        setTimeout(() => {
            element.style.transition = 'all 0.6s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, delay);
    }

    // Animación de pulse
    pulse(element) {
        element.style.transform = 'scale(1.05)';

        setTimeout(() => {
            element.style.transform = 'scale(1)';
        }, 150);
    }

    // Limpiar observer cuando sea necesario
    destroy() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }
}

// Exportar para uso global
window.AnimationManager = AnimationManager;