import { collection, addDoc, query, where, getDocs, Timestamp, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export default class BookingSystem {
    constructor() {
        console.log('BookingSystem Konstruktor aufgerufen');
        this.currentStep = 1;
        this.selectedTreatment = {
            id: 'massage',
            name: 'Klassische Massage',
            duration: 60,
            price: 65
        };
        this.selectedDate = null;
        this.selectedTime = null;
        this.currentMonth = new Date();
        
        // Test-Event-Listener
        document.addEventListener('click', (e) => {
            console.log('Click-Event auf:', e.target);
        });
        
        this.init();
    }

    init() {
        console.log('BookingSystem init() aufgerufen');
        
        // Verzögere die Initialisierung um sicherzustellen, dass das DOM geladen ist
        setTimeout(() => {
            console.log('Starte verzögerte Initialisierung...');
            this.initStepNavigation();
            this.initTreatmentSelection();
            this.initCalendar();
            this.initBookingForm();
            console.log('Verzögerte Initialisierung abgeschlossen');
        }, 1000);
    }

    initStepNavigation() {
        console.log('Initialisiere Schritt-Navigation');
        
        // Weiter-Buttons
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

        // Zurück-Buttons
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
        // Temporär immer true zurückgeben
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
        
        const nextStep = document.getElementById(`bookingStep${step}`);
        console.log('Nächster Schritt Container:', nextStep?.id);
        
        if (nextStep) {
            console.log('Entferne hidden-Klasse von:', nextStep.id);
            nextStep.classList.remove('hidden');
            this.currentStep = parseInt(step);
            console.log('Aktueller Schritt gesetzt auf:', this.currentStep);

            if (step === '2') {
                console.log('Aktualisiere Kalender');
                this.updateCalendar();
            }
            if (step === '3') {
                console.log('Aktualisiere Buchungszusammenfassung');
                this.updateBookingSummary();
            }
        } else {
            console.error('Container für Schritt nicht gefunden:', step);
            console.log('Verfügbare Container:', Array.from(document.querySelectorAll('[id^="bookingStep"]')).map(el => el.id));
        }
    }

    initTreatmentSelection() {
        console.log('Initialisiere Behandlungsauswahl');
        const treatments = document.querySelectorAll('.treatment-card input[type="radio"]');
        console.log('Gefundene Behandlungen:', treatments.length);
        
        treatments.forEach((treatment, index) => {
            console.log(`Füge Event-Listener für Behandlung ${index} hinzu:`, treatment.outerHTML);
            treatment.addEventListener('change', (e) => {
                console.log('Behandlung ausgewählt:', e.target.value);
                
                // Entferne die Auswahl von allen Karten
                document.querySelectorAll('.treatment-card').forEach(card => {
                    card.classList.remove('selected');
                });
                
                // Markiere die ausgewählte Karte
                const selectedCard = e.target.closest('.treatment-card');
                if (selectedCard) {
                    selectedCard.classList.add('selected');
                    
                    this.selectedTreatment = {
                        id: e.target.value,
                        name: selectedCard.querySelector('h4').textContent,
                        duration: parseInt(selectedCard.dataset.duration),
                        price: parseInt(selectedCard.dataset.price)
                    };
                    console.log('Ausgewählte Behandlung:', this.selectedTreatment);

                    // Aktiviere den Weiter-Button
                    const nextButton = document.querySelector('#bookingStep1 .next-step');
                    if (nextButton) {
                        nextButton.removeAttribute('disabled');
                        console.log('Weiter-Button aktiviert');
                    } else {
                        console.error('Weiter-Button nicht gefunden');
                    }
                }
            });
        });

        // Deaktiviere initial den Weiter-Button
        const nextButton = document.querySelector('#bookingStep1 .next-step');
        if (nextButton) {
            nextButton.setAttribute('disabled', 'disabled');
            console.log('Weiter-Button initial deaktiviert');
        } else {
            console.error('Weiter-Button nicht gefunden');
        }
    }

    initCalendar() {
        const calendar = document.getElementById('bookingCalendar');
        const prevMonth = document.querySelector('.prev-month');
        const nextMonth = document.querySelector('.next-month');

        prevMonth.addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            this.updateCalendar();
        });

        nextMonth.addEventListener('click', () => {
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            this.updateCalendar();
        });

        this.updateCalendar();
    }

    async updateCalendar() {
        const calendar = document.getElementById('bookingCalendar');
        const currentMonthElement = document.getElementById('currentMonth');
        
        // Aktualisiere Monatsanzeige
        currentMonthElement.textContent = this.currentMonth.toLocaleDateString('de-DE', {
            month: 'long',
            year: 'numeric'
        });

        // Kalender leeren
        calendar.innerHTML = '';

        // Wochentage hinzufügen
        const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
        weekdays.forEach(day => {
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day weekday';
            dayElement.textContent = day;
            calendar.appendChild(dayElement);
        });

        // Tage des Monats generieren
        const firstDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), 1);
        const lastDay = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 0);
        
        // Lücken am Anfang füllen
        let firstWeekday = firstDay.getDay() || 7;
        for (let i = 1; i < firstWeekday; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day disabled';
            calendar.appendChild(emptyDay);
        }

        // Verfügbare Termine laden
        console.log('Lade Termine für Monat:', {
            firstDay: firstDay.toISOString(),
            lastDay: lastDay.toISOString()
        });
        const availableSlots = await this.getAvailableSlots(firstDay, lastDay);
        console.log('Verfügbare Slots für Monat:', availableSlots);

        // Tage hinzufügen
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), day);
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';

            // Erstelle Container für Tag und Slot-Indikator
            const dayContent = document.createElement('div');
            dayContent.className = 'day-content';
            dayContent.textContent = day;
            dayElement.appendChild(dayContent);

            // Prüfe ob der Tag in der Vergangenheit liegt
            if (date < new Date().setHours(0,0,0,0)) {
                dayElement.classList.add('disabled');
                console.log(`${date.toDateString()} ist in der Vergangenheit`);
            } 
            // Prüfe ob der Tag ein Wochenende ist
            else if (date.getDay() === 0 || date.getDay() === 6) {
                dayElement.classList.add('disabled');
                console.log(`${date.toDateString()} ist am Wochenende`);
            }
            // Prüfe ob es verfügbare Termine gibt
            else if (availableSlots[date.toDateString()]) {
                console.log(`${date.toDateString()} hat verfügbare Slots:`, availableSlots[date.toDateString()]);
                dayElement.classList.add('has-slots');
                
                // Füge Slot-Indikator hinzu
                const slotsCount = availableSlots[date.toDateString()].length;
                const indicator = document.createElement('div');
                indicator.className = 'slots-indicator';
                indicator.textContent = `${slotsCount} ${slotsCount === 1 ? 'Termin' : 'Termine'}`;
                dayElement.appendChild(indicator);
                
                dayElement.addEventListener('click', () => this.selectDate(date));
            } else {
                dayElement.classList.add('disabled');
                console.log(`${date.toDateString()} hat keine verfügbaren Slots`);
            }

            calendar.appendChild(dayElement);
        }

        // Leere den Zeitslot-Container
        const timeSlotsContainer = document.getElementById('timeSlots');
        if (timeSlotsContainer) {
            timeSlotsContainer.innerHTML = '';
        }

        // Deaktiviere den Weiter-Button
        const nextButton = document.querySelector('#bookingStep2 .next-step');
        if (nextButton) {
            nextButton.disabled = true;
        }
    }

    async getAvailableSlots(startDate, endDate) {
        try {
            console.log('Lade verfügbare Slots für Zeitraum:', {
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString()
            });

            // Setze Start- und Endzeit für den Tag
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);

            console.log('Angepasster Zeitraum:', {
                start: start.toISOString(),
                end: end.toISOString()
            });

            // Erstelle Query für den ausgewählten Zeitraum
            const slotsRef = collection(db, 'verfuegbare_slots');
            const q = query(
                slotsRef,
                where('datum', '>=', Timestamp.fromDate(start)),
                where('datum', '<=', Timestamp.fromDate(end))
            );

            // Hole verfügbare Slots
            const querySnapshot = await getDocs(q);
            console.log('Gefundene Slots in der Datenbank:', querySnapshot.size);
            
            const slots = {};

            querySnapshot.forEach((doc) => {
                const slotData = doc.data();
                console.log('Slot-Daten:', slotData);
                
                // Konvertiere das Datum korrekt
                const slotDate = slotData.datum.toDate();
                const dateKey = slotDate.toDateString();
                
                if (!slots[dateKey]) {
                    slots[dateKey] = [];
                }

                // Prüfe, ob genug Zeit für die Behandlung verfügbar ist
                const startTime = this.parseTime(slotData.startTime);
                const endTime = this.parseTime(slotData.endTime);
                const interval = parseInt(slotData.intervall);
                const treatmentDuration = this.selectedTreatment.duration;

                console.log('Prüfe Zeitslot:', {
                    startTime: startTime.toTimeString(),
                    endTime: endTime.toTimeString(),
                    interval,
                    treatmentDuration
                });

                // Generiere nur Slots, wenn genügend Zeit für die Behandlung vorhanden ist
                let currentTime = startTime;
                while (currentTime < endTime) {
                    const slotEndTime = new Date(currentTime.getTime() + treatmentDuration * 60000);
                    
                    // Prüfe, ob der Slot in die verfügbare Zeit passt
                    if (slotEndTime <= endTime) {
                        const timeString = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
                        if (!slots[dateKey].includes(timeString)) {
                            slots[dateKey].push(timeString);
                        }
                    }
                    
                    // Gehe zum nächsten Intervall
                    currentTime = new Date(currentTime.getTime() + interval * 60000);
                }
            });

            console.log('Verarbeitete Slots:', slots);
            return slots;
        } catch (error) {
            console.error('Fehler beim Laden der verfügbaren Termine:', error);
            return {};
        }
    }

    // Hilfsmethode zum Parsen der Zeitstrings
    parseTime(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        const date = new Date();
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    // Separate Methode zum Generieren von Standard-Slots
    generateDefaultSlotsForDate(date) {
        if (date.getDay() === 0 || date.getDay() === 6) {
            return []; // Keine Slots am Wochenende
        }
        return this.generateDefaultSlots();
    }

    generateDefaultSlots() {
        const slots = [];
        // Vormittags-Slots
        for (let hour = 9; hour <= 12; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        // Nachmittags-Slots
        for (let hour = 14; hour <= 17; hour++) {
            slots.push(`${hour.toString().padStart(2, '0')}:00`);
        }
        return slots;
    }

    async checkSlotAvailability(date, time) {
        try {
            console.log('Prüfe Verfügbarkeit für:', {
                date: date.toISOString(),
                time: time
            });

            // Hole den verfügbaren Slot für diesen Tag
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);

            // Prüfe verfügbare Slots
            const slotsRef = collection(db, 'verfuegbare_slots');
            const slotsQuery = query(
                slotsRef,
                where('datum', '>=', Timestamp.fromDate(start)),
                where('datum', '<=', Timestamp.fromDate(end))
            );

            const slotsSnapshot = await getDocs(slotsQuery);
            let isTimeAvailable = false;

            for (const doc of slotsSnapshot.docs) {
                const slotData = doc.data();
                const slotStartTime = this.parseTime(slotData.startTime);
                const slotEndTime = this.parseTime(slotData.endTime);
                const bookingStartTime = this.parseTime(time);
                const bookingEndTime = new Date(bookingStartTime.getTime() + this.selectedTreatment.duration * 60000);

                console.log('Vergleiche Zeiten:', {
                    slotStart: slotStartTime.toTimeString(),
                    slotEnd: slotEndTime.toTimeString(),
                    bookingStart: bookingStartTime.toTimeString(),
                    bookingEnd: bookingEndTime.toTimeString()
                });

                // Prüfe ob die Buchungszeit innerhalb des Slots liegt
                if (bookingStartTime >= slotStartTime && bookingEndTime <= slotEndTime) {
                    isTimeAvailable = true;
                    break;
                }
            }

            if (!isTimeAvailable) {
                console.log('Zeit nicht verfügbar in den Slots');
                return false;
            }

            // Prüfe existierende Buchungen
            const buchungenRef = collection(db, 'buchungen');
            const buchungenQuery = query(
                buchungenRef,
                where('date', '==', Timestamp.fromDate(date)),
                where('time', '==', time)
            );

            const buchungenSnapshot = await getDocs(buchungenQuery);
            const isSlotFree = buchungenSnapshot.empty;

            console.log('Buchungsprüfung:', {
                isSlotFree,
                existingBookings: buchungenSnapshot.size
            });

            return isSlotFree;
        } catch (error) {
            console.error('Fehler bei der Verfügbarkeitsprüfung:', error);
            throw error;
        }
    }

    async updateAvailableSlots(bookingDate, bookingTime, duration) {
        try {
            console.log('Aktualisiere verfügbare Slots für:', {
                date: bookingDate,
                time: bookingTime,
                duration: duration
            });

            // Hole den verfügbaren Slot für diesen Tag
            const start = new Date(bookingDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(bookingDate);
            end.setHours(23, 59, 59, 999);

            console.log('Suche Slots zwischen:', {
                start: start.toISOString(),
                end: end.toISOString()
            });

            const slotsRef = collection(db, 'verfuegbare_slots');
            const q = query(
                slotsRef,
                where('datum', '>=', Timestamp.fromDate(start)),
                where('datum', '<=', Timestamp.fromDate(end))
            );

            const querySnapshot = await getDocs(q);
            console.log('Gefundene Slots:', querySnapshot.size);
            
            for (const doc of querySnapshot.docs) {
                const slotData = doc.data();
                console.log('Verarbeite Slot:', slotData);

                const bookingStartTime = this.parseTime(bookingTime);
                const bookingEndTime = new Date(bookingStartTime.getTime() + duration * 60000);
                const slotStartTime = this.parseTime(slotData.startTime);
                const slotEndTime = this.parseTime(slotData.endTime);

                console.log('Vergleiche Zeiten:', {
                    bookingStart: bookingStartTime.toTimeString(),
                    bookingEnd: bookingEndTime.toTimeString(),
                    slotStart: slotStartTime.toTimeString(),
                    slotEnd: slotEndTime.toTimeString()
                });

                // Fall 1: Buchung ist am Anfang des Slots
                if (bookingStartTime.getTime() === slotStartTime.getTime()) {
                    console.log('Fall 1: Buchung am Anfang des Slots');
                    const newStartTime = new Date(bookingEndTime);
                    if (newStartTime < slotEndTime) {
                        console.log('Aktualisiere Startzeit auf:', newStartTime.toTimeString());
                        await updateDoc(doc.ref, {
                            startTime: `${newStartTime.getHours().toString().padStart(2, '0')}:${newStartTime.getMinutes().toString().padStart(2, '0')}`
                        });
                    } else {
                        console.log('Lösche Slot, da komplett gebucht');
                        await deleteDoc(doc.ref);
                    }
                }
                // Fall 2: Buchung ist am Ende des Slots
                else if (bookingEndTime.getTime() === slotEndTime.getTime()) {
                    console.log('Fall 2: Buchung am Ende des Slots');
                    await updateDoc(doc.ref, {
                        endTime: bookingTime
                    });
                }
                // Fall 3: Buchung ist in der Mitte des Slots
                else if (bookingStartTime > slotStartTime && bookingEndTime < slotEndTime) {
                    console.log('Fall 3: Buchung in der Mitte des Slots');
                    // Erstelle zwei neue Slots
                    const slot1 = {
                        datum: slotData.datum,
                        startTime: slotData.startTime,
                        endTime: bookingTime,
                        intervall: slotData.intervall
                    };

                    const slot2 = {
                        datum: slotData.datum,
                        startTime: `${bookingEndTime.getHours().toString().padStart(2, '0')}:${bookingEndTime.getMinutes().toString().padStart(2, '0')}`,
                        endTime: slotData.endTime,
                        intervall: slotData.intervall
                    };

                    console.log('Erstelle neue Slots:', { slot1, slot2 });

                    // Lösche den alten Slot
                    await deleteDoc(doc.ref);

                    // Erstelle die neuen Slots
                    if (this.parseTime(slot1.endTime) > this.parseTime(slot1.startTime)) {
                        await addDoc(slotsRef, slot1);
                    }
                    if (this.parseTime(slot2.endTime) > this.parseTime(slot2.startTime)) {
                        await addDoc(slotsRef, slot2);
                    }
                }
            }

            console.log('Verfügbare Slots erfolgreich aktualisiert');
        } catch (error) {
            console.error('Fehler beim Aktualisieren der verfügbaren Slots:', error);
            throw error;
        }
    }

    async submitBooking(formData) {
        try {
            console.log('Starte Buchungsprozess:', {
                date: this.selectedDate,
                time: this.selectedTime,
                treatment: this.selectedTreatment
            });

            // Prüfe nochmal die Verfügbarkeit
            const isAvailable = await this.checkSlotAvailability(this.selectedDate, this.selectedTime);
            if (!isAvailable) {
                throw new Error('Dieser Termin ist leider nicht mehr verfügbar.');
            }

            // Erstelle die Buchung
            const bookingData = {
                treatment: this.selectedTreatment,
                date: Timestamp.fromDate(this.selectedDate),
                time: this.selectedTime,
                duration: this.selectedTreatment.duration,
                customer: {
                    name: formData.name,
                    email: formData.email,
                    phone: formData.phone,
                    notes: formData.notes
                },
                status: 'pending',
                createdAt: Timestamp.now()
            };

            console.log('Speichere Buchung:', bookingData);

            // Speichere in Firestore
            const docRef = await addDoc(collection(db, 'buchungen'), bookingData);
            console.log('Buchung gespeichert mit ID:', docRef.id);
            
            // Aktualisiere die verfügbaren Slots
            await this.updateAvailableSlots(
                this.selectedDate,
                this.selectedTime,
                this.selectedTreatment.duration
            );

            console.log('Buchungsprozess erfolgreich abgeschlossen');

            // Zeige Erfolgsmeldung
            alert('Deine Buchung wurde erfolgreich gespeichert! Du erhältst in Kürze eine Bestätigungs-E-Mail.');
            
            // Formular zurücksetzen
            const form = document.getElementById('bookingForm');
            if (form) form.reset();

            // Gehe zurück zu Schritt 1 und aktualisiere alles
            this.showStep(1);
            
            // Setze ausgewählte Behandlung zurück
            document.querySelectorAll('.treatment-card').forEach(card => {
                card.classList.remove('selected');
            });
            
            // Setze ausgewähltes Datum und Zeit zurück
            this.selectedDate = null;
            this.selectedTime = null;
            
            // Aktualisiere den Kalender
            await this.updateCalendar();

            return {
                success: true,
                bookingId: docRef.id
            };
        } catch (error) {
            console.error('Fehler bei der Buchung:', error);
            throw error;
        }
    }

    // E-Mail-Funktionen werden später implementiert
    /*
    async sendConfirmationEmail(bookingId, bookingData) {
        try {
            console.log('Bestätigungs-E-Mail wird gesendet...');
        } catch (error) {
            console.error('Fehler beim Senden der Bestätigungs-E-Mail:', error);
        }
    }
    */

    async selectDate(date) {
        this.selectedDate = date;
        
        // Markiere ausgewähltes Datum
        document.querySelectorAll('.calendar-day').forEach(day => {
            day.classList.remove('selected');
        });
        event.target.classList.add('selected');

        // Zeige verfügbare Zeitslots
        await this.updateTimeSlots(date);
    }

    async updateTimeSlots(date) {
        const timeSlotsContainer = document.getElementById('timeSlots');
        if (!timeSlotsContainer) return;

        console.log('Aktualisiere Zeitslots für Datum:', date.toISOString());

        // Hole verfügbare Slots für das ausgewählte Datum
        const slots = await this.getAvailableSlots(date, date);
        const availableSlots = slots[date.toDateString()] || [];
        console.log('Verfügbare Slots für das Datum:', availableSlots);

        timeSlotsContainer.innerHTML = '';

        if (availableSlots.length === 0) {
            const noSlotsMessage = document.createElement('div');
            noSlotsMessage.className = 'no-slots-message';
            noSlotsMessage.textContent = 'Keine Termine verfügbar an diesem Tag';
            timeSlotsContainer.appendChild(noSlotsMessage);
            return;
        }

        // Erstelle den Container für die zwei Spalten
        const timeSlotColumns = document.createElement('div');
        timeSlotColumns.className = 'time-slots-columns';
        timeSlotsContainer.appendChild(timeSlotColumns);

        // Sortiere die Slots chronologisch
        availableSlots.sort((a, b) => {
            const [aHours, aMinutes] = a.split(':').map(Number);
            const [bHours, bMinutes] = b.split(':').map(Number);
            return (aHours * 60 + aMinutes) - (bHours * 60 + bMinutes);
        });

        // Gruppiere Slots nach Tageszeit
        const morningSlots = [];
        const afternoonSlots = [];

        availableSlots.forEach(time => {
            const hour = parseInt(time.split(':')[0]);
            if (hour < 12) {
                morningSlots.push(time);
            } else {
                afternoonSlots.push(time);
            }
        });

        // Vormittags-Container
        if (morningSlots.length > 0) {
            const morningContainer = document.createElement('div');
            morningContainer.className = 'time-slots-group morning-slots';
            
            const morningTitle = document.createElement('h4');
            morningTitle.textContent = 'Vormittag';
            morningContainer.appendChild(morningTitle);

            const morningGrid = document.createElement('div');
            morningGrid.className = 'time-slots-grid';
            morningContainer.appendChild(morningGrid);

            morningSlots.forEach(time => {
                const slot = this.createTimeSlot(time);
                morningGrid.appendChild(slot);
            });

            timeSlotColumns.appendChild(morningContainer);
        }

        // Nachmittags-Container
        if (afternoonSlots.length > 0) {
            const afternoonContainer = document.createElement('div');
            afternoonContainer.className = 'time-slots-group afternoon-slots';
            
            const afternoonTitle = document.createElement('h4');
            afternoonTitle.textContent = 'Nachmittag';
            afternoonContainer.appendChild(afternoonTitle);

            const afternoonGrid = document.createElement('div');
            afternoonGrid.className = 'time-slots-grid';
            afternoonContainer.appendChild(afternoonGrid);

            afternoonSlots.forEach(time => {
                const slot = this.createTimeSlot(time);
                afternoonGrid.appendChild(slot);
            });

            timeSlotColumns.appendChild(afternoonContainer);
        }

        // Deaktiviere den Weiter-Button bis ein Zeitslot ausgewählt wurde
        const nextButton = document.querySelector('#bookingStep2 .next-step');
        if (nextButton) {
            nextButton.disabled = true;
        }
    }

    createTimeSlot(time) {
        const slot = document.createElement('div');
        slot.className = 'time-slot';
        
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'time-slot-content';

        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = time;
        contentWrapper.appendChild(timeSpan);

        const durationSpan = document.createElement('span');
        durationSpan.className = 'duration';
        durationSpan.textContent = `${this.selectedTreatment.duration} Minuten`;
        contentWrapper.appendChild(durationSpan);

        slot.appendChild(contentWrapper);
        
        slot.addEventListener('click', () => {
            document.querySelectorAll('.time-slot').forEach(s => {
                s.classList.remove('selected');
            });
            slot.classList.add('selected');
            this.selectedTime = time;

            // Aktiviere den Weiter-Button
            const nextButton = document.querySelector('#bookingStep2 .next-step');
            if (nextButton) {
                nextButton.disabled = false;
            }
        });

        return slot;
    }

    updateBookingSummary() {
        const summary = document.getElementById('bookingSummary');
        if (!summary) return;

        const dateString = this.selectedDate.toLocaleDateString('de-DE', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        summary.innerHTML = `
            <h4>Ihre Buchung</h4>
            <p><strong>Behandlung:</strong> ${this.selectedTreatment.name}</p>
            <p><strong>Datum:</strong> ${dateString}</p>
            <p><strong>Uhrzeit:</strong> ${this.selectedTime} Uhr</p>
            <p><strong>Dauer:</strong> ${this.selectedTreatment.duration} Minuten</p>
            <p><strong>Preis:</strong> ${this.selectedTreatment.price}€</p>
        `;
    }

    initBookingForm() {
        const form = document.getElementById('bookingForm');
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!this.validateBookingData()) {
                alert('Bitte fülle alle erforderlichen Felder aus.');
                return;
            }

            try {
                const formData = {
                    name: form.name.value,
                    email: form.email.value,
                    phone: form.phone?.value || '',
                    notes: form.notes?.value || ''
                };

                // Zeige Lade-Animation
                const submitButton = form.querySelector('.submit-booking');
                submitButton.classList.add('loading');
                submitButton.disabled = true;

                const result = await this.submitBooking(formData);
                
                if (result.success) {
                    alert('Deine Buchung wurde erfolgreich gespeichert! Du erhältst in Kürze eine Bestätigungs-E-Mail.');
                    form.reset();
                    this.showStep(1);
                }
            } catch (error) {
                alert(error.message || 'Es ist ein Fehler aufgetreten. Bitte versuche es später erneut.');
            } finally {
                // Entferne Lade-Animation
                const submitButton = form.querySelector('.submit-booking');
                submitButton.classList.remove('loading');
                submitButton.disabled = false;
            }
        });
    }

    validateBookingData() {
        return this.selectedTreatment && 
               this.selectedDate && 
               this.selectedTime &&
               document.getElementById('name').value &&
               document.getElementById('email').value;
    }
} 