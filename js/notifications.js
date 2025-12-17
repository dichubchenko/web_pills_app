const NOTIFICATION_PERMISSION_KEY = 'med_diary_notification_permission';

const MEDICATION_ICON_SVG = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%2334c7a6"><path d="M18 3h-3.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H6c-1.1 0-2 .9-2 2v15c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-6 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm0 4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 14H6v-1c0-2 4-3.1 6-3.1s6 1.1 6 3.1v1z"/></svg>';

export class MedicationNotifications {
    constructor() {
        this.notifications = new Map();
        this.isSupported = 'Notification' in window;
        this.permission = this.getSavedPermission();
        this.initPermissionListener();
        console.log('Notification Manager initialized:', {
            supported: this.isSupported,
            permission: this.permission,
            browserPermission: Notification.permission
        });
    }

    initPermissionListener() {
        if (!this.isSupported) return;
        
        try {
            if ('permissions' in navigator && 'query' in navigator.permissions) {
                navigator.permissions.query({ name: 'notifications' }).then((permissionStatus) => {
                    console.log('Permission status listener initialized');
                    permissionStatus.onchange = () => {
                        console.log('Permission changed:', Notification.permission);
                        this.permission = Notification.permission;
                        this.savePermission(this.permission);
                    };
                }).catch((error) => {
                    console.warn('Не удалось установить слушатель разрешений:', error);
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
        
        console.log('Saved permission:', saved, 'Browser permission:', browserPermission);
        
        if (!saved) {
            return browserPermission;
        }
        
        return saved;
    }

    savePermission(permission) {
        console.log('Saving permission:', permission);
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
            console.log('Requesting notification permission...');
            const permission = await Notification.requestPermission();
            console.log('Permission result:', permission);
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
        console.log('Updating permission from browser:', browserPermission, 'Current:', this.permission);
        
        if (browserPermission !== this.permission) {
            console.log('Permission changed, updating...');
            this.permission = browserPermission;
            this.savePermission(browserPermission);
        }
    }

    showTestNotification() {
        console.log('Showing test notification...');
        this.updatePermissionFromBrowser();
        
        if (!this.isSupported) {
            console.error('Notifications not supported');
            return false;
        }
        
        if (this.permission !== 'granted') {
            console.error('Permission not granted:', this.permission);
            return false;
        }

        try {
            const options = {
                body: 'Это тестовое уведомление. Уведомления работают корректно!',
                icon: MEDICATION_ICON_SVG,
                badge: MEDICATION_ICON_SVG,
                tag: 'test-notification-' + Date.now(),
                requireInteraction: false
            };

            console.log('Creating notification with options:', options);
            const notification = new Notification('Медицинский дневник', options);
            
            notification.onclick = () => {
                console.log('Test notification clicked');
                window.focus();
                notification.close();
            };
            
            notification.onerror = (error) => {
                console.error('Notification error:', error);
            };
            
            console.log('Test notification created successfully');
            return true;
        } catch (error) {
            console.error('Ошибка при показе тестового уведомления:', error);
            return false;
        }
    }

    scheduleMedicationNotification(medication, date = new Date()) {
        console.log('Scheduling notification for:', medication.name, 'at', medication.time);
        this.updatePermissionFromBrowser();
        
        if (!this.isSupported || this.permission !== 'granted') {
            console.log('Cannot schedule: supported=', this.isSupported, 'permission=', this.permission);
            return null;
        }

        const notificationId = `medication-${medication.id}-${date.toDateString()}`;
        
        if (this.notifications.has(notificationId)) {
            console.log('Cancelling existing notification:', notificationId);
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
            console.log('Notification time is more than 24 hours in the future');
            return null;
        }

        console.log('Notification scheduled for:', notificationTime, 'in', timeUntilNotification, 'ms');

        const timeoutId = setTimeout(() => {
            console.log('Timeout fired for:', medication.name);
            this.showMedicationNotification(medication);
        }, timeUntilNotification);

        this.notifications.set(notificationId, {
            timeoutId,
            medication,
            scheduledTime: notificationTime
        });

        console.log('Notifications scheduled:', this.notifications.size);
        return notificationId;
    }

    showMedicationNotification(medication) {
        console.log('Showing medication notification for:', medication.name);
        this.updatePermissionFromBrowser();
        
        if (!this.isSupported || this.permission !== 'granted') {
            console.log('Cannot show: supported=', this.isSupported, 'permission=', this.permission);
            return null;
        }

        const notificationId = `medication-${medication.id}-${Date.now()}`;
        
        try {
            const options = {
                body: `Время принять ${medication.name} (${medication.dosage})`,
                icon: MEDICATION_ICON_SVG,
                badge: MEDICATION_ICON_SVG,
                tag: notificationId,
                requireInteraction: false,
                data: {
                    medicationId: medication.id,
                    medicationName: medication.name
                }
            };

            console.log('Creating medication notification with options:', options);
            const notification = new Notification('💊 Пора принять лекарство', options);

            notification.onclick = (event) => {
                console.log('Medication notification clicked');
                event.preventDefault();
                window.focus();
                
                if (window.location.pathname.includes('diary.html')) {
                    window.location.href = 'diary.html';
                } else {
                    window.open('diary.html', '_blank');
                }
                
                notification.close();
            };
            
            notification.onerror = (error) => {
                console.error('Medication notification error:', error);
            };

            notification.onclose = () => {
                console.log('Notification closed:', notificationId);
                this.notifications.delete(notificationId);
            };

            console.log('Medication notification created successfully');
            return notificationId;
        } catch (error) {
            console.error('Error showing medication notification:', error);
            return null;
        }
    }

    scheduleAllMedicationsForToday(medications) {
        console.log('Scheduling all medications for today:', medications.length);
        this.updatePermissionFromBrowser();
        
        if (!this.isSupported || this.permission !== 'granted') {
            console.log('Cannot schedule all: supported=', this.isSupported, 'permission=', this.permission);
            return;
        }

        const today = new Date();
        medications.forEach(medication => {
            this.scheduleMedicationNotification(medication, today);
        });
    }

    cancelNotification(notificationId) {
        if (this.notifications.has(notificationId)) {
            console.log('Cancelling notification:', notificationId);
            const { timeoutId } = this.notifications.get(notificationId);
            clearTimeout(timeoutId);
            this.notifications.delete(notificationId);
        }
    }

    cancelAllNotifications() {
        console.log('Cancelling all notifications:', this.notifications.size);
        this.notifications.forEach(({ timeoutId }, id) => {
            clearTimeout(timeoutId);
            console.log('Cancelled:', id);
        });
        this.notifications.clear();
    }

    getScheduledNotifications() {
        this.updatePermissionFromBrowser();
        
        const scheduled = Array.from(this.notifications.entries()).map(([id, data]) => ({
            id,
            medication: data.medication,
            scheduledTime: data.scheduledTime
        }));
        
        console.log('Scheduled notifications:', scheduled.length);
        return scheduled;
    }

    isPermissionGranted() {
        this.updatePermissionFromBrowser();
        const granted = this.isSupported && this.permission === 'granted';
        console.log('isPermissionGranted:', granted, 'supported=', this.isSupported, 'permission=', this.permission);
        return granted;
    }

    isPermissionDenied() {
        this.updatePermissionFromBrowser();
        return this.isSupported && this.permission === 'denied';
    }

    canRequestPermission() {
        this.updatePermissionFromBrowser();
        return this.isSupported && this.permission === 'default';
    }

    checkNotificationSupport() {
        return {
            supported: this.isSupported,
            permission: this.permission,
            browserPermission: Notification.permission,
            maxActions: 'actions' in Notification.prototype ? Notification.maxActions : 0,
            requiresInteraction: 'requireInteraction' in Notification.prototype
        };
    }
}

export const notificationManager = new MedicationNotifications();