// Firebase Konfiguration
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

console.log('Initialisiere Firebase...');

const firebaseConfig = {
    apiKey: "AIzaSyDKbo3gONVWiATosdfXW3x6Eqy5k39qIcw",
    authDomain: "mamas-kite-website.firebaseapp.com",
    projectId: "mamas-kite-website",
    storageBucket: "mamas-kite-website.appspot.com",
    messagingSenderId: "492839282588",
    appId: "1:492839282588:web:d965b4c369f180e751ca59"
};

console.log('Firebase-Konfiguration:', { ...firebaseConfig, apiKey: '[HIDDEN]' });
const app = initializeApp(firebaseConfig);
console.log('Firebase App initialisiert');

const db = getFirestore(app);
console.log('Firestore initialisiert');

export { db }; 