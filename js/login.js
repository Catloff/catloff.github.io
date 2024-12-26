import { auth } from './firebase.js';
import { signInWithEmailAndPassword } from 'firebase/auth';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            await signInWithEmailAndPassword(auth, email, password);
            loginError.style.display = 'none';
        } catch (error) {
            loginError.textContent = 'Ungültige Anmeldedaten';
            loginError.style.display = 'block';
            console.error('Login error:', error);
        }
    });
}); 