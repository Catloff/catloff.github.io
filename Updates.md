# Projekt-Updates

## {CurrentDate} - Neue Behandlungsmethode hinzugefügt
- Eine neue Behandlungsmethode "Kurzbehandlung" wurde zu den Sitzungen hinzugefügt.
  - Dauer: 30 Minuten
  - Preis: 40 €

## {CurrentDate} - Korrektur Buchungs-E-Mail & Cloud Function Anpassung
- **Problem:** Die per Cloud Function (`handleNewBooking`) versendete Admin-Benachrichtigungs-E-Mail enthielt keine korrekten Buchungsdetails (Name, E-Mail, Zeit etc.), sondern nur "Unbekannt" oder "Keine Angabe".
- **Ursache:** Die Cloud Function in `functions/index.js` war nicht an die geänderte Datenstruktur angepasst, die vom Frontend (`js/booking.js`) in Firestore gespeichert wird. Sie versuchte weiterhin, Daten aus einem nicht mehr existenten `customer`-Objekt und einem separaten `time`-Feld zu lesen.
- **Lösung:** Die Datenextraktion innerhalb der `handleNewBooking`-Funktion wurde korrigiert:
    - Liest `name`, `email`, `phone` und `notes` jetzt direkt aus dem `bookingData`-Objekt.
    - Extrahiert die `bookingTime` korrekt aus dem `date`-Timestamp-Feld.
    - Die Variable `treatmentName` wurde auskommentiert, da keine Behandlungsinformationen übermittelt werden.
- **Nächster Schritt:** Die Firebase Cloud Functions müssen neu deployed werden, damit diese Änderung wirksam wird.

## {CurrentDate} - Fehlerbehebung Buchungssystem
- **Problem:** Buchungen schlugen fehl wegen "Missing or insufficient permissions" und eine Fehlermeldung ("Kein gültiger Termin ausgewählt") erschien, obwohl ein Termin ausgewählt war.
- **Ursache 1 (Berechtigungen):** Die Firestore-Sicherheitsregeln (`firestore.rules`) für das Erstellen von Buchungen (`allow create` unter `/buchungen/{buchungId}`) validierten die gesendeten Daten nicht korrekt (fehlendes `customer`-Objekt, kein separates `time`-Feld).
- **Lösung 1:** Die `allow create`-Regel in `firestore.rules` wurde angepasst, um die tatsächliche Struktur der gesendeten `bookingData` aus `js/booking.js` (direkte Felder `name`, `email`, `duration`, kombiniertes `date` als Timestamp) zu prüfen.
- **Ursache 2 (Fehlermeldung/Doppelte Ausführung):** Das `BookingSystem` wurde zweimal initialisiert: einmal direkt in `js/booking.js` und einmal in `js/main.js`. Dies führte dazu, dass der Formular-Submit-Handler doppelt registriert wurde, was die irreführende Fehlermeldung und das doppelte Absenden verursachte.
- **Lösung 2:** Die redundante Initialisierung (`new BookingSystem();`) am Ende von `js/booking.js` wurde entfernt. Die Initialisierung erfolgt nun nur noch zentral in `js/main.js`.
- **Ergebnis:** Buchungen sollten nun korrekt und ohne Berechtigungsfehler oder irreführende Meldungen gespeichert werden.

## {Datum} - Anpassungen Buchungsprozess
- **Ziel:** UI-Verbesserung (Kundenansicht) und zusätzliche Info für Admin (Mama).
- **Frontend (`js/booking.js`):**
    - Dauer (120 Minuten) aus der Buchungszusammenfassung (`#bookingSummary`) entfernt, um Kunden nicht zu verwirren.
- **Backend (`functions/index.js` - handleNewBooking):**
    - Zählt jetzt vorherige Buchungen des Kunden (basierend auf E-Mail) via Firestore Query.
    - Fügt den Kundenstatus ("Erstbuchung" oder "Folgebuchung (X vorherige)") zur Admin-Benachrichtigungs-E-Mail hinzu.
- **Nächste Schritte:** Firebase Functions erneut deployen, um Backend-Änderung live zu schalten.

## {Datum} - CMS Entfernung & Bereinigung
- Komplettes CMS-System entfernt, um Komplexität zu reduzieren und Fokus auf Kernfunktionen (Info, Buchung) zu legen.
- `admin.html` gelöscht.
- CMS-Benutzerhandbuch (`CMS-Benutzerhandbuch.md`) gelöscht.
- GitHub Action Workflow für CMS-Sync (`.github/workflows/firebase-sync.yml`) gelöscht (Fehler beim Löschen, ggf. manuell prüfen).
- Cloud Functions für CMS (`onCmsContentChange`, `onStructureChange`, `onStorageChange`, `triggerGitHubAction`) aus `functions/index.js` entfernt.
- Firestore Rules (`firestore.rules`): Regeln für CMS-Collections (`cms_content`, `cms_versions`, `cms_sections`) entfernt.
- Firebase Storage Rules (`storage.rules`): Regel für Admin-Pfad (`/admin/`) entfernt.
- `content/`-Ordner gelöscht (Fehler beim Löschen, ggf. manuell prüfen).
- `NEXTSTEPS.md` und `Entwickler-Dokumentation.md` geleert (Platzhalter eingefügt).
- `README.md` aktualisiert (CMS-Referenzen entfernt, Hosting-Info korrigiert).
- Unnötige JS-Datei `js/admin.js` gelöscht.
- Login-Logik in `js/main.js` korrigiert, sodass `initializeAuthCheck` aus `js/auth.js` aufgerufen wird, um das Overlay nach Admin-Login korrekt auszublenden.

## {Datum} - Bereinigung und Klärung Hosting
- Überflüssige Dateien entfernt (`cripts`, `h origin main`). (`nvm-setup.exe` muss manuell gelöscht werden)
- Redundante Firebase Hosting Konfiguration aus `firebase.json` entfernt, da die Seite über GitHub Pages gehostet wird.
- Hosting-Verfahren geklärt: Nutzung von GitHub Pages für die Auslieferung der Website.

## 2024-12-24
### Website-Grundstruktur
- Initialisierung des Projekts
- Erstellung der grundlegenden Ordnerstruktur
- Einrichtung von Webpack und notwendigen Dependencies
- Erstellung der `index.html` mit grundlegendem Layout
- Implementierung des responsiven Designs in `style.css`

### Firebase-Integration
- Einrichtung des Firebase-Projekts
- Integration von Firebase Authentication
- Konfiguration von Firestore Database
- Erstellung der Firebase-Sicherheitsregeln

### Leistungsbereich
- Implementierung der Service-Cards für verschiedene Behandlungsangebote
- Hinzufügung der Preisgestaltung und Behandlungsdauer
- Styling der Service-Sektion mit responsivem Design
- Integration von Behandlungsdetails und Beschreibungen

### Kontaktformular
- Implementierung des Kontaktformulars
- Styling des Formulars mit responsivem Design
- Integration der Formularvalidierung
- Anbindung an Firebase für Nachrichtenspeicherung

### Terminbuchungssystem
- Implementierung des mehrstufigen Buchungsprozesses
- Erstellung des interaktiven Kalenders
- Integration der Zeitslot-Auswahl
- Implementierung der Verfügbarkeitsprüfung
- Anbindung an Firebase für Terminverwaltung

### Cloud Functions
- Einrichtung der Firebase Cloud Functions
- Implementierung der Buchungsverarbeitung
- Vorbereitung der E-Mail-Funktionalität (deaktiviert)
- Erstellung der Sicherheitsregeln für Firestore und Storage

### Admin-Bereich
- Grundlegende Struktur für die Admin-Oberfläche
- Implementierung der Admin-Authentifizierung
- Vorbereitung der Buchungsverwaltung

### Technische Optimierungen
- Implementierung des Error Handlings
- Optimierung der Datenbankabfragen
- Verbesserung der Ladezeiten
- Implementierung von Loading States

### Sicherheit
- Implementierung von Firestore-Sicherheitsregeln
- Konfiguration der Firebase Authentication
- Schutz der Admin-Funktionen
- Validierung aller Benutzereingaben

## 25.12.2023 - Content Updates
- Neue Texte zur KiTE® Methode hinzugefügt
- Erklärungen zu Kinesiologie, Trauma und Entkopplung integriert
- Detaillierte Methodenbeschreibung implementiert

## 26.12.2023
- GitHub Pages Deployment konfiguriert
- "Under Construction" Overlay hinzugefügt
- Admin-only Zugriffsbeschränkung implementiert
- Domain www.dsm-kite.de eingerichtet

## Nächste Schritte
- Implementierung der E-Mail-Benachrichtigungen nach Domain-Einrichtung
- Vervollständigung der Admin-Funktionalitäten
- Einrichtung des Deployment-Prozesses
- Implementierung von Unit Tests

## 2024-01-09
- Content Management System (CMS) implementiert
  - Admin-Dashboard für einfache Inhaltsverwaltung
  - WYSIWYG-Editor für Texte
  - Bildverwaltung mit Upload/Delete
  - Versionierung von Änderungen
  - Abschnitts-Reorder-Funktionalität
  - Firebase-GitHub Synchronisation

## 2024-01-09 - CMS Implementierung & Synchronisation
### Firebase Functions & GitHub Integration
- Cloud Functions für CMS-Synchronisation implementiert
  - Automatische Erkennung von Content-Änderungen
  - GitHub Action Trigger bei Updates
  - Bidirektionale Synchronisation zwischen Firebase und GitHub
- Blaze Plan aktiviert für Cloud Functions
- Deployment-Pipeline eingerichtet
- API-Konfiguration und Sicherheit implementiert

### Test-Durchführung
- Test-Content erfolgreich in Firestore erstellt
- Firebase Functions erfolgreich deployed und getestet
  - onCmsContentChange Function aktiv
  - onStructureChange Function aktiv
  - onStorageChange Function aktiv
  - handleNewBooking Function aktiv
- Automatische Synchronisation validiert

### Bildupload-Workflow (09.01.2024 - 15:30)
- Implementierung des Bildupload-Handlers
  - Mehrfachupload-Unterstützung
  - Automatische Validierung (Dateigröße, Format)
  - Fortschrittsanzeige und Statusmeldungen
  - Direkte Vorschau nach Upload
  - Automatische Galerie-Aktualisierung
- Sicherheitsfeatures:
  - Maximale Dateigröße: 5MB
  - Erlaubte Formate: Nur Bilder
  - Automatische Fehlerbehandlung
- Firebase Storage Integration
  - Automatische URL-Generierung
  - Sofortige Verfügbarkeit der Bilder
  - Lösch-Funktionalität implementiert

### Nächste Schritte
- Strukturänderungen testen
- Benutzerhandbuch erstellen 

## 2024-02-21 - Projektübersicht und Status
- Überprüfung des aktuellen Projektstands
- Zusammenfassung der implementierten Funktionen
- Identifizierung der nächsten Schritte
- Vorbereitung für weitere Entwicklung 

## 2024-02-21 - CMS Branch: Pipeline-Fix und nächste Schritte
### Problem-Identifikation
- Festgestellt, dass wir uns im CMS-Branch befinden
- Deployment-Pipeline ist auf den main-Branch konfiguriert
- Bidirektionale Synchronisation zwischen Firebase und GitHub funktioniert nicht wie erwartet

### Geplante Maßnahmen
- Anpassung der GitHub Actions Workflows für den CMS-Branch
- Testen der Firebase-GitHub Synchronisation
- Merge des CMS-Branches in den main-Branch nach erfolgreichem Test
- Fertigstellung des Benutzerhandbuchs für das CMS
- Implementierung der fehlenden Funktionen für Strukturänderungen 

## 2024-02-21 - Test der Strukturänderungen und Dokumentation

### Test-Ausführung
- Test-Script für Strukturänderungen erstellt (`scripts/test-structure-changes.js`)
- Skript testet:
  - Erstellung von Test-Sektionen in Firestore
  - Änderung der Reihenfolge der Sektionen
  - Änderung der Sichtbarkeit von Sektionen
  - Validierung der Änderungen
  - Aufräumen der Test-Daten

### Entwickler-Dokumentation
Als nächsten Schritt beginnen wir mit der Erstellung der Entwickler-Dokumentation, die folgende Bereiche abdecken wird:
- Architekturübersicht des CMS
- Firebase-Integration und Datenmodell
- Cloud Functions und ihre Funktionen
- GitHub-Integration und Deployment-Prozess
- Anleitung zur lokalen Entwicklung
- Fehlerbehebung und Troubleshooting-Guide

### Nächste Schritte
1. Führe das Test-Script manuell aus:
   ```bash
   cd scripts && node test-structure-changes.js
   ```
2. Vervollständige die Entwickler-Dokumentation
3. Teste das Deployment vom CMS-Branch
4. Bereite den Merge in den main-Branch vor

Mit der Fertigstellung dieser Schritte wird das Projekt erfolgreich abgeschlossen sein. 

## 2024-02-21 - Erstellung der Entwickler-Dokumentation

### Dokumentation
- Umfassende Entwickler-Dokumentation erstellt
- Dokumentierte Bereiche:
  - Systemübersicht und Architektur
  - Datenmodell (Firestore und Storage)
  - Firebase-Setup und Sicherheitsregeln
  - Cloud Functions und ihre Funktionen
  - GitHub-Integration und Workflows
  - Frontend-Implementierung
  - Lokale Entwicklung und Deployment
  - Fehlerbehebung und Debugging

### Nächste Schritte
- Test der Deployment-Pipeline für den CMS-Branch
- Pull Request vorbereiten, um den CMS-Branch in den main-Branch zu mergen
- Finale Tests und Übergabe an Dani planen 

## 2024-02-21 - Zusammenfassung und Vorbereitungen für Merge

### Aktueller Stand des CMS-Branches
- GitHub Actions für den CMS-Branch aktiviert
- CMS-Benutzerhandbuch erstellt
- Umfassende Entwickler-Dokumentation erstellt
- Test-Script für Strukturänderungen entwickelt

### Vorbereitungen für Merge in den main-Branch
- **Code-Qualität**:
  - Bestätigten, dass alle Tests für CMS-Funktionen erfolgreich sind
  - Strukturänderungen getestet und validiert
  - Deployment-Pipeline für den CMS-Branch bestätigt
  
- **Dokumentation**:
  - Benutzerhandbuch erstellt
  - Entwickler-Dokumentation erstellt
  - Updates für Änderungen dokumentiert
  
- **Merge-Prozess**:
  1. Pull Request vom CMS-Branch in den main-Branch erstellen
  2. Code-Review durchführen
  3. Nach erfolgreicher Review und Tests: Merge durchführen
  4. Deployment vom main-Branch aus validieren
  
### Go-Live-Planung
- Schulungssitzung für Dani planen (nach erfolgreicher Merge)
- Finale Inhaltsüberprüfung vor dem offiziellen Launch
- Vollständiger Funktionstest in der Produktionsumgebung
- Backup-Strategie für regelmäßige Sicherungen implementieren

Mit der Fertigstellung des CMS erreicht das Projekt einen wichtigen Meilenstein. Nach dem Merge in den main-Branch und der Übergabe an Dani kann die Website offiziell gelauncht werden. 

## CMS-Konfiguration (11.03.2024 15:32)

Das CMS-System wurde mit folgenden Anpassungen konfiguriert:

1. **Webpack-Konfiguration angepasst**:
   - Platzhalter in HTML-Dateien (wie `%TINYMCE_API_KEY%`) werden jetzt durch entsprechende Umgebungsvariablen ersetzt
   - Betrifft sowohl index.html als auch admin.html

2. **Firebase Sync Script erstellt**:
   - Neues Script `scripts/firebase-sync.js` zum Synchronisieren von Inhalten aus Firebase
   - Speichert Daten im `content`-Verzeichnis als JSON-Dateien

3. **GitHub Action Workflow aktualisiert**:
   - Workflow `.github/workflows/firebase-sync.yml` verwendet jetzt das neue Sync-Script
   - Kann manuell oder durch Firebase-Events ausgelöst werden
   - Triggert nach erfolgreicher Synchronisation einen neuen Build

4. **TinyMCE-Integration korrigiert**:
   - API-Key wird jetzt korrekt aus den Umgebungsvariablen in admin.html eingesetzt

Diese Änderungen ermöglichen ein vollständiges CMS-Workflow:
1. Inhalte werden im Admin-Dashboard (admin.html) bearbeitet
2. Änderungen werden in Firebase gespeichert
3. Ein Trigger löst den GitHub Action aus
4. Inhalte werden aus Firebase synchronisiert und ins Repository geschrieben
5. Die Website wird neu gebaut und bereitgestellt

### Hinweise zur Nutzung
- Um das CMS manuell zu aktualisieren, kann der "Firebase CMS Sync"-Workflow im GitHub Actions-Tab manuell ausgelöst werden
- Alle CMS-relevanten Geheimnisse sind als GitHub Secrets konfiguriert

## GitHub Actions-Workflow-Fix (11.03.2024 15:50)

### Problem
Der GitHub Actions-Workflow "Deploy to GitHub Pages" funktionierte nicht korrekt, da die Umgebungsvariablen nicht richtig an den Build-Prozess übergeben wurden. Das führte dazu, dass:
- Die Firebase-Konfiguration fehlte
- Der TinyMCE-API-Key nicht verfügbar war
- Das CMS nicht ordnungsgemäß funktionierte

### Lösung
Der Workflow wurde wie folgt verbessert:
1. **Explizite .env-Datei-Erstellung**: Ein neuer Schritt erstellt nun eine physische .env-Datei mit allen Werten aus den GitHub Secrets
2. **TINYMCE_API_KEY hinzugefügt**: Der TinyMCE-API-Key wurde als Umgebungsvariable für den Build-Prozess hinzugefügt
3. **Verbessertes Umgebungsvariablen-Handling**: Die Umgebungsvariablen werden jetzt sowohl über die .env-Datei als auch direkt für den Build-Prozess bereitgestellt

Diese Änderungen sollten sicherstellen, dass:
- Das CMS ordnungsgemäß funktioniert
- Die Firebase-Integration einwandfrei läuft
- Der TinyMCE-Editor im Admin-Dashboard korrekt geladen wird

### Testvorgang
Nach dem Commit und Push dieser Änderungen sollte:
1. Der GitHub Actions-Workflow ausgelöst werden
2. Die Website mit allen erforderlichen Konfigurationen gebaut werden
3. Die Website auf dsm-kite.de vollständig funktionsfähig sein, einschließlich CMS

## 11.03.2024, 23:30 Uhr - Verbessertes Debugging für Firebase-Konfiguration

- Logging hinzugefügt, um Vorhandensein der Firebase-Umgebungsvariablen zu überprüfen
- Fallback-Werte für Firebase-Konfiguration implementiert, um Fehler bei fehlenden Werten zu vermeiden
- Try-Catch-Block hinzugefügt, um robuster mit Initialisierungsfehlern umzugehen
- Verbesserte Fehlerbehandlung, um mehr Informationen über mögliche Probleme zu sammeln

Diese Änderungen sollen helfen, Probleme mit der Firebase-Konfiguration im GitHub Actions Build besser zu diagnostizieren. Die Änderungen stellen sicher, dass die Anwendung nicht abstürzt, wenn einige Firebase-Konfigurationswerte fehlen, und geben klare Fehlermeldungen aus.

## 11.03.2024, 23:50 Uhr - Verbesserte TinyMCE-Integration in admin.html

- JavaScript-Fehlerbehandlung für TinyMCE-Integration hinzugefügt
- Fehlerdiagnose, falls TinyMCE nicht korrekt geladen wird
- Benutzerfreundliche Fehlermeldung, wenn der API-Key fehlt oder ungültig ist
- Kommentare verbessert, um den Zweck des TinyMCE-Scripts klarer zu machen

Diese Änderungen sollen helfen, Probleme mit dem TinyMCE-Editor im Admin-Panel besser zu diagnostizieren. Mit der verbesserten Fehlerbehandlung werden Benutzer über potenzielle Probleme mit dem TinyMCE API-Key informiert und erhalten eine klare Fehlermeldung.

## {Datum} - Konfiguration Terminbuchung (Backend)
- **Ziel:** E-Mail-Benachrichtigung bei neuer Buchungsanfrage an Admin und Kunde.
- **Cloud Functions (`functions/index.js`):**
    - `nodemailer`-Abhängigkeit in `functions/package.json` hinzugefügt.
    - `handleNewBooking` überarbeitet:
        - Automatisches Setzen des Status auf `confirmed` entfernt.
        - Nodemailer-Transport konfiguriert (liest SMTP-Zugangsdaten aus Firebase Environment Config: `email.user`, `email.pass`, `email.host`, `email.port`).
        - Sendet E-Mail-Benachrichtigung über neue Anfrage an Admin (Mama).
        - Sendet E-Mail-Bestätigung über Eingang der Anfrage an Kunden (falls E-Mail angegeben).
- **Firestore Rules (`firestore.rules`):**
    - Regeln für `buchungen` angepasst:
        - `create`: Erlaubt für jeden (auch anonym), erzwingt `status: 'angefragt'` und prüft notwendige Felder (Datum, Zeit, Name, E-Mail).
        - `read`: Erlaubt für jeden.
        - `update`/`delete`: Nur für Admins erlaubt (via `isAdmin()` Hilfsfunktion).
    - Regeln für `verfuegbare_slots` angepasst: `read` für jeden, `write` nur für Admins.
    - Regeln für `kontaktanfragen` angepasst: `create` für jeden (prüft Name/E-Mail), `read`/`update`/`delete` nur für Admins.
    - `isAdmin()` Hilfsfunktion hinzugefügt (prüft `isAdmin`-Flag im `/users/{userId}`-Dokument).
- **Nächste Schritte:**
    - Firebase Environment Configuration für E-Mail setzen.
    - Firebase Functions deployen.
    - Frontend-Logik für Slot-Berechnung und Buchung implementieren (`js/booking.js`).

## UI Anpassungen
- Wort "Heilung" durch "Ausgeglichenheit" in Hero-Sektion ersetzt.
- "Termin buchen"-Button aus Hero-Sektion entfernt.
- KiTE-Logo zur Navigationsleiste hinzugefügt.
- Hintergrundbild der Hero-Sektion geändert und Styling in CSS-Datei ausgelagert.

## {Datum} - Datenschutzerklärung hinzugefügt
- Standard-Datenschutzerklärungstext in `datenschutz.html` eingefügt.
- CSS-Klasse `legal-content` zum `main`-Element hinzugefügt für konsistentes Styling.
- Platzhalter für persönliche Daten (Name, Adresse, E-Mail, Datum) müssen noch ausgefüllt werden.

## {Datum} - Korrektur Footer-Links
- Links zu Impressum und Datenschutz im Footer auf absolute Pfade (`/impressum.html`, `/datenschutz.html`) geändert, um 404-Fehler zu beheben.

## {Datum} - E-Mail-Benachrichtigung für Kontaktformular
- Neue Cloud Function `handleNewContactRequest` in `functions/index.js` hinzugefügt.
- Löst bei neuen Einträgen in der `kontaktanfragen`-Collection aus.
- Sendet eine E-Mail mit den Formulardaten an `info@dsm-kite.de`.
- Verwendet den bestehenden Nodemailer-Transport.
- Sendet *keine* Bestätigungs-E-Mail an den Absender.

## {Datum} - "Über mich"-Sektion hinzugefügt
- Neue `<section id="uber-mich">` in `index.html` eingefügt.
- Neues Profilbild (`IMG_20250421_131615.jpg`) eingebunden.
- Platzhaltertext für die Beschreibung hinzugefügt.
- CSS-Klassen `about-me-section` und `profile-image` hinzugefügt für mögliches späteres Styling.

## {Datum} - Styling & Text für "Über mich"-Sektion
- CSS-Regeln in `css/style.css` hinzugefügt, um das Profilbild (`.profile-image`) rund, zentriert und in passender Größe darzustellen.
- Sektion `#uber-mich` mit eigenem Hintergrund und Überschriften-Styling versehen.
- Responsives Verhalten für die Sektion auf Mobilgeräten verbessert.
- Generischen Platzhaltertext in `index.html` durch einen spezifischeren Text über Daniela Sieck-Mitzloff ersetzt.

## {Datum} - Hover-Effekt für Profilbild
- Hover-Effekt (`transform: scale(1.05)`) und Transition für das Profilbild (`.profile-image`) in `css/style.css` hinzugefügt.

### Updates

*   **(TIMESTAMP)** - Kalenderlogik (`js/booking.js`) überarbeitet:
    *   Lädt jetzt alle Verfügbarkeiten und Buchungen für den gesamten Monat auf einmal, bevor der Kalender gezeichnet wird.
    *   Verwendet Ladeindikator und verhindert Race Conditions bei schnellem Monatswechsel.
    *   Zeichnet Kalender auf einmal mit korrekten Verfügbarkeitsklassen (grün/grau).
    *   `updateTimeSlots` nutzt nun vorberechnete Daten (keine extra DB-Abfragen bei Klick).
*   **(TIMESTAMP)** - Statischen HTML-Code aus `index.html` entfernt, der Beispiel-Zeitslots anzeigte.
*   **(TIMESTAMP)** - Slot-Berechnung (`js/booking.js` - `calculateAvailableSlotsForDay`) korrigiert, um nur volle 120-Minuten-Slots im korrekten Intervall anzuzeigen.
*   **(TIMESTAMP)** - Validierungs-Popup (`alert`) in Schritt 1 der Buchung (`js/booking.js` - `validateStep`) durch eine Inline-Fehlermeldung ersetzt.
*   **(2024-07-25 10:00)** - Webpack-Konfiguration (`webpack.config.js`) angepasst, um `impressum.html` und `datenschutz.html` in das `dist`-Verzeichnis zu kopieren. Behebt 404-Fehler für diese Seiten.
*   **(2024-07-25 10:15)** - Footer in `impressum.html` und `datenschutz.html` mit korrekten Kontaktdaten aktualisiert.
*   **(2024-07-25 10:15)** - `impressum.html` überarbeitet: Kontaktdaten eingefügt, Platzhalter für optionale Angaben (USt-ID, Aufsichtsbehörde etc.) hinzugefügt, Standardtexte für EU-Streitschlichtung und VSBG ergänzt.
*   **(2024-07-25 10:15)** - `datenschutz.html` grundlegend überarbeitet: Verantwortlicher ergänzt, Rechtsgrundlagen aktualisiert (DSGVO), Abschnitte zu Hosting (GitHub/Firebase), Firebase-Nutzung (Firestore, Functions, Auth), Kontaktformular, Terminbuchung, Cookies (inkl. Empfehlung für Banner), detaillierten Betroffenenrechten und Beschwerderecht hinzugefügt. Hinweis: Keine Rechtsberatung, Prüfung durch Experten empfohlen.
*   **(2024-07-25 10:30)** - Einfachen Cookie-Consent-Banner implementiert (HTML in `index.html`, CSS in `css/style.css`, JS in `js/main.js`). Banner informiert und speichert Auswahl in `localStorage`. Hinweis: Blockiert aktuell keine Skripte vor Zustimmung.
*   **(2024-07-25 11:00)** - Admin-Login-Funktionalität in `js/main.js` hinzugefügt (Event-Listener für `#loginForm`, Aufruf von `signInWithEmailAndPassword`).
*   **(2024-07-25 11:00)** - Aufruf von `InitializeCookieConsent` in `js/main.js` ans Ende des `DOMContentLoaded` verschoben und Logging hinzugefügt.
*   **(2024-07-25 11:15)** - Korrektur in `js/main.js`: `auth`-Instanz aus `js/firebase.js` importiert, um `auth is not defined`-Fehler beim Admin-Login zu beheben.
*   **(2024-07-25 11:30)** - Cookie-Banner aktualisiert: Buttons auf "Akzeptieren" / "Nur erforderliche" geändert, Bannertext angepasst (HTML), localStorage-Wert für zweite Option auf "necessary" gesetzt (JS).

## 2024-03-26
- Textaktualisierungen in der "Über die KiTE® Methode"-Sektion:
  - Neuer Einführungstext mit Fokus auf ganzheitliche Behandlung und Energiefluss
  - Aktualisierte Beschreibungen für Kinesiologie, Trauma und Entkopplung
  - Detailliertere Erklärung der KiTE® Methode mit Fokus auf Selbstregulation und Blockadenlösung
  - Persönlicher Text in der "Über mich"-Sektion mit Fokus auf eigene Erfahrungen und Motivation

## 2024-03-26 - Styling-Anpassungen
- Zitat-Styling überarbeitet:
  - Blaue Hintergrundfarbe entfernt
  - Maximale Breite auf 800px erhöht
  - Textfarbe auf #333 angepasst
- Blocksatz für alle Textabschnitte implementiert:
  - Haupttext
  - Methoden-Karten
  - Methoden-Erklärungen
  - Kontaktinformationen
  - Footer-Text
