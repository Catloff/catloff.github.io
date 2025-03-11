/**
 * Test-Script für Strukturänderungen im CMS
 * 
 * Dieses Script erstellt Test-Sektionen in Firestore und ändert ihre Reihenfolge,
 * um die Funktionalität der Strukturänderungen zu testen.
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, updateDoc, getDocs, deleteDoc } = require('firebase/firestore');
const dotenv = require('dotenv');

// Umgebungsvariablen laden
dotenv.config();

// Firebase konfigurieren
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Firebase initialisieren
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test-Sektionen
const testSections = [
  {
    id: 'test-section-1',
    title: 'Testsektion 1',
    order: 0,
    visible: true,
    content: 'Inhalt der Testsektion 1'
  },
  {
    id: 'test-section-2',
    title: 'Testsektion 2',
    order: 1,
    visible: true,
    content: 'Inhalt der Testsektion 2'
  },
  {
    id: 'test-section-3',
    title: 'Testsektion 3',
    order: 2,
    visible: true,
    content: 'Inhalt der Testsektion 3'
  }
];

// Test-Sektionen erstellen
async function createTestSections() {
  console.log('Erstelle Test-Sektionen...');
  
  for (const section of testSections) {
    const { id, ...data } = section;
    await setDoc(doc(db, 'cms_sections', id), data);
    console.log(`Sektion "${section.title}" erstellt`);
  }
  
  console.log('Alle Test-Sektionen wurden erstellt.');
}

// Reihenfolge der Sektionen ändern
async function changeOrder() {
  console.log('Ändere Reihenfolge der Sektionen...');
  
  // Reihenfolge umkehren
  await updateDoc(doc(db, 'cms_sections', 'test-section-1'), { order: 2 });
  await updateDoc(doc(db, 'cms_sections', 'test-section-3'), { order: 0 });
  
  console.log('Reihenfolge geändert.');
}

// Sichtbarkeit einer Sektion ändern
async function toggleVisibility() {
  console.log('Ändere Sichtbarkeit einer Sektion...');
  
  await updateDoc(doc(db, 'cms_sections', 'test-section-2'), { visible: false });
  
  console.log('Sichtbarkeit geändert.');
}

// Aktuelle Sektionen anzeigen
async function listSections() {
  console.log('Aktuelle Sektionen:');
  
  const snapshot = await getDocs(collection(db, 'cms_sections'));
  const sections = [];
  
  snapshot.forEach(doc => {
    sections.push({ id: doc.id, ...doc.data() });
  });
  
  sections.sort((a, b) => a.order - b.order);
  
  sections.forEach(section => {
    console.log(`- ${section.title} (Reihenfolge: ${section.order}, Sichtbar: ${section.visible})`);
  });
}

// Test-Sektionen löschen
async function cleanupTestSections() {
  console.log('Lösche Test-Sektionen...');
  
  for (const section of testSections) {
    await deleteDoc(doc(db, 'cms_sections', section.id));
    console.log(`Sektion "${section.title}" gelöscht`);
  }
  
  console.log('Alle Test-Sektionen wurden gelöscht.');
}

// Hauptfunktion
async function runTest() {
  try {
    // Erstelle Test-Sektionen
    await createTestSections();
    
    // Zeige aktuelle Sektionen
    await listSections();
    
    // Warte kurz
    console.log('Warte 3 Sekunden...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Ändere Reihenfolge
    await changeOrder();
    
    // Zeige aktualisierte Sektionen
    await listSections();
    
    // Warte kurz
    console.log('Warte 3 Sekunden...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Ändere Sichtbarkeit
    await toggleVisibility();
    
    // Zeige aktualisierte Sektionen
    await listSections();
    
    // Warte kurz
    console.log('Warte 3 Sekunden...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Räume auf
    await cleanupTestSections();
    
    console.log('Test abgeschlossen.');
  } catch (error) {
    console.error('Fehler beim Testen:', error);
  } finally {
    process.exit(0);
  }
}

// Starte Test
runTest(); 