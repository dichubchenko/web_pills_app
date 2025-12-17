import { getCurrentUser } from './storage.js';
import { createNotificationStyles } from './utils.js';

export function initApp() {
    createNotificationStyles();
    
    const currentUser = getCurrentUser();
    const currentPage = window.location.pathname;
    
    const publicPages = ['/login.html', '/register.html', '/index.html', '/'];
    
    if (!currentUser && !publicPages.some(page => currentPage.endsWith(page))) {
        window.location.href = 'login.html';
        return;
    }
    
    if (currentUser && (currentPage.endsWith('login.html') || currentPage.endsWith('register.html'))) {
        window.location.href = 'diary.html';
        return;
    }
    
    initCommonComponents();
}

function initCommonComponents() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            const form = e.target.closest('form');
            if (form && !form.querySelector('button[type="submit"]:disabled')) {
                e.preventDefault();
            }
        }
    });
    
    if (!document.getElementById('loading-styles')) {
        const style = document.createElement('style');
        style.id = 'loading-styles';
        style.textContent = `
            .app-loading {
                opacity: 0.5;
                pointer-events: none;
            }
            
            .app-loading::after {
                content: '';
                position: absolute;
                top: 50%;
                left: 50%;
                width: 20px;
                height: 20px;
                border: 2px solid var(--color-accent);
                border-radius: 50%;
                border-top-color: transparent;
                animation: spin 1s linear infinite;
                transform: translate(-50%, -50%);
            }
        `;
        document.head.appendChild(style);
    }
}

export function setLoading(element, isLoading) {
    if (isLoading) {
        element.classList.add('app-loading');
        element.disabled = true;
    } else {
        element.classList.remove('app-loading');
        element.disabled = false;
    }
}

export function redirectTo(page, params = {}) {
    const url = new URL(page, window.location.origin);
    
    Object.keys(params).forEach(key => {
        url.searchParams.set(key, params[key]);
    });
    
    window.location.href = url.toString();
}

export default { initApp };