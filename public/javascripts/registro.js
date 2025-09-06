document.addEventListener('DOMContentLoaded', function() {
    // Elementos principales
    const userTypeSelector = document.getElementById('userTypeSelector');
    const registroJugador = document.getElementById('registroJugador');
    const registroSupervisor = document.getElementById('registroSupervisor');
    const authFooter = document.getElementById('authFooter');

    // Botones de tipo de usuario
    const userTypeBtns = document.querySelectorAll('.user-type-btn');
    const backFromJugador = document.getElementById('backFromJugador');
    const backFromSupervisor = document.getElementById('backFromSupervisor');

    // Elementos del formulario de supervisor
    const form = document.getElementById('registroForm');
    const submitBtn = document.getElementById('submitBtn');
    const btnLoader = document.getElementById('btnLoader');
    const btnText = submitBtn?.querySelector('.btn-text');
    const formMessage = document.getElementById('formMessage');

    // Elementos de contraseña
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    const passwordStrength = document.getElementById('passwordStrength');

    // Botón de Steam
    const steamRegisterBtn = document.getElementById('steamRegisterBtn');

    // Event listeners para selección de tipo de usuario
    userTypeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const type = this.dataset.type;
            showRegistrationForm(type);
        });
    });

    // Event listeners para volver atrás
    if (backFromJugador) {
        backFromJugador.addEventListener('click', () => showUserTypeSelector());
    }

    if (backFromSupervisor) {
        backFromSupervisor.addEventListener('click', () => showUserTypeSelector());
    }

    // Event listener para Steam
    if (steamRegisterBtn) {
        steamRegisterBtn.addEventListener('click', function() {
            // Mostrar mensaje de redirección
            this.innerHTML = '<div class="spinner"></div> Redirigiendo a Steam...';
            this.disabled = true;

            // Redirigir a Steam OAuth
            window.location.href = '/auth/steam';
        });
    }

    // Toggle password visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            this.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    // Password strength checker
    if (passwordInput) {
        passwordInput.addEventListener('input', checkPasswordStrength);
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
    }

    // Manejar envío del formulario de supervisor
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();

            // Validar formulario
            if (!validateForm()) {
                return;
            }

            // Mostrar loader
            showLoader(true);

            try {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);

                const response = await fetch('/registro', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showMessage('success', result.message);
                    setTimeout(() => {
                        window.location.href = result.redirectUrl || '/login.html';
                    }, 2000);
                } else {
                    showMessage('error', result.message);
                }

            } catch (error) {
                console.error('Error:', error);
                showMessage('error', 'Error de conexión. Inténtalo de nuevo.');
            } finally {
                showLoader(false);
            }
        });
    }

    // Funciones de navegación
    function showUserTypeSelector() {
        userTypeSelector.style.display = 'block';
        registroJugador.style.display = 'none';
        registroSupervisor.style.display = 'none';
        authFooter.style.display = 'block';
    }

    function showRegistrationForm(type) {
        userTypeSelector.style.display = 'none';
        authFooter.style.display = 'none';

        if (type === 'jugador') {
            registroJugador.style.display = 'block';
            registroSupervisor.style.display = 'none';
        } else if (type === 'supervisor') {
            registroSupervisor.style.display = 'block';
            registroJugador.style.display = 'none';
        }
    }

    // Funciones de validación
    function validateForm() {
        let isValid = true;

        // Limpiar errores previos
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
            el.parentElement.classList.remove('error');
        });

        // Validar campos requeridos
        const requiredFields = ['nombre', 'usuario', 'correo', 'telefono', 'cedula', 'password'];

        requiredFields.forEach(field => {
            const input = document.getElementById(field);
            if (input && !input.value.trim()) {
                showFieldError(field, 'Este campo es obligatorio');
                isValid = false;
            }
        });

        // Validar email
        const email = document.getElementById('correo');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (email && email.value && !emailRegex.test(email.value)) {
            showFieldError('correo', 'Ingresa un email válido');
            isValid = false;
        }

        // Validar contraseñas
        const password = passwordInput?.value;
        const confirmPassword = confirmPasswordInput?.value;

        if (password && password.length < 6) {
            showFieldError('password', 'La contraseña debe tener al menos 6 caracteres');
            isValid = false;
        }

        if (password && confirmPassword && password !== confirmPassword) {
            showFieldError('confirmPassword', 'Las contraseñas no coinciden');
            isValid = false;
        }

        // Validar términos
        const terms = document.getElementById('terms');
        if (terms && !terms.checked) {
            showFieldError('terms', 'Debes aceptar los términos y condiciones');
            isValid = false;
        }

        return isValid;
    }

    function showFieldError(fieldName, message) {
        const errorEl = document.getElementById(`${fieldName}-error`);
        const fieldEl = document.getElementById(fieldName);

        if (errorEl) {
            errorEl.textContent = message;
        }
        if (fieldEl) {
            fieldEl.closest('.form-group').classList.add('error');
        }
    }

    function checkPasswordStrength() {
        const password = passwordInput.value;
        const strengthBar = passwordStrength.querySelector('.strength-fill');
        const strengthText = passwordStrength.querySelector('.strength-text');

        let strength = 0;
        let text = 'Muy débil';
        let color = '#ff4444';

        if (password.length >= 6) strength += 1;
        if (password.match(/[a-z]/)) strength += 1;
        if (password.match(/[A-Z]/)) strength += 1;
        if (password.match(/[0-9]/)) strength += 1;
        if (password.match(/[^a-zA-Z0-9]/)) strength += 1;

        switch (strength) {
            case 0:
            case 1:
                text = 'Muy débil';
                color = '#ff4444';
                break;
            case 2:
                text = 'Débil';
                color = '#ff8800';
                break;
            case 3:
                text = 'Regular';
                color = '#ffaa00';
                break;
            case 4:
                text = 'Fuerte';
                color = '#88cc00';
                break;
            case 5:
                text = 'Muy fuerte';
                color = '#44cc00';
                break;
        }

        strengthBar.style.width = `${(strength / 5) * 100}%`;
        strengthBar.style.backgroundColor = color;
        strengthText.textContent = text;
        strengthText.style.color = color;
    }

    function checkPasswordMatch() {
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        const errorEl = document.getElementById('confirmPassword-error');

        if (confirmPassword && password !== confirmPassword) {
            errorEl.textContent = 'Las contraseñas no coinciden';
            confirmPasswordInput.closest('.form-group').classList.add('error');
        } else {
            errorEl.textContent = '';
            confirmPasswordInput.closest('.form-group').classList.remove('error');
        }
    }

    function showLoader(show) {
        if (submitBtn && btnText && btnLoader) {
            if (show) {
                submitBtn.disabled = true;
                btnText.style.opacity = '0';
                btnLoader.style.display = 'block';
            } else {
                submitBtn.disabled = false;
                btnText.style.opacity = '1';
                btnLoader.style.display = 'none';
            }
        }
    }

    function showMessage(type, message) {
        if (formMessage) {
            formMessage.textContent = message;
            formMessage.className = `form-message ${type}`;
            formMessage.style.display = 'block';
        }
    }

    function clearMessage() {
        if (formMessage) {
            formMessage.style.display = 'none';
            formMessage.textContent = '';
            formMessage.className = 'form-message';
        }
    }

    // Verificar si hay parámetros de error en la URL (para errores de Steam)
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error === 'steam-error') {
        showMessage('error', 'Error al registrarse con Steam. Inténtalo de nuevo.');
        showRegistrationForm('jugador');
    }
});