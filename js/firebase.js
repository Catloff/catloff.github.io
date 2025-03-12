// Firebase Konfiguration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

console.log('Initialisiere Firebase...');

// Debug: Überprüfen, ob Umgebungsvariablen existieren
console.log('FIREBASE_API_KEY existiert:', process.env.FIREBASE_API_KEY ? 'Ja' : 'Nein');
console.log('FIREBASE_AUTH_DOMAIN existiert:', process.env.FIREBASE_AUTH_DOMAIN ? 'Ja' : 'Nein');
console.log('FIREBASE_PROJECT_ID existiert:', process.env.FIREBASE_PROJECT_ID ? 'Ja' : 'Nein');
console.log('FIREBASE_STORAGE_BUCKET existiert:', process.env.FIREBASE_STORAGE_BUCKET ? 'Ja' : 'Nein');
console.log('FIREBASE_MESSAGING_SENDER_ID existiert:', process.env.FIREBASE_MESSAGING_SENDER_ID ? 'Ja' : 'Nein');
console.log('FIREBASE_APP_ID existiert:', process.env.FIREBASE_APP_ID ? 'Ja' : 'Nein');

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || 'API_KEY_FEHLT',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'AUTH_DOMAIN_FEHLT',
    projectId: process.env.FIREBASE_PROJECT_ID || 'PROJECT_ID_FEHLT',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'STORAGE_BUCKET_FEHLT',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || 'MESSAGING_SENDER_ID_FEHLT',
    appId: process.env.FIREBASE_APP_ID || 'APP_ID_FEHLT'
};

console.log('Firebase-Konfiguration:', { 
    ...firebaseConfig, 
    apiKey: firebaseConfig.apiKey === 'API_KEY_FEHLT' ? 'API_KEY_FEHLT' : '[HIDDEN]'
});

// Variablen für Export
let app = null;
let auth = null;
let db = null;
let storage = null;

try {
    app = initializeApp(firebaseConfig);
    console.log('Firebase App initialisiert');

    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    console.log('Firestore initialisiert');
} catch (error) {
    console.error('Fehler bei der Firebase-Initialisierung:', error);
}

// Export auf oberster Ebene
export { app, auth, db, storage }; 