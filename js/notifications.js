const NOTIFICATION_PERMISSION_KEY = 'med_diary_notification_permission';

const MEDICATION_ICON_SVG = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2334c7a6"><path d="M18 3h-3.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H6c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 14H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/></svg>';

export class MedicationNotifications {
    constructor() {
        this.notifications = new Map();
        this.isSupported = 'Notification' in window;
        this.permission = this.getSavedPermission();
        this.initPermissionListener();
    }

    initPermissionListener() {
        if (!this.isSupported) return;
        
        try {
            if ('permissions' in navigator && 'query' in navigator.permissions) {
                navigator.permissions.query({ name: 'notifications' }).then((permissionStatus) => {
                    permissionStatus.onchange = () => {
                        const newPermission = Notification.permission;
                        this.permission = newPermission;
                        this.savePermission(newPermission);
                    };
                }).catch(() => {
                    console.warn('Не удалось установить слушатель разрешений');
                });
            }
        } catch (error) {
            console.warn('Браузер не поддерживает отслеживание изменения разрешений:', error);
        }
    }

    getSavedPermission() {
        if (!this.isSupported) return 'unsupported';
        
        const saved = localStorage.getItem(NOTIFICATION_PERMISSION_KEY);
        const browserPermission = Notification.permission;
        
        if (!saved || saved === 'default') {
            return browserPermission;
        }
        
        return saved;
    }

    savePermission(permission) {
        this.permission = permission;
        localStorage.setItem(NOTIFICATION_PERMISSION_KEY, permission);
        
        if (permission !== 'granted') {
            this.cancelAllNotifications();
        }
    }

    async requestPermission() {
        if (!this.isSupported) {
            console.warn('Уведомления не поддерживаются в этом браузере');
            return 'unsupported';
        }

        try {
            const permission = await Notification.requestPermission();
            this.savePermission(permission);
            return permission;
        } catch (error) {
            console.error('Ошибка при запросе разрешения на уведомления:', error);
            this.savePermission('denied');
            return 'denied';
        }
    }

    updatePermissionFromBrowser() {
        if (!this.isSupported) return;
        
        const browserPermission = Notification.permission;
        if (browserPermission !== this.permission) {
            this.permission = browserPermission;
            this.savePermission(browserPermission);
        }
    }

    showTestNotification() {
        this.updatePermissionFromBrowser();
        
        if (!this.isSupported || this.permission !== 'granted') {
            return false;
        }

        const options = {
            body: 'Это тестовое уведомление. Уведомления работают корректно!',
            icon: MEDICATION_ICON_SVG,
            badge: MEDICATION_ICON_SVG,
            tag: 'test-notification',
            requireInteraction: true
        };

        try {
            const notification = new Notification('Медицинский дневник', options);
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };

            return true;
        } catch (error) {
            console.error('Ошибка при показе тестового уведомления:', error);
            return false;
        }
    }

    scheduleMedicationNotification(medication, date = new Date()) {
        this.updatePermissionFromBrowser();
        
        if (!this.isSupported || this.permission !== 'granted') {
            return null;
        }

        const notificationId = `medication-${medication.id}-${date.toDateString()}`;
        
        if (this.notifications.has(notificationId)) {
            this.cancelNotification(notificationId);
        }

        const [hours, minutes] = medication.time.split(':').map(Number);
        const notificationTime = new Date(date);
        notificationTime.setHours(hours, minutes, 0, 0);

        const now = new Date();
        let timeUntilNotification = notificationTime - now;

        if (timeUntilNotification < 0) {
            notificationTime.setDate(notificationTime.getDate() + 1);
            timeUntilNotification = notificationTime - now;
        }

        if (timeUntilNotification > 24 * 60 * 60 * 1000) {
            return null;
        }

        const timeoutId = setTimeout(() => {
            this.showMedicationNotification(medication);
        }, timeUntilNotification);

        this.notifications.set(notificationId, {
            timeoutId,
            medication,
            scheduledTime: notificationTime
        });

        return notificationId;
    }

    showMedicationNotification(medication) {
        this.updatePermissionFromBrowser();
        
        if (!this.isSupported || this.permission !== 'granted') {
            return null;
        }

        const notificationId = `medication-${medication.id}-${Date.now()}`;
        
        const options = {
            body: `Время принять ${medication.name} (${medication.dosage})`,
            icon: MEDICATION_ICON_SVG,
            badge: MEDICATION_ICON_SVG,
            tag: notificationId,
            requireInteraction: true,
            data: {
                medicationId: medication.id,
                medicationName: medication.name
            }
        };

        try {
            const notification = new Notification('💊 Пора принять лекарство', options);

            notification.onclick = (event) => {
                event.preventDefault();
                window.focus();
                
                if (window.location.pathname.includes('diary.html')) {
                    window.location.href = 'diary.html';
                } else {
                    window.open('diary.html', '_blank');
                }
                
                notification.close();
            };

            notification.onclose = () => {
                this.notifications.delete(notificationId);
            };

            return notificationId;
        } catch (error) {
            console.error('Ошибка при показе уведомления:', error);
            return null;
        }
    }

    scheduleAllMedicationsForToday(medications) {
        this.updatePermissionFromBrowser();
        
        if (!this.isSupported || this.permission !== 'granted') {
            return;
        }

        const today = new Date();
        medications.forEach(medication => {
            this.scheduleMedicationNotification(medication, today);
        });
    }

    cancelNotification(notificationId) {
        if (this.notifications.has(notificationId)) {
            const { timeoutId } = this.notifications.get(notificationId);
            clearTimeout(timeoutId);
            this.notifications.delete(notificationId);
        }
    }

    cancelAllNotifications() {
        this.notifications.forEach(({ timeoutId }) => {
            clearTimeout(timeoutId);
        });
        this.notifications.clear();
    }

    getScheduledNotifications() {
        this.updatePermissionFromBrowser();
        
        return Array.from(this.notifications.entries()).map(([id, data]) => ({
            id,
            medication: data.medication,
            scheduledTime: data.scheduledTime
        }));
    }

    isPermissionGranted() {
        this.updatePermissionFromBrowser();
        return this.isSupported && this.permission === 'granted';
    }

    isPermissionDenied() {
        this.updatePermissionFromBrowser();
        return this.isSupported && this.permission === 'denied';
    }

    canRequestPermission() {
        this.updatePermissionFromBrowser();
        return this.isSupported && this.permission === 'default';
    }
}

export const notificationManager = new MedicationNotifications();