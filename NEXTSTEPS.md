# Content Management System (CMS) Implementierungsplan

## Überblick
Ein benutzerfreundliches CMS für die KiTE® Method Website, das es Dani ermöglicht, Inhalte einfach zu verwalten.

## Funktionsumfang

### Bearbeitbare Elemente
- Alle Texte der Website
- Bilder (Upload, Austausch, Löschen)
- Struktur/Reihenfolge der Seitenabschnitte
- Meta-Informationen (Titel, Beschreibungen)

### Geschützte Elemente
- Buchungssystem-Logik
- Technische Konfigurationen
- Sicherheitsrelevante Einstellungen

## Technische Umsetzung

### 1. Content-Verwaltung
- **Datenbank**: Firebase Firestore
  - Separate Collections für verschiedene Inhaltstypen
  - Versionierung durch Timestamp-basierte Snapshots
- **Bilder**: Firebase Storage
  - Automatische Bildoptimierung
  - Vorschau vor Upload
  - Größenbeschränkungen implementieren

### 2. Benutzeroberfläche
- **Dashboard**
  - Übersichtliche Navigationsstruktur
  - Schnellzugriff auf häufig bearbeitete Bereiche
  - Live-Vorschau der Änderungen
- **Editor**
  - TinyMCE Integration für WYSIWYG-Editing
  - Drag & Drop für Bildupload
  - Abschnitts-Reorder via Drag & Drop

### 3. Versionierung & Sicherheit
- **Änderungsverfolgung**
  - Automatische Snapshots bei jeder Änderung
  - Rollback-Funktion für die letzten 10 Versionen
  - Änderungsprotokoll mit Zeitstempel
- **Backup**
  - Tägliches automatisches Backup
  - Export-Funktion für manuelle Backups

### 4. Synchronisation
- **Workflow**
  1. Änderungen werden direkt in Firebase gespeichert
  2. GitHub Action triggert bei Firebase-Änderungen
  3. Automatischer Commit und Push zu GitHub
  4. Deployment-Pipeline wird ausgelöst
- **Entwickler-Workflow**
  1. Pull vor lokaler Entwicklung
  2. Branch-basierte Entwicklung
  3. Merge-Konflikte werden zugunsten der Firebase-Version aufgelöst

## Implementierungsschritte

### Phase 1: Grundstruktur
1. [ ] Firebase Collections für CMS-Daten erstellen
2. [ ] Admin-Dashboard-Grundgerüst entwickeln
3. [ ] WYSIWYG-Editor integrieren
4. [ ] Basis-Bildverwaltung implementieren

### Phase 2: Content-Management
1. [ ] Text-Bearbeitung für alle Seitenbereiche
2. [ ] Erweiterte Bildverwaltung
3. [ ] Abschnitts-Reorder-Funktionalität
4. [ ] Live-Vorschau implementieren

### Phase 3: Versionierung
1. [ ] Snapshot-System entwickeln
2. [ ] Rollback-Funktionalität
3. [ ] Änderungsprotokoll
4. [ ] Backup-System

### Phase 4: Synchronisation
1. [ ] GitHub Action für Firebase-Trigger
2. [ ] Automatisierte Deployment-Pipeline
3. [ ] Konfliktlösungsstrategie implementieren
4. [ ] Entwickler-Dokumentation erstellen

### Phase 5: Testing & Schulung
1. [ ] Umfassende Tests aller Funktionen
2. [ ] Benutzerhandbuch erstellen
3. [ ] Schulung für Dani durchführen
4. [ ] Feedback einarbeiten

## Nächste Schritte
1. Bestätigung des Plans
2. Setup der erweiterten Firebase-Struktur
3. Beginn mit Phase 1 