const STORAGE_KEYS = {
    USERS: 'med_diary_users',
    CURRENT_USER: 'med_diary_current_user',
    MEDICATIONS: 'med_diary_medications',
    TAKEN_HISTORY: 'med_diary_taken_history'
};

export function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error('Ошибка при сохранении в localStorage:', error);
    }
}

export function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
        console.error('Ошибка при загрузке из localStorage:', error);
        return defaultValue;
    }
}

export function getCurrentUser() {
    return loadFromStorage(STORAGE_KEYS.CURRENT_USER);
}

export function setCurrentUser(user) {
    saveToStorage(STORAGE_KEYS.CURRENT_USER, user);
}

export function logout() {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
}

export function getUsers() {
    return loadFromStorage(STORAGE_KEYS.USERS, []);
}

export function saveUsers(users) {
    saveToStorage(STORAGE_KEYS.USERS, users);
}

export function registerUser(userData) {
    const users = getUsers();
    
    const existingUser = users.find(user => user.email === userData.email);
    if (existingUser) {
        return {
            success: false,
            message: 'Пользователь с таким email уже существует'
        };
    }
    
    const newUser = {
        id: Date.now().toString(),
        name: userData.name,
        email: userData.email,
        password: userData.password,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    
    return {
        success: true,
        user: newUser
    };
}

export function loginUser(email, password) {
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return {
            success: false,
            message: 'Неверный email или пароль'
        };
    }
    
    const { password: _, ...userWithoutPassword } = user;
    setCurrentUser(userWithoutPassword);
    
    return {
        success: true,
        user: userWithoutPassword
    };
}

export function getUserMedications(userId) {
    const allMedications = loadFromStorage(STORAGE_KEYS.MEDICATIONS, {});
    return allMedications[userId] || [];
}

export function saveUserMedications(userId, medications) {
    const allMedications = loadFromStorage(STORAGE_KEYS.MEDICATIONS, {});
    allMedications[userId] = medications;
    saveToStorage(STORAGE_KEYS.MEDICATIONS, allMedications);
}

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

export function getTakenHistory(userId) {
    const allHistory = loadFromStorage(STORAGE_KEYS.TAKEN_HISTORY, {});
    return allHistory[userId] || {};
}

export function saveTakenHistory(userId, history) {
    const allHistory = loadFromStorage(STORAGE_KEYS.TAKEN_HISTORY, {});
    allHistory[userId] = history;
    saveToStorage(STORAGE_KEYS.TAKEN_HISTORY, allHistory);
}

export function markMedicationAsTaken(medicationId, date = new Date()) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return { success: false, message: 'Пользователь не авторизован' };
    }
    
    const dateKey = date.toISOString().split('T')[0];
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

export function isMedicationTaken(medicationId, date = new Date()) {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    const dateKey = date.toISOString().split('T')[0];
    const history = getTakenHistory(currentUser.id);
    
    return history[dateKey] && history[dateKey].includes(medicationId);
}

export function getMedicationsForDate(date) {
    const currentUser = getCurrentUser();
    if (!currentUser) return [];
    
    const allMedications = getUserMedications(currentUser.id);
    const dateKey = date.toISOString().split('T')[0];
    const today = new Date();
    
    return allMedications.filter(med => {
        if (med.type === 'single') {
            const medDate = new Date(med.date);
            return medDate.toISOString().split('T')[0] === dateKey;
        }
        
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

export function deleteMedication(medicationId) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        return { success: false, message: 'Пользователь не авторизован' };
    }
    
    const medications = getUserMedications(currentUser.id);
    const medicationToDelete = medications.find(m => m.id === medicationId);
    
    if (!medicationToDelete) {
        return { success: false, message: 'Лекарство не найдено' };
    }
    
    const updatedMedications = medications.filter(m => m.id !== medicationId);
    saveUserMedications(currentUser.id, updatedMedications);
    
    const history = getTakenHistory(currentUser.id);
    const updatedHistory = {};
    
    Object.keys(history).forEach(dateKey => {
        updatedHistory[dateKey] = history[dateKey].filter(id => id !== medicationId);
    });
    
    saveTakenHistory(currentUser.id, updatedHistory);
    
    return { 
        success: true, 
        medication: medicationToDelete,
        message: 'Лекарство успешно удалено'
    };
}

export function getMedicationById(medicationId) {
    const currentUser = getCurrentUser();
    if (!currentUser) return null;
    
    const medications = getUserMedications(currentUser.id);
    return medications.find(m => m.id === medicationId) || null;
}