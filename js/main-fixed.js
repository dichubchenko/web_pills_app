// Временное исправление - отключаем все редиректы
console.log('Main.js loaded - NO REDIRECTS');

export function initApp() {
    console.log('App initialized without redirects');
    
    // Только базовая инициализация
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
            const form = e.target.closest('form');
            if (form && !form.querySelector('button[type="submit"]:disabled')) {
                e.preventDefault();
            }
        }
    });
    
    // Добавляем стили для загрузки
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

export default { initApp };