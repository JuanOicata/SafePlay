// main.js - Versión simplificada para debugging
console.log('🚀 Cargando SteamGuard...');

// Función principal que se ejecuta cuando el DOM está listo
function initSteamGuard() {
    console.log('✅ DOM cargado, inicializando...');

    try {
        // Configurar navegación básica
        setupBasicNavigation();

        // Configurar animaciones básicas
        setupBasicAnimations();

        // Configurar botones
        setupButtons();

        console.log('✅ SteamGuard inicializado correctamente');

        // Mostrar mensaje de éxito
        showNotification('¡Aplicación cargada exitosamente! 🎮', 'success');

    } catch (error) {
        console.error('❌ Error al inicializar:', error);
        showErrorMessage(error.message);
    }
}

// Configurar navegación básica
function setupBasicNavigation() {
    // Smooth scrolling para enlaces internos
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

    console.log('📱 Navegación configurada');
}

// Configurar animaciones básicas
function setupBasicAnimations() {
    // Animaciones de scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible', 'animate');
            }
        });
    }, observerOptions);

    // Observar elementos
    document.querySelectorAll('.fade-in, .feature-card, .user-card').forEach(el => {
        observer.observe(el);
    });

    // Efecto de header al hacer scroll
    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            requestAnimationFrame(function() {
                const scrolled = window.pageYOffset;
                const header = document.querySelector('header');

                if (header) {
                    if (scrolled > 50) {
                        header.style.background = 'rgba(255, 255, 255, 0.98)';
                        header.style.boxShadow = '0 2px 30px rgba(135, 206, 235, 0.4)';
                    } else {
                        header.style.background = 'rgba(255, 255, 255, 0.95)';
                        header.style.boxShadow = '0 2px 20px rgba(135, 206, 235, 0.3)';
                    }
                }
                ticking = false;
            });
            ticking = true;
        }
    });

    console.log('🎭 Animaciones configuradas');
}

// Configurar botones
function setupButtons() {
    // Botón de registro
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleButtonClick(this, 'Redirigiendo a registro...');
            setTimeout(() => {
                window.location.href = '/registro';
            }, 500);
        });
    }

    // Botón de login
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleButtonClick(this, 'Redirigiendo a iniciar sesión...');
            setTimeout(() => {
                window.location.href = '/login';
            }, 500);
        });
    }

    // Botón de comenzar
    const startBtn = document.getElementById('startBtn');
    if (startBtn) {
        startBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleButtonClick(this, '¡Comenzemos!');
        });
    }

    // Botón de características
    const featuresBtn = document.getElementById('featuresBtn');
    if (featuresBtn) {
        featuresBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const featuresSection = document.getElementById('features');
            if (featuresSection) {
                featuresSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    }

    console.log('🔘 Botones configurados');
}

// Manejar clics de botones con animación
function handleButtonClick(button, message) {
    if (button.classList.contains('loading')) return;

    button.classList.add('loading');
    button.style.opacity = '0.7';
    button.style.transform = 'scale(0.98)';

    setTimeout(() => {
        button.classList.remove('loading');
        button.style.opacity = '1';
        button.style.transform = 'scale(1)';

        showNotification(message, 'info');
        console.log('Botón clickeado:', button.textContent);
    }, 300);
}

// Mostrar notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.textContent = message;

    // Estilos
    const colors = {
        info: '#87CEEB',
        success: '#28a745',
        error: '#dc3545'
    };

    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        border-radius: 8px;
        background: ${colors[type] || colors.info};
        color: white;
        font-weight: 600;
        z-index: 9999;
        opacity: 0;
        transform: translateX(100px);
        transition: all 0.3s ease;
    `;

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

// Mostrar mensaje de error
function showErrorMessage(errorMsg) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #dc3545;
        color: white;
        padding: 20px 30px;
        border-radius: 8px;
        z-index: 9999;
        font-weight: 600;
        text-align: center;
        max-width: 90%;
    `;
    errorDiv.innerHTML = `
        <h3>Error al cargar</h3>
        <p>${errorMsg}</p>
        <button onclick="location.reload()" style="
            background: white;
            color: #dc3545;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            margin-top: 10px;
            cursor: pointer;
            font-weight: 600;
        ">Recargar página</button>
    `;
    document.body.appendChild(errorDiv);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSteamGuard);
} else {
    initSteamGuard();
}