const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('../mamas-kite-website-firebase-adminsdk-x0fgm-78a1ab79ed.json');

// Initialisiere Firebase Admin
const app = initializeApp({
    credential: cert(serviceAccount)
});

const auth = getAuth(app);
const db = getFirestore(app);

// Liste der E-Mail-Adressen, die zu Admins gemacht werden sollen
const adminEmails = [
    'yannik.mitzloff@gmail.com',
    'dani.sm@gmx.de'
];

async function makeAdmins() {
    try {
        // Hole alle Benutzer
        const userRecords = await Promise.all(
            adminEmails.map(email => auth.getUserByEmail(email))
        );

        // Erstelle Firestore-Einträge für jeden Admin
        const batch = db.batch();
        
        for (const user of userRecords) {
            console.log(`Verarbeite Benutzer: ${user.email}`);
            
            // Setze Custom Claims für Firebase Auth
            await auth.setCustomUserClaims(user.uid, { admin: true });
            console.log(`Admin-Rechte in Auth gesetzt für: ${user.email}`);
            
            // Erstelle/Aktualisiere Firestore-Dokument
            const userRef = db.collection('users').doc(user.uid);
            batch.set(userRef, {
                email: user.email,
                isAdmin: true,
                updatedAt: new Date()
            }, { merge: true });
            
            console.log(`Firestore-Dokument vorbereitet für: ${user.email}`);
        }

        // Führe alle Firestore-Updates auf einmal aus
        await batch.commit();
        console.log('Alle Änderungen erfolgreich durchgeführt!');

    } catch (error) {
        console.error('Fehler beim Setzen der Admin-Rechte:', error);
    } finally {
        process.exit();
    }
}

makeAdmins(); 