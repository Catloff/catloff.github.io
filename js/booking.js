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

// --- Funktion zur Berechnung tatsächlicher Slots für EINEN Tag, basierend auf VORGELADENEN Daten ---
function calculateSlotsForDay(date, availableSlotsForDay, bookingsForDay, bookingDuration) {
    const calculatedSlots = [];
    // Check für maximale Buchungen
    if (bookingsForDay.length >= 2) {
        return []; // Keine Slots verfügbar
    }

    for (const slot of availableSlotsForDay) {
        const slotStart = timeStringToDate(slot.startTime, date);
        const slotEnd = timeStringToDate(slot.endTime, date);
        let potentialStartTime = new Date(slotStart);

        while (potentialStartTime < slotEnd) {
            const potentialEndTime = new Date(potentialStartTime.getTime() + bookingDuration * 60000);

            if (potentialEndTime <= slotEnd) {
                const timeString = dateToTimeString(potentialStartTime);
                
                let isCollision = false;
                for (const booking of bookingsForDay) {
                    const bookingStart = booking.date.toDate(); 
                    const currentBookingDuration = booking.duration || bookingDuration;
                    const bookingEnd = new Date(bookingStart.getTime() + currentBookingDuration * 60000);

                    if (potentialStartTime < bookingEnd && potentialEndTime > bookingStart) {
                        isCollision = true;
                        break;
                    }
                }

                if (!isCollision) {
                    if (!calculatedSlots.includes(timeString)) {
                         calculatedSlots.push(timeString);
                    }
                }
            }
            // Schrittweite 30 Minuten
            potentialStartTime.setTime(potentialStartTime.getTime() + 30 * 60000); 
        }
    }
    calculatedSlots.sort();
    return calculatedSlots;
}

export default class BookingSystem {
    constructor() {
        console.log('BookingSystem Konstruktor aufgerufen');
        this.currentStep = 1;
        this.bookingDuration = 120;
        this.selectedDate = null;
        this.selectedTime = null;
        this.currentMonth = new Date();
        // Cache für Monatsdaten
        this.monthlySlotsData = null;
        this.monthlyBookingsData = null;
        this.currentMonthBeingFetched = null; // Verhindert parallele Fetches für denselben Monat
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
            this.updateCalendar(); // Löst Fetch für neuen Monat aus
        });

        nextMonth.addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            console.log('Gehe zu Nächstmonat:', this.currentMonth);
            this.updateCalendar(); // Löst Fetch für neuen Monat aus
        });

        this.updateCalendar(); // Ersten Kalender laden
    }

    // --- Hauptfunktion zum Laden und Anzeigen des Kalenders ---
    async updateCalendar() {
        const monthToLoad = new Date(this.currentMonth); // Kopie erstellen für diesen Ladevorgang
        const monthString = `${monthToLoad.getFullYear()}-${monthToLoad.getMonth()}`;
        console.log(`updateCalendar wird aufgerufen für Monat: ${monthString}`);

        // Verhindern, dass derselbe Monat mehrfach parallel geladen wird
        if (this.currentMonthBeingFetched === monthString) {
            console.log(`Monat ${monthString} wird bereits geladen. Abbruch.`);
            return;
        }
        this.currentMonthBeingFetched = monthString;

        const calendar = document.getElementById('bookingCalendar');
        const currentMonthElement = document.getElementById('currentMonth');
        
        if (!calendar || !currentMonthElement) {
            console.error('Kalender-Container oder Monatsanzeige nicht gefunden.');
            this.currentMonthBeingFetched = null; // Fetch beendet (Fehler)
            return;
        }
        
        // Ladeindikator anzeigen
        calendar.innerHTML = '<p style="text-align:center; padding: 20px;">Lade Kalender...</p>'; 
        currentMonthElement.textContent = monthToLoad.toLocaleDateString('de-DE', {
            month: 'long', year: 'numeric'
        });

        try {
            // Schritt 1: Daten für den gesamten Monat holen (parallel)
            const [slotsData, bookingsData] = await Promise.all([
                this.getSlotsForMonth(monthToLoad),
                this.getBookingsForMonth(monthToLoad)
            ]);

             // Prüfen, ob sich der Monat in der Zwischenzeit geändert hat
             const currentDisplayMonthString = `${this.currentMonth.getFullYear()}-${this.currentMonth.getMonth()}`;
             if (monthString !== currentDisplayMonthString) {
                 console.log(`Monat hat sich während des Ladens geändert (${monthString} vs ${currentDisplayMonthString}). Breche Rendering ab.`);
                 this.currentMonthBeingFetched = null; 
                 return; // Nicht den Kalender für den alten Monat rendern
             }

            // Schritt 2: Daten aufbereiten für schnellen Zugriff
            const slotsByDate = this.groupDataByDate(slotsData, 'datum');
            const bookingsByDate = this.groupDataByDate(bookingsData, 'date');

            // Schritt 3: Verfügbarkeit für jeden Tag berechnen
            const availabilityMap = this.calculateMonthlyAvailability(monthToLoad, slotsByDate, bookingsByDate);

            // Schritt 4: Kalender rendern
            this.renderCalendarGrid(monthToLoad, availabilityMap);

            // Reset Auswahl und Time Slots
            this.selectedDate = null;
            this.selectedTime = null;
            document.getElementById('timeSlots').innerHTML = ''; 
            this.disableNextButton();

        } catch (error) {
            console.error(`Fehler beim Laden der Kalenderdaten für ${monthString}:`, error);
            calendar.innerHTML = '<p style="text-align:center; padding: 20px; color: red;">Fehler beim Laden des Kalenders.</p>';
        } finally {
            this.currentMonthBeingFetched = null; // Fetch abgeschlossen
        }
    }

    // --- Hilfsfunktionen für updateCalendar ---

    async getSlotsForMonth(monthDate) {
        const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        console.log(`(Firestore) Lade Slots für Monat: ${firstDay.toLocaleDateString()} - ${lastDay.toLocaleDateString()}`);
        const slots = [];
        try {
            const q = query(
                collection(db, 'verfuegbare_slots'),
                where('datum', '>=', customStartOfDay(firstDay)),
                where('datum', '<=', customEndOfDay(lastDay))
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => slots.push({ id: doc.id, ...doc.data() }));
            console.log(`(Firestore) ${slots.length} Slot-Dokumente für Monat gefunden.`);
        } catch (error) {
            console.error('(Firestore) Fehler beim Laden der Slots für Monat:', error);
            throw error; // Fehler weitergeben
        }
        return slots;
    }

    async getBookingsForMonth(monthDate) {
        const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        console.log(`(Firestore) Lade Buchungen für Monat: ${firstDay.toLocaleDateString()} - ${lastDay.toLocaleDateString()}`);
        const bookings = [];
        try {
            const q = query(
                collection(db, 'buchungen'),
                where('date', '>=', customStartOfDay(firstDay)),
                where('date', '<=', customEndOfDay(lastDay))
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));
            console.log(`(Firestore) ${bookings.length} Buchungen für Monat gefunden.`);
        } catch (error) {
            console.error('(Firestore) Fehler beim Laden der Buchungen für Monat:', error);
            throw error; // Fehler weitergeben
        }
        return bookings;
    }

    groupDataByDate(dataArray, dateFieldName) {
        const grouped = {};
        dataArray.forEach(item => {
            if (item[dateFieldName] && item[dateFieldName].toDate) { // Prüfen ob Timestamp
                const dateStr = item[dateFieldName].toDate().toISOString().split('T')[0];
                if (!grouped[dateStr]) {
                    grouped[dateStr] = [];
                }
                grouped[dateStr].push(item);
            }
        });
        return grouped;
    }

    calculateMonthlyAvailability(monthDate, slotsByDate, bookingsByDate) {
        const availabilityMap = {};
        const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            const slotsForDay = slotsByDate[dateStr] || [];
            const bookingsForDay = bookingsByDate[dateStr] || [];
            
            // Berechne tatsächliche Slots für diesen Tag mit den vorgeladenen Daten
            const actualSlots = calculateSlotsForDay(currentDate, slotsForDay, bookingsForDay, this.bookingDuration);
            availabilityMap[dateStr] = actualSlots.length > 0;
        }
        console.log('Verfügbarkeits-Map für Monat berechnet.');
        return availabilityMap;
    }

    renderCalendarGrid(monthDate, availabilityMap) {
        const calendar = document.getElementById('bookingCalendar');
        calendar.innerHTML = ''; // Sicherstellen, dass Kalender leer ist
        console.log('Rendere Kalender-Grid...');

        const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
        weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day weekday';
            dayElement.textContent = day;
            calendar.appendChild(dayElement);
        });

        const firstDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const lastDayOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let dayOfWeek = firstDayOfMonth.getDay();
        let startOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        for (let i = 0; i < startOffset; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendar.appendChild(emptyDay);
        }

        for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
            const currentDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.dataset.date = dateStr;

            const dayContent = document.createElement('div');
            dayContent.className = 'day-content';
            dayContent.textContent = day;
            dayElement.appendChild(dayContent);
            
            if (currentDate < today) {
                dayElement.classList.add('disabled');
            } else {
                if (availabilityMap[dateStr]) { // Prüfe gegen die berechnete Map
                    dayElement.classList.add('available');
                    dayElement.addEventListener('click', () => {
                        this.selectDate(currentDate, dayElement);
                    });
                } else {
                    dayElement.classList.add('disabled');
                }
            }
            calendar.appendChild(dayElement);
        }
        
        const totalDaysRendered = startOffset + lastDayOfMonth.getDate();
        const remainingCells = 42 - totalDaysRendered; // Annahme: 6 Zeilen * 7 Tage = 42 Zellen
        for (let i = 0; i < remainingCells; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendar.appendChild(emptyDay);
        }
        console.log('Kalender-Grid gerendert.');
    }

    // --- Andere Methoden ---

    async selectDate(date, dayElement) {
        console.log('Datum ausgewählt:', date.toLocaleDateString('de-DE'));
        this.selectedDate = date;
        this.selectedTime = null;
        
        document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
        
        if (dayElement) {
            dayElement.classList.add('selected');
        } else {
            // Fallback (theoretisch nicht mehr nötig)
            const dateStr = date.toISOString().split('T')[0];
            dayElement = document.querySelector(`.calendar-day[data-date="${dateStr}"]`);
            if (dayElement) dayElement.classList.add('selected');
        }
        
        // Rufe updateTimeSlots auf, um die Slots für den ausgewählten Tag anzuzeigen
        await this.updateTimeSlots(date);
    }

    // Zeigt nur noch die Timeslots an, die Berechnung erfolgt jetzt zentral
    async updateTimeSlots(date) { 
        console.log('Aktualisiere (zeige) Zeit-Slots für:', date.toLocaleDateString('de-DE'));
        const timeSlotsContainer = document.getElementById('timeSlots');
        timeSlotsContainer.innerHTML = '<p>Lade verfügbare Zeiten...</p>';

        try {
            // Daten für den Tag holen (könnte man aus Cache nehmen, wenn implementiert)
             const availableSlotsForDay = await this.getSlotsForDay(date); // Neue Funktion nur für diesen Tag
             const bookingsForDay = await this.getBookingsForDay(date); // Neue Funktion nur für diesen Tag

            // Berechne die Slots spezifisch für diesen Tag erneut
            const calculatedSlots = calculateSlotsForDay(date, availableSlotsForDay, bookingsForDay, this.bookingDuration);

            timeSlotsContainer.innerHTML = ''; // Leere Container

            if (calculatedSlots.length === 0) {
                timeSlotsContainer.innerHTML = '<p class="no-slots-message">Keine verfügbaren Termine an diesem Tag.</p>';
                this.disableNextButton();
                console.warn('updateTimeSlots: Keine Slots gefunden - sollte nicht passieren, da Tag verfügbar war.');
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
    
    // Funktion, um nur Slots für EINEN spezifischen Tag zu holen (für updateTimeSlots)
    async getSlotsForDay(date) {
        console.log(`(Firestore) Lade Slots für Tag: ${date.toLocaleDateString()}`);
        const slots = [];
        try {
            const q = query(
                collection(db, 'verfuegbare_slots'),
                where('datum', '==', customStartOfDay(date)) // Exakte Übereinstimmung für den Tag
            );
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach(doc => slots.push({ id: doc.id, ...doc.data() }));
            console.log(`(Firestore) ${slots.length} Slot-Dokumente für Tag gefunden.`);
        } catch (error) {
            console.error('(Firestore) Fehler beim Laden der Slots für Tag:', error);
        }
        return slots;
    }

    // Funktion, um nur Buchungen für EINEN spezifischen Tag zu holen (für updateTimeSlots)
    async getBookingsForDay(date) {
        console.log(`(Firestore) Lade Buchungen für Tag: ${date.toLocaleDateString()}`);
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
            querySnapshot.forEach(doc => bookings.push({ id: doc.id, ...doc.data() }));
            console.log(`(Firestore) ${bookings.length} Buchungen für Tag gefunden.`);
        } catch (error) {
            console.error('(Firestore) Fehler beim Laden der Buchungen für Tag:', error);
        }
        return bookings;
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