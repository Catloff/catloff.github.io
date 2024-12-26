import { auth } from './firebase.js';
import { signInWithEmailAndPassword } from 'firebase/auth';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginButton = loginForm.querySelector('button[type="submit"]');

    const showError = (message) => {
        loginError.textContent = message;
        loginError.style.display = 'block';
        loginButton.disabled = false;
        loginButton.textContent = 'Anmelden';
    };

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        // UI-Feedback
        loginButton.disabled = true;
        loginButton.textContent = 'Anmeldung läuft...';
        loginError.style.display = 'none';
        
        try {
            console.log('Versuche Anmeldung für:', email);
            await signInWithEmailAndPassword(auth, email, password);
            console.log('Anmeldung erfolgreich');
            loginError.style.display = 'none';
        } catch (error) {
            console.error('Login-Fehler:', error);
            
            switch(error.code) {
                case 'auth/invalid-email':
                    showError('Ungültige E-Mail-Adresse');
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    showError('Ungültige Anmeldedaten');
                    break;
                case 'auth/too-many-requests':
                    showError('Zu viele Versuche. Bitte warte einen Moment.');
                    break;
                default:
                    showError('Ein Fehler ist aufgetreten. Bitte versuche es später erneut.');
            }
        }
    });
}); 