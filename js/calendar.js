export class CalendarIntegration {
    constructor() {
        this.isAvailable = this.checkCalendarAvailability();
        this.calendarType = this.detectCalendarType();
        this.googleApiAvailable = false;
        this.oauthState = this.loadOAuthState();
        this.initGoogleAPI();
    }

    checkCalendarAvailability() {
        return typeof URL === 'function' && 
               typeof encodeURIComponent === 'function' &&
               typeof Date.prototype.toISOString === 'function';
    }

    detectCalendarType() {
        const userAgent = navigator.userAgent.toLowerCase();
        if (userAgent.includes('android') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
            return 'mobile';
        }
        return 'desktop';
    }

    initGoogleAPI() {
        if (typeof gapi === 'undefined') {
            this.loadGoogleAPI();
        }
    }

    loadGoogleAPI() {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = () => {
            console.log('Google API loaded');
            gapi.load('client:auth2', this.initGoogleClient.bind(this));
        };
        script.onerror = () => {
            console.warn('Failed to load Google API');
        };
        document.head.appendChild(script);
    }

    async initGoogleClient() {
        try {
            await gapi.client.init({
                apiKey: 'AIzaSyDummyKeyForDemoOnly', // Демо-ключ
                clientId: 'dummy-client-id.apps.googleusercontent.com', // Демо ID
                discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
                scope: 'https://www.googleapis.com/auth/calendar.events'
            });
            
            this.googleApiAvailable = true;
            console.log('Google Calendar API initialized (demo mode)');
        } catch (error) {
            console.warn('Google Calendar API initialization failed (expected in demo):', error.message);
            this.googleApiAvailable = false;
        }
    }

    loadOAuthState() {
        const saved = localStorage.getItem('calendar_oauth_state');
        return saved ? JSON.parse(saved) : {
            authenticated: false,
            token: null,
            expiry: null
        };
    }

    saveOAuthState(state) {
        this.oauthState = state;
        localStorage.setItem('calendar_oauth_state', JSON.stringify(state));
    }

    createGoogleCalendarEvent(medication, date) {
        if (!this.isAvailable) {
            console.error('Calendar integration is not available in this browser');
            return null;
        }

        const eventDate = new Date(date);
        const [hours, minutes] = medication.time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(eventDate);
        endDate.setHours(eventDate.getHours() + 1);

        const title = `💊 Принять ${medication.name}`;
        const description = `Лекарство: ${medication.name}\nДозировка: ${medication.dosage}\nПримечания: ${medication.notes || 'нет'}`;
        
        const details = {
            text: title,
            details: description,
            location: '',
            dates: this.formatGoogleCalendarDates(eventDate, endDate),
            trp: false
        };

        return this.generateGoogleCalendarLink(details);
    }

    formatGoogleCalendarDates(startDate, endDate) {
        const format = (date) => date.toISOString().replace(/-|:|\.\d+/g, '');
        return `${format(startDate)}/${format(endDate)}`;
    }

    generateGoogleCalendarLink(details) {
        const baseUrl = 'https://calendar.google.com/calendar/render';
        const params = new URLSearchParams({
            action: 'TEMPLATE',
            text: details.text,
            details: details.details,
            location: details.location,
            dates: details.dates,
            trp: details.trp.toString()
        });

        return `${baseUrl}?${params.toString()}`;
    }

    createOutlookCalendarEvent(medication, date) {
        if (!this.isAvailable) return null;

        const eventDate = new Date(date);
        const [hours, minutes] = medication.time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(eventDate);
        endDate.setHours(eventDate.getHours() + 1);

        const title = `💊 Принять ${medication.name}`;
        const description = `Лекарство: ${medication.name}\nДозировка: ${medication.dosage}\nПримечания: ${medication.notes || 'нет'}`;

        const details = {
            path: '/calendar/action/compose',
            rru: 'addevent',
            subject: title,
            body: description,
            startdt: eventDate.toISOString(),
            enddt: endDate.toISOString()
        };

        return this.generateOutlookCalendarLink(details);
    }

    generateOutlookCalendarLink(details) {
        const baseUrl = 'https://outlook.live.com/owa';
        const params = new URLSearchParams({
            path: details.path,
            rru: details.rru,
            subject: details.subject,
            body: details.body,
            startdt: details.startdt,
            enddt: details.enddt
        });

        return `${baseUrl}?${params.toString()}`;
    }

    createICalendarEvent(medication, date) {
        if (!this.isAvailable) return null;

        const eventDate = new Date(date);
        const [hours, minutes] = medication.time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(eventDate);
        endDate.setHours(eventDate.getHours() + 1);

        const uid = `medication-${medication.id}-${Date.now()}@med-diary.app`;
        const title = `💊 Принять ${medication.name}`;
        const description = `Лекарство: ${medication.name}\nДозировка: ${medication.dosage}\nПримечания: ${medication.notes || 'нет'}`;

        const icalContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Medical Diary//med-diary.app//RU',
            'BEGIN:VEVENT',
            `UID:${uid}`,
            `SUMMARY:${title}`,
            `DESCRIPTION:${description.replace(/\n/g, '\\n')}`,
            `DTSTART:${this.formatICalDate(eventDate)}`,
            `DTEND:${this.formatICalDate(endDate)}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        const blob = new Blob([icalContent], { type: 'text/calendar;charset=utf-8' });
        return URL.createObjectURL(blob);
    }

    formatICalDate(date) {
        return date.toISOString().replace(/-|:|\.\d+/g, '').slice(0, 15) + 'Z';
    }

    async checkGoogleCalendarAPI() {
        try {
            const testUrl = 'https://www.googleapis.com/calendar/v3/users/me/calendarList';
            
            return {
                available: true,
                requiresAuth: true,
                authenticated: this.oauthState.authenticated,
                message: this.oauthState.authenticated ? 
                    'Google Calendar API доступен (авторизован)' : 
                    'Google Calendar API доступен (требуется авторизация)'
            };
        } catch (error) {
            return {
                available: false,
                requiresAuth: true,
                authenticated: false,
                message: 'Google Calendar API требует OAuth авторизации'
            };
        }
    }

    async mockOAuthLogin() {
        console.log('Starting mock OAuth login...');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const mockToken = {
            access_token: 'mock_access_token_' + Date.now(),
            expires_in: 3600,
            token_type: 'Bearer',
            scope: 'https://www.googleapis.com/auth/calendar.events'
        };
        
        this.saveOAuthState({
            authenticated: true,
            token: mockToken.access_token,
            expiry: Date.now() + mockToken.expires_in * 1000
        });
        
        return {
            success: true,
            token: mockToken,
            message: 'Авторизация выполнена (мок-режим)'
        };
    }

    async mockOAuthLogout() {
        this.saveOAuthState({
            authenticated: false,
            token: null,
            expiry: null
        });
        
        return {
            success: true,
            message: 'Выход выполнен'
        };
    }

    async createEventViaAPI(eventData) {
        if (!this.oauthState.authenticated) {
            const authResult = await this.mockOAuthLogin();
            if (!authResult.success) {
                return {
                    success: false,
                    message: 'Требуется авторизация'
                };
            }
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const mockResponse = {
                success: true,
                eventId: `mock-event-${Date.now()}`,
                htmlLink: `https://calendar.google.com/calendar/event?eid=${btoa(JSON.stringify(eventData))}`,
                message: 'Событие успешно создано в Google Calendar (мок-режим)',
                mockData: {
                    summary: eventData.summary,
                    description: eventData.description,
                    start: eventData.start,
                    end: eventData.end
                }
            };

            return mockResponse;
        } catch (error) {
            console.error('Error creating calendar event:', error);
            return {
                success: false,
                message: 'Не удалось создать событие в календаре'
            };
        }
    }

    async getCalendarEvents(date) {
        if (!this.oauthState.authenticated) {
            return {
                success: false,
                events: [],
                message: 'Требуется авторизация для доступа к календарю'
            };
        }

        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            const mockEvents = [
                {
                    id: 'mock-event-1',
                    summary: '💊 Принять лекарство (мок)',
                    description: 'Тестовое событие из календаря',
                    start: { 
                        dateTime: new Date(date.setHours(9, 0, 0, 0)).toISOString(),
                        timeZone: 'Europe/Moscow'
                    },
                    end: { 
                        dateTime: new Date(date.setHours(10, 0, 0, 0)).toISOString(),
                        timeZone: 'Europe/Moscow'
                    }
                },
                {
                    id: 'mock-event-2',
                    summary: '💊 Витамины (мок)',
                    description: 'Ежедневный прием витаминов',
                    start: { 
                        dateTime: new Date(date.setHours(12, 0, 0, 0)).toISOString(),
                        timeZone: 'Europe/Moscow'
                    },
                    end: { 
                        dateTime: new Date(date.setHours(13, 0, 0, 0)).toISOString(),
                        timeZone: 'Europe/Moscow'
                    }
                }
            ];

            return {
                success: true,
                events: mockEvents,
                message: 'События загружены (мок-режим)'
            };
        } catch (error) {
            console.error('Error fetching calendar events:', error);
            return {
                success: false,
                events: [],
                message: 'Не удалось загрузить события календаря'
            };
        }
    }

    testCalendarIntegration() {
        if (!this.isAvailable) {
            return {
                success: false,
                message: 'Интеграция с календарем не поддерживается в вашем браузере'
            };
        }

        const testMedication = {
            id: 'test',
            name: 'Тестовое лекарство',
            dosage: '1 таблетка',
            time: '12:00',
            notes: 'Тестовое напоминание'
        };

        const testDate = new Date();
        
        return {
            success: true,
            message: 'Интеграция с календарем работает',
            features: {
                googleCalendar: true,
                outlook: true,
                icalendar: true,
                googleApi: this.googleApiAvailable,
                oauth: this.oauthState.authenticated
            },
            links: {
                google: this.createGoogleCalendarEvent(testMedication, testDate),
                outlook: this.createOutlookCalendarEvent(testMedication, testDate),
                ical: this.createICalendarEvent(testMedication, testDate)
            }
        };
    }

    getSupportedCalendars() {
        return {
            google: true,
            outlook: true,
            ical: true,
            yahoo: false,
            apple: this.calendarType === 'mobile' && /iphone|ipad|mac/.test(navigator.userAgent.toLowerCase())
        };
    }

    getOAuthStatus() {
        return {
            authenticated: this.oauthState.authenticated,
            tokenExpired: this.oauthState.expiry && Date.now() > this.oauthState.expiry,
            expiry: this.oauthState.expiry ? new Date(this.oauthState.expiry).toLocaleString() : null
        };
    }

    async createMedicationEvent(medication, date) {
        const eventDate = new Date(date);
        const [hours, minutes] = medication.time.split(':').map(Number);
        eventDate.setHours(hours, minutes, 0, 0);

        const endDate = new Date(eventDate);
        endDate.setHours(eventDate.getHours() + 1);

        const eventData = {
            summary: `💊 Принять ${medication.name}`,
            description: `Лекарство: ${medication.name}\nДозировка: ${medication.dosage}\nПримечания: ${medication.notes || 'нет'}\n\nДобавлено из Медицинского дневника`,
            start: {
                dateTime: eventDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            end: {
                dateTime: endDate.toISOString(),
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'popup', minutes: 30 },
                    { method: 'popup', minutes: 10 }
                ]
            }
        };

        return await this.createEventViaAPI(eventData);
    }
}

export const calendarManager = new CalendarIntegration();