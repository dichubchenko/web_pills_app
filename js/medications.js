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
    initMedicationLists();
    initAddButton();
    initLogoutButton();
    initManageMedicationsButton();
    
    updateDateDisplay();
    updateMedicationsForDate(currentSelectedDate);
    
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

function initMedicationLists() {
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
            <button class="app-delete-btn" title="Удалить лекарство" data-medication-id="${medication.id}">🗑️</button>
        </div>
    `;
    
    const checkbox = label.querySelector('.app-medication-checkbox');
    checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    label.addEventListener('click', async (e) => {
        if (e.target.closest('.app-delete-btn')) return;
        if (e.target === checkbox) return;
        
        const newTakenState = !isTaken;
        
        label.style.opacity = '0.5';
        
        try {
            if (newTakenState) {
                await markMedicationAsTaken(medication.id, date);
                showNotification(`Лекарство "${medication.name}" отмечено как принятое`, 'success');
            } else {
                await markMedicationAsNotTaken(medication.id, date);
                showNotification(`Лекарство "${medication.name}" отмечено как не принятое`, 'info');
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
    
    label.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showContextMenu(e, medication);
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
            updateMedicationsForDate(currentSelectedDate);
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting medication:', error);
        showNotification('Произошла ошибка при удалении', 'error');
    }
}

function showContextMenu(event, medication) {
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
        min-width: 180px;
        z-index: 1000;
        animation: fadeIn 0.2s ease;
        overflow: hidden;
    `;
    
    menu.innerHTML = `
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
            
            setTimeout(() => {
                window.location.href = 'diary.html';
            }, 1000);
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

async function showMedicationStats() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    
    const medications = getUserMedications(currentUser.id);
    const history = getTakenHistory(currentUser.id);
    
    const regularCount = medications.filter(m => m.type === 'regular').length;
    const singleCount = medications.filter(m => m.type === 'single').length;
    
    let totalTaken = 0;
    Object.values(history).forEach(dateMeds => {
        totalTaken += dateMeds.length;
    });
    
    const content = `
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; text-align: center;">
            <div style="background: rgba(52, 199, 166, 0.1); padding: 1rem; border-radius: 8px;">
                <div style="font-size: 2rem; color: var(--color-accent);">${medications.length}</div>
                <div style="font-size: 0.9rem; color: var(--color-text-secondary);">Всего лекарств</div>
            </div>
            <div style="background: rgba(26, 107, 138, 0.1); padding: 1rem; border-radius: 8px;">
                <div style="font-size: 2rem; color: var(--color-primary-light);">${totalTaken}</div>
                <div style="font-size: 0.9rem; color: var(--color-text-secondary);">Всего принято</div>
            </div>
            <div style="background: rgba(52, 199, 166, 0.1); padding: 1rem; border-radius: 8px;">
                <div style="font-size: 2rem; color: var(--color-accent);">${regularCount}</div>
                <div style="font-size: 0.9rem; color: var(--color-text-secondary);">Регулярных</div>
            </div>
            <div style="background: rgba(26, 107, 138, 0.1); padding: 1rem; border-radius: 8px;">
                <div style="font-size: 2rem; color: var(--color-primary-light);">${singleCount}</div>
                <div style="font-size: 0.9rem; color: var(--color-text-secondary);">Разовых</div>
            </div>
        </div>
        <div style="margin-top: 1.5rem; font-size: 0.9rem; color: var(--color-text-secondary); text-align: center;">
            Статистика обновляется в реальном времени
        </div>
    `;
    
    try {
        const { createModal } = await import('./ui.js');
        createModal({
            title: 'Статистика',
            content: content,
            confirmText: 'Закрыть',
            showCancel: false,
            onConfirm: () => {}
        });
    } catch (error) {
        console.error('Error showing stats:', error);
    }
}