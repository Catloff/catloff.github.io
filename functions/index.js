const functions = require('firebase-functions');
const admin = require('firebase-admin');
const fetch = require('node-fetch');

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

// GitHub Repository Konfiguration
const GITHUB_REPO = 'yannik-mitzloff/mamas-kite-website';
const GITHUB_API = 'https://api.github.com';

// Funktion zum Triggern der GitHub Action
async function triggerGitHubAction(token) {
    try {
        const response = await fetch(`${GITHUB_API}/repos/${GITHUB_REPO}/dispatches`, {
            method: 'POST',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_type: 'firebase-content-update',
                client_payload: {
                    timestamp: new Date().toISOString()
                }
            })
        });

        if (!response.ok) {
            throw new Error(`GitHub API responded with status ${response.status}`);
        }

        console.log('GitHub Action erfolgreich getriggert');
        return true;
    } catch (error) {
        console.error('Fehler beim Triggern der GitHub Action:', error);
        throw error;
    }
}

// Überwache Änderungen in der CMS-Collection
exports.onCmsContentChange = functions.firestore
    .document('cms_content/{contentId}')
    .onWrite(async (change, context) => {
        try {
            const githubToken = functions.config().github.token;
            await triggerGitHubAction(githubToken);
        } catch (error) {
            console.error('Fehler in onCmsContentChange:', error);
        }
    });

// Überwache Änderungen in der Seitenstruktur
exports.onStructureChange = functions.firestore
    .document('cms_sections/{sectionId}')
    .onWrite(async (change, context) => {
        try {
            const githubToken = functions.config().github.token;
            await triggerGitHubAction(githubToken);
        } catch (error) {
            console.error('Fehler in onStructureChange:', error);
        }
    });

// Überwache Bildänderungen
exports.onStorageChange = functions.storage
    .object()
    .onFinalize(async (object) => {
        if (!object.name.startsWith('images/')) {
            return null;
        }

        try {
            const githubToken = functions.config().github.token;
            await triggerGitHubAction(githubToken);
        } catch (error) {
            console.error('Fehler in onStorageChange:', error);
        }
    });

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