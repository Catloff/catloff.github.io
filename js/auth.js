import { auth, db } from './firebase.js';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const checkAdminAccess = async (user) => {
    if (!user) return false;
    
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        return userDoc.exists() && userDoc.data().isAdmin === true;
    } catch (error) {
        console.error('Fehler beim Überprüfen des Admin-Status:', error);
        return false;
    }
};

const initializeAuthCheck = () => {
    const constructionOverlay = document.getElementById('constructionOverlay');
    
    onAuthStateChanged(auth, async (user) => {
        const isAdmin = await checkAdminAccess(user);
        
        if (!isAdmin) {
            constructionOverlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            constructionOverlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });
};

export { initializeAuthCheck }; 