/**
 * Модуль для работы с localStorage
 */

const STORAGE_KEYS = {
    USERS: 'med_diary_users',
    CURRENT_USER: 'med_diary_current_user',
    MEDICATIONS: 'med_diary_medications',
    TAKEN_HISTORY: 'med_diary_taken_history'
};

/**
 * Сохраняет данные в localStorage
 * @param {string} key - Ключ
 * @param {any} data - Данные для сохранения
 */
export function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Ошибка при сохранении в localStorage:', error);
    }
}

/**
 * Загружает данные из localStorage
 * @param {string} key - Ключ
 * @param {any} defaultValue - Значение по умолчанию
 * @returns {any} Данные из localStorage
 */
export function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Ошибка при загрузке из localStorage:', error);
        return defaultValue;
    }
}

/**
 * Получает текущего пользователя
 * @returns {Object|null} Текущий пользователь или null
 */
export function getCurrentUser() {
    return loadFromStorage(STORAGE_KEYS.CURRENT_USER);
}

/**
 * Устанавливает текущего пользователя
 * @param {Object} user - Объект пользователя
 */
export function setCurrentUser(user) {
    saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
}

/**
 * Выход из системы (удаление текущего пользователя)
 */
export function logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

/**
 * Получает список пользователей
 * @returns {Array} Массив пользователей
 */
export function getUsers() {
    return loadFromStorage(STORAGE_KEYS.USERS, []);
}

/**
 * Сохраняет список пользователей
 * @param {Array} users - Массив пользователей
 */
export function saveUsers(users) {
    saveToStorage(STORAGE_KEYS.USERS, users);
}

/**
 * Регистрирует нового пользователя
 * @param {Object} userData - Данные пользователя
 * @returns {Object} Результат регистрации
 */
export function registerUser(userData) {
    const users = getUsers();
    
    // Проверяем, существует ли пользователь с таким email
    const existingUser = users.find(user => user.email === userData.email);
    if (existingUser) {
        return {
            success: false,
            message: 'Пользователь с таким email уже существует'
        };
    }
    
    // Создаем нового пользователя
    const newUser = {
        id: Date.now().toString(),
        name: userData.name,
        email: userData.email,
        password: userData.password, // В реальном приложении нужно хешировать!
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    
    return {
        success: true,
        user: newUser
    };
}

/**
 * Авторизация пользователя
 * @param {string} email - Email
 * @param {string} password - Пароль
 * @returns {Object} Результат авторизации
 */
export function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return {
            success: false,
            message: 'Неверный email или пароль'
        };
    }
    
    // Удаляем пароль из объекта пользователя перед сохранением
    const { password: _, ...userWithoutPassword } = user;
    setCurrentUser(userWithoutPassword);
    
    return {
        success: true,
        user: userWithoutPassword
    };
}

/**
 * Получает лекарства пользователя
 * @param {string} userId - ID пользователя
 * @returns {Array} Массив лекарств
 */
export function getUserMedications(userId) {
    const allMedications = loadFromStorage(STORAGE_KEYS.MEDICATIONS, {});
    return allMedications[userId] || [];
}

/**
 * Сохраняет лекарства пользователя
 * @param {string} userId - ID пользователя
 * @param {Array} medications - Массив лекарств
 */
export function saveUserMedications(userId, medications) {
    const allMedications = loadFromStorage(STORAGE_KEYS.MEDICATIONS, {});
    allMedications[userId] = medications;
    saveToStorage(STORAGE_KEYS.MEDICATIONS, allMedications);
}

/**
 * Добавляет новое лекарство
 * @param {Object} medication - Данные лекарства
 * @returns {Object} Результат операции
 */
export function addMedication(medication) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return {
            success: false,
            message: 'Пользователь не авторизован'
        };
    }
    
    const medications = getUserMedications(currentUser.id);
    const newMedication = {
        ...medication,
        id: Date.now().toString(),
        userId: currentUser.id,
        createdAt: new Date().toISOString()
    };
    
    medications.push(newMedication);
    saveUserMedications(currentUser.id, medications);
    
    return {
        success: true,
        medication: newMedication
    };
}

/**
 * Получает историю приема лекарств
 * @param {string} userId - ID пользователя
 * @returns {Object} История приема по датам
 */
export function getTakenHistory(userId) {
    const allHistory = loadFromStorage(STORAGE_KEYS.TAKEN_HISTORY, {});
    return allHistory[userId] || {};
}

/**
 * Сохраняет историю приема лекарств
 * @param {string} userId - ID пользователя
 * @param {Object} history - История приема
 */
export function saveTakenHistory(userId, history) {
    const allHistory = loadFromStorage(STORAGE_KEYS.TAKEN_HISTORY, {});
    allHistory[userId] = history;
    saveToStorage(STORAGE_KEYS.TAKEN_HISTORY, allHistory);
}

/**
 * Отмечает лекарство как принятое
 * @param {string} medicationId - ID лекарства
 * @param {Date} date - Дата приема
 * @returns {Object} Результат операции
 */
export function markMedicationAsTaken(medicationId, date = new Date()) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return { success: false, message: 'Пользователь не авторизован' };
    }
    
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const history = getTakenHistory(currentUser.id);
    
    if (!history[dateKey]) {
        history[dateKey] = [];
    }
    
    if (!history[dateKey].includes(medicationId)) {
        history[dateKey].push(medicationId);
        saveTakenHistory(currentUser.id, history);
    }
    
    return { success: true };
}

/**
 * Отмечает лекарство как не принятое
 * @param {string} medicationId - ID лекарства
 * @param {Date} date - Дата приема
 * @returns {Object} Результат операции
 */
export function markMedicationAsNotTaken(medicationId, date = new Date()) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return { success: false, message: 'Пользователь не авторизован' };
    }
    
    const dateKey = date.toISOString().split('T')[0];
    const history = getTakenHistory(currentUser.id);
    
    if (history[dateKey]) {
        history[dateKey] = history[dateKey].filter(id => id !== medicationId);
        saveTakenHistory(currentUser.id, history);
    }
    
    return { success: true };
}

/**
 * Проверяет, принято ли лекарство в указанную дату
 * @param {string} medicationId - ID лекарства
 * @param {Date} date - Дата
 * @returns {boolean} true, если принято
 */
export function isMedicationTaken(medicationId, date = new Date()) {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    const dateKey = date.toISOString().split('T')[0];
    const history = getTakenHistory(currentUser.id);
    
    return history[dateKey] && history[dateKey].includes(medicationId);
}

/**
 * Получает лекарства для указанной даты
 * @param {Date} date - Дата
 * @returns {Array} Массив лекарств для даты
 */
export function getMedicationsForDate(date) {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    const allMedications = getUserMedications(currentUser.id);
    const dateKey = date.toISOString().split('T')[0];
    const today = new Date();
    
    return allMedications.filter(med => {
        // Для разовых лекарств проверяем дату
        if (med.type === 'single') {
            const medDate = new Date(med.date);
            return medDate.toISOString().split('T')[0] === dateKey;
        }
        
        // Для постоянных лекарств проверяем расписание
        if (med.type === 'regular') {
            const startDate = new Date(med.startDate || med.createdAt);
            if (date < startDate) return false;
            
            switch (med.frequency) {
                case 'daily':
                    return true;
                case 'weekly':
                    const daysDiff = Math.floor((date - startDate) / (1000 * 60 * 60 * 24));
                    return daysDiff % 7 === 0;
                case 'monthly':
                    return date.getDate() === startDate.getDate();
                default:
                    return false;
            }
        }
        
        return false;
    });
}

/**
 * Удаляет лекарство
 * @param {string} medicationId - ID лекарства
 * @returns {Object} Результат операции
 */
export function deleteMedication(medicationId) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return { success: false, message: 'Пользователь не авторизован' };
    }
    
    const medications = getUserMedications(currentUser.id);
    const updatedMedications = medications.filter(m => m.id !== medicationId);
    saveUserMedications(currentUser.id, updatedMedications);
    
    return { success: true };
}