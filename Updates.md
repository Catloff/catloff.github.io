# Projekt-Updates

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
   - Triggert nach erfolgreicher Synchronisierung einen neuen Build

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
