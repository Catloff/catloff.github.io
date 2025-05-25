const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');
const { FieldPath } = require('firebase-admin/firestore');

admin.initializeApp();

// --- Nodemailer Konfiguration ---
const emailUser = functions.config().email ? functions.config().email.user : process.env.EMAIL_USER;
const emailPass = functions.config().email ? functions.config().email.pass : process.env.EMAIL_PASS;
const emailHost = functions.config().email ? functions.config().email.host : process.env.EMAIL_HOST || 'mail.privateemail.com';
const emailPort = functions.config().email ? parseInt(functions.config().email.port) : parseInt(process.env.EMAIL_PORT || '465');

let transporter;
try {
    if (emailUser && emailPass) {
        transporter = nodemailer.createTransport({
            host: emailHost,
            port: emailPort,
            secure: emailPort === 465, // true für port 465, false für andere ports wie 587
            auth: {
                user: emailUser,
                pass: emailPass,
            },
        });
        functions.logger.log('Nodemailer Transporter erstellt für Host:', emailHost);
    } else {
        functions.logger.warn('E-Mail-Zugangsdaten (User/Pass) nicht vollständig konfiguriert. E-Mail-Versand deaktiviert.');
    }
} catch (error) {
    functions.logger.error('Fehler beim Erstellen des Nodemailer Transporters:', error);
    // Hier könnte man einen Fallback oder Monitoring implementieren
}

// Funktion zum Verarbeiten neuer Buchungen (E-Mail + Push-Benachrichtigung)
exports.handleNewBooking = functions.region("europe-west1") // Optional: Region anpassen
    .firestore
    .document('buchungen/{bookingId}')
    .onCreate(async (snap, context) => {
        const bookingData = snap.data();
        const bookingId = context.params.bookingId;
        functions.logger.log(`Neue Buchung (${bookingId}) erkannt:`, bookingData);

        // --- Gemeinsame Datenextraktion (ANGEPASST an neue Struktur) ---
        const customerName = bookingData.name || 'Unbekannt'; // Direkt aus bookingData.name
        const customerEmail = bookingData.email; // Direkt aus bookingData.email
        const customerPhone = bookingData.phone || 'Keine Angabe'; // Direkt aus bookingData.phone
        const bookingDateRaw = bookingData.date?.toDate(); // Ist immer noch korrekt
        // Extrahiere Datum und Zeit aus dem Timestamp unter Berücksichtigung der deutschen Zeitzone
        const optionsDate = { timeZone: 'Europe/Berlin', day: '2-digit', month: '2-digit', year: 'numeric' };
        const optionsTime = { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', hour12: false };

        const bookingDate = bookingDateRaw ? new Intl.DateTimeFormat('de-DE', optionsDate).format(bookingDateRaw) : 'Unbekanntes Datum';
        const bookingTime = bookingDateRaw ? new Intl.DateTimeFormat('de-DE', optionsTime).format(bookingDateRaw) : 'Unbekannte Zeit';
        const notes = bookingData.notes || 'Keine'; // Direkt aus bookingData.notes
        // const treatmentName = bookingData.treatment?.name || "Behandlung"; // Auskommentiert, da nicht verwendet/übermittelt

        // --- 1. Push-Benachrichtigung senden (NUR wenn Status 'angefragt') ---
        if (bookingData.status === "angefragt") {
            functions.logger.log(`Buchung ${bookingId} hat Status 'angefragt'. Versuche Push-Benachrichtigung zu senden.`);
            try {
                // Admin-Geräte-Token holen
                const devicesSnapshot = await admin.firestore().collection("admin_devices").get();
                const tokens = [];
                devicesSnapshot.forEach((doc) => {
                    const deviceData = doc.data();
                    if (deviceData.token) {
                        tokens.push(deviceData.token);
                        functions.logger.log(`Gefundenes Admin-Token für User ${doc.id}: ${deviceData.token.substring(0, 10)}...`);
                    } else {
                         functions.logger.warn(`Kein Token im Dokument für User ${doc.id} gefunden.`);
                    }
                });

                if (tokens.length > 0) {
                    // Payload erstellen (ANGEPASST: ohne treatmentName)
                    const payload = {
                        notification: {
                            title: "Neue Buchungsanfrage!",
                            // KORREKTUR: Text angepasst, da treatmentName nicht verfügbar ist
                            body: `${customerName} möchte einen Termin um ${bookingTime} Uhr buchen.`,
                            sound: "default"
                        },
                        data: {
                            bookingId: bookingId,
                            click_action: "FLUTTER_NOTIFICATION_CLICK"
                        }
                    };
                    functions.logger.log(`Sende Push-Payload an ${tokens.length} Token(s):`, payload);

                    // Nachricht senden
                    const response = await admin.messaging().sendToDevice(tokens, payload);
                    functions.logger.log("Push-Benachrichtigung erfolgreich gesendet:", response);

                } else {
                    functions.logger.warn("Keine Admin-Geräte-Tokens in 'admin_devices' gefunden. Push-Benachrichtigung kann nicht gesendet werden.");
                }
            } catch (error) {
                functions.logger.error(`Fehler beim Senden der Push-Benachrichtigung für Buchung ${bookingId}:`, error);
            }
        } else {
            functions.logger.log(`Buchung ${bookingId} hat Status '${bookingData.status}'. Keine Push-Benachrichtigung gesendet.`);
        }

        // --- 2. Zähle vorherige Buchungen ---
        let customerStatus = "Erstbuchung";
        if (customerEmail) {
            try {
                const bookingsRef = admin.firestore().collection('buchungen');
                // ANNAHME: Du willst jetzt nach 'email' direkt im Dokument suchen, nicht mehr in 'customer.email'
                const previousBookingsQuery = bookingsRef
                    .where('email', '==', customerEmail) // Angepasst an neue Struktur
                    .where(FieldPath.documentId(), '!=', bookingId);

                const querySnapshot = await previousBookingsQuery.get();
                const previousBookingsCount = querySnapshot.size;

                if (previousBookingsCount > 0) {
                    customerStatus = `Folgebuchung (${previousBookingsCount} vorherige)`;
                }
                functions.logger.log(`Kundenstatus für ${customerEmail}: ${customerStatus}`);
            } catch (error) {
                functions.logger.error(`Fehler beim Zählen vorheriger Buchungen für ${customerEmail}:`, error);
            }
        } else {
             functions.logger.warn(`Keine E-Mail für Buchung ${bookingId}, Kundenstatus kann nicht ermittelt werden.`);
             customerStatus = "Unbekannt (keine E-Mail)";
        }

        // --- 3. E-Mail-Versand ---
        if (!transporter) {
            functions.logger.error('Nodemailer Transporter nicht verfügbar. Kann keine E-Mails senden.');
            return;
        }
        if (!emailUser) {
             functions.logger.error('E-Mail-Benutzer (Absender) nicht konfiguriert.');
             return;
        }

        const mamaEmail = emailUser;

        // 3.1 E-Mail an Mama (Admin) (Angepasst an neue Struktur, ohne treatmentName)
        const mailToAdmin = {
            from: `"KiTE® Website Buchung" <${emailUser}>`,
            to: mamaEmail,
            subject: `Neue Terminanfrage: ${customerName} (${customerStatus}) am ${bookingDate} um ${bookingTime}`,
            text: `Hallo Dani,\n\nEs gibt eine neue Terminanfrage über die Website:\n\nKundenstatus: ${customerStatus}\nName: ${customerName}\nE-Mail: ${customerEmail || 'Keine Angabe'}\nTelefon: ${customerPhone}\nDatum: ${bookingDate}\nUhrzeit: ${bookingTime}\nAnmerkungen: ${notes}\n\nBuchungs-ID: ${bookingId}\n\nDu musst diesen Termin noch in der Admin-App bestätigen oder ablehnen.\n\nViele Grüße,\nDeine Website`,
            html: `<p>Hallo Dani,</p><p>Es gibt eine neue Terminanfrage über die Website:</p><ul><li><b>Kundenstatus:</b> ${customerStatus}</li><li><b>Name:</b> ${customerName}</li><li><b>E-Mail:</b> ${customerEmail || 'Keine Angabe'}</li><li><b>Telefon:</b> ${customerPhone}</li><li><b>Datum:</b> ${bookingDate}</li><li><b>Uhrzeit:</b> ${bookingTime}</li><li><b>Anmerkungen:</b> ${notes}</li></ul><p>Buchungs-ID: ${bookingId}</p><p><b>Du musst diesen Termin noch in der Admin-App bestätigen oder ablehnen.</b></p><p>Viele Grüße,<br/>Deine Website</p>`
        };

        // 3.2 E-Mail an Kunden (Angepasst an neue Struktur, ohne treatmentName)
        let mailToCustomer = null;
        if (customerEmail) {
            mailToCustomer = {
                from: `"Dani Sieck-Mitzloff (KiTE® Methode)" <${emailUser}>`,
                to: customerEmail,
                subject: `Deine Terminanfrage für die KiTE® Methode am ${bookingDate}`,
                text: `Hallo ${customerName},\n\nvielen Dank für deine Terminanfrage für die KiTE® Methode am ${bookingDate} um ${bookingTime}.\n\nDeine Anfrage wurde erfolgreich übermittelt und wird schnellstmöglich bearbeitet. Du erhältst eine separate Bestätigung per E-Mail, sobald der Termin final feststeht.\n\nBei Fragen erreichst du mich unter ${mamaEmail} oder telefonisch.\n\nHerzliche Grüße,\nDani Sieck-Mitzloff`,
                html: `<p>Hallo ${customerName},</p><p>vielen Dank für deine Terminanfrage für die KiTE® Methode am ${bookingDate} um ${bookingTime}.</p><p>Deine Anfrage wurde erfolgreich übermittelt und wird schnellstmöglich bearbeitet. Du erhältst eine separate Bestätigung per E-Mail, sobald der Termin final feststeht.</p><p>Bei Fragen erreichst du mich unter <a href="mailto:${mamaEmail}">${mamaEmail}</a> oder telefonisch.</p><p>Herzliche Grüße,<br/>Dani Sieck-Mitzloff</p>`
            };
        } else {
            functions.logger.warn(`Keine Kunden-E-Mail für Buchung ${bookingId} angegeben. Es wird keine Bestätigung gesendet.`);
        }

        // 3.3 E-Mails versenden
        try {
            functions.logger.log(`Sende Admin-Benachrichtigung an ${mamaEmail} für Buchung ${bookingId}...`);
            const infoAdmin = await transporter.sendMail(mailToAdmin);
            functions.logger.log('Admin-Benachrichtigung gesendet:', infoAdmin.messageId);

            if (mailToCustomer) {
                functions.logger.log(`Sende Kunden-Bestätigung an ${customerEmail} für Buchung ${bookingId}...`);
                const infoCustomer = await transporter.sendMail(mailToCustomer);
                functions.logger.log('Kunden-Bestätigung gesendet:', infoCustomer.messageId);
            }
        } catch (error) {
            functions.logger.error(`Fehler beim Senden der E-Mails für Buchung ${bookingId}:`, error);
        }
    });

// --- Funktion für Kontaktanfragen (unverändert) ---
exports.handleNewContactRequest = functions.region("europe-west1") // Optional: Region anpassen
    .firestore
    .document('kontaktanfragen/{anfragenId}')
    .onCreate(async (snap, context) => {
        const contactData = snap.data();
        const requestId = context.params.anfragenId;
        functions.logger.log(`Neue Kontaktanfrage (${requestId}):`, contactData);

        // --- E-Mail-Versand an Admin ---
        if (!transporter) {
            functions.logger.error('Nodemailer Transporter nicht verfügbar. Kann keine E-Mail für Kontaktanfrage senden.');
            return; // Beenden, wenn Transporter nicht initialisiert werden konnte
        }
        if (!emailUser) {
             functions.logger.error('E-Mail-Benutzer (Absender) nicht konfiguriert für Kontaktanfrage.');
             return;
        }

        // Daten extrahieren (mit Fallbacks)
        const senderName = contactData.name || 'Unbekannt';
        const senderEmail = contactData.email || 'Keine Angabe';
        const senderPhone = contactData.phone || 'Keine Angabe';
        const subject = contactData.subject || 'Kein Betreff';
        const message = contactData.message || 'Keine Nachricht';
        const adminEmail = 'info@dsm-kite.de'; // Feste Empfängeradresse //TODO: Auch über Config holen?

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
            functions.logger.log(`Sende Kontaktformular-Benachrichtigung an ${adminEmail} für Anfrage ${requestId}...`);
            const infoAdmin = await transporter.sendMail(mailToAdmin);
            functions.logger.log('Kontaktformular-Benachrichtigung gesendet:', infoAdmin.messageId);
        } catch (error) {
            functions.logger.error(`Fehler beim Senden der Kontaktformular-E-Mail für Anfrage ${requestId}:`, error);
        }
    });
