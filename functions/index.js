const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { FieldPath } = require('firebase-admin/firestore');

admin.initializeApp();

// --- Nodemailer Konfiguration ---
// Werte sollten über Firebase Environment Configuration gesetzt werden:
// `firebase functions:config:set email.user="DEINE_EMAIL" email.pass="DEIN_PASSWORT" email.host="smtp.host.com" email.port="465"`
// Du musst diese Werte in deinem Firebase Projekt setzen!
const emailUser = functions.config().email ? functions.config().email.user : process.env.EMAIL_USER;
const emailPass = functions.config().email ? functions.config().email.pass : process.env.EMAIL_PASS;
const emailHost = functions.config().email ? functions.config().email.host : process.env.EMAIL_HOST || 'mail.privateemail.com';
const emailPort = functions.config().email ? parseInt(functions.config().email.port) : parseInt(process.env.EMAIL_PORT || '465');

let transporter;
try {
    transporter = nodemailer.createTransport({
        host: emailHost,
        port: emailPort,
        secure: emailPort === 465, // true für port 465, false für andere ports wie 587
        auth: {
            user: emailUser, 
            pass: emailPass, 
        },
    });
    console.log('Nodemailer Transporter erstellt für Host:', emailHost);
} catch (error) {
    console.error('Fehler beim Erstellen des Nodemailer Transporters:', error);
    // Hier könnte man einen Fallback oder Monitoring implementieren
}

// Funktion zum Speichern der Buchung
exports.handleNewBooking = functions.firestore
    .document('buchungen/{bookingId}')
    .onCreate(async (snap, context) => {
        const bookingData = snap.data();
        const bookingId = context.params.bookingId;
        console.log(`Neue Buchung (${bookingId}):`, bookingData);

        // Status Update entfernen - Status sollte 'angefragt' sein
        /*
        try {
            await snap.ref.update({
                status: 'confirmed', // Nicht mehr automatisch bestätigen
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('Buchungsstatus aktualisiert (falls nötig - hier nicht mehr).');
        } catch (error) {
            console.error(`Fehler beim Aktualisieren des Buchungsstatus für ${bookingId}:`, error);
            // Trotzdem versuchen, E-Mails zu senden
        }
        */

        // --- Zähle vorherige Buchungen --- 
        let customerStatus = "Erstbuchung";
        const customerEmail = bookingData.customer?.email;
        if (customerEmail) { 
            try {
                const bookingsRef = admin.firestore().collection('buchungen');
                // Query: Finde andere Buchungen mit derselben E-Mail
                // Optional: Füge .where('status', '!=', 'storniert') hinzu, um nur gültige zu zählen?
                const previousBookingsQuery = bookingsRef
                    .where('customer.email', '==', customerEmail)
                    .where(FieldPath.documentId(), '!=', bookingId); // Schließe die aktuelle Buchung aus
                    
                const querySnapshot = await previousBookingsQuery.get();
                const previousBookingsCount = querySnapshot.size;
                
                if (previousBookingsCount > 0) {
                    customerStatus = `Folgebuchung (${previousBookingsCount} vorherige)`;
                }
                console.log(`Kundenstatus für ${customerEmail}: ${customerStatus}`);
            } catch (error) {
                console.error(`Fehler beim Zählen vorheriger Buchungen für ${customerEmail}:`, error);
                // Fahre trotzdem fort, E-Mails zu senden
            }
        } else {
             console.warn(`Keine E-Mail für Buchung ${bookingId}, Kundenstatus kann nicht ermittelt werden.`);
             customerStatus = "Unbekannt (keine E-Mail)";
        }

        // --- E-Mail-Versand --- 
        if (!transporter) {
            console.error('Nodemailer Transporter nicht verfügbar. Kann keine E-Mails senden.');
            return; // Beenden, wenn Transporter nicht initialisiert werden konnte
        }
        if (!emailUser) {
             console.error('E-Mail-Benutzer (Absender) nicht konfiguriert.');
             return;
        }
        
        // Daten extrahieren (mit Fallbacks)
        const customerName = bookingData.customer?.name || 'Unbekannt';
        const customerPhone = bookingData.customer?.phone || 'Keine Angabe';
        const bookingTime = bookingData.time || 'Unbekannte Zeit';
        const bookingDate = bookingData.date?.toDate() ? bookingData.date.toDate().toLocaleDateString('de-DE') : 'Unbekanntes Datum';
        const notes = bookingData.customer?.notes || 'Keine';
        const mamaEmail = emailUser; // Sende an die konfigurierte Admin-Email

        // 1. E-Mail an Mama (Admin) - mit Kundenstatus
        const mailToAdmin = {
            from: `"KiTE® Website Buchung" <${emailUser}>`, 
            to: mamaEmail, 
            subject: `Neue Terminanfrage: ${customerName} (${customerStatus}) am ${bookingDate} um ${bookingTime}`,
            text: `Hallo Dani,\n\nEs gibt eine neue Terminanfrage über die Website:\n\nKundenstatus: ${customerStatus}\nName: ${customerName}\nE-Mail: ${customerEmail || 'Keine Angabe'}\nTelefon: ${customerPhone}\nDatum: ${bookingDate}\nUhrzeit: ${bookingTime}\nAnmerkungen: ${notes}\n\nBuchungs-ID: ${bookingId}\n\nDu musst diesen Termin noch manuell per E-Mail bestätigen.\n\nViele Grüße,\nDeine Website`, 
            html: `<p>Hallo Dani,</p><p>Es gibt eine neue Terminanfrage über die Website:</p><ul><li><b>Kundenstatus:</b> ${customerStatus}</li><li><b>Name:</b> ${customerName}</li><li><b>E-Mail:</b> ${customerEmail || 'Keine Angabe'}</li><li><b>Telefon:</b> ${customerPhone}</li><li><b>Datum:</b> ${bookingDate}</li><li><b>Uhrzeit:</b> ${bookingTime}</li><li><b>Anmerkungen:</b> ${notes}</li></ul><p>Buchungs-ID: ${bookingId}</p><p>Du musst diesen Termin noch manuell per E-Mail bestätigen.</p><p>Viele Grüße,<br/>Deine Website</p>`
        };

        // 2. E-Mail an Kunden
        let mailToCustomer = null;
        if (customerEmail) {
            mailToCustomer = {
                from: `"Dani Sieck-Mitzloff (KiTE® Methode)" <${emailUser}>`, // Absender
                to: customerEmail,
                subject: `Deine Terminanfrage für die KiTE® Methode am ${bookingDate}`,
                text: `Hallo ${customerName},\n\nvielen Dank für deine Terminanfrage für die KiTE® Methode am ${bookingDate} um ${bookingTime}.\n\nDeine Anfrage wurde vorgemerkt. Ich werde mich in Kürze bei dir melden, um den Termin final zu bestätigen und dir weitere Informationen zuzusenden.\n\nBei Fragen erreichst du mich unter ${mamaEmail} oder telefonisch.\n\nHerzliche Grüße,\nDani Sieck-Mitzloff`, // Plain text body
                html: `<p>Hallo ${customerName},</p><p>vielen Dank für deine Terminanfrage für die KiTE® Methode am ${bookingDate} um ${bookingTime}.</p><p>Deine Anfrage wurde vorgemerkt. Ich werde mich in Kürze bei dir melden, um den Termin final zu bestätigen und dir weitere Informationen zuzusenden.</p><p>Bei Fragen erreichst du mich unter <a href="mailto:${mamaEmail}">${mamaEmail}</a> oder telefonisch.</p><p>Herzliche Grüße,<br/>Dani Sieck-Mitzloff</p>` // HTML body
            };
        } else {
            console.warn(`Keine Kunden-E-Mail für Buchung ${bookingId} angegeben. Es wird keine Bestätigung gesendet.`);
        }

        // E-Mails versenden
        try {
            console.log(`Sende Admin-Benachrichtigung an ${mamaEmail} für Buchung ${bookingId}...`);
            const infoAdmin = await transporter.sendMail(mailToAdmin);
            console.log('Admin-Benachrichtigung gesendet:', infoAdmin.messageId);

            if (mailToCustomer) {
                console.log(`Sende Kunden-Bestätigung an ${customerEmail} für Buchung ${bookingId}...`);
                const infoCustomer = await transporter.sendMail(mailToCustomer);
                console.log('Kunden-Bestätigung gesendet:', infoCustomer.messageId);
            }
        } catch (error) {
            console.error(`Fehler beim Senden der E-Mails für Buchung ${bookingId}:`, error);
            // Hier könnte man versuchen, den Fehler zu loggen oder einen Admin zu benachrichtigen
        }
    });

// --- Neue Funktion für Kontaktanfragen ---
exports.handleNewContactRequest = functions.firestore
    .document('kontaktanfragen/{anfragenId}')
    .onCreate(async (snap, context) => {
        const contactData = snap.data();
        const requestId = context.params.anfragenId;
        console.log(`Neue Kontaktanfrage (${requestId}):`, contactData);

        // --- E-Mail-Versand an Admin ---
        if (!transporter) {
            console.error('Nodemailer Transporter nicht verfügbar. Kann keine E-Mail für Kontaktanfrage senden.');
            return; // Beenden, wenn Transporter nicht initialisiert werden konnte
        }
        if (!emailUser) {
             console.error('E-Mail-Benutzer (Absender) nicht konfiguriert für Kontaktanfrage.');
             return;
        }

        // Daten extrahieren (mit Fallbacks)
        const senderName = contactData.name || 'Unbekannt';
        const senderEmail = contactData.email || 'Keine Angabe';
        const senderPhone = contactData.phone || 'Keine Angabe';
        const subject = contactData.subject || 'Kein Betreff';
        const message = contactData.message || 'Keine Nachricht';
        const adminEmail = 'info@dsm-kite.de'; // Feste Empfängeradresse

        const mailToAdmin = {
            from: `"KiTE® Website Kontaktformular" <${emailUser}>`, 
            to: adminEmail, 
            replyTo: senderEmail, // Setzt den Absender ins Antwort-An Feld
            subject: `Neue Kontaktanfrage: ${subject} von ${senderName}`,
            text: `Hallo Dani,\n\nDu hast eine neue Nachricht über das Kontaktformular erhalten:\n\nName: ${senderName}\nE-Mail: ${senderEmail}\nTelefon: ${senderPhone}\nBetreff: ${subject}\nNachricht:\n${message}\n\nAnfrage-ID: ${requestId}\n\nViele Grüße,\nDeine Website`, 
            html: `<p>Hallo Dani,</p><p>Du hast eine neue Nachricht über das Kontaktformular erhalten:</p><ul><li><b>Name:</b> ${senderName}</li><li><b>E-Mail:</b> ${senderEmail}</li><li><b>Telefon:</b> ${senderPhone}</li><li><b>Betreff:</b> ${subject}</li></ul><p><b>Nachricht:</b></p><p style="white-space: pre-wrap;">${message}</p><p>Anfrage-ID: ${requestId}</p><p>Viele Grüße,<br/>Deine Website</p>`
        };

        // E-Mail versenden
        try {
            console.log(`Sende Kontaktformular-Benachrichtigung an ${adminEmail} für Anfrage ${requestId}...`);
            const infoAdmin = await transporter.sendMail(mailToAdmin);
            console.log('Kontaktformular-Benachrichtigung gesendet:', infoAdmin.messageId);
        } catch (error) {
            console.error(`Fehler beim Senden der Kontaktformular-E-Mail für Anfrage ${requestId}:`, error);
        }
    });

// E-Mail-Funktionen werden später implementiert
/*
exports.sendBookingConfirmation = ...
exports.sendAdminNotification = ...
exports.sendBookingReminders = ...
*/ 