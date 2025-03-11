/**
 * Firebase Content Sync Script
 * Dieses Script synchronisiert Inhalte von Firebase in das Repository
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Firebase Admin SDK initialisieren
let serviceAccount;
try {
    // Versuche, die Dienstkonto-JSON-Datei direkt zu lesen
    serviceAccount = require('../mamas-kite-website-firebase-adminsdk-x0fgm-78a1ab79ed.json');
} catch (error) {
    // Fallback: Verwende die Umgebungsvariable
    console.log('Dienstkonto aus JSON-Datei konnte nicht geladen werden, verwende Umgebungsvariable');
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } else {
        console.error('Keine Firebase-Dienstkonto-Informationen gefunden!');
        process.exit(1);
    }
}

// Firebase initialisieren
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.firestore();
const contentDir = path.join(__dirname, '../content');

// Stelle sicher, dass das Inhaltsverzeichnis existiert
if (!fs.existsSync(contentDir)) {
    fs.mkdirSync(contentDir, { recursive: true });
    console.log(`Verzeichnis "${contentDir}" erstellt`);
}

async function syncContent() {
    console.log('Starte Synchronisierung von Firebase...');

    try {
        // Sektionen abrufen
        const sectionsSnapshot = await db.collection('sections').get();
        
        // Speichere alle Sektionen in einer JSON-Datei
        const sections = [];
        sectionsSnapshot.forEach(doc => {
            sections.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Nach Position sortieren
        sections.sort((a, b) => a.position - b.position);
        
        // In Datei schreiben
        fs.writeFileSync(
            path.join(contentDir, 'sections.json'), 
            JSON.stringify(sections, null, 2)
        );
        console.log('Sektionen erfolgreich synchronisiert');

        // Inhalte abrufen
        const contentsSnapshot = await db.collection('contents').get();
        
        const contents = {};
        contentsSnapshot.forEach(doc => {
            contents[doc.id] = doc.data();
        });
        
        // In Datei schreiben
        fs.writeFileSync(
            path.join(contentDir, 'contents.json'), 
            JSON.stringify(contents, null, 2)
        );
        console.log('Inhalte erfolgreich synchronisiert');

        // Versionsinfo für die Synchronisierung speichern
        const versionInfo = {
            lastSync: new Date().toISOString(),
            totalSections: sections.length,
            totalContents: Object.keys(contents).length
        };
        
        fs.writeFileSync(
            path.join(contentDir, 'version.json'), 
            JSON.stringify(versionInfo, null, 2)
        );
        
        console.log('Synchronisierung abgeschlossen!');
    } catch (error) {
        console.error('Fehler bei der Synchronisierung:', error);
        process.exit(1);
    }
}

// Führe die Synchronisierung aus
syncContent(); 