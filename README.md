# KiTE® Method Website

Diese Website ist die offizielle Präsenz der KiTE® Method Praxis von Dani Sieck-Mitzloff.

## Features

- Moderne, responsive Benutzeroberfläche
- Online-Terminbuchungssystem
- Informationen über die Methode und Behandlungen
- Kontaktformular
- Admin-Bereich für Terminverwaltung und CMS

## Technologien

- HTML5, CSS3, JavaScript
- Firebase (Hosting, Firestore, Functions)
- Responsive Design
- Progressive Web App (PWA)
- TinyMCE für WYSIWYG-Editing

## Installation

1. Repository klonen:
   ```bash
   git clone https://github.com/yourusername/kite-method-website.git
   cd kite-method-website
   ```

2. Dependencies installieren:
   ```bash
   npm install
   ```

3. Umgebungsvariablen einrichten:
   - Kopiere `.env.example` zu `.env`
   - Fülle alle erforderlichen Werte aus:
     - Firebase-Konfiguration aus deinem Firebase-Projekt
     - TinyMCE API-Key von https://www.tiny.cloud/
     - GitHub Token für automatische Deployments

4. Entwicklungsserver starten:
   ```bash
   npm start
   ```

## Deployment

1. Firebase-CLI installieren:
   ```bash
   npm install -g firebase-tools
   ```

2. Firebase Login:
   ```bash
   firebase login
   ```

3. Deployment:
   ```bash
   firebase deploy
   ```

## Sicherheit

- Alle API-Keys und Secrets werden in Umgebungsvariablen gespeichert
- Sensitive Daten werden nie im Code gespeichert
- Firebase Security Rules schützen alle Daten
- Admin-Zugriff ist durch Firebase Authentication gesichert

## Lizenz

Alle Rechte vorbehalten. © 2024 KiTE® Method 