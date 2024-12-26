import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const checkAdminAccess = async (user) => {
    if (!user) {
        console.log('Kein Benutzer angemeldet');
        return false;
    }
    
    try {
        console.log('Überprüfe Admin-Status für User:', user.email);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const isAdmin = userDoc.exists() && userDoc.data().isAdmin === true;
        console.log('Admin-Status:', isAdmin);
        return isAdmin;
    } catch (error) {
        console.error('Fehler beim Überprüfen des Admin-Status:', error);
        return false;
    }
};

const updateUIVisibility = (isAdmin) => {
    const constructionOverlay = document.getElementById('constructionOverlay');
    if (!constructionOverlay) {
        console.error('Overlay-Element nicht gefunden');
        return;
    }

    if (!isAdmin) {
        console.log('Zeige Overlay (kein Admin)');
        constructionOverlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        console.log('Verstecke Overlay (Admin bestätigt)');
        constructionOverlay.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
};

const initializeAuthCheck = () => {
    console.log('Initialisiere Auth-Check');
    
    onAuthStateChanged(auth, async (user) => {
        console.log('Auth-Status geändert:', user ? user.email : 'nicht angemeldet');
        const isAdmin = await checkAdminAccess(user);
        updateUIVisibility(isAdmin);
    });
};

export { initializeAuthCheck }; 