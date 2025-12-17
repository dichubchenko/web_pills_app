/**
 * Модуль для работы с лекарствами и дневником
 */

import { 
    getCurrentUser, 
    getMedicationsForDate, 
    markMedicationAsTaken, 
    markMedicationAsNotTaken,
    isMedicationTaken,
    addMedication,
    deleteMedication
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

/**
 * Инициализирует главный экран дневника
 */
export function initDiary() {
    createNotificationStyles();
    
    // Проверяем авторизацию
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Обновляем заголовок с именем пользователя
    const pageTitle = document.querySelector('.app-page-title');
    if (pageTitle) {
        pageTitle.textContent = `Дневник ${currentUser.name}`;
    }
    
    // Инициализируем компоненты
    initDateSlider();
    initMedicationLists();
    initAddButton();
    initLogoutButton();
    
    // Обновляем данные
    updateDateDisplay();
    updateMedicationsForDate(currentSelectedDate);
}

/**
 * Инициализирует слайдер с датами
 */
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

/**
 * Обновляет слайдер с датами
 */
function updateDateSlider() {
    const dateList = document.getElementById('dateList');
    if (!dateList) return;
    
    dateList.innerHTML = '';
    
    // Создаем даты для отображения (3 дня назад, сегодня, 3 дня вперед)
    for (let i = -3; i <= 3; i++) {
        const date = addDays(currentDate, i);
        const dateElement = createDateElement(date);
        dateList.appendChild(dateElement);
    }
    
    // Прокручиваем к сегодняшней дате
    const todayElement = dateList.querySelector('.app-date-item--active');
    if (todayElement) {
        todayElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
}

/**
 * Создает элемент даты для слайдера
 */
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

/**
 * Обновляет отображение текущей даты
 */
function updateDateDisplay() {
    const dateDisplay = document.getElementById('currentDate');
    if (dateDisplay) {
        dateDisplay.textContent = formatDate(currentSelectedDate);
        
        // Добавляем индикатор "сегодня"
        if (isSameDay(currentSelectedDate, new Date())) {
            dateDisplay.innerHTML += ' <span style="color: var(--color-accent); font-size: 0.9em;">(сегодня)</span>';
        }
    }
}

/**
 * Инициализирует списки лекарств
 */
function initMedicationLists() {
    // Будут обновляться динамически
}

/**
 * Обновляет списки лекарств для указанной даты
 */
function updateMedicationsForDate(date) {
    const medications = getMedicationsForDate(date);
    const pendingList = document.getElementById('pendingMedications');
    const takenList = document.getElementById('takenMedications');
    const pendingCount = document.getElementById('pendingCount');
    const takenCount = document.getElementById('takenCount');
    
    if (!pendingList || !takenList) return;
    
    // Разделяем лекарства на принятые и ожидающие
    const pending = [];
    const taken = [];
    
    medications.forEach(med => {
        if (isMedicationTaken(med.id, date)) {
            taken.push(med);
        } else {
            pending.push(med);
        }
    });
    
    // Сортируем по времени
    pending.sort((a, b) => parseTime(a.time) - parseTime(b.time));
    taken.sort((a, b) => parseTime(a.time) - parseTime(b.time));
    
    // Обновляем счетчики
    if (pendingCount) pendingCount.textContent = pending.length;
    if (takenCount) takenCount.textContent = taken.length;
    
    // Очищаем списки
    pendingList.innerHTML = '';
    takenList.innerHTML = '';
    
    // Добавляем лекарства в списки
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

/**
 * Создает элемент лекарства
 */
function createMedicationElement(medication, date, isTaken = false) {
    const label = document.createElement('label');
    label.className = 'app-medication-item';
    
    if (isTaken) {
        label.classList.add('app-medication-item--taken');
    }
    
    // Определяем иконку в зависимости от типа
    let icon = '💊';
    if (medication.type === 'regular') {
        icon = '📅';
    }
    
    label.innerHTML = `
        <input type="checkbox" class="app-medication-checkbox" ${isTaken ? 'checked' : ''}>
        <div class="app-medication-info">
            <div class="app-medication-name">${icon} ${medication.name}</div>
            <div class="app-medication-time">${medication.time} | ${medication.dosage}</div>
            ${medication.notes ? `<div class="app-medication-notes" style="font-size: 0.85rem; color: var(--color-text-secondary); margin-top: 2px;">${medication.notes}</div>` : ''}
        </div>
    `;
    
    // Обработчик клика на чекбокс
    const checkbox = label.querySelector('.app-medication-checkbox');
    checkbox.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    
    label.addEventListener('click', async (e) => {
        if (e.target === checkbox) return;
        
        const newTakenState = !isTaken;
        
        // Имитация задержки
        label.style.opacity = '0.5';
        
        try {
            if (newTakenState) {
                await markMedicationAsTaken(medication.id, date);
                showNotification(`Лекарство "${medication.name}" отмечено как принятое`, 'success');
            } else {
                await markMedicationAsNotTaken(medication.id, date);
                showNotification(`Лекарство "${medication.name}" отмечено как не принятое`, 'info');
            }
            
            // Обновляем отображение
            updateMedicationsForDate(date);
            
        } catch (error) {
            console.error('Error updating medication:', error);
            showNotification('Произошла ошибка', 'error');
            label.style.opacity = '1';
        }
    });
    
    return label;
}

/**
 * Инициализирует кнопку добавления
 */
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
    
    // Закрытие меню при клике вне его
    document.addEventListener('click', function(e) {
        if (!addButton.contains(e.target) && !dropdownMenu.contains(e.target)) {
            addButton.setAttribute('aria-expanded', 'false');
            dropdownMenu.classList.remove('app-dropdown-menu--visible');
        }
    });
}

/**
 * Инициализирует кнопку выхода
 */
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

/**
 * Инициализирует экран добавления лекарства
 */
export function initAddMedication() {
    createNotificationStyles();
    
    // Проверяем авторизацию
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Определяем тип лекарства из URL
    const urlParams = new URLSearchParams(window.location.search);
    const type = urlParams.get('type') || 'single';
    
    // Устанавливаем заголовок
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = type === 'single' 
            ? 'Добавить разовый приём' 
            : 'Добавить постоянное лекарство';
    }
    
    // Устанавливаем тип лекарства
    const typeRadio = document.getElementById(`type-${type}`);
    if (typeRadio) {
        typeRadio.checked = true;
        toggleFrequencyGroup();
    }
    
    // Устанавливаем текущее время
    const timeInput = document.getElementById('med-time');
    if (timeInput) {
        const now = new Date();
        now.setMinutes(now.getMinutes() + 30); // Ближайшие полчаса
        timeInput.value = formatTime(now);
    }
    
    // Обработчик изменения типа лекарства
    const typeRadios = document.querySelectorAll('input[name="med-type"]');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', toggleFrequencyGroup);
    });
    
    // Обработчик отправки формы
    const form = document.getElementById('medicationForm');
    if (form) {
        form.addEventListener('submit', handleAddMedication);
    }
}

/**
 * Переключает видимость группы с частотой приема
 */
function toggleFrequencyGroup() {
    const frequencyGroup = document.getElementById('frequencyGroup');
    const regularType = document.getElementById('type-regular');
    
    if (frequencyGroup && regularType) {
        frequencyGroup.style.display = regularType.checked ? 'block' : 'none';
        
        // Устанавливаем значение по умолчанию для частоты
        if (regularType.checked) {
            const dailyRadio = document.getElementById('freq-daily');
            if (dailyRadio && !document.querySelector('input[name="med-frequency"]:checked')) {
                dailyRadio.checked = true;
            }
        }
    }
}

/**
 * Обработчик добавления лекарства
 */
async function handleAddMedication(event) {
    event.preventDefault();
    
    const name = document.getElementById('med-name').value.trim();
    const dosage = document.getElementById('med-dosage').value.trim();
    const time = document.getElementById('med-time').value;
    const type = document.querySelector('input[name="med-type"]:checked').value;
    const notes = document.getElementById('med-notes').value.trim();
    const errorElement = document.getElementById('formError');
    
    // Валидация
    if (!name || !dosage || !time) {
        showFormError(errorElement, 'Пожалуйста, заполните все обязательные поля');
        return;
    }
    
    // Подготавливаем данные лекарства
    const medicationData = {
        name,
        dosage,
        time,
        type,
        notes: notes || undefined
    };
    
    // Добавляем данные для постоянных лекарств
    if (type === 'regular') {
        const frequency = document.querySelector('input[name="med-frequency"]:checked');
        if (!frequency) {
            showFormError(errorElement, 'Пожалуйста, выберите частоту приёма');
            return;
        }
        
        medicationData.frequency = frequency.value;
        medicationData.startDate = new Date().toISOString();
    } else {
        // Для разовых лекарств добавляем дату
        medicationData.date = new Date().toISOString();
    }
    
    // Имитация загрузки
    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Добавление...';
    submitBtn.disabled = true;
    
    try {
        // Имитация сетевой задержки
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const result = addMedication(medicationData);
        
        if (result.success) {
            showNotification(`Лекарство "${name}" успешно добавлено`, 'success');
            
            // Возвращаемся на главный экран
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

/**
 * Показывает ошибку в форме
 */
function showFormError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}