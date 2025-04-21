import { collection, addDoc, query, where, getDocs, Timestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

// --- Eigene Hilfsfunktionen für Tagesanfang/-ende ---
function customStartOfDay(date) {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
}

function customEndOfDay(date) {
    const newDate = new Date(date);
    newDate.setHours(23, 59, 59, 999);
    return newDate;
}

// --- Hilfsfunktionen für Zeitberechnung ---
function timeStringToDate(timeString, referenceDate) {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(referenceDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
}

function dateToTimeString(date) {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
}

// --- Neue Hilfsfunktion zur Berechnung der tatsächlichen Verfügbarkeit ---
async function calculateAvailableSlotsForDay(date, bookingDuration) {
    console.log(`Berechne tatsächliche Slots für: ${date.toLocaleDateString('de-DE')}`);
    const availableSlotsData = await getAvailableSlotsForDayFirestore(date); // Umbenannte Firestore-Abfrage
    const existingBookings = await getBookingsForDayFirestore(date); // Umbenannte Firestore-Abfrage
    const calculatedSlots = [];

    // Check für maximale Buchungen PRO TAG
    if (existingBookings.length >= 2) {
        console.log('Maximale Anzahl an Buchungen (2) für diesen Tag bereits erreicht.');
        return []; // Keine Slots verfügbar
    }

    for (const slot of availableSlotsData) {
        const slotStart = timeStringToDate(slot.startTime, date);
        const slotEnd = timeStringToDate(slot.endTime, date);
        let potentialStartTime = new Date(slotStart);

        while (potentialStartTime < slotEnd) {
            const potentialEndTime = new Date(potentialStartTime.getTime() + bookingDuration * 60000);

            if (potentialEndTime <= slotEnd) {
                const timeString = dateToTimeString(potentialStartTime);
                
                let isCollision = false;
                for (const booking of existingBookings) {
                    const bookingStart = booking.date.toDate();
                    // Verwende die Dauer aus der Buchung, falls vorhanden, sonst die Standarddauer
                    const currentBookingDuration = booking.duration || bookingDuration;
                    const bookingEnd = new Date(bookingStart.getTime() + currentBookingDuration * 60000);

                    // Kollisionsprüfung
                    if (potentialStartTime < bookingEnd && potentialEndTime > bookingStart) {
                        console.log(`Kollision: Slot ${timeString} überschneidet sich mit Buchung ${dateToTimeString(bookingStart)}`);
                        isCollision = true;
                        break;
                    }
                }

                if (!isCollision) {
                    if (!calculatedSlots.includes(timeString)) {
                         calculatedSlots.push(timeString);
                         console.log(`Gültiger Slot ${timeString} hinzugefügt.`);
                    }
                }
            }
            // WICHTIG: Schrittweite - Hier nehmen wir an, dass die Slots immer zur vollen Stunde oder halben Stunde beginnen?
            // Wir verwenden eine feste Schrittweite von 30 Minuten, um alle Möglichkeiten zu prüfen.
            potentialStartTime.setTime(potentialStartTime.getTime() + 30 * 60000); // 30 Minuten Schrittweite
        }
    }

    calculatedSlots.sort();
    console.log(`Berechnete verfügbare Slots: ${calculatedSlots.join(', ') || 'Keine'}`);
    return calculatedSlots;
}

// --- Umbenannte Firestore Abfragefunktionen (waren vorher Methoden in der Klasse) ---
async function getAvailableSlotsForDayFirestore(date) {
    console.log('(Firestore) Rufe verfügbare Slot-Dokumente für Datum ab:', date.toISOString());
    const slots = [];
    const start = customStartOfDay(date);
    const end = customEndOfDay(date);
    try {
        const q = query(
            collection(db, 'verfuegbare_slots'), 
            where('datum', '>=', start),
            where('datum', '<=', end)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            slots.push({ id: doc.id, ...doc.data() });
        });
        console.log(`(Firestore) Gefundene verfügbare Slot-Dokumente: ${slots.length}`);
    } catch (error) {
        console.error('(Firestore) Fehler beim Abrufen der verfügbaren Slots:', error);
    }
    return slots;
}

async function getBookingsForDayFirestore(date) {
    console.log('(Firestore) Rufe Buchungen für Datum ab:', date.toISOString());
    const bookings = [];
    const start = customStartOfDay(date);
    const end = customEndOfDay(date);
    try {
        const q = query(
            collection(db, 'buchungen'), 
            where('date', '>=', start),
            where('date', '<=', end)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
            bookings.push({ id: doc.id, ...doc.data() });
        });
        console.log(`(Firestore) Gefundene Buchungen: ${bookings.length}`);
    } catch (error) {
        console.error('(Firestore) Fehler beim Abrufen der Buchungen:', error);
    }
    return bookings;
}

export default class BookingSystem {
    constructor() {
        console.log('BookingSystem Konstruktor aufgerufen');
        this.currentStep = 1;
        this.bookingDuration = 120;
        this.selectedDate = null;
        this.selectedTime = null;
        this.currentMonth = new Date();
        console.log('Initial currentMonth:', this.currentMonth);
        
        this.init();
    }

    init() {
        console.log('BookingSystem init() aufgerufen');
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', this.initializeComponents.bind(this));
        } else {
            this.initializeComponents();
        }
    }

    initializeComponents() {
        console.log('DOM geladen, starte Initialisierung der Komponenten...');
        this.initStepNavigation();
        this.initCalendar();
        this.initBookingForm();
        console.log('Initialisierung der Komponenten abgeschlossen');
    }

    initStepNavigation() {
        console.log('Initialisiere Schritt-Navigation');
        
        const nextButtons = document.querySelectorAll('.next-step');
        console.log('Gefundene Next-Buttons:', nextButtons.length, nextButtons);
        
        nextButtons.forEach((button, index) => {
            console.log(`Füge Event-Listener für Weiter-Button ${index} hinzu:`, button.outerHTML);
            const clickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Weiter-Button geklickt');
                const nextStep = button.getAttribute('data-next');
                console.log('Nächster Schritt:', nextStep);
                this.showStep(nextStep);
            };
            button.addEventListener('click', clickHandler);
        });

        const prevButtons = document.querySelectorAll('.prev-step');
        console.log('Gefundene Prev-Buttons:', prevButtons.length, prevButtons);
        
        prevButtons.forEach((button, index) => {
            console.log(`Füge Event-Listener für Zurück-Button ${index} hinzu:`, button.outerHTML);
            const clickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Zurück-Button geklickt');
                const prevStep = button.getAttribute('data-prev');
                console.log('Vorheriger Schritt:', prevStep);
                this.showStep(prevStep);
            };
            button.addEventListener('click', clickHandler);
        });
    }

    validateStep(step) {
        console.log('Validiere Schritt', step);
        console.log('Aktueller Step:', this.currentStep);
        return true;
    }

    showStep(step) {
        console.log('showStep aufgerufen mit:', step);
        
        const allSteps = document.querySelectorAll('.booking-step-container');
        console.log('Gefundene Schritte:', allSteps.length);
        console.log('Alle Schritte:', Array.from(allSteps).map(step => step.id));
        
        allSteps.forEach(container => {
            container.classList.add('hidden');
            console.log('Container versteckt:', container.id);
        });
        
        const nextStepElement = document.getElementById(`bookingStep${step}`);
        console.log('Nächster Schritt Container:', nextStepElement?.id);
        
        if (nextStepElement) {
            console.log('Entferne hidden-Klasse von:', nextStepElement.id);
            nextStepElement.classList.remove('hidden');
            this.currentStep = parseInt(step);
            console.log('Aktueller Schritt gesetzt auf:', this.currentStep);

            if (this.currentStep === 2) {
                console.log('Aktualisiere Buchungszusammenfassung');
                this.updateBookingSummary();
            }
        } else {
            console.error('Container für Schritt nicht gefunden:', step);
            console.log('Verfügbare Container:', Array.from(document.querySelectorAll('[id^="bookingStep"]')).map(el => el.id));
        }
    }

    initCalendar() {
        console.log('initCalendar wird aufgerufen');
        const calendar = document.getElementById('bookingCalendar');
        const prevMonth = document.querySelector('.prev-month');
        const nextMonth = document.querySelector('.next-month');

        if (!calendar || !prevMonth || !nextMonth) {
            console.error('Kalender-Elemente nicht im DOM gefunden! Abbruch.');
            return;
        }

        prevMonth.addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            console.log('Gehe zu Vormonat:', this.currentMonth);
            this.updateCalendar();
        });

        nextMonth.addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            console.log('Gehe zu Nächstmonat:', this.currentMonth);
            this.updateCalendar();
        });

        this.updateCalendar();
    }

    async updateCalendar() {
        console.log('updateCalendar wird aufgerufen für Monat:', this.currentMonth);
        const calendar = document.getElementById('bookingCalendar');
        const currentMonthElement = document.getElementById('currentMonth');
        
        if (!calendar || !currentMonthElement) {
            console.error('Kalender-Container oder Monatsanzeige nicht gefunden.');
            return;
        }
        
        // Ladeindikator anzeigen?
        calendar.innerHTML = '<p style="text-align:center; padding: 20px;">Lade Kalender...</p>'; 
        currentMonthElement.textContent = this.currentMonth.toLocaleDateString('de-DE', {
            month: 'long', year: 'numeric'
        });

        // Leere den Kalender für den Neuaufbau
        calendar.innerHTML = ''; 

        const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
        weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day weekday';
            dayElement.textContent = day;
            calendar.appendChild(dayElement);
        });

        const firstDayOfMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const lastDayOfMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dayOfWeek = firstDayOfMonth.getDay();
        let startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        for (let i = 0; i < startOffset; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendar.appendChild(emptyDay);
        }

        // --- Schleife zum Rendern der Tage mit Verfügbarkeitsprüfung ---
        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const currentDate = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), day);
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.dataset.date = currentDate.toISOString().split('T')[0];

            const dayContent = document.createElement('div');
            dayContent.className = 'day-content';
            dayContent.textContent = day;
            dayElement.appendChild(dayContent);
            
            if (currentDate < today) {
                dayElement.classList.add('disabled');
            } else {
                // Prüfe die TATSÄCHLICHE Verfügbarkeit für diesen Tag
                const actualSlots = await calculateAvailableSlotsForDay(currentDate, this.bookingDuration);
                if (actualSlots.length > 0) {
                    dayElement.classList.add('available');
                    // Klick-Listener nur für verfügbare Tage hinzufügen
                    dayElement.addEventListener('click', () => {
                        this.selectDate(currentDate, dayElement);
                    });
                } else {
                    dayElement.classList.add('disabled'); // Keine Slots -> Tag deaktivieren
                }
            }
            calendar.appendChild(dayElement);
        }
        
        const totalDaysRendered = startOffset + lastDayOfMonth.getDate();
        const remainingCells = 42 - totalDaysRendered;
        for (let i = 0; i < remainingCells; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendar.appendChild(emptyDay);
        }
        
        console.log('Kalender-Grid neu aufgebaut mit TATSÄCHLICHER Verfügbarkeitsprüfung.');
        
        this.selectedDate = null;
        this.selectedTime = null;
        document.getElementById('timeSlots').innerHTML = ''; // Zeitfenster leeren
        this.disableNextButton();
    }

    async selectDate(date, dayElement) {
        console.log('Datum ausgewählt:', date.toLocaleDateString('de-DE'));
        this.selectedDate = date;
        this.selectedTime = null;
        
        document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
        
        if (dayElement) {
            dayElement.classList.add('selected');
        } else {
            // Fallback (sollte nicht nötig sein, da Listener nur auf verfügbare Tage gesetzt wird)
            const dateStr = date.toISOString().split('T')[0];
            dayElement = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
            if (dayElement) dayElement.classList.add('selected');
            else console.warn('dayElement konnte nicht gefunden werden.');
        }
        
        // Rufe updateTimeSlots auf, um die Slots anzuzeigen (nicht mehr zum Deaktivieren)
        await this.updateTimeSlots(date);
    }

    async updateTimeSlots(date) { 
        console.log('Aktualisiere Zeit-Slots für:', date.toLocaleDateString('de-DE'));
        const timeSlotsContainer = document.getElementById('timeSlots');
        timeSlotsContainer.innerHTML = '<p>Lade verfügbare Zeiten...</p>';

        try {
            // Rufe die Berechnungsfunktion auf (Daten werden ggf. erneut geholt)
            const calculatedSlots = await calculateAvailableSlotsForDay(date, this.bookingDuration);

            timeSlotsContainer.innerHTML = ''; // Leere Container für Neuaufbau

            if (calculatedSlots.length === 0) {
                // Dieser Fall sollte theoretisch nicht eintreten, da der Tag nicht klickbar sein sollte
                timeSlotsContainer.innerHTML = '<p class="no-slots-message">Keine verfügbaren Termine an diesem Tag.</p>';
                this.disableNextButton();
                console.warn('updateTimeSlots aufgerufen für einen Tag ohne verfügbare Slots - sollte nicht passieren.');
            } else {
                timeSlotsContainer.classList.add('time-slots-grid');
                
                calculatedSlots.forEach(time => {
                    const slotElement = this.createTimeSlotElement(time);
                    timeSlotsContainer.appendChild(slotElement);
                });
                
                this.disableNextButton(); // Button erst nach Zeitauswahl aktivieren
            }

        } catch (error) {
            console.error('Fehler beim Aktualisieren der Zeit-Slots:', error);
            timeSlotsContainer.innerHTML = '<p>Fehler beim Laden der Zeiten.</p>';
            this.disableNextButton();
        }
    }

    createTimeSlotElement(time) {
        const slotElement = document.createElement('div');
        slotElement.className = 'time-slot';
        slotElement.dataset.time = time;

        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = `${time} Uhr`;
        slotElement.appendChild(timeSpan);

        slotElement.addEventListener('click', () => {
            document.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
            slotElement.classList.add('selected');
            this.selectedTime = time;
            console.log('Zeit ausgewählt:', this.selectedTime);
            this.enableNextButton(); 
        });

        return slotElement;
    }
    
    enableNextButton() {
        const nextButton = document.querySelector(`#bookingStep${this.currentStep} .next-step`);
        if (nextButton) {
            nextButton.disabled = false;
            console.log('Weiter-Button aktiviert für Schritt', this.currentStep);
        }
    }

    disableNextButton() {
        const nextButton = document.querySelector(`#bookingStep${this.currentStep} .next-step`);
        if (nextButton) {
            nextButton.disabled = true;
            console.log('Weiter-Button deaktiviert für Schritt', this.currentStep);
        }
    }

    updateBookingSummary() {
        const summary = document.getElementById('bookingSummary');
        if (!summary || !this.selectedDate || !this.selectedTime) return;

        const dateString = this.selectedDate.toLocaleDateString('de-DE', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        summary.innerHTML = `
            <h4>Ihre Terminanfrage</h4>
            <p><strong>Datum:</strong> ${dateString}</p>
            <p><strong>Uhrzeit:</strong> ${this.selectedTime} Uhr</p>
            <p>Bitte überprüfen Sie Ihre persönlichen Daten unten.</p>
        `;
    }

    initBookingForm() {
        const form = document.getElementById('bookingForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nameInput = form.querySelector('#name');
            const emailInput = form.querySelector('#email');
            
            if (!this.selectedDate || !this.selectedTime || !nameInput.value || !emailInput.value) {
                alert('Bitte wählen Sie ein Datum, eine Uhrzeit und füllen Sie Name und E-Mail aus.');
                return;
            }

            const formData = {
                name: nameInput.value,
                email: emailInput.value,
                phone: form.querySelector('#phone')?.value || '',
                notes: form.querySelector('#notes')?.value || ''
            };

            const submitButton = form.querySelector('.submit-booking');
            submitButton.textContent = 'Buchung wird gesendet...';
            submitButton.disabled = true;

            try {
                await this.submitBooking(formData);
                alert('Vielen Dank! Ihre Terminanfrage wurde gesendet.');
                location.reload();
            } catch (error) {
                console.error('Fehler beim Absenden der Buchung:', error);
                alert(`Fehler: ${error.message || 'Buchung konnte nicht gesendet werden.'}`);
            } finally {
                submitButton.textContent = 'Termin anfragen';
                submitButton.disabled = false;
            }
        });
    }

    async submitBooking(formData) {
        console.log('Sende Buchungsanfrage:', {
            date: this.selectedDate,
            time: this.selectedTime,
            customer: formData
        });

        if (!this.selectedDate || !this.selectedTime) {
            throw new Error('Datum oder Uhrzeit nicht ausgewählt.');
        }

        const bookingTimestamp = timeStringToDate(this.selectedTime, this.selectedDate);

        const bookingData = {
            date: Timestamp.fromDate(bookingTimestamp),
            time: this.selectedTime,
            duration: this.bookingDuration,
            customer: {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                notes: formData.notes
            },
            status: 'angefragt',
            createdAt: Timestamp.now()
        };

        try {
            const docRef = await addDoc(collection(db, 'buchungen'), bookingData);
            console.log('Buchungsanfrage gespeichert mit ID:', docRef.id);
            return { success: true, bookingId: docRef.id };
        } catch (error) {
            console.error('Fehler beim Speichern der Buchung in Firestore:', error);
            throw new Error('Fehler beim Speichern der Terminanfrage.');
        }
    }
} 