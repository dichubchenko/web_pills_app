/**
 * Модуль UI компонентов
 */

import { showNotification } from './utils.js';

/**
 * Создает модальное окно
 * @param {Object} options - Опции модального окна
 * @returns {Object} Объект с методами управления модальным окном
 */
export function createModal(options = {}) {
    const {
        title = 'Модальное окно',
        content = '',
        confirmText = 'OK',
        cancelText = 'Отмена',
        onConfirm = () => {},
        onCancel = () => {},
        showCancel = true
    } = options;
    
    // Создаем элементы модального окна
    const overlay = document.createElement('div');
    overlay.className = 'app-modal-overlay';
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.3s ease;
    `;
    
    const modal = document.createElement('div');
    modal.className = 'app-modal';
    modal.style.cssText = `
        background: var(--color-surface);
        backdrop-filter: var(--glass-blur);
        border: var(--glass-border);
        border-radius: var(--border-radius);
        padding: var(--spacing-lg);
        max-width: 500px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease;
    `;
    
    modal.innerHTML = `
        <div class="app-modal-header" style="margin-bottom: var(--spacing-md);">
            <h2 style="margin: 0; color: var(--color-text);">${title}</h2>
        </div>
        <div class="app-modal-content" style="margin-bottom: var(--spacing-lg);">
            ${content}
        </div>
        <div class="app-modal-actions" style="display: flex; gap: var(--spacing-sm);">
            ${showCancel ? `<button class="app-button" id="modalCancel" style="flex: 1; background: transparent; border: 1px solid var(--color-border);">${cancelText}</button>` : ''}
            <button class="app-button app-button--accent" id="modalConfirm" style="flex: 1;">${confirmText}</button>
        </div>
    `;
    
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    
    // Добавляем стили для анимаций
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideUp {
                from {
                    transform: translateY(20px);
                    opacity: 0;
                }
                to {
                    transform: translateY(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Обработчики событий
    const confirmBtn = modal.querySelector('#modalConfirm');
    const cancelBtn = modal.querySelector('#modalCancel');
    
    const closeModal = () => {
        overlay.style.animation = 'fadeOut 0.3s ease';
        modal.style.animation = 'slideDown 0.3s ease';
        
        setTimeout(() => {
            overlay.remove();
        }, 300);
    };
    
    confirmBtn.addEventListener('click', () => {
        onConfirm();
        closeModal();
    });
    
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            onCancel();
            closeModal();
        });
    }
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            onCancel();
            closeModal();
        }
    });
    
    // Добавляем стили для выхода
    if (!document.getElementById('modal-exit-styles')) {
        const exitStyle = document.createElement('style');
        exitStyle.id = 'modal-exit-styles';
        exitStyle.textContent = `
            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }
            
            @keyframes slideDown {
                from {
                    transform: translateY(0);
                    opacity: 1;
                }
                to {
                    transform: translateY(20px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(exitStyle);
    }
    
    return {
        close: closeModal,
        updateContent: (newContent) => {
            const contentElement = modal.querySelector('.app-modal-content');
            if (contentElement) {
                contentElement.innerHTML = newContent;
            }
        }
    };
}

/**
 * Создает подтверждающее модальное окно
 * @param {Object} options - Опции подтверждения
 * @returns {Promise} Promise, который резолвится при подтверждении
 */
export function confirmDialog(options = {}) {
    return new Promise((resolve) => {
        createModal({
            title: options.title || 'Подтверждение',
            content: options.message || 'Вы уверены?',
            confirmText: options.confirmText || 'Да',
            cancelText: options.cancelText || 'Нет',
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
        });
    });
}

/**
 * Создает индикатор загрузки
 * @param {string} text - Текст загрузки
 * @returns {Object} Объект с методами управления индикатором
 */
export function createLoader(text = 'Загрузка...') {
    const loader = document.createElement('div');
    loader.className = 'app-loader';
    loader.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1001;
        color: white;
    `;
    
    loader.innerHTML = `
        <div class="app-loader-spinner" style="
            width: 50px;
            height: 50px;
            border: 3px solid rgba(255, 255, 255, 0.3);
            border-radius: 50%;
            border-top-color: var(--color-accent);
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
        "></div>
        <div class="app-loader-text">${text}</div>
    `;
    
    // Добавляем стили для анимации
    if (!document.getElementById('loader-styles')) {
        const style = document.createElement('style');
        style.id = 'loader-styles';
        style.textContent = `
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(loader);
    
    return {
        hide: () => {
            loader.style.opacity = '0';
            loader.style.transition = 'opacity 0.3s ease';
            setTimeout(() => loader.remove(), 300);
        },
        updateText: (newText) => {
            const textElement = loader.querySelector('.app-loader-text');
            if (textElement) {
                textElement.textContent = newText;
            }
        }
    };
}

/**
 * Создает всплывающую подсказку
 * @param {HTMLElement} element - Элемент, к которому привязана подсказка
 * @param {string} text - Текст подсказки
 * @param {Object} options - Опции подсказки
 */
export function createTooltip(element, text, options = {}) {
    const tooltip = document.createElement('div');
    tooltip.className = 'app-tooltip';
    tooltip.textContent = text;
    tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: 4px;
        font-size: 0.85rem;
        z-index: 1000;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        ${options.position === 'top' ? 'bottom: 100%; left: 50%; transform: translateX(-50%); margin-bottom: 5px;' : ''}
        ${options.position === 'bottom' ? 'top: 100%; left: 50%; transform: translateX(-50%); margin-top: 5px;' : ''}
        ${options.position === 'left' ? 'right: 100%; top: 50%; transform: translateY(-50%); margin-right: 5px;' : ''}
        ${options.position === 'right' ? 'left: 100%; top: 50%; transform: translateY(-50%); margin-left: 5px;' : ''}
    `;
    
    element.style.position = 'relative';
    element.appendChild(tooltip);
    
    let timeout;
    
    element.addEventListener('mouseenter', () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            tooltip.style.opacity = '1';
        }, 300);
    });
    
    element.addEventListener('mouseleave', () => {
        clearTimeout(timeout);
        tooltip.style.opacity = '0';
    });
    
    return {
        destroy: () => {
            element.removeEventListener('mouseenter', () => {});
            element.removeEventListener('mouseleave', () => {});
            tooltip.remove();
        },
        updateText: (newText) => {
            tooltip.textContent = newText;
        }
    };
}