const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// E-Mail-Funktionalität wird später implementiert
/*
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
        user: functions.config().email.user,
        pass: functions.config().email.pass
    }
});
*/

// Funktion zum Speichern der Buchung
exports.handleNewBooking = functions.firestore
    .document('buchungen/{bookingId}')
    .onCreate(async (snap, context) => {
        const booking = snap.data();
        
        try {
            // Aktualisiere den Buchungsstatus
            await snap.ref.update({
                status: 'confirmed',
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('Buchung erfolgreich gespeichert:', context.params.bookingId);
        } catch (error) {
            console.error('Fehler bei der Buchungsverarbeitung:', error);
        }
    });

// E-Mail-Funktionen werden später implementiert
/*
exports.sendBookingConfirmation = ...
exports.sendAdminNotification = ...
exports.sendBookingReminders = ...
*/ 