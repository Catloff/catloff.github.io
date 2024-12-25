const admin = require('firebase-admin');
const serviceAccount = require('../mamas-kite-website-firebase-adminsdk-x0fgm-78a1ab79ed.json');

// Initialisiere Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

async function makeUserAdmin(email) {
    try {
        // Hole den Benutzer anhand der E-Mail-Adresse
        const user = await admin.auth().getUserByEmail(email);
        
        // Setze die Admin-Rolle
        await admin.auth().setCustomUserClaims(user.uid, {
            admin: true
        });
        
        console.log(`Erfolg! ${email} ist jetzt ein Administrator.`);
    } catch (error) {
        console.error('Fehler beim Setzen der Admin-Rolle:', error);
    }
}

// Admin E-Mail-Adresse
const adminEmail = 'yannik.mitzloff@gmail.com';

makeUserAdmin(adminEmail); 