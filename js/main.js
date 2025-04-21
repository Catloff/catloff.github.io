// Main JavaScript file
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc } from 'firebase/firestore';
import BookingSystem from './booking.js';
import { db } from './firebase.js';
import { initializeAuthCheck } from './auth.js';

// --- Cookie Consent --- 
function InitializeCookieConsent() {
    console.log('InitializeCookieConsent aufgerufen.');
    const banner = document.getElementById('cookieConsentBanner');
    const acceptButton = document.getElementById('cookieConsentAccept');
    const closeButton = document.getElementById('cookieConsentClose');
    const consentKey = 'cookieConsentDSM';

    if (!banner) {
        console.log('Cookie-Banner Element nicht gefunden!');
        return;
    }
    console.log('Cookie-Banner Element gefunden.');

    const userConsent = localStorage.getItem(consentKey);
    console.log('localStorage Wert für', consentKey, ':', userConsent);

    if (!userConsent) {
        console.log('Keine Zustimmung im localStorage gefunden, zeige Banner.');
        banner.style.display = 'flex';
    } else {
        if (userConsent === 'accepted') {
            console.log('Zustimmung im localStorage gefunden (accepted).');
            // Ggf. zustimmungsbasierte Skripte laden
        } else {
            console.log('Zustimmung im localStorage gefunden (rejected/closed).');
        }
        banner.style.display = 'none';
    }

    // Event Listener für Buttons
    if (acceptButton) {
        acceptButton.addEventListener('click', () => {
            localStorage.setItem(consentKey, 'accepted');
            banner.style.display = 'none';
            console.log('Akzeptieren geklickt, Zustimmung gespeichert.');
            // Ggf. zustimmungsbasierte Skripte laden
        });
    }

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            localStorage.setItem(consentKey, 'rejected');
            banner.style.display = 'none';
            console.log('Schließen geklickt, Ablehnung gespeichert.');
        });
    }
}
// --- Ende Cookie Consent ---

// Website Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    console.log('Website geladen (DOMContentLoaded Start)');

    // Auth-Check initialisieren, um Overlay zu steuern
    initializeAuthCheck();

    // Mobile Navigation
    const mobileMenuButton = document.querySelector('.mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    
    if (mobileMenuButton && navLinks) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenuButton.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Schließe das Menü beim Klicken auf einen Link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                mobileMenuButton.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // Smooth Scroll für Navigation
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Initialisiere das Buchungssystem
    console.log('Initialisiere BookingSystem...');
    const bookingContainer = document.querySelector('.booking-section');
    if (bookingContainer) {
        console.log('Booking-Container gefunden');
        try {
            window.bookingSystem = new BookingSystem();
            console.log('BookingSystem erfolgreich initialisiert');
            
            // Debug: Überprüfe die Event-Listener
            const nextButtons = document.querySelectorAll('.next-step');
            console.log('Gefundene Next-Buttons:', nextButtons.length);
            
            const prevButtons = document.querySelectorAll('.prev-step');
            console.log('Gefundene Prev-Buttons:', prevButtons.length);
            
            const treatments = document.querySelectorAll('.treatment-card input[type="radio"]');
            console.log('Gefundene Behandlungen:', treatments.length);
        } catch (error) {
            console.error('Fehler bei der Initialisierung des BookingSystems:', error);
            console.error('Stack:', error.stack);
        }
    } else {
        console.log('Booking-Container nicht gefunden');
    }

    // Kontaktformular Handler
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Formular-Daten sammeln
            const formData = {
                name: contactForm.name.value,
                email: contactForm.email.value,
                phone: contactForm.phone.value,
                subject: contactForm.subject.value,
                message: contactForm.message.value,
                timestamp: new Date(),
                status: 'neu'
            };

            try {
                // Speichere die Nachricht in Firestore
                const docRef = await addDoc(collection(db, 'kontaktanfragen'), formData);
                console.log('Nachricht gespeichert mit ID:', docRef.id);

                // Zeige Erfolgsmeldung
                alert('Vielen Dank für Ihre Nachricht! Wir werden uns schnellstmöglich bei Ihnen melden.');
                
                // Formular zurücksetzen
                contactForm.reset();

            } catch (error) {
                console.error('Fehler beim Senden der Nachricht:', error);
                alert('Entschuldigung, beim Senden Ihrer Nachricht ist ein Fehler aufgetreten. Bitte versuchen Sie es später erneut.');
            }
        });
    }

    // Admin Login Handler (im Overlay)
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    if (loginForm && loginError) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Verhindert das Neuladen der Seite
            const email = loginForm.loginEmail.value;
            const password = loginForm.loginPassword.value;
            loginError.textContent = ''; // Fehlermeldung zurücksetzen
            loginError.style.display = 'none';

            try {
                console.log('Versuche Admin-Login für:', email);
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                console.log('Admin-Login erfolgreich:', userCredential.user.email);
                // Das Overlay wird automatisch durch onAuthStateChanged in auth.js ausgeblendet
            } catch (error) {
                console.error('Admin-Login fehlgeschlagen:', error.code, error.message);
                loginError.textContent = 'Login fehlgeschlagen. Bitte E-Mail und Passwort prüfen.'; // Zeige generische Fehlermeldung
                loginError.style.display = 'block';
            }
        });
    }
    
    // Test der Firebase-Verbindung (kann entfernt oder belassen werden)
    /*
    const auth = getAuth();
    onAuthStateChanged(auth, (user) => {
        if (user) {
            console.log('Benutzer ist eingeloggt:', user.uid);
        } else {
            console.log('Kein Benutzer eingeloggt');
        }
    });
    */

    // Cookie Consent GANZ AM ENDE initialisieren, wenn der Rest des DOM sicher bereit ist
    console.log('Initialisiere Cookie Consent (am Ende von DOMContentLoaded)');
    InitializeCookieConsent();

    console.log('Website Initialisierung (DOMContentLoaded Ende)');
}); 