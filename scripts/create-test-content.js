const admin = require('firebase-admin');
const serviceAccount = require('../mamas-kite-website-firebase-adminsdk-x0fgm-78a1ab79ed.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createTestContent() {
  try {
    // Test-Content erstellen
    await db.collection('cms_content').doc('test-section').set({
      title: 'Test Section',
      content: '<h2>Test Content</h2><p>Dies ist ein Test für die CMS-Synchronisation.</p>',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Test-Struktur erstellen
    await db.collection('cms_sections').doc('test-section').set({
      title: 'Test Section',
      order: 0,
      visible: true,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('Test-Content erfolgreich erstellt!');
    process.exit(0);
  } catch (error) {
    console.error('Fehler:', error);
    process.exit(1);
  }
}

createTestContent(); 