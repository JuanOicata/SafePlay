// registro.js - Funcionalidad para el formulario de registro

class RegistroManager {
    constructor() {
        this.form = null;
        this.fields = {};
        this.validators = {};
        this.isSubmitting = false;

        this.init();
    }

    init() {
        console.log('🚀 Inicializando registro...');

        // Esperar a que el DOM esté listo
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        try {
            this.form = document.getElementById('registroForm');
            this.setupFields();
            this.setupValidators();
            this.setupEventListeners();
            this.setupPasswordStrength();
            this.setupTogglePassword();

            console.log('✅ Registro configurado correctamente');
        } catch (error) {
            console.error('❌ Error al configurar registro:', error);
        }
    }

    setupFields() {
        this.fields = {
            nombre: document.getElementById('nombre'),
            usuario: document.getElementById('usuario'),
            correo: document.getElementById('correo'),
            telefono: document.getElementById('telefono'),
            cedula: document.getElementById('cedula'),
            rol: document.getElementById('rol'),
            password: document.getElementById('password'),
            confirmPassword: document.getElementById('confirmPassword'),
            terms: document.getElementById('terms')
        };
    }

    setupValidators() {
        this.validators = {
            nombre: {
                required: true,
                minLength: 2,
                pattern: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
                message: 'Ingresa un nombre válido (solo letras y espacios)'
            },
            usuario: {
                required: true,
                minLength: 3,
                maxLength: 20,
                pattern: /^[a-zA-Z0-9_]+$/,
                message: 'Usuario debe tener 3-20 caracteres (letras, números y _)'
            },
            correo: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Ingresa un correo electrónico válido'
            },
            telefono: {
                required: true,
                pattern: /^[\+]?[\d\s\-\(\)]+$/,
                minLength: 10,
                message: 'Ingresa un número de teléfono válido'
            },
            cedula: {
                required: true,
                pattern: /^\d{6,12}$/,
                message: 'Cédula debe tener entre 6 y 12 dígitos'
            },
            rol: {
                required: true,
                message: 'Selecciona un tipo de usuario'
            },
            password: {
                required: true,
                minLength: 8,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
                message: 'La contraseña debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y símbolo'
            },
            confirmPassword: {
                required: true,
                custom: (value) => value === this.fields.password.value,
                message: 'Las contraseñas no coinciden'
            },
            terms: {
                required: true,
                custom: (value) => value === true,
                message: 'Debes aceptar los términos y condiciones'
            }
        };
    }

    setupEventListeners() {
        // Validación en tiempo real
        Object.keys(this.fields).forEach(fieldName => {
            const field = this.fields[fieldName];
            if (field && fieldName !== 'terms') {
                field.addEventListener('blur', () => this.validateField(fieldName));
                field.addEventListener('input', () => this.clearFieldError(fieldName));
            }
        });

        // Validación especial para confirmación de contraseña
        this.fields.confirmPassword.addEventListener('input', () => {
            this.validateField('confirmPassword');
        });

        this.fields.password.addEventListener('input', () => {
            this.validateField('confirmPassword');
        });

        // Envío del formulario
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // Registro con Steam
        const steamBtn = document.getElementById('steamLogin');
        if (steamBtn) {
            steamBtn.addEventListener('click', () => this.handleSteamRegistration());
        }
    }

    setupPasswordStrength() {
        const passwordField = this.fields.password;
        const strengthIndicator = document.getElementById('passwordStrength');
        const strengthFill = strengthIndicator.querySelector('.strength-fill');
        const strengthText = strengthIndicator.querySelector('.strength-text');

        passwordField.addEventListener('input', () => {
            const password = passwordField.value;
            const strength = this.calculatePasswordStrength(password);

            strengthFill.className = `strength-fill ${strength.level}`;
            strengthText.textContent = strength.text;
        });
    }

    setupTogglePassword() {
        const toggleBtn = document.getElementById('togglePassword');
        const passwordField = this.fields.password;

        toggleBtn.addEventListener('click', () => {
            const type = passwordField.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordField.setAttribute('type', type);
            toggleBtn.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    calculatePasswordStrength(password) {
        let score = 0;
        const checks = {
            length: password.length >= 8,
            lowercase: /[a-z]/.test(password),
            uppercase: /[A-Z]/.test(password),
            numbers: /\d/.test(password),
            symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password)
        };

        score = Object.values(checks).filter(Boolean).length;

        if (password.length === 0) {
            return { level: '', text: 'Ingresa una contraseña' };
        } else if (score <= 2) {
            return { level: 'weak', text: 'Contraseña débil' };
        } else if (score === 3) {
            return { level: 'fair', text: 'Contraseña regular' };
        } else if (score === 4) {
            return { level: 'good', text: 'Contraseña buena' };
        } else {
            return { level: 'strong', text: 'Contraseña fuerte' };
        }
    }

    validateField(fieldName) {
        const field = this.fields[fieldName];
        const validator = this.validators[fieldName];
        const value = fieldName === 'terms' ? field.checked : field.value.trim();

        if (!validator) return true;

        // Verificar requerido
        if (validator.required && (!value || value === '')) {
            this.showFieldError(fieldName, 'Este campo es requerido');
            return false;
        }

        // Si está vacío y no es requerido, es válido
        if (!validator.required && !value) {
            this.clearFieldError(fieldName);
            return true;
        }

        // Verificar longitud mínima
        if (validator.minLength && value.length < validator.minLength) {
            this.showFieldError(fieldName, `Mínimo ${validator.minLength} caracteres`);
            return false;
        }

        // Verificar longitud máxima
        if (validator.maxLength && value.length > validator.maxLength) {
            this.showFieldError(fieldName, `Máximo ${validator.maxLength} caracteres`);
            return false;
        }

        // Verificar patrón
        if (validator.pattern && !validator.pattern.test(value)) {
            this.showFieldError(fieldName, validator.message);
            return false;
        }

        // Verificar validación personalizada
        if (validator.custom && !validator.custom(value)) {
            this.showFieldError(fieldName, validator.message);
            return false;
        }

        // Si llegó hasta aquí, es válido
        this.clearFieldError(fieldName);
        this.showFieldSuccess(fieldName);
        return true;
    }

    showFieldError(fieldName, message) {
        const field = this.fields[fieldName];
        const errorElement = document.getElementById(`${fieldName}-error`);

        field.classList.add('error');
        field.classList.remove('success');

        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.add('show');
        }
    }

    showFieldSuccess(fieldName) {
        const field = this.fields[fieldName];

        field.classList.remove('error');
        field.classList.add('success');
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

    validateAllFields() {
        let isValid = true;

        Object.keys(this.validators).forEach(fieldName => {
            if (!this.validateField(fieldName)) {
                isValid = false;
            }
        });

        return isValid;
    }

    async handleSubmit(e) {
        e.preventDefault();

        if (this.isSubmitting) return;

        console.log('📝 Enviando formulario de registro...');

        // Validar todos los campos
        if (!this.validateAllFields()) {
            this.showFormMessage('Por favor corrige los errores antes de continuar', 'error');
            return;
        }

        try {
            this.setSubmitLoading(true);
            this.isSubmitting = true;

            // Obtener datos del formulario
            const formData = this.getFormData();

            // Simular envío (aquí iría tu lógica real)
            const response = await this.submitRegistration(formData);

            if (response.success) {
                this.showFormMessage('¡Cuenta creada exitosamente! Redirigiendo...', 'success');
                setTimeout(() => {
                    window.location.href = '/login';
                }, 2000);
            } else {
                throw new Error(response.message || 'Error al crear la cuenta');
            }

        } catch (error) {
            console.error('Error en registro:', error);
            this.showFormMessage(error.message || 'Error al procesar el registro', 'error');
        } finally {
            this.setSubmitLoading(false);
            this.isSubmitting = false;
        }
    }

    getFormData() {
        const data = {};

        Object.keys(this.fields).forEach(fieldName => {
            const field = this.fields[fieldName];
            if (fieldName === 'terms') {
                data[fieldName] = field.checked;
            } else if (fieldName !== 'confirmPassword') {
                data[fieldName] = field.value.trim();
            }
        });

        return data;
    }

    async submitRegistration(formData) {
        // Simulación de envío - reemplazar con tu API real
        return new Promise((resolve) => {
            setTimeout(() => {
                // Simular respuesta exitosa
                resolve({
                    success: true,
                    message: 'Registro exitoso'
                });
            }, 2000);
        });

        // Implementación real:
        /*
        const response = await fetch('/api/registro', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        return await response.json();
        */
    }

    setSubmitLoading(loading) {
        const submitBtn = document.getElementById('submitBtn');
        const btnText = submitBtn.querySelector('.btn-text');
        const btnLoader = submitBtn.querySelector('.btn-loader');

        if (loading) {
            submitBtn.classList.add('loading');
            submitBtn.disabled = true;
        } else {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
        }
    }

    showFormMessage(message, type) {
        const messageElement = document.getElementById('formMessage');

        messageElement.textContent = message;
        messageElement.className = `form-message ${type} show`;

        if (type === 'error') {
            setTimeout(() => {
                messageElement.classList.remove('show');
            }, 5000);
        }
    }

    handleSteamRegistration() {
        console.log('🎮 Registro con Steam...');
        this.showFormMessage('Conectando con Steam...', 'info');

        // Aquí iría la integración real con Steam OAuth
        setTimeout(() => {
            alert('Función de Steam en desarrollo');
        }, 1000);
    }
}

// Inicializar cuando se cargue la página
const registroManager = new RegistroManager();