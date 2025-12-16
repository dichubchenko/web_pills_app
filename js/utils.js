/**
 * Вспомогательные функции для приложения
 */

/**
 * Форматирует дату в читаемый вид
 * @param {Date} date - Дата для форматирования
 * @param {boolean} includeWeekday - Включать ли день недели
 * @returns {string} Отформатированная дата
 */
export function formatDate(date, includeWeekday = true) {
    const options = {
        weekday: includeWeekday ? 'long' : undefined,
        day: 'numeric',
        month: 'long'
    };
    
    return date.toLocaleDateString('ru-RU', options);
}

/**
 * Форматирует дату в короткий вид (ДД.ММ)
 * @param {Date} date - Дата для форматирования
 * @returns {string} Короткая дата
 */
export function formatShortDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}`;
}

/**
 * Возвращает день недели в сокращенном виде
 * @param {Date} date - Дата
 * @returns {string} Сокращенный день недели
 */
export function getShortWeekday(date) {
    const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return weekdays[date.getDay()];
}

/**
 * Проверяет, являются ли две даты одним и тем же днем
 * @param {Date} date1 - Первая дата
 * @param {Date} date2 - Вторая дата
 * @returns {boolean} true, если даты - один и тот же день
 */
export function isSameDay(date1, date2) {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
}

/**
 * Добавляет дни к дате
 * @param {Date} date - Исходная дата
 * @param {number} days - Количество дней для добавления
 * @returns {Date} Новая дата
 */
export function addDays(date, days) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

/**
 * Форматирует время для input[type="time"]
 * @param {Date} date - Дата со временем
 * @returns {string} Время в формате HH:MM
 */
export function formatTime(date) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Парсит время из строки в объект Date
 * @param {string} timeString - Время в формате HH:MM
 * @param {Date} baseDate - Базовая дата
 * @returns {Date} Дата со временем
 */
export function parseTime(timeString, baseDate = new Date()) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

/**
 * Показывает уведомление
 * @param {string} message - Сообщение
 * @param {string} type - Тип уведомления (success, error, info)
 */
export function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `app-notification app-notification--${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? 'rgba(255, 107, 107, 0.9)' : 
                      type === 'success' ? 'rgba(52, 199, 166, 0.9)' : 
                      'rgba(26, 107, 138, 0.9)'};
        backdrop-filter: blur(10px);
        border-radius: 8px;
        color: white;
        z-index: 1000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

/**
 * Создает CSS для анимаций уведомлений
 */
export function createNotificationStyles() {
    if (!document.getElementById('notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
}

/**
 * Валидация email
 * @param {string} email - Email для проверки
 * @returns {boolean} true, если email валиден
 */
export function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

/**
 * Задержка выполнения (sleep)
 * @param {number} ms - Миллисекунды
 * @returns {Promise} Promise, который резолвится через указанное время
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}