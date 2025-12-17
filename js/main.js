import { getCurrentUser } from './storage.js';
import { createNotificationStyles } from './utils.js';

let isInitialized = false;

export function initApp() {
    if (isInitialized) {
        console.log('App already initialized, skipping...');
        return;
    }
    
    isInitialized = true;
    console.log('Initializing app...');
    
    createNotificationStyles();
    
    const currentUser = getCurrentUser();
    const currentPage = window.location.pathname;
    
    console.log('Current page:', currentPage);
    console.log('Current user:', currentUser ? 'Logged in' : 'Not logged in');
    
    const publicPages = ['/login.html', '/register.html', '/index.html', '/', '/medication-diary/login.html', '/medication-diary/register.html', '/medication-diary/index.html', '/medication-diary/'];
    
    const isPublicPage = publicPages.some(page => {
        const normalizedPage = page.replace(/^\/+/, '');
        const normalizedCurrent = currentPage.replace(/^\/+/, '');
        return normalizedCurrent.endsWith(normalizedPage) || normalizedCurrent === normalizedPage;
    });
    
    console.log('Is public page:', isPublicPage);
    
    if (!currentUser && !isPublicPage) {
        console.log('Not logged in and not public page, redirecting to login...');
        // Используем setTimeout чтобы избежать мгновенного редиректа
        setTimeout(() => {
            window.location.href = getPagePath('login.html');
        }, 100);
        return;
    }
    
    if (currentUser && (currentPage.endsWith('login.html') || currentPage.endsWith('register.html'))) {
        console.log('Already logged in, redirecting to diary...');
        setTimeout(() => {
            window.location.href = getPagePath('diary.html');
        }, 100);
        return;
    }
    
    initCommonComponents();
}

function getPagePath(pageName) {
    const isGitHubPages = window.location.hostname.includes('github.io');
    if (isGitHubPages) {
        // GitHub Pages
        const repoName = window.location.pathname.split('/')[1] || 'medication-diary';
        return `/${repoName}/${pageName}`;
    }
    return pageName;
}

function initCommonComponents() {
    console.log('Initializing common components...');
    
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
    const url = new URL(getPagePath(page), window.location.origin);
    
    Object.keys(params).forEach(key => {
        url.searchParams.set(key, params[key]);
    });
    
    window.location.href = url.toString();
}

export default { initApp };