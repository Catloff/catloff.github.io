# KiTE® Method Website

Diese Website ist die offizielle Präsenz der KiTE® Method Praxis von Dani Sieck-Mitzloff.

## Features

- Moderne, responsive Benutzeroberfläche
- Online-Terminbuchungssystem (in Entwicklung)
- Informationen über die Methode und Behandlungen
- Kontaktformular

## Technologien

- HTML5, CSS3, JavaScript
- Firebase (Firestore, Functions, Authentication)
- Responsive Design
- Progressive Web App (PWA)

## Installation

1. Repository klonen:
   ```bash
   git clone https://github.com/catloff/catloff.github.io.git
   cd catloff.github.io
   ```

2. Dependencies installieren:
   ```bash
   npm install
   ```

3. Umgebungsvariablen einrichten:
   - Kopiere `.env.example` zu `.env`
   - Fülle alle erforderlichen Werte aus:
     - Firebase-Konfiguration aus deinem Firebase-Projekt

4. Entwicklungsserver starten:
   ```bash
   npm start
   ```

## Deployment

Deployment erfolgt über GitHub Pages durch Push auf den `gh-pages` Branch (oder den konfigurierten Branch).

## Sicherheit

- Alle API-Keys und Secrets werden in Umgebungsvariablen gespeichert
- Sensitive Daten werden nie im Code gespeichert
- Firebase Security Rules schützen relevante Daten
- Admin-Zugriff ist durch Firebase Authentication gesichert (für Login auf Entwicklungsseite)

## Lizenz

Alle Rechte vorbehalten. © 2024 KiTE® Method 