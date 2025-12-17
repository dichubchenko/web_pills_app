import { loginUser, registerUser, getCurrentUser } from './storage.js';
import { showNotification, createNotificationStyles, validateEmail } from './utils.js';

export function initLogin() {
    createNotificationStyles();
    
    if (getCurrentUser()) {
        window.location.href = 'diary.html';
        return;
    }
    
    const loginForm = document.getElementById('loginForm');
    const errorElement = document.getElementById('loginError');
    
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', handleLogin);
    
    const emailInput = document.getElementById('login-email');
    if (emailInput) {
        emailInput.focus();
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        showError(errorElement, 'Пожалуйста, заполните все поля');
        return;
    }
    
    if (!validateEmail(email)) {
        showError(errorElement, 'Пожалуйста, введите корректный email');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Вход...';
    submitBtn.disabled = true;
    
    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = loginUser(email, password);
        
        if (result.success) {
            showNotification('Вход выполнен успешно!', 'success');
            
            setTimeout(() => {
                window.location.href = 'diary.html';
            }, 1000);
        } else {
            showError(errorElement, result.message);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        showError(errorElement, 'Произошла ошибка при входе');
        console.error('Login error:', error);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

export function initRegister() {
    createNotificationStyles();
    
    if (getCurrentUser()) {
        window.location.href = 'diary.html';
        return;
    }
    
    const registerForm = document.getElementById('registerForm');
    const errorElement = document.getElementById('registerError');
    
    if (!registerForm) return;
    
    registerForm.addEventListener('submit', handleRegister);
    
    const passwordInput = document.getElementById('register-password');
    const confirmInput = document.getElementById('register-password-confirm');
    
    if (passwordInput && confirmInput) {
        confirmInput.addEventListener('input', () => {
            validatePasswordMatch(passwordInput, confirmInput, errorElement);
        });
    }
    
    const nameInput = document.getElementById('register-name');
    if (nameInput) {
        nameInput.focus();
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const confirmPassword = document.getElementById('register-password-confirm').value.trim();
    const errorElement = document.getElementById('registerError');
    
    if (!name || !email || !password || !confirmPassword) {
        showError(errorElement, 'Пожалуйста, заполните все поля');
        return;
    }
    
    if (!validateEmail(email)) {
        showError(errorElement, 'Пожалуйста, введите корректный email');
        return;
    }
    
    if (password.length < 6) {
        showError(errorElement, 'Пароль должен содержать минимум 6 символов');
        return;
    }
    
    if (password !== confirmPassword) {
        showError(errorElement, 'Пароли не совпадают');
        return;
    }
    
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Регистрация...';
    submitBtn.disabled = true;
    
    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = registerUser({
            name,
            email,
            password
        });
        
        if (result.success) {
            showNotification('Регистрация прошла успешно!', 'success');
            
            const loginResult = loginUser(email, password);
            
            if (loginResult.success) {
                setTimeout(() => {
                    window.location.href = 'diary.html';
                }, 1000);
            }
        } else {
            showError(errorElement, result.message);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        showError(errorElement, 'Произошла ошибка при регистрации');
        console.error('Register error:', error);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function validatePasswordMatch(passwordInput, confirmInput, errorElement) {
    if (passwordInput.value && confirmInput.value && passwordInput.value !== confirmInput.value) {
        showError(errorElement, 'Пароли не совпадают');
    } else {
        hideError(errorElement);
    }
}

function showError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function hideError(element) {
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

export function logout() {
    import('./storage.js').then(({ logout: storageLogout }) => {
        storageLogout();
        showNotification('Вы вышли из системы', 'info');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);
    });
}