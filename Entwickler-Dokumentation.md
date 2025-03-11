# KiTE® Method CMS - Entwickler-Dokumentation

## Inhaltsverzeichnis
1. [Systemübersicht](#systemübersicht)
2. [Architektur](#architektur)
3. [Datenmodell](#datenmodell)
4. [Firebase-Setup](#firebase-setup)
5. [Cloud Functions](#cloud-functions)
6. [GitHub-Integration](#github-integration)
7. [Frontend-Implementierung](#frontend-implementierung)
8. [Lokale Entwicklung](#lokale-entwicklung)
9. [Deployment](#deployment)
10. [Fehlerbehebung](#fehlerbehebung)

## Systemübersicht

Das Content Management System (CMS) für die KiTE® Method Website ermöglicht die einfache Verwaltung von Inhalten ohne technische Kenntnisse. Es besteht aus folgenden Hauptkomponenten:

- **Admin-Dashboard**: Benutzeroberfläche für die Inhaltsverwaltung
- **Firebase-Backend**: Datenbank, Authentifizierung und serverseitige Logik
- **Synchronisations-Mechanismus**: Bidirektionale Synchronisation zwischen Firebase und GitHub
- **Deployment-Pipeline**: Automatische Veröffentlichung von Änderungen

## Architektur

```
+------------------+     +-----------------+     +------------------+
|                  |     |                 |     |                  |
|  Admin-Interface +---->+  Firebase       +---->+  GitHub Actions  |
|  (Browser)       |     |  (Backend)      |     |  (CI/CD)         |
|                  |     |                 |     |                  |
+------------------+     +--------+--------+     +--------+---------+
                                 |                        |
                                 v                        v
                         +-------+--------+      +--------+---------+
                         |                |      |                  |
                         |  Firestore DB  |      |  GitHub          |
                         |  Firebase      |      |  Repository      |
                         |  Storage       |      |                  |
                         |                |      |                  |
                         +----------------+      +------------------+
                                                          |
                                                          v
                                                 +--------+---------+
                                                 |                  |
                                                 |  Website         |
                                                 |  (Öffentliche    |
                                                 |   Ansicht)       |
                                                 |                  |
                                                 +------------------+
```

Die Architektur basiert auf dem Prinzip der bidirektionalen Synchronisation. Änderungen im CMS werden in Firestore gespeichert und durch Cloud Functions automatisch mit dem GitHub-Repository synchronisiert. GitHub Actions deployen diese Änderungen dann zur Website.

## Datenmodell

### Firestore-Struktur

```
firestore/
├── cms_content/
│   ├── {contentId}/
│   │   ├── title: String
│   │   ├── content: String
│   │   ├── lastModified: Timestamp
│   │   ├── createdBy: String
│   │   └── versions: Array<Object>
│   │       ├── content: String
│   │       ├── timestamp: Timestamp
│   │       └── author: String
│   └── ...
├── cms_sections/
│   ├── {sectionId}/
│   │   ├── title: String
│   │   ├── order: Number
│   │   ├── visible: Boolean
│   │   └── content: String
│   └── ...
├── cms_media/
│   ├── {mediaId}/
│   │   ├── title: String
│   │   ├── url: String
│   │   ├── type: String
│   │   ├── size: Number
│   │   ├── uploadDate: Timestamp
│   │   └── uploadedBy: String
│   └── ...
├── bookings/
│   └── ...
└── users/
    └── ...
```

### Firebase Storage

```
storage/
├── images/
│   ├── {imageId}.jpg
│   ├── {imageId}.png
│   └── ...
└── backups/
    ├── {date}_content_backup.json
    └── ...
```

## Firebase-Setup

### Erforderliche Firebase-Dienste

1. **Firebase Authentication**: Für Admin-Zugang
2. **Firestore Database**: Für Speicherung der CMS-Daten
3. **Firebase Storage**: Für Bilderverwaltung
4. **Firebase Functions**: Für serverseitige Logik und GitHub-Integration
5. **Firebase Hosting**: Für Bereitstellung der Website

### Sicherheitsregeln

Die Sicherheitsregeln in `firestore.rules` und `storage.rules` stellen sicher, dass nur authentifizierte Administratoren Inhalte bearbeiten können.

Beispiel aus `firestore.rules`:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Authentifizierungscheck
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Admin-Check
    function isAdmin() {
      return isAuthenticated() && 
             request.auth.token.email_verified && 
             exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // CMS-Inhalte
    match /cms_content/{contentId} {
      allow read: if true;  // Öffentlich lesbar
      allow write: if isAdmin();  // Nur Admins dürfen schreiben
    }

    // CMS-Sektionen
    match /cms_sections/{sectionId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Weitere Regeln...
  }
}
```

## Cloud Functions

Die folgenden Firebase Functions sind implementiert:

### onCmsContentChange

Überwacht Änderungen an CMS-Inhalten in Firestore und löst bei einer Änderung eine GitHub Action aus.

```javascript
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
```

### onStructureChange

Überwacht Änderungen an der Seitenstruktur und löst bei einer Änderung eine GitHub Action aus.

```javascript
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
```

### onStorageChange

Überwacht Uploads und Löschungen in Firebase Storage und löst bei Bildänderungen eine GitHub Action aus.

```javascript
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
```

### handleNewBooking

Verarbeitet neue Buchungen und sendet Bestätigungsmails.

```javascript
exports.handleNewBooking = functions.firestore
    .document('bookings/{bookingId}')
    .onCreate(async (snap, context) => {
        const bookingData = snap.data();
        
        // Implementierung der E-Mail-Benachrichtigung
        // (nach Domain-Einrichtung aktivieren)
    });
```

## GitHub-Integration

### Repository-Struktur

Das GitHub-Repository enthält den gesamten Website-Code und wird über GitHub Actions automatisch mit Firebase synchronisiert.

### GitHub Actions

#### Firebase-Sync Workflow

Die Datei `.github/workflows/firebase-sync.yml` definiert den Workflow für die Synchronisation von Firebase zu GitHub:

```yaml
name: Firebase CMS Sync

on:
  repository_dispatch:
    types: [firebase-content-update]

jobs:
  sync-content:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      # Weitere Schritte zur Content-Synchronisation...
```

#### Deployment Workflow

Die Datei `.github/workflows/deploy.yml` definiert den Deployment-Prozess von GitHub Pages:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main
      - CMS  # Auch für den CMS-Branch aktiviert

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      # Weitere Schritte für Build und Deployment...
```

## Frontend-Implementierung

### Admin-Dashboard

Das Admin-Dashboard wird in `admin.html` und `js/admin.js` implementiert. Es bietet folgende Funktionen:

- Authentifizierung mit Firebase Auth
- WYSIWYG-Editor (TinyMCE) für Textbearbeitung
- Bildupload-Funktionen
- Drag & Drop für Strukturänderungen
- Versionsverwaltung
- Live-Vorschau

### Drag & Drop für Strukturänderungen

Die Implementierung des Drag & Drop für Strukturänderungen verwendet native Browser-Funktionen:

```javascript
initializeDragAndDrop() {
    const sectionOrder = document.querySelector('.section-order');
    const items = sectionOrder.querySelectorAll('.section-item');

    items.forEach(item => {
        item.addEventListener('dragstart', () => {
            item.classList.add('dragging');
        });

        item.addEventListener('dragend', () => {
            item.classList.remove('dragging');
            this.updateSectionOrder();
        });
    });

    sectionOrder.addEventListener('dragover', e => {
        e.preventDefault();
        const draggingItem = document.querySelector('.dragging');
        const siblings = [...sectionOrder.querySelectorAll('.section-item:not(.dragging)')];
        const nextSibling = siblings.find(sibling => {
            const box = sibling.getBoundingClientRect();
            return e.clientY <= box.top + box.height / 2;
        });

        sectionOrder.insertBefore(draggingItem, nextSibling);
    });
}
```

## Lokale Entwicklung

### Voraussetzungen

- Node.js (Version 18 oder höher)
- npm
- Firebase CLI
- Git

### Setup

1. Repository klonen:
   ```bash
   git clone https://github.com/yourusername/kite-method-website.git
   cd kite-method-website
   ```

2. Abhängigkeiten installieren:
   ```bash
   npm install
   ```

3. Umgebungsvariablen einrichten:
   - Kopiere `.env.example` zu `.env`
   - Fülle die Firebase-Konfiguration und andere notwendige Werte aus

4. Entwicklungsserver starten:
   ```bash
   npm start
   ```

5. Firebase-Emulator starten (für lokales Testing der Cloud Functions):
   ```bash
   firebase emulators:start
   ```

## Deployment

### Manuelles Deployment

1. Build erstellen:
   ```bash
   npm run build
   ```

2. Zu Firebase deployen:
   ```bash
   firebase deploy
   ```

### Automatisches Deployment

Das automatische Deployment wird durch GitHub Actions gesteuert. Es wird ausgelöst durch:

1. Pushes zum `main`- oder `CMS`-Branch
2. Änderungen in Firestore durch das CMS (via Cloud Functions)

## Fehlerbehebung

### Häufige Probleme

1. **Cloud Functions werden nicht ausgelöst**
   - Prüfe, ob der Blaze-Plan für Firebase aktiviert ist
   - Überprüfe die Cloud Functions-Logs in der Firebase Console

2. **GitHub Action wird nicht ausgelöst**
   - Stelle sicher, dass das GitHub-Token korrekt konfiguriert ist
   - Überprüfe die Repository-Berechtigungen für das Token

3. **Änderungen werden nicht synchronisiert**
   - Überprüfe die Firestore-Sicherheitsregeln
   - Stelle sicher, dass die bidirektionale Synchronisation korrekt konfiguriert ist

4. **Deployment schlägt fehl**
   - Überprüfe die GitHub Actions-Logs
   - Stelle sicher, dass alle Umgebungsvariablen korrekt konfiguriert sind

### Debugging

1. Aktiviere ausführliche Logging-Funktionen in den Cloud Functions:
   ```javascript
   console.log('Detaillierte Debugging-Informationen:', {
     data: snap.data(),
     context: context,
     timestamp: new Date().toISOString()
   });
   ```

2. Nutze den Firebase-Emulator für lokales Testing:
   ```bash
   firebase emulators:start
   ```

---

Diese Dokumentation wird kontinuierlich aktualisiert, um alle Aspekte des CMS abzudecken. 