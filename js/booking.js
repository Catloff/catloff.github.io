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

// --- Hilfsfunktion zur Berechnung der tatsächlichen Verfügbarkeit FÜR EINEN TAG ---
// Diese Funktion verwendet jetzt VORGELADENE Daten statt neuer DB-Abfragen
function calculateAvailableSlotsForDay(date, bookingDuration, availableSlotsDataForDay, existingBookingsForDay) {
    console.log(`Berechne tatsächliche Slots für: ${date.toLocaleDateString('de-DE')} aus vorgeladenen Daten`);
    const calculatedSlots = [];

    // Check für maximale Buchungen PRO TAG
    if (existingBookingsForDay.length >= 2) {
        console.log(`Maximale Anzahl an Buchungen (2) für ${date.toLocaleDateString('de-DE')} bereits erreicht.`);
        return []; // Keine Slots verfügbar
    }

    for (const slot of availableSlotsDataForDay) {
        const slotStart = timeStringToDate(slot.startTime, date);
        const slotEnd = timeStringToDate(slot.endTime, date);
        let potentialStartTime = new Date(slotStart);

        while (potentialStartTime < slotEnd) {
            const potentialEndTime = new Date(potentialStartTime.getTime() + bookingDuration * 60000);

            if (potentialEndTime <= slotEnd) {
                const timeString = dateToTimeString(potentialStartTime);
                
                let isCollision = false;
                for (const booking of existingBookingsForDay) {
                    const bookingStart = booking.date.toDate(); // Annahme: booking.date ist Firestore Timestamp
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
                    // Sicherstellen, dass wir keine Duplikate hinzufügen
                    if (!calculatedSlots.some(s => s.time === timeString)) {
                         calculatedSlots.push({ time: timeString, date: new Date(potentialStartTime) }); // Speichern Datum für Sortierung
                         console.log(`Gültiger Slot ${timeString} hinzugefügt.`);
                    }
                }
            }
            // WICHTIG: Schrittweite - 30 Minuten Schrittweite
            potentialStartTime.setTime(potentialStartTime.getTime() + 30 * 60000); 
        }
    }

    // Sortieren nach Zeit
    calculatedSlots.sort((a, b) => a.date - b.date);
    const finalSlots = calculatedSlots.map(s => s.time); // Nur die Zeitstrings zurückgeben

    console.log(`Berechnete verfügbare Slots für ${date.toLocaleDateString('de-DE')}: ${finalSlots.join(', ') || 'Keine'}`);
    return finalSlots;
}

// --- NEUE Firestore Abfragefunktion für den GESAMTEN Monat ---
async function fetchMonthDataFirestore(year, month) {
    console.log(`(Firestore) Rufe Daten für Monat ab: ${year}-${month + 1}`);
    const monthStart = new Date(year, month, 1);
    const nextMonthStart = new Date(year, month + 1, 1);
    const monthEnd = new Date(nextMonthStart.getTime() - 1); // Letzter Millisekunde des Monats

    const startTimestamp = Timestamp.fromDate(monthStart);
    const endTimestamp = Timestamp.fromDate(monthEnd);

    console.log(`(Firestore) Zeitraum: ${monthStart.toISOString()} bis ${monthEnd.toISOString()}`);

    try {
        // Parallele Abfragen für Slots und Buchungen
        const [slotsSnapshot, bookingsSnapshot] = await Promise.all([
            getDocs(query(
                collection(db, 'verfuegbare_slots'),
                where('datum', '>=', startTimestamp),
                where('datum', '<=', endTimestamp)
            )),
            getDocs(query(
                collection(db, 'buchungen'),
                where('date', '>=', startTimestamp),
                where('date', '<=', endTimestamp)
            ))
        ]);

        const availableSlots = [];
        slotsSnapshot.forEach((doc) => {
            const data = doc.data();
            // Konvertiere Firestore Timestamp zu JS Date für einfachere Handhabung
            if (data.datum && data.datum.toDate) {
                 availableSlots.push({ 
                     id: doc.id, 
                     ...data, 
                     jsDate: data.datum.toDate() // JS Date hinzufügen
                 });
            } else {
                console.warn("Slot ohne gültiges Datum gefunden:", doc.id, data);
            }
        });

        const bookings = [];
        bookingsSnapshot.forEach((doc) => {
            const data = doc.data();
             // Konvertiere Firestore Timestamp zu JS Date für einfachere Handhabung
            if (data.date && data.date.toDate) {
                bookings.push({ 
                    id: doc.id, 
                    ...data,
                    jsDate: data.date.toDate() // JS Date hinzufügen
                });
            } else {
                 console.warn("Buchung ohne gültiges Datum gefunden:", doc.id, data);
            }
        });

        console.log(`(Firestore) Gefunden: ${availableSlots.length} verfügbare Slot-Dokumente, ${bookings.length} Buchungen`);
        return { availableSlots, bookings };

    } catch (error) {
        console.error('(Firestore) Fehler beim Abrufen der Monatsdaten:', error);
        return { availableSlots: [], bookings: [] }; // Leere Arrays im Fehlerfall
    }
}

export default class BookingSystem {
    constructor() {
        console.log('BookingSystem Konstruktor aufgerufen');
        this.currentStep = 1;
        this.bookingDuration = 120; // Standarddauer, wird ggf. überschrieben
        this.selectedDate = null;
        this.selectedTime = null;
        this.currentMonth = new Date(); // Startet mit dem aktuellen Monat
        this.currentMonthData = null; // Hält die verarbeiteten Daten für den aktuellen Monat
        this.calendarElement = null;
        this.timeSlotsElement = null;
        this.monthDisplayElement = null;
        this.isLoading = false; // Flag, um parallele Ladevorgänge zu verhindern
        this.currentLoadId = 0; // Für Race-Condition Handling

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
        // DOM-Elemente einmalig holen und speichern
        this.calendarElement = document.getElementById('bookingCalendar');
        this.timeSlotsElement = document.getElementById('timeSlots');
        this.monthDisplayElement = document.getElementById('currentMonth');
        const prevMonthBtn = document.querySelector('.prev-month');
        const nextMonthBtn = document.querySelector('.next-month');

        if (!this.calendarElement || !this.timeSlotsElement || !this.monthDisplayElement || !prevMonthBtn || !nextMonthBtn) {
            console.error('Wichtige Kalender- oder Zeitleisten-Elemente nicht im DOM gefunden! Abbruch.');
            return;
        }

        this.initStepNavigation();
        this.initCalendarNavigation(prevMonthBtn, nextMonthBtn); // Eigene Methode für Klarheit
        this.initBookingForm();

        // Initialen Kalender laden
        this.updateCalendar();

        console.log('Initialisierung der Komponenten abgeschlossen');
    }

    initStepNavigation() {
        console.log('Initialisiere Schritt-Navigation');
        const nextButtons = document.querySelectorAll('.next-step');
        nextButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                 if (this.validateStep(this.currentStep)) { // Validierung vor dem Wechsel
                    const nextStep = button.getAttribute('data-next');
                    console.log('Weiter-Button geklickt, nächster Schritt:', nextStep);
                    this.showStep(nextStep);
                }
            });
        });

        const prevButtons = document.querySelectorAll('.prev-step');
        prevButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const prevStep = button.getAttribute('data-prev');
                console.log('Zurück-Button geklickt, vorheriger Schritt:', prevStep);
                this.showStep(prevStep);
            });
        });
    }

    // NEU: Separate Methode für Kalender Navigation Listener
    initCalendarNavigation(prevMonthBtn, nextMonthBtn) {
        prevMonthBtn.addEventListener('click', () => {
            if (this.isLoading) return; // Verhindern während Ladevorgang
            this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
            console.log('Gehe zu Vormonat:', this.currentMonth);
            this.updateCalendar();
        });

        nextMonthBtn.addEventListener('click', () => {
             if (this.isLoading) return; // Verhindern während Ladevorgang
            this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
            console.log('Gehe zu Nächstmonat:', this.currentMonth);
            this.updateCalendar();
        });
    }

    validateStep(step) {
        console.log('Validiere Schritt', step);
        if (step === 1) {
            if (!this.selectedDate || !this.selectedTime) {
                console.warn('Validierung fehlgeschlagen: Datum oder Zeit nicht ausgewählt.');
                // Hier könnte man eine User-Nachricht anzeigen
                alert('Bitte wählen Sie zuerst ein Datum und eine verfügbare Uhrzeit aus.');
                return false;
            }
        }
        // Weitere Validierungen für andere Schritte könnten hier folgen
        console.log('Validierung erfolgreich für Schritt', step);
        return true;
    }

    showStep(step) {
        console.log('showStep aufgerufen mit:', step);
        const allSteps = document.querySelectorAll('.booking-step-container');
        allSteps.forEach(container => container.classList.add('hidden'));

        const nextStepElement = document.getElementById(`bookingStep${step}`);
        if (nextStepElement) {
            nextStepElement.classList.remove('hidden');
            this.currentStep = parseInt(step);
            console.log('Aktueller Schritt gesetzt auf:', this.currentStep);

            if (this.currentStep === 2) {
                console.log('Aktualisiere Buchungszusammenfassung');
                this.updateBookingSummary();
            }
        } else {
            console.error('Container für Schritt nicht gefunden:', step);
        }
    }

    // initCalendar wird jetzt nur noch für die Navigation genutzt -> umbenannt
    initCalendar() {
         // Diese Methode ist jetzt leer, da die Logik in initializeComponents und initCalendarNavigation ist
         // Könnte entfernt oder für zukünftige Zwecke beibehalten werden.
         console.warn("initCalendar() ist veraltet und wird nicht mehr direkt verwendet.");
    }

    // --- Kernfunktion zur Aktualisierung des Kalenders (STARK ÜBERARBEITET) ---
    async updateCalendar() {
        if (this.isLoading) {
            console.log("Kalender lädt bereits, überspringe erneuten Aufruf.");
            return;
        }
        this.isLoading = true;
        this.currentLoadId++; // Eindeutige ID für diesen Ladevorgang
        const loadId = this.currentLoadId; // Lokale Kopie für Prüfung nach await

        console.log(`Starte updateCalendar für ${this.currentMonth.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })} (Load ID: ${loadId})`);

        // 1. Ladezustand anzeigen
        this.calendarElement.innerHTML = '<div class="calendar-loading">Kalender wird geladen...</div>';
        this.timeSlotsElement.innerHTML = ''; // Zeitleiste leeren
        this.disableNextButton(); // Weiter-Button deaktivieren
        this.selectedDate = null;
        this.selectedTime = null;

        this.monthDisplayElement.textContent = this.currentMonth.toLocaleDateString('de-DE', {
            month: 'long',
            year: 'numeric'
        });

        try {
            // 2. Daten für den gesamten Monat abrufen
            const year = this.currentMonth.getFullYear();
            const month = this.currentMonth.getMonth();
            const { availableSlots: monthSlots, bookings: monthBookings } = await fetchMonthDataFirestore(year, month);

            // 2.1 Race Condition Check: Nur fortfahren, wenn dies der letzte gestartete Ladevorgang ist
             if (loadId !== this.currentLoadId) {
                console.log(`Ladevorgang ${loadId} abgebrochen, da neuere Anfrage (${this.currentLoadId}) gestartet wurde.`);
                this.isLoading = false; // Wichtig: isLoading zurücksetzen
                return;
            }

            console.log(`Daten für ${year}-${month + 1} geladen (Load ID: ${loadId}). Verarbeite...`);

            // 3. Verfügbarkeiten für jeden Tag des Monats berechnen
            this.currentMonthData = new Map(); // Zurücksetzen für neuen Monat
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=So, 1=Mo,...
            const adjustedFirstDay = (firstDayOfMonth === 0) ? 6 : firstDayOfMonth - 1; // Anpassung: 0=Mo, 6=So

            const today = customStartOfDay(new Date()); // Heutiges Datum für Vergleich

            for (let day = 1; day <= daysInMonth; day++) {
                const currentDate = new Date(year, month, day);
                const currentDateStartOfDay = customStartOfDay(currentDate);

                // Filtern der Monatsdaten für den aktuellen Tag
                const slotsForDay = monthSlots.filter(slot => customStartOfDay(slot.jsDate).getTime() === currentDateStartOfDay.getTime());
                const bookingsForDay = monthBookings.filter(booking => customStartOfDay(booking.jsDate).getTime() === currentDateStartOfDay.getTime());

                let dayAvailability = {
                    isAvailable: false,
                    isPast: currentDateStartOfDay < today,
                    isToday: currentDateStartOfDay.getTime() === today.getTime(),
                    availableTimes: []
                };

                // Nur Verfügbarkeit prüfen, wenn Tag nicht in Vergangenheit liegt UND Slots definiert sind
                if (!dayAvailability.isPast && slotsForDay.length > 0) {
                     // Verwende die überarbeitete Funktion mit vorgeladenen Daten
                    const calculatedTimes = calculateAvailableSlotsForDay(currentDate, this.bookingDuration, slotsForDay, bookingsForDay);
                    if (calculatedTimes.length > 0) {
                        dayAvailability.isAvailable = true;
                        dayAvailability.availableTimes = calculatedTimes;
                    }
                }
                 console.log(`Tag ${day}: verfügbar=${dayAvailability.isAvailable}, Zeiten=${dayAvailability.availableTimes.join('/') || '-'}`, `(Slots: ${slotsForDay.length}, Buchungen: ${bookingsForDay.length})`);

                this.currentMonthData.set(day, dayAvailability);
            }
             console.log("Monatsdaten verarbeitet:", this.currentMonthData);


            // 4. Kalender-HTML auf einmal generieren und einfügen
            let calendarHtml = '';
            // Leere Zellen für Tage vor dem 1. des Monats
            for (let i = 0; i < adjustedFirstDay; i++) {
                calendarHtml += `<div class="calendar-day empty"></div>`;
            }

            // Zellen für jeden Tag des Monats
            for (let day = 1; day <= daysInMonth; day++) {
                const availability = this.currentMonthData.get(day);
                let classes = 'calendar-day';
                let onClick = '';

                if (availability.isPast) {
                    classes += ' past unavailable';
                } else if (availability.isAvailable) {
                    classes += ' available';
                    onClick = `data-day="${day}"`; // Attribut für Event Listener
                } else {
                    classes += ' unavailable';
                }
                 if (availability.isToday) {
                    classes += ' today';
                }


                calendarHtml += `<div class="${classes}" ${onClick}>${day}</div>`;
            }

            this.calendarElement.innerHTML = calendarHtml;

             // 5. Event Listener für klickbare Tage hinzufügen (Event Delegation)
            this.calendarElement.removeEventListener('click', this.handleDayClick); // Alten Listener entfernen
            this.handleDayClick = this.handleDayClick.bind(this); // Kontext binden
            this.calendarElement.addEventListener('click', this.handleDayClick);


        } catch (error) {
            console.error('Fehler beim Aktualisieren des Kalenders:', error);
            this.calendarElement.innerHTML = '<div class="calendar-error">Fehler beim Laden des Kalenders. Bitte versuchen Sie es später erneut.</div>';
        } finally {
             // Sicherstellen, dass isLoading zurückgesetzt wird, auch wenn der Check fehlschlägt oder ein Fehler auftritt
             if (loadId === this.currentLoadId) {
                this.isLoading = false;
                console.log(`updateCalendar abgeschlossen (Load ID: ${loadId}). isLoading: ${this.isLoading}`);
            } else {
                 console.log(`isLoading bleibt true für ${loadId}, da neuere Anfrage (${this.currentLoadId}) aktiv ist.`);
            }
        }
    }

     // NEU: Event Handler für Klicks im Kalender (Delegation)
    handleDayClick(event) {
        const target = event.target;
        // Prüfen, ob auf ein verfügbares Tages-Element geklickt wurde
        if (target.classList.contains('calendar-day') && target.classList.contains('available') && target.dataset.day) {
            const day = parseInt(target.dataset.day);
            const date = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth(), day);
            
            // Visuelles Feedback für Auswahl
            document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
            target.classList.add('selected');

            this.selectDate(date); // Rufe die (vereinfachte) selectDate auf
        }
    }

    // selectDate: Vereinfacht, da Verfügbarkeit schon bekannt ist
    selectDate(date) {
        console.log(`Datum ausgewählt: ${date.toLocaleDateString('de-DE')}`);
        this.selectedDate = date;
        this.selectedTime = null; // Zeit zurücksetzen bei neuer Datumswahl
        this.disableNextButton(); // Weiter erstmal deaktivieren

        const dayOfMonth = date.getDate();
        const availability = this.currentMonthData.get(dayOfMonth);

        if (availability && availability.isAvailable) {
             console.log("Zeige verfügbare Zeiten an:", availability.availableTimes);
            this.updateTimeSlotsUI(availability.availableTimes); // Reine UI-Update Funktion
        } else {
            console.warn(`Keine Verfügbarkeitsdaten für ${date.toLocaleDateString('de-DE')} gefunden oder Tag nicht verfügbar.`);
            this.timeSlotsElement.innerHTML = '<p>Für diesen Tag sind keine Termine verfügbar.</p>';
        }
    }

    // updateTimeSlots: Umbenannt in updateTimeSlotsUI, da keine Logik mehr, nur UI
    updateTimeSlotsUI(availableTimes) {
        this.timeSlotsElement.innerHTML = ''; // Vorherige Slots leeren

        if (availableTimes.length === 0) {
            this.timeSlotsElement.innerHTML = '<p>Keine freien Termine für diesen Tag.</p>';
            return;
        }

        availableTimes.forEach(time => {
            const timeSlotElement = this.createTimeSlotElement(time);
            this.timeSlotsElement.appendChild(timeSlotElement);
        });
    }

    createTimeSlotElement(time) {
        const button = document.createElement('button');
        button.classList.add('time-slot');
        button.textContent = time;
        button.addEventListener('click', (e) => {
            e.preventDefault();
            // Visuelles Feedback für Auswahl
            document.querySelectorAll('.time-slot.selected').forEach(el => el.classList.remove('selected'));
            button.classList.add('selected');

            this.selectedTime = time;
            console.log(`Zeit ausgewählt: ${this.selectedTime}`);
            this.enableNextButton(); // Weiter-Button aktivieren
        });
        return button;
    }

    enableNextButton() {
         console.log("Aktiviere Weiter-Button");
        const nextButton = document.querySelector('#bookingStep1 .next-step'); // Gezieltere Auswahl
        if (nextButton) {
            nextButton.disabled = false;
            nextButton.classList.remove('disabled'); // Optional: für Styling
        } else {
            console.warn("Weiter-Button in Schritt 1 nicht gefunden zum Aktivieren.");
        }
    }

    disableNextButton() {
         console.log("Deaktiviere Weiter-Button");
         const nextButton = document.querySelector('#bookingStep1 .next-step'); // Gezieltere Auswahl
         if (nextButton) {
             nextButton.disabled = true;
             nextButton.classList.add('disabled'); // Optional: für Styling
         } else {
             console.warn("Weiter-Button in Schritt 1 nicht gefunden zum Deaktivieren.");
         }
    }

    updateBookingSummary() {
        const summaryElement = document.getElementById('bookingSummary');
        if (!summaryElement) {
             console.error("Zusammenfassungselement nicht gefunden.");
             return;
        }
        if (this.selectedDate && this.selectedTime) {
            const dateString = this.selectedDate.toLocaleDateString('de-DE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
            // Keine Dauer mehr anzeigen
            summaryElement.innerHTML = `
                <p><strong>Ausgewählter Termin:</strong></p>
                <p>${dateString} um ${this.selectedTime} Uhr</p>
            `;
             console.log("Buchungszusammenfassung aktualisiert.");
        } else {
            summaryElement.innerHTML = '<p>Bitte wählen Sie zuerst einen Termin aus.</p>';
             console.log("Buchungszusammenfassung: Kein Termin ausgewählt.");
        }
    }

    initBookingForm() {
        console.log("Initialisiere Buchungsformular");
        const form = document.getElementById('bookingForm');
        if (!form) {
            console.error("Buchungsformular nicht gefunden.");
            return;
        }
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log("Buchungsformular abgeschickt");

            // Erfasse Formulardaten
            const formData = {
                name: form.name.value.trim(),
                email: form.email.value.trim(),
                phone: form.phone.value.trim(),
                notes: form.notes.value.trim(),
            };

             console.log("Formulardaten:", formData);

            // Validierung (einfach)
            if (!formData.name || !formData.email) {
                alert('Bitte geben Sie mindestens Name und E-Mail an.');
                console.warn("Formularvalidierung fehlgeschlagen: Name oder E-Mail fehlt.");
                return;
            }

            // Füge ausgewählte Termininfos hinzu
            if (!this.selectedDate || !this.selectedTime) {
                 alert('Es wurde kein gültiger Termin ausgewählt. Bitte gehen Sie zurück und wählen Sie einen Termin.');
                 console.error("Buchungsversuch ohne gültiges Datum/Zeit.");
                 return;
            }
             // Kombiniere Datum und Zeit zu einem Date-Objekt für Firestore
            const [hours, minutes] = this.selectedTime.split(':').map(Number);
            const finalBookingDate = new Date(this.selectedDate);
            finalBookingDate.setHours(hours, minutes, 0, 0);

            const bookingData = {
                ...formData,
                date: Timestamp.fromDate(finalBookingDate), // Verwende kombiniertes Datum/Zeit
                duration: this.bookingDuration, // Füge die Dauer hinzu
                status: 'angefragt' // Standardstatus bei neuer Anfrage
            };

             console.log("Sende Buchungsdaten an Firestore:", bookingData);

            try {
                // Sende Buchungsanfrage an Firestore
                const docRef = await addDoc(collection(db, 'buchungen'), bookingData);
                console.log('Buchung erfolgreich gespeichert mit ID:', docRef.id);
                alert('Ihre Terminanfrage wurde erfolgreich gesendet! Sie erhalten in Kürze eine Bestätigung.');
                // Optional: Formular zurücksetzen oder zur Bestätigungsseite weiterleiten
                form.reset();
                this.selectedDate = null;
                this.selectedTime = null;
                 this.currentMonthData = null; // Cache leeren, da sich Verfügbarkeit geändert hat
                this.showStep(1); // Zurück zu Schritt 1
                this.updateCalendar(); // Kalender neu laden, um geänderte Verfügbarkeit anzuzeigen
            } catch (error) {
                console.error('Fehler beim Speichern der Buchung:', error);
                alert('Es gab einen Fehler beim Senden Ihrer Anfrage. Bitte versuchen Sie es erneut.');
            }
        });
    }
}

// Stelle sicher, dass das Skript erst nach dem Laden des DOMs ausgeführt wird
// Die Initialisierung erfolgt jetzt im Konstruktor bzw. in initializeComponents
// document.addEventListener('DOMContentLoaded', () => {
//     console.log("DOM vollständig geladen. Initialisiere BookingSystem.");
//     new BookingSystem();
// });

// Direkte Instanziierung, wenn das Skript als Modul geladen wird
// Der Konstruktor behandelt das DOMContentLoaded Event bereits.
new BookingSystem(); 