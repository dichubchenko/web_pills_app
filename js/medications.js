import { 
    getCurrentUser, 
    getMedicationsForDate, 
    markMedicationAsTaken, 
    markMedicationAsNotTaken,
    isMedicationTaken,
    addMedication,
    deleteMedication,
    getMedicationById,
    getUserMedications,
    getTakenHistory
} from './storage.js';
import { 
    formatDate, 
    formatShortDate, 
    getShortWeekday, 
    addDays, 
    isSameDay,
    showNotification,
    createNotificationStyles,
    formatTime,
    parseTime
} from './utils.js';
import { notificationManager } from './notifications.js';
import { calendarManager } from './calendar.js';

let currentDate = new Date();
let currentSelectedDate = new Date();

export function initDiary() {
    createNotificationStyles();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const pageTitle = document.querySelector('.app-page-title');
    if (pageTitle) {
        pageTitle.textContent = `Дневник ${currentUser.name}`;
    }
    
    initDateSlider();
    initAddButton();
    initLogoutButton();
    initManageMedicationsButton();
    initNotificationControls();
    initCalendarControls();
    
    updateDateDisplay();
    updateMedicationsForDate(currentSelectedDate);
    scheduleTodayNotifications();
    
    document.addEventListener('click', async (e) => {
        if (e.target.classList.contains('app-delete-btn') && e.target.dataset.medicationId) {
            e.preventDefault();
            e.stopPropagation();
            
            const medicationId = e.target.dataset.medicationId;
            const medication = getMedicationById(medicationId);
            
            if (medication) {
                await handleDeleteMedication(medicationId, medication.name);
                
                const modal = document.querySelector('.app-modal');
                if (modal && modal.querySelector('.app-manage-med-item')) {
                    showManageMedicationsScreen();
                }
            }
        }
    });
}

function initDateSlider() {
    const prevBtn = document.getElementById('prevDateBtn');
    const nextBtn = document.getElementById('nextDateBtn');
    const dateList = document.getElementById('dateList');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            currentDate = addDays(currentDate, -1);
            updateDateSlider();
            updateMedicationsForDate(currentSelectedDate);
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            currentDate = addDays(currentDate, 1);
            updateDateSlider();
            updateMedicationsForDate(currentSelectedDate);
        });
    }
    
    updateDateSlider();
}

function updateDateSlider() {
    const dateList = document.getElementById('dateList');
    if (!dateList) return;
    
    dateList.innerHTML = '';
    
    for (let i = -3; i <= 3; i++) {
        const date = addDays(currentDate, i);
        const dateElement = createDateElement(date);
        dateList.appendChild(dateElement);
    }
    
    const todayElement = dateList.querySelector('.app-date-item--active');
    if (todayElement) {
        todayElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

function createDateElement(date) {
    const div = document.createElement('div');
    div.className = 'app-date-item';
    
    if (isSameDay(date, currentSelectedDate)) {
        div.classList.add('app-date-item--active');
    }
    
    if (isSameDay(date, new Date())) {
        div.classList.add('app-date-item--today');
    }
    
    div.innerHTML = `
        <span class="app-date-weekday">${getShortWeekday(date)}</span>
        <span class="app-date-day">${date.getDate()}</span>
    `;
    
    div.addEventListener('click', () => {
        currentSelectedDate = date;
        updateDateSlider();
        updateMedicationsForDate(date);
        updateDateDisplay();
    });
    
    return div;
}

function updateDateDisplay() {
    const dateDisplay = document.getElementById('currentDate');
    if (dateDisplay) {
        dateDisplay.textContent = formatDate(currentSelectedDate);
        
        if (isSameDay(currentSelectedDate, new Date())) {
            dateDisplay.innerHTML += ' <span style="color: var(--color-accent); font-size: 0.9em;">(сегодня)</span>';
        }
    }
}

function updateMedicationsForDate(date) {
    const medications = getMedicationsForDate(date);
    const pendingList = document.getElementById('pendingMedications');
    const takenList = document.getElementById('takenMedications');
    const pendingCount = document.getElementById('pendingCount');
    const takenCount = document.getElementById('takenCount');
    
    if (!pendingList || !takenList) return;
    
    const pending = [];
    const taken = [];
    
    medications.forEach(med => {
        if (isMedicationTaken(med.id, date)) {
            taken.push(med);
        } else {
            pending.push(med);
        }
    });
    
    pending.sort((a, b) => parseTime(a.time) - parseTime(b.time));
    taken.sort((a, b) => parseTime(a.time) - parseTime(b.time));
    
    if (pendingCount) pendingCount.textContent = pending.length;
    if (takenCount) takenCount.textContent = taken.length;
    
    pendingList.innerHTML = '';
    takenList.innerHTML = '';
    
    if (pending.length === 0) {
        pendingList.innerHTML = `
            <div class="app-empty-state" style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                На ${isSameDay(date, new Date()) ? 'сегодня' : 'этот день'} приёма лекарств нет
            </div>
        `;
    } else {
        pending.forEach(med => {
            pendingList.appendChild(createMedicationElement(med, date));
        });
    }
    
    if (taken.length === 0) {
        takenList.innerHTML = `
            <div class="app-empty-state" style="text-align: center; padding: var(--spacing-lg); color: var(--color-text-secondary);">
                ${isSameDay(date, new Date()) ? 'Вы ещё не приняли ни одного лекарства сегодня' : 'На этот день не было принято лекарств'}
            </div>
        `;
    } else {
        taken.forEach(med => {
            takenList.appendChild(createMedicationElement(med, date, true));
        });
    }
    
    if (isSameDay(date, new Date()) && notificationManager.isPermissionGranted()) {
        scheduleTodayNotifications();
    }
}

function createMedicationElement(medication, date, isTaken = false) {
    const label = document.createElement('label');
    label.className = 'app-medication-item';
    
    if (isTaken) {
        label.classList.add('app-medication-item--taken');
    }
    
    let icon = '💊';
    let typeBadge = '';
    if (medication.type === 'regular') {
        icon = '📅';
        typeBadge = `<span class="app-medication-badge">регулярное</span>`;
    }
    
    label.innerHTML = `
        <input type="checkbox" class="app-medication-checkbox" ${isTaken ? 'checked' : ''}>
        <div class="app-medication-info" style="flex: 1;">
            <div class="app-medication-name" style="display: flex; align-items: center; gap: 0.5rem;">
                ${icon} ${medication.name} ${typeBadge}
            </div>
            <div class="app-medication-time">${medication.time} | ${medication.dosage}</div>
            ${medication.notes ? `<div class="app-medication-notes" style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 2px;">${medication.notes}</div>` : ''}
            ${medication.frequency ? `<div class="app-medication-frequency" style="font-size: 0.75rem; color: var(--color-primary-light); margin-top: 2px;">
                ${getFrequencyText(medication.frequency)}
            </div>` : ''}
        </div>
        <div class="app-medication-actions">
            ${notificationManager.isPermissionGranted() && !isTaken && isSameDay(date, new Date()) ? 
                `<button class="app-notify-btn" title="Напомнить" data-medication-id="${medication.id}" style="background: none; border: none; color: var(--color-accent); cursor: pointer; font-size: 1.2rem; padding: 0.25rem; border-radius: 4px;">🔔</button>` : ''}
            ${calendarManager.isAvailable ? 
                `<button class="app-calendar-btn" title="Добавить в календарь" data-medication-id="${medication.id}" style="background: none; border: none; color: #1a73e8; cursor: pointer; font-size: 1.2rem; padding: 0.25rem; border-radius: 4px;">📅</button>` : ''}
            <button class="app-delete-btn" title="Удалить лекарство" data-medication-id="${medication.id}">🗑️</button>
        </div>
    `;
    
    const checkbox = label.querySelector('.app-medication-checkbox');
    checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    label.addEventListener('click', async (e) => {
        if (e.target.closest('.app-delete-btn')) return;
        if (e.target.closest('.app-notify-btn')) return;
        if (e.target.closest('.app-calendar-btn')) return;
        if (e.target === checkbox) return;
        
        const newTakenState = !isTaken;
        
        label.style.opacity = '0.5';
        
        try {
            if (newTakenState) {
                await markMedicationAsTaken(medication.id, date);
                showNotification(`Лекарство "${medication.name}" отмечено как принятое`, 'success');
                
                if (isSameDay(date, new Date())) {
                    const scheduled = notificationManager.getScheduledNotifications();
                    scheduled.forEach(item => {
                        if (item.medication.id === medication.id) {
                            notificationManager.cancelNotification(item.id);
                        }
                    });
                }
            } else {
                await markMedicationAsNotTaken(medication.id, date);
                showNotification(`Лекарство "${medication.name}" отмечено как не принятое`, 'info');
                
                if (isSameDay(date, new Date()) && notificationManager.isPermissionGranted()) {
                    notificationManager.scheduleMedicationNotification(medication);
                }
            }
            
            updateMedicationsForDate(date);
            
        } catch (error) {
            console.error('Error updating medication:', error);
            showNotification('Произошла ошибка', 'error');
            label.style.opacity = '1';
        }
    });
    
    const deleteBtn = label.querySelector('.app-delete-btn');
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        await handleDeleteMedication(medication.id, medication.name);
    });
    
    const notifyBtn = label.querySelector('.app-notify-btn');
    if (notifyBtn) {
        notifyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            if (notificationManager.isPermissionGranted()) {
                notificationManager.scheduleMedicationNotification(medication);
                showNotification(`Напоминание для "${medication.name}" установлено`, 'success');
            }
        });
    }
    
    const calendarBtn = label.querySelector('.app-calendar-btn');
    if (calendarBtn) {
        calendarBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            
            await handleAddToCalendar(medication, date);
        });
    }
    
    label.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, medication, date);
    });
    
    return label;
}

function getFrequencyText(frequency) {
    const frequencyMap = {
        'daily': 'каждый день',
        'weekly': 'каждую неделю',
        'monthly': 'каждый месяц'
    };
    return frequencyMap[frequency] || frequency;
}

async function handleDeleteMedication(medicationId, medicationName) {
    try {
        const { confirmDialog } = await import('./ui.js');
        const confirmed = await confirmDialog({
            title: 'Удаление лекарства',
            message: `Вы уверены, что хотите удалить лекарство "${medicationName}"? Это действие нельзя отменить.`,
            confirmText: 'Удалить',
            cancelText: 'Отмена'
        });
        
        if (!confirmed) return;
        
        const result = deleteMedication(medicationId);
        
        if (result.success) {
            showNotification(result.message, 'success');
            
            const scheduled = notificationManager.getScheduledNotifications();
            scheduled.forEach(item => {
                if (item.medication.id === medicationId) {
                    notificationManager.cancelNotification(item.id);
                }
            });
            
            updateMedicationsForDate(currentSelectedDate);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting medication:', error);
        showNotification('Произошла ошибка при удалении', 'error');
    }
}

async function handleAddToCalendar(medication, date) {
    try {
        const { createModal } = await import('./ui.js');
        
        const googleLink = calendarManager.createGoogleCalendarEvent(medication, date);
        const outlookLink = calendarManager.createOutlookCalendarEvent(medication, date);
        const icalLink = calendarManager.createICalendarEvent(medication, date);
        
        const content = `
            <div style="line-height: 1.6;">
                <p style="margin-bottom: 1rem;">Выберите календарь для добавления события:</p>
                
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                    <a href="${googleLink}" target="_blank" class="app-button" style="text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                        <span>📅</span>
                        <span>Добавить в Google Calendar</span>
                    </a>
                    
                    <a href="${outlookLink}" target="_blank" class="app-button" style="text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #0078d4;">
                        <span>📧</span>
                        <span>Добавить в Outlook</span>
                    </a>
                    
                    <a href="${icalLink}" download="прием-${medication.name}.ics" class="app-button" style="text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: #34c7a6;">
                        <span>📥</span>
                        <span>Скачать iCalendar файл</span>
                    </a>
                </div>
                
                <div style="margin-top: 1rem; font-size: 0.85rem; color: var(--color-text-secondary);">
                    Событие будет создано на ${formatDate(date)} в ${medication.time}
                </div>
            </div>
        `;
        
        createModal({
            title: 'Добавить в календарь',
            content: content,
            confirmText: 'Закрыть',
            showCancel: false,
            onConfirm: () => {}
        });
        
    } catch (error) {
        console.error('Error adding to calendar:', error);
        showNotification('Не удалось создать событие в календаре', 'error');
    }
}

async function showContextMenu(event, medication, date) {
    const existingMenu = document.querySelector('.app-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }
    
    const menu = document.createElement('div');
    menu.className = 'app-context-menu';
    menu.style.cssText = `
        position: fixed;
        background: var(--color-surface);
        backdrop-filter: var(--glass-blur);
        border: var(--glass-border);
        border-radius: var(--border-radius-small);
        box-shadow: var(--shadow-strong);
        min-width: 200px;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
        overflow: hidden;
    `;
    
    let menuItems = `
        <div class="app-context-menu-item" data-action="delete" style="
            padding: 0.75rem 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: #ff6b6b;
            transition: background 0.2s ease;
        ">
            <span>🗑️</span>
            <span>Удалить</span>
        </div>
    `;
    
    if (calendarManager.isAvailable) {
        menuItems += `
            <div class="app-context-menu-item" data-action="calendar" style="
                padding: 0.75rem 1rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: #1a73e8;
                transition: background 0.2s ease;
                border-top: 1px solid var(--color-border);
            ">
                <span>📅</span>
                <span>Добавить в календарь</span>
            </div>
        `;
    }
    
    if (notificationManager.isPermissionGranted() && isSameDay(date, new Date())) {
        menuItems += `
            <div class="app-context-menu-item" data-action="notify" style="
                padding: 0.75rem 1rem;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 0.5rem;
                color: var(--color-accent);
                transition: background 0.2s ease;
                border-top: 1px solid var(--color-border);
            ">
                <span>🔔</span>
                <span>Установить напоминание</span>
            </div>
        `;
    }
    
    menuItems += `
        <div class="app-context-menu-item" data-action="info" style="
            padding: 0.75rem 1rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            transition: background 0.2s ease;
            border-top: 1px solid var(--color-border);
        ">
            <span>ℹ️</span>
            <span>Информация</span>
        </div>
    `;
    
    menu.innerHTML = menuItems;
    
    document.body.appendChild(menu);
    
    const x = Math.min(event.pageX, window.innerWidth - menu.offsetWidth - 10);
    const y = Math.min(event.pageY, window.innerHeight - menu.offsetHeight - 10);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    menu.addEventListener('click', async (e) => {
        const menuItem = e.target.closest('.app-context-menu-item');
        if (!menuItem) return;
        
        const action = menuItem.dataset.action;
        
        switch (action) {
            case 'delete':
                await handleDeleteMedication(medication.id, medication.name);
                break;
            case 'calendar':
                await handleAddToCalendar(medication, date);
                break;
            case 'notify':
                if (notificationManager.isPermissionGranted()) {
                    notificationManager.scheduleMedicationNotification(medication);
                    showNotification(`Напоминание для "${medication.name}" установлено`, 'success');
                }
                break;
            case 'info':
                showMedicationInfo(medication);
                break;
        }
        
        menu.remove();
    });
    
    const closeMenu = () => {
        menu.remove();
        document.removeEventListener('click', closeMenu);
    };
    
    setTimeout(() => {
        document.addEventListener('click', closeMenu);
    }, 100);
}

async function showMedicationInfo(medication) {
    const frequencyText = medication.frequency ? 
        `<p><strong>Частота:</strong> ${getFrequencyText(medication.frequency)}</p>` : '';
    
    const startDate = medication.startDate ? 
        new Date(medication.startDate).toLocaleDateString('ru-RU') : 
        new Date(medication.createdAt).toLocaleDateString('ru-RU');
    
    const content = `
        <div style="line-height: 1.6;">
            <p><strong>Название:</strong> ${medication.name}</p>
            <p><strong>Дозировка:</strong> ${medication.dosage}</p>
            <p><strong>Время приёма:</strong> ${medication.time}</p>
            <p><strong>Тип:</strong> ${medication.type === 'regular' ? 'Постоянное' : 'Разовое'}</p>
            ${frequencyText}
            <p><strong>Начало приёма:</strong> ${startDate}</p>
            ${medication.notes ? `<p><strong>Примечания:</strong> ${medication.notes}</p>` : ''}
            <p><strong>ID:</strong> <small style="color: var(--color-text-secondary);">${medication.id}</small></p>
        </div>
    `;
    
    try {
        const { createModal } = await import('./ui.js');
        createModal({
            title: 'Информация о лекарстве',
            content: content,
            confirmText: 'Закрыть',
            showCancel: false,
            onConfirm: () => {}
        });
    } catch (error) {
        console.error('Error showing medication info:', error);
    }
}

function initAddButton() {
    const addButton = document.getElementById('addButton');
    const dropdownMenu = document.getElementById('dropdownMenu');
    
    if (!addButton || !dropdownMenu) return;
    
    addButton.addEventListener('click', function(e) {
        e.stopPropagation();
        const isExpanded = this.getAttribute('aria-expanded') === 'true';
        this.setAttribute('aria-expanded', !isExpanded);
        dropdownMenu.classList.toggle('app-dropdown-menu--visible');
    });
    
    document.addEventListener('click', function(e) {
        if (!addButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
            addButton.setAttribute('aria-expanded', 'false');
            dropdownMenu.classList.remove('app-dropdown-menu--visible');
        }
    });
}

function initLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (!logoutBtn) return;
    
    logoutBtn.addEventListener('click', (e) => {
        e.preventDefault();
        import('./auth.js').then(({ logout }) => {
            logout();
        });
    });
}

function initNotificationControls() {
    const notificationBtn = document.getElementById('notificationSettingsBtn');
    if (!notificationBtn) return;
    
    notificationBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const addButton = document.getElementById('addButton');
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (addButton && dropdownMenu) {
            addButton.setAttribute('aria-expanded', 'false');
            dropdownMenu.classList.remove('app-dropdown-menu--visible');
        }
        
        await showNotificationSettings();
    });
}

async function showNotificationSettings() {
    const content = `
        <div style="line-height: 1.6;">
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-top: 0; margin-bottom: 0.5rem; color: var(--color-accent);">Статус уведомлений</h4>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${notificationManager.isPermissionGranted() ? '#34c7a6' : notificationManager.isPermissionDenied() ? '#ff6b6b' : '#ffd166'};"></div>
                    <span>${getNotificationStatusText()}</span>
                </div>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-top: 0; margin-bottom: 0.5rem; color: var(--color-primary-light);">Запланированные уведомления</h4>
                ${getScheduledNotificationsHTML()}
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                ${getNotificationButtonsHTML()}
            </div>
        </div>
    `;
    
    try {
        const { createModal } = await import('./ui.js');
        createModal({
            title: 'Настройки уведомлений',
            content: content,
            confirmText: 'Закрыть',
            showCancel: false,
            onConfirm: () => {}
        });
        
        setupNotificationButtonHandlers();
    } catch (error) {
        console.error('Error showing notification settings:', error);
    }
}

function getNotificationStatusText() {
    if (!notificationManager.isSupported) {
        return 'Уведомления не поддерживаются в вашем браузере';
    }
    
    if (notificationManager.isPermissionGranted()) {
        return 'Уведомления разрешены ✅';
    }
    
    if (notificationManager.isPermissionDenied()) {
        return 'Уведомления запрещены ❌';
    }
    
    return 'Разрешение не запрошено';
}

function getScheduledNotificationsHTML() {
    const scheduled = notificationManager.getScheduledNotifications();
    
    if (scheduled.length === 0) {
        return '<p style="color: var(--color-text-secondary); font-size: 0.9rem;">Нет запланированных уведомлений</p>';
    }
    
    const now = new Date();
    
    return `
        <div style="max-height: 200px; overflow-y: auto;">
            ${scheduled.map(item => {
                const timeDiff = item.scheduledTime - now;
                const minutes = Math.floor(timeDiff / (1000 * 60));
                const hours = Math.floor(minutes / 60);
                
                let timeText;
                if (minutes < 0) {
                    timeText = 'Прошло';
                } else if (minutes < 60) {
                    timeText = `через ${minutes} мин`;
                } else {
                    timeText = `через ${hours} ч ${minutes % 60} мин`;
                }
                
                return `
                    <div style="
                        padding: 0.75rem;
                        background: rgba(255, 255, 255, 0.05);
                        border-radius: 8px;
                        margin-bottom: 0.5rem;
                        border-left: 3px solid var(--color-accent);
                    ">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${item.medication.name}</strong>
                                <div style="font-size: 0.85rem; color: var(--color-text-secondary);">
                                    ${item.medication.time} | ${timeText}
                                </div>
                            </div>
                            <button class="app-button" style="padding: 0.25rem 0.5rem; font-size: 0.85rem;" data-cancel-notification="${item.id}">
                                Отменить
                            </button>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function getNotificationButtonsHTML() {
    notificationManager.updatePermissionFromBrowser();
    
    if (!notificationManager.isSupported) {
        return '<p style="color: var(--color-text-secondary); font-size: 0.9rem; text-align: center;">Уведомления не поддерживаются в вашем браузере</p>';
    }
    
    let buttons = '';
    
    if (notificationManager.canRequestPermission()) {
        buttons += `
            <button class="app-button app-button--accent" id="enableNotificationsBtn">
                Включить уведомления
            </button>
        `;
    }
    
    if (notificationManager.isPermissionGranted()) {
        buttons += `
            <button class="app-button" id="testNotificationBtn">
                Тестовое уведомление
            </button>
            <button class="app-button" id="scheduleAllNotificationsBtn">
                Перепланировать все
            </button>
            <button class="app-button" id="refreshPermissionBtn">
                Обновить статус
            </button>
            <button class="app-button" style="background: transparent; border: 1px solid #ff6b6b; color: #ff6b6b;" id="disableNotificationsBtn">
                Отключить уведомления
            </button>
        `;
    }
    
    if (notificationManager.isPermissionDenied()) {
        buttons += `
            <button class="app-button" id="refreshPermissionBtn">
                Проверить разрешение
            </button>
            <p style="font-size: 0.9rem; color: var(--color-text-secondary); text-align: center; margin-top: 0.5rem;">
                Чтобы включить уведомления, разрешите их в настройках браузера
            </p>
        `;
    }
    
    return buttons;
}

function setupNotificationButtonHandlers() {
    const enableBtn = document.getElementById('enableNotificationsBtn');
    if (enableBtn) {
        enableBtn.addEventListener('click', async () => {
            const permission = await notificationManager.requestPermission();
            
            if (permission === 'granted') {
                showNotification('Уведомления включены!', 'success');
                scheduleTodayNotifications();
                showNotificationSettings();
            } else if (permission === 'denied') {
                showNotification('Уведомления запрещены', 'error');
                showNotificationSettings();
            }
        });
    }
    
    const testBtn = document.getElementById('testNotificationBtn');
    if (testBtn) {
        testBtn.addEventListener('click', () => {
            notificationManager.updatePermissionFromBrowser();
            
            if (notificationManager.isPermissionGranted()) {
                const success = notificationManager.showTestNotification();
                if (success) {
                    showNotification('Тестовое уведомление отправлено', 'success');
                } else {
                    showNotification('Не удалось отправить уведомление', 'error');
                }
            } else {
                showNotification('Уведомления запрещены', 'error');
            }
        });
    }
    
    const scheduleBtn = document.getElementById('scheduleAllNotificationsBtn');
    if (scheduleBtn) {
        scheduleBtn.addEventListener('click', () => {
            notificationManager.updatePermissionFromBrowser();
            
            if (notificationManager.isPermissionGranted()) {
                scheduleTodayNotifications();
                showNotification('Все уведомления перепланированы', 'success');
                showNotificationSettings();
            } else {
                showNotification('Уведомления запрещены', 'error');
            }
        });
    }
    
    const refreshBtn = document.getElementById('refreshPermissionBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            notificationManager.updatePermissionFromBrowser();
            showNotification('Статус уведомлений обновлен', 'info');
            showNotificationSettings();
        });
    }
    
    const disableBtn = document.getElementById('disableNotificationsBtn');
    if (disableBtn) {
        disableBtn.addEventListener('click', () => {
            notificationManager.cancelAllNotifications();
            notificationManager.savePermission('denied');
            showNotification('Уведомления отключены', 'info');
            showNotificationSettings();
        });
    }
    
    document.querySelectorAll('[data-cancel-notification]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const notificationId = e.target.dataset.cancelNotification;
            notificationManager.cancelNotification(notificationId);
            showNotification('Уведомление отменено', 'info');
            showNotificationSettings();
        });
    });
}

function scheduleTodayNotifications() {
    if (!notificationManager.isPermissionGranted()) {
        return;
    }
    
    const medications = getMedicationsForDate(new Date());
    const pendingMedications = medications.filter(med => !isMedicationTaken(med.id));
    
    notificationManager.cancelAllNotifications();
    notificationManager.scheduleAllMedicationsForToday(pendingMedications);
}

function initCalendarControls() {
    const calendarBtn = document.getElementById('calendarSettingsBtn');
    if (!calendarBtn) return;
    
    calendarBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const addButton = document.getElementById('addButton');
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (addButton && dropdownMenu) {
            addButton.setAttribute('aria-expanded', 'false');
            dropdownMenu.classList.remove('app-dropdown-menu--visible');
        }
        
        await showCalendarSettings();
    });
}

async function showCalendarSettings() {
    const apiStatus = await calendarManager.checkGoogleCalendarAPI();
    const testResult = calendarManager.testCalendarIntegration();
    const supportedCalendars = calendarManager.getSupportedCalendars();
    const oauthStatus = calendarManager.getOAuthStatus();
    
    const authSection = oauthStatus.authenticated ? `
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(52, 199, 166, 0.1); border-radius: 8px;">
            <h4 style="margin-top: 0; margin-bottom: 0.5rem; color: var(--color-accent);">Статус авторизации ✅</h4>
            <div style="font-size: 0.9rem;">
                <div>Авторизован в Google Calendar</div>
                <div style="color: var(--color-text-secondary); margin-top: 0.25rem;">
                    ${oauthStatus.tokenExpired ? 'Токен истёк' : 'Токен действителен'} до ${oauthStatus.expiry || 'неизвестно'}
                </div>
            </div>
        </div>
    ` : `
        <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(255, 107, 107, 0.1); border-radius: 8px;">
            <h4 style="margin-top: 0; margin-bottom: 0.5rem; color: #ff6b6b;">Статус авторизации ❌</h4>
            <div style="font-size: 0.9rem;">
                Не авторизован в Google Calendar API
            </div>
        </div>
    `;
    
    const content = `
        <div style="line-height: 1.6;">
            ${authSection}
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-top: 0; margin-bottom: 0.5rem; color: var(--color-accent);">Статус интеграции</h4>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                    <div style="width: 12px; height: 12px; border-radius: 50%; background: ${testResult.success ? '#34c7a6' : '#ff6b6b'};"></div>
                    <span>${testResult.message}</span>
                </div>
                <div style="font-size: 0.9rem; color: var(--color-text-secondary);">
                    ${apiStatus.message}
                </div>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-top: 0; margin-bottom: 0.5rem; color: var(--color-primary-light);">Поддерживаемые календари</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem;">
                    <div style="padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px; text-align: center;">
                        <div style="font-weight: 500; color: ${supportedCalendars.google ? 'var(--color-accent)' : '#ff6b6b'};">Google Calendar</div>
                        <div style="font-size: 0.8rem; color: var(--color-text-secondary);">${supportedCalendars.google ? '✅ Доступен' : '❌ Недоступен'}</div>
                    </div>
                    <div style="padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px; text-align: center;">
                        <div style="font-weight: 500; color: ${supportedCalendars.outlook ? 'var(--color-accent)' : '#ff6b6b'};">Outlook</div>
                        <div style="font-size: 0.8rem; color: var(--color-text-secondary);">${supportedCalendars.outlook ? '✅ Доступен' : '❌ Недоступен'}</div>
                    </div>
                    <div style="padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px; text-align: center;">
                        <div style="font-weight: 500; color: ${supportedCalendars.ical ? 'var(--color-accent)' : '#ff6b6b'};">iCalendar</div>
                        <div style="font-size: 0.8rem; color: var(--color-text-secondary);">${supportedCalendars.ical ? '✅ Доступен' : '❌ Недоступен'}</div>
                    </div>
                    <div style="padding: 0.5rem; background: rgba(255, 255, 255, 0.05); border-radius: 6px; text-align: center;">
                        <div style="font-weight: 500; color: ${supportedCalendars.apple ? 'var(--color-accent)' : '#ff6b6b'};">Apple Calendar</div>
                        <div style="font-size: 0.8rem; color: var(--color-text-secondary);">${supportedCalendars.apple ? '✅ Доступен' : '❌ Недоступен'}</div>
                    </div>
                </div>
            </div>
            
            <div style="margin-bottom: 1.5rem;">
                <h4 style="margin-top: 0; margin-bottom: 0.5rem; color: var(--color-primary-light);">Управление</h4>
                <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                    ${oauthStatus.authenticated ? `
                        <button class="app-button" id="syncWithCalendarBtn">
                            Синхронизировать с Google Calendar
                        </button>
                        <button class="app-button" id="createTestEventBtn">
                            Создать тестовое событие
                        </button>
                        <button class="app-button" style="background: transparent; border: 1px solid #ff6b6b; color: #ff6b6b;" id="logoutCalendarBtn">
                            Выйти из Google Calendar
                        </button>
                    ` : `
                        <button class="app-button app-button--accent" id="loginCalendarBtn">
                            Авторизоваться в Google Calendar
                        </button>
                        <button class="app-button" id="testCalendarIntegrationBtn">
                            Протестировать интеграцию
                        </button>
                    `}
                </div>
            </div>
            
            <div style="font-size: 0.85rem; color: var(--color-text-secondary); text-align: center; padding-top: 1rem; border-top: 1px solid var(--color-border);">
                Для работы с Google Calendar API требуется OAuth 2.0 авторизация
            </div>
        </div>
    `;
    
    try {
        const { createModal } = await import('./ui.js');
        createModal({
            title: 'Интеграция с календарем',
            content: content,
            confirmText: 'Закрыть',
            showCancel: false,
            onConfirm: () => {}
        });
        
        setupCalendarButtonHandlers();
    } catch (error) {
        console.error('Error showing calendar settings:', error);
    }
}

function setupCalendarButtonHandlers() {
    const loginBtn = document.getElementById('loginCalendarBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const result = await calendarManager.mockOAuthLogin();
            if (result.success) {
                showNotification(result.message, 'success');
                showCalendarSettings();
            }
        });
    }
    
    const logoutBtn = document.getElementById('logoutCalendarBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            const result = await calendarManager.mockOAuthLogout();
            if (result.success) {
                showNotification(result.message, 'info');
                showCalendarSettings();
            }
        });
    }
    
    const testBtn = document.getElementById('testCalendarIntegrationBtn');
    if (testBtn) {
        testBtn.addEventListener('click', () => {
            const result = calendarManager.testCalendarIntegration();
            if (result.success) {
                showNotification('Интеграция с календарем работает корректно', 'success');
            } else {
                showNotification(result.message, 'error');
            }
        });
    }
    
    const syncBtn = document.getElementById('syncWithCalendarBtn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            const events = await calendarManager.getCalendarEvents(new Date());
            if (events.success) {
                showNotification(`Загружено ${events.events.length} событий из календаря`, 'success');
            } else {
                showNotification(events.message, 'info');
            }
        });
    }
    
    const createTestBtn = document.getElementById('createTestEventBtn');
    if (createTestBtn) {
        createTestBtn.addEventListener('click', async () => {
            const testMedication = {
                id: 'test',
                name: 'Тестовое лекарство',
                dosage: '1 таблетка',
                time: '15:00',
                notes: 'Тестовое событие для календаря'
            };
            
            const result = await calendarManager.createMedicationEvent(testMedication, new Date());
            if (result.success) {
                showNotification(result.message, 'success');
            } else {
                showNotification(result.message, 'error');
            }
        });
    }
}

function initManageMedicationsButton() {
    const manageBtn = document.getElementById('manageMedicationsBtn');
    if (!manageBtn) return;
    
    manageBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const addButton = document.getElementById('addButton');
        const dropdownMenu = document.getElementById('dropdownMenu');
        if (addButton && dropdownMenu) {
            addButton.setAttribute('aria-expanded', 'false');
            dropdownMenu.classList.remove('app-dropdown-menu--visible');
        }
        
        await showManageMedicationsScreen();
    });
}

async function showManageMedicationsScreen() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const medications = getUserMedications(currentUser.id);
    
    const regularMeds = medications.filter(m => m.type === 'regular');
    const singleMeds = medications.filter(m => m.type === 'single');
    
    const content = `
        <div style="max-height: 60vh; overflow-y: auto; padding-right: 0.5rem;">
            <h3 style="margin-top: 0; color: var(--color-accent);">Регулярные приёмы (${regularMeds.length})</h3>
            ${regularMeds.length === 0 ? 
                '<p style="color: var(--color-text-secondary); text-align: center; padding: 1rem;">Нет регулярных лекарств</p>' : 
                regularMeds.map(med => createManageMedicationItem(med)).join('')}
            
            <h3 style="margin-top: 1.5rem; color: var(--color-primary-light);">Разовые приёмы (${singleMeds.length})</h3>
            ${singleMeds.length === 0 ? 
                '<p style="color: var(--color-text-secondary); text-align: center; padding: 1rem;">Нет разовых лекарств</p>' : 
                singleMeds.map(med => createManageMedicationItem(med)).join('')}
        </div>
    `;
    
    try {
        const { createModal } = await import('./ui.js');
        createModal({
            title: 'Управление лекарствами',
            content: content,
            confirmText: 'Закрыть',
            showCancel: false,
            onConfirm: () => {
                updateMedicationsForDate(currentSelectedDate);
            }
        });
    } catch (error) {
        console.error('Error showing manage medications screen:', error);
    }
}

function createManageMedicationItem(medication) {
    const date = new Date(medication.date || medication.createdAt);
    const dateStr = date.toLocaleDateString('ru-RU');
    
    return `
        <div class="app-manage-med-item" style="
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.75rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            margin-bottom: 0.5rem;
            border-left: 3px solid ${medication.type === 'regular' ? 'var(--color-accent)' : 'var(--color-primary)'};
        ">
            <div>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <strong>${medication.name}</strong>
                    <span style="font-size: 0.75rem; background: ${medication.type === 'regular' ? 'rgba(52, 199, 166, 0.2)' : 'rgba(26, 107, 138, 0.2)'}; 
                          color: ${medication.type === 'regular' ? 'var(--color-accent)' : 'var(--color-primary-light)'}; 
                          padding: 2px 6px; border-radius: 10px;">
                        ${medication.type === 'regular' ? 'регулярное' : 'разовое'}
                    </span>
                </div>
                <div style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 0.25rem;">
                    ${medication.time} | ${medication.dosage}
                    ${medication.type === 'regular' && medication.frequency ? 
                        ` | ${getFrequencyText(medication.frequency)}` : 
                        ` | ${dateStr}`}
                </div>
            </div>
            <button class="app-delete-btn" data-medication-id="${medication.id}" 
                    style="background: none; border: none; color: #ff6b6b; cursor: pointer; font-size: 1.2rem; padding: 0.5rem; border-radius: 4px;"
                    title="Удалить">
                🗑️
            </button>
        </div>
    `;
}

export function initAddMedication() {
    createNotificationStyles();
    
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'single';
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = type === 'single' 
            ? 'Добавить разовый приём' 
            : 'Добавить постоянное лекарство';
    }
    
    const typeRadio = document.getElementById(`type-${type}`);
    if (typeRadio) {
        typeRadio.checked = true;
        toggleFrequencyGroup();
    }
    
    const timeInput = document.getElementById('med-time');
    if (timeInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30);
        timeInput.value = formatTime(now);
    }
    
    const typeRadios = document.querySelectorAll('input[name="med-type"]');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', toggleFrequencyGroup);
    });
    
    const form = document.getElementById('medicationForm');
    if (form) {
        form.addEventListener('submit', handleAddMedication);
    }
}

function toggleFrequencyGroup() {
    const frequencyGroup = document.getElementById('frequencyGroup');
    const regularType = document.getElementById('type-regular');
    
    if (frequencyGroup && regularType) {
        frequencyGroup.style.display = regularType.checked ? 'block' : 'none';
        
        if (regularType.checked) {
            const dailyRadio = document.getElementById('freq-daily');
            if (dailyRadio && !document.querySelector('input[name="med-frequency"]:checked')) {
                dailyRadio.checked = true;
            }
        }
    }
}

async function handleAddMedication(event) {
    event.preventDefault();
    
    const name = document.getElementById('med-name').value.trim();
    const dosage = document.getElementById('med-dosage').value.trim();
    const time = document.getElementById('med-time').value;
    const type = document.querySelector('input[name="med-type"]:checked').value;
    const notes = document.getElementById('med-notes').value.trim();
    const errorElement = document.getElementById('formError');
    
    if (!name || !dosage || !time) {
        showFormError(errorElement, 'Пожалуйста, заполните все обязательные поля');
        return;
    }
    
    const medicationData = {
        name,
        dosage,
        time,
        type,
        notes: notes || undefined
    };
    
    if (type === 'regular') {
        const frequency = document.querySelector('input[name="med-frequency"]:checked');
        if (!frequency) {
            showFormError(errorElement, 'Пожалуйста, выберите частоту приёма');
            return;
        }
        
        medicationData.frequency = frequency.value;
        medicationData.startDate = new Date().toISOString();
    } else {
        medicationData.date = new Date().toISOString();
    }
    
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Добавление...';
    submitBtn.disabled = true;
    
    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = addMedication(medicationData);
        
        if (result.success) {
            showNotification(`Лекарство "${name}" успешно добавлено`, 'success');
            
            if (notificationManager.isPermissionGranted() && isSameDay(new Date(), new Date(result.medication.date || result.medication.createdAt))) {
                notificationManager.scheduleMedicationNotification(result.medication);
            }
            
            const { createModal } = await import('./ui.js');
            
            const content = `
                <div style="line-height: 1.6; text-align: center;">
                    <p style="margin-bottom: 1.5rem;">Лекарство "${name}" успешно добавлено!</p>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <a href="diary.html" class="app-button" style="text-decoration: none;">
                            Перейти в дневник
                        </a>
                        <button id="addToCalendarBtn" class="app-button" style="background: #1a73e8;">
                            📅 Добавить в календарь
                        </button>
                    </div>
                </div>
            `;
            
            const modal = createModal({
                title: 'Успешно!',
                content: content,
                confirmText: 'Закрыть',
                showCancel: false,
                onConfirm: () => {
                    window.location.href = 'diary.html';
                }
            });
            
            document.getElementById('addToCalendarBtn')?.addEventListener('click', async () => {
                await handleAddToCalendar(result.medication, new Date());
            });
            
        } else {
            showFormError(errorElement, result.message);
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    } catch (error) {
        showFormError(errorElement, 'Произошла ошибка при добавлении лекарства');
        console.error('Add medication error:', error);
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function showFormError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

