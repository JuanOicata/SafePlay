// login.js - Funcionalidad para el formulario de login

class LoginManager {
    constructor() {
        this.form = null;
        this.fields = {};
        this.isSubmitting = false;
        this.connectionStatus = 'online';

        this.init();
    }

    init() {
        console.log('🔐 Inicializando login...');

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        try {
            this.form = document.getElementById('loginForm');
            this.setupFields();
            this.setupEventListeners();
            this.setupPasswordToggle();
            this.setupConnectionStatus();
            this.setupRememberMe();

            console.log('✅ Login configurado correctamente');
        } catch (error) {
            console.error('❌ Error al configurar login:', error);
        }
    }

    setupFields() {
        this.fields = {
            usuario: document.getElementById('usuario'),
            password: document.getElementById('password'),
            remember: document.getElementById('remember')
        };
    }

    setupEventListeners() {
        // Validación básica en tiempo real
        this.fields.usuario.addEventListener('blur', () => this.validateUsuario());
        this.fields.password.addEventListener('blur', () => this.validatePassword());

        // Limpiar errores al escribir
        this.fields.usuario.addEventListener('input', () => this.clearFieldError('usuario'));
        this.fields.password.addEventListener('input', () => this.clearFieldError('password'));

        // Envío del formulario
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Login con Steam
        const steamBtn = document.getElementById('steamLogin');
        if (steamBtn) {
            steamBtn.addEventListener('click', () => this.handleSteamLogin());
        }

        // Enter para enviar
        this.form.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isSubmitting) {
                this.handleSubmit(e);
            }
        });
    }
    // Agrega esta función dentro de tu clase LoginManager

    setSubmitLoading(isLoading) {
        const submitButton = this.form.querySelector('button[type="submit"]');
        const spinner = submitButton?.querySelector('.loading-spinner');

        if (submitButton) {
            submitButton.disabled = isLoading;

            if (isLoading) {
                // Cambiar texto y deshabilitar botón
                submitButton.innerHTML = `
                    <span class="loading-spinner">⏳</span>
                    <span>Iniciando sesión...</span>
                `;
                submitButton.classList.add('loading');
            } else {
                // Restaurar estado normal
                submitButton.innerHTML = 'Iniciar Sesión';
                submitButton.classList.remove('loading');
            }
        }
    }

    // También agrega esta función para mostrar mensajes
    showFormMessage(message, type = 'info') {
        // Buscar o crear elemento para mostrar mensajes
        let messageElement = document.getElementById('form-message');

        if (!messageElement) {
            messageElement = document.createElement('div');
            messageElement.id = 'form-message';
            messageElement.className = 'form-message';

            // Insertar antes del formulario
            this.form.parentNode.insertBefore(messageElement, this.form);
        }

        // Limpiar clases anteriores
        messageElement.className = `form-message ${type}`;
        messageElement.textContent = message;
        messageElement.style.display = 'block';

        // Auto-ocultar después de 5 segundos si es éxito
        if (type === 'success') {
            setTimeout(() => {
                messageElement.style.display = 'none';
            }, 5000);
        }
    }

    // Y esta función para manejar errores de login
    handleLoginError(error) {
        let message = 'Error al iniciar sesión';

        if (error.message) {
            if (error.message.includes('conexión')) {
                message = 'Error de conexión. Verifica tu internet.';
            } else if (error.message.includes('credenciales')) {
                message = 'Usuario o contraseña incorrectos.';
            } else {
                message = error.message;
            }
        }

        this.showFormMessage(message, 'error');
    }
    setupPasswordToggle() {
        const toggleBtn = document.getElementById('togglePassword');
        const passwordField = this.fields.password;

        toggleBtn.addEventListener('click', () => {
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            toggleBtn.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    setupConnectionStatus() {
        // Crear indicador de estado de conexión
        const statusIndicator = document.createElement('div');
        statusIndicator.className = 'connection-status';
        statusIndicator.id = 'connectionStatus';
        statusIndicator.innerHTML = `
                <div class="status-indicator"></div>
                <span>Conectado al servidor</span>
            `;

        // Insertar después del formulario
        const form = this.form;
        form.parentNode.insertBefore(statusIndicator, form.nextSibling);

        // Simular verificación de conexión
        this.checkConnection();
        setInterval(() => this.checkConnection(), 30000); // Verificar cada 30 segundos
    }
    checkConnection() {
        console.log("🔌 Verificando conexión con el servidor...");
        // Aquí luego puedes implementar un ping a tu backend
        return true; // Por ahora solo simula que la conexión está bien
    }

    setupRememberMe() {
        // Cargar usuario recordado si existe
        const rememberedUser = localStorage.getItem('steamguard_remember_user');
        if (rememberedUser) {
            this.fields.usuario.value = rememberedUser;
            this.fields.remember.checked = true;
        }
    }

    validateUsuario() {
        const usuario = this.fields.usuario.value.trim();

        if (!usuario) {
            this.showFieldError('usuario', 'Ingresa tu usuario o email');
            return false;
        }

        if (usuario.length < 3) {
            this.showFieldError('usuario', 'Usuario debe tener al menos 3 caracteres');
            return false;
        }

        this.clearFieldError('usuario');
        return true;
    }

    validatePassword() {
        const password = this.fields.password.value;

        if (!password) {
            this.showFieldError('password', 'Ingresa tu contraseña');
            return false;
        }

        if (password.length < 6) {
            this.showFieldError('password', 'Contraseña muy corta');
            return false;
        }

        this.clearFieldError('password');
        return true;
    }

    showFieldError(fieldName, message) {
        const field = this.fields[fieldName];
        const errorElement = document.getElementById(`${fieldName}-error`);

        field.classList.add('error');

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    clearFieldError(fieldName) {
        const field = this.fields[fieldName];
        const errorElement = document.getElementById(`${fieldName}-error`);

        field.classList.remove('error');

        if (errorElement) {
            errorElement.classList.remove('show');
            setTimeout(() => {
                errorElement.textContent = '';
            }, 300);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) return;

        console.log('🔑 Iniciando sesión...');

        // Validar campos
        const isUsuarioValid = this.validateUsuario();
        const isPasswordValid = this.validatePassword();

        if (!isUsuarioValid || !isPasswordValid) {
            this.showFormMessage('Por favor completa todos los campos', 'error');
            return;
        }

        try {
            this.setSubmitLoading(true);
            this.isSubmitting = true;

            // Obtener datos del formulario
            const loginData = {
                usuario: this.fields.usuario.value.trim(),
                password: this.fields.password.value,
                remember: this.fields.remember.checked
            };

            // Enviar datos de login al backend
            const response = await this.submitLogin(loginData);

            if (response.success) {
                // Guardar usuario si se marcó "recordar"
                if (loginData.remember) {
                    localStorage.setItem('steamguard_remember_user', loginData.usuario);
                } else {
                    localStorage.removeItem('steamguard_remember_user');
                }

                this.showFormMessage('¡Login exitoso! Redirigiendo...', 'success');

                // 🔥 Usar la URL que manda el backend
                setTimeout(() => {
                    window.location.href = response.redirectUrl;
                }, 1500);

            } else {
                throw new Error(response.message || 'Credenciales incorrectas');
            }

        } catch (error) {
            console.error('Error en login:', error);
            this.handleLoginError(error);
        } finally {
            this.setSubmitLoading(false);
            this.isSubmitting = false;
        }
    }


    async submitLogin(loginData) {
        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    usuario: loginData.usuario,
                    password: loginData.password
                })
            });

            const data = await response.json();
            return data;

        } catch (error) {
            console.error('❌ Error en submitLogin:', error);
            return { success: false, message: 'Error de conexión con el servidor' };
        }
    }


    // 🚀 Login con Steam
    async handleSteamLogin() {
        try {
            console.log("🔗 Solicitando URL de autenticación de Steam...");

            // Hacer la petición a tu backend para obtener la URL de Steam
            const response = await fetch('/api/steam/auth-url');
            const data = await response.json();

            if (data.url) {
                console.log("🌐 Redirigiendo a Steam:", data.url);
                window.location.href = data.url; // Redirige a Steam
            } else {
                throw new Error("No se recibió URL de autenticación desde el servidor");
            }

        } catch (error) {
            console.error("❌ Error iniciando login con Steam:", error);

            alert(`Error iniciando login con Steam: ${error.message || 'Error desconocido'}`);
        }
    }

}
// Iniciar LoginManager cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});