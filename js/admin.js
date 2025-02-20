import { auth, db, storage } from './firebase.js';
import { 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc,
    addDoc,
    updateDoc,
    serverTimestamp 
} from 'firebase/firestore';
import {
    ref,
    uploadBytes,
    getDownloadURL,
    listAll,
    deleteObject
} from 'firebase/storage';

// TinyMCE Konfiguration
const initTinyMCE = (selector) => {
    tinymce.init({
        selector: selector,
        plugins: 'anchor autolink charmap codesample emoticons image link lists media searchreplace table visualblocks wordcount',
        toolbar: 'undo redo | blocks fontfamily fontsize | bold italic underline strikethrough | link image media table | align lineheight | numlist bullist indent outdent | emoticons charmap | removeformat',
        language: 'de',
        height: 400,
        automatic_uploads: true,
        images_upload_handler: async (blobInfo, progress) => {
            try {
                const file = blobInfo.blob();
                const storageRef = ref(storage, `images/${file.name}`);
                await uploadBytes(storageRef, file);
                const url = await getDownloadURL(storageRef);
                return url;
            } catch (error) {
                console.error('Fehler beim Bildupload:', error);
                return '';
            }
        }
    });
};

// Admin-Authentifizierung
class AdminAuth {
    constructor() {
        this.loginForm = document.getElementById('adminLoginForm');
        this.loginOverlay = document.getElementById('loginOverlay');
        this.adminOverlay = document.getElementById('adminOverlay');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.adminEmail = document.getElementById('adminEmail');
        this.loginError = document.getElementById('loginError');

        this.setupEventListeners();
        this.checkAuthState();
    }

    setupEventListeners() {
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    async checkAuthState() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                const isAdmin = await this.checkAdminAccess(user);
                if (isAdmin) {
                    this.showAdminDashboard(user);
                } else {
                    await this.handleLogout();
                    this.showError('Keine Admin-Berechtigung');
                }
            } else {
                this.showLoginForm();
            }
        });
    }

    async checkAdminAccess(user) {
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            return userDoc.exists() && userDoc.data().isAdmin === true;
        } catch (error) {
            console.error('Fehler beim Prüfen der Admin-Rechte:', error);
            return false;
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error('Login-Fehler:', error);
            this.showError('Ungültige Anmeldedaten');
        }
    }

    async handleLogout() {
        try {
            await signOut(auth);
            this.showLoginForm();
        } catch (error) {
            console.error('Logout-Fehler:', error);
        }
    }

    showAdminDashboard(user) {
        this.loginOverlay.style.display = 'none';
        this.adminOverlay.classList.remove('hidden');
        this.adminEmail.textContent = user.email;
        contentManager.loadContent();
    }

    showLoginForm() {
        this.loginOverlay.style.display = 'flex';
        this.adminOverlay.classList.add('hidden');
        this.loginForm.reset();
    }

    showError(message) {
        this.loginError.textContent = message;
        this.loginError.style.display = 'block';
    }
}

// Content-Management
class ContentManager {
    constructor() {
        this.contentList = document.querySelector('.content-list');
        this.setupNavigation();
        this.setupPublishing();
    }

    setupNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                navButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                const sections = document.querySelectorAll('.admin-section');
                sections.forEach(s => s.classList.remove('active'));
                
                const targetSection = document.getElementById(`${btn.dataset.section}Section`);
                targetSection.classList.add('active');
                
                if (btn.dataset.section === 'content') {
                    this.loadContent();
                } else if (btn.dataset.section === 'images') {
                    this.loadImages();
                } else if (btn.dataset.section === 'structure') {
                    this.loadStructure();
                } else if (btn.dataset.section === 'versions') {
                    this.loadVersions();
                }
            });
        });
    }

    setupPublishing() {
        const publishBtn = document.getElementById('publishBtn');
        const previewBtn = document.getElementById('previewBtn');
        
        publishBtn.addEventListener('click', () => this.publishChanges());
        previewBtn.addEventListener('click', () => this.previewChanges());
    }

    async loadContent() {
        try {
            const snapshot = await getDocs(collection(db, 'cms_content'));
            this.contentList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const content = doc.data();
                const contentItem = this.createContentItem(doc.id, content);
                this.contentList.appendChild(contentItem);
            });
            
            // TinyMCE initialisieren
            initTinyMCE('.content-editor');
        } catch (error) {
            console.error('Fehler beim Laden der Inhalte:', error);
        }
    }

    createContentItem(id, content) {
        const div = document.createElement('div');
        div.className = 'content-item';
        div.innerHTML = `
            <h3>${content.title}</h3>
            <textarea class="content-editor">${content.content}</textarea>
            <div class="content-controls">
                <button class="save-btn" data-id="${id}">Speichern</button>
            </div>
        `;

        div.querySelector('.save-btn').addEventListener('click', () => {
            this.saveContent(id);
        });

        return div;
    }

    async saveContent(id) {
        try {
            const editor = tinymce.get(`content-${id}`);
            const content = editor.getContent();
            
            await updateDoc(doc(db, 'cms_content', id), {
                content: content,
                updatedAt: serverTimestamp()
            });

            // Version erstellen
            await addDoc(collection(db, 'cms_versions'), {
                contentId: id,
                content: content,
                timestamp: serverTimestamp(),
                userId: auth.currentUser.uid
            });

            this.showSaveStatus('Gespeichert!', 'success');
        } catch (error) {
            console.error('Fehler beim Speichern:', error);
            this.showSaveStatus('Fehler beim Speichern', 'error');
        }
    }

    showSaveStatus(message, type) {
        const status = document.querySelector('.save-status');
        status.textContent = message;
        status.className = `save-status ${type}`;
        setTimeout(() => {
            status.textContent = '';
            status.className = 'save-status';
        }, 3000);
    }

    async loadImages() {
        const gallery = document.querySelector('.image-gallery');
        gallery.innerHTML = '';

        try {
            const storageRef = ref(storage, 'images');
            const result = await listAll(storageRef);

            for (const item of result.items) {
                const url = await getDownloadURL(item);
                const imageItem = this.createImageItem(item.name, url);
                gallery.appendChild(imageItem);
            }
        } catch (error) {
            console.error('Fehler beim Laden der Bilder:', error);
        }
    }

    createImageItem(name, url) {
        const div = document.createElement('div');
        div.className = 'image-item';
        div.innerHTML = `
            <img src="${url}" alt="${name}">
            <div class="image-controls">
                <button class="delete-btn" data-name="${name}">Löschen</button>
                <button class="copy-btn" data-url="${url}">URL Kopieren</button>
            </div>
        `;

        div.querySelector('.delete-btn').addEventListener('click', () => {
            this.deleteImage(name);
        });

        div.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(url);
            this.showSaveStatus('URL kopiert!', 'success');
        });

        return div;
    }

    async deleteImage(name) {
        try {
            const imageRef = ref(storage, `images/${name}`);
            await deleteObject(imageRef);
            this.loadImages();
            this.showSaveStatus('Bild gelöscht', 'success');
        } catch (error) {
            console.error('Fehler beim Löschen:', error);
            this.showSaveStatus('Fehler beim Löschen', 'error');
        }
    }

    async loadStructure() {
        try {
            const snapshot = await getDocs(collection(db, 'cms_sections'));
            const sectionOrder = document.querySelector('.section-order');
            sectionOrder.innerHTML = '';

            const sections = [];
            snapshot.forEach(doc => {
                sections.push({ id: doc.id, ...doc.data() });
            });

            sections.sort((a, b) => a.order - b.order);
            sections.forEach(section => {
                const sectionItem = this.createSectionItem(section);
                sectionOrder.appendChild(sectionItem);
            });

            this.initializeDragAndDrop();
        } catch (error) {
            console.error('Fehler beim Laden der Struktur:', error);
        }
    }

    createSectionItem(section) {
        const div = document.createElement('div');
        div.className = 'section-item';
        div.setAttribute('draggable', 'true');
        div.setAttribute('data-id', section.id);
        div.innerHTML = `
            <span class="handle">☰</span>
            <span class="section-title">${section.title}</span>
            <div class="section-controls">
                <button class="visibility-btn" data-visible="${section.visible}">
                    ${section.visible ? 'Sichtbar' : 'Versteckt'}
                </button>
            </div>
        `;

        div.querySelector('.visibility-btn').addEventListener('click', (e) => {
            this.toggleSectionVisibility(section.id, e.target);
        });

        return div;
    }

    initializeDragAndDrop() {
        const sectionOrder = document.querySelector('.section-order');
        const items = sectionOrder.querySelectorAll('.section-item');

        items.forEach(item => {
            item.addEventListener('dragstart', () => {
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
                this.updateSectionOrder();
            });
        });

        sectionOrder.addEventListener('dragover', e => {
            e.preventDefault();
            const draggingItem = document.querySelector('.dragging');
            const siblings = [...sectionOrder.querySelectorAll('.section-item:not(.dragging)')];
            const nextSibling = siblings.find(sibling => {
                const box = sibling.getBoundingClientRect();
                return e.clientY <= box.top + box.height / 2;
            });

            sectionOrder.insertBefore(draggingItem, nextSibling);
        });
    }

    async updateSectionOrder() {
        try {
            const items = document.querySelectorAll('.section-item');
            const batch = db.batch();

            items.forEach((item, index) => {
                const sectionRef = doc(db, 'cms_sections', item.dataset.id);
                batch.update(sectionRef, { order: index });
            });

            await batch.commit();
            this.showSaveStatus('Reihenfolge gespeichert', 'success');
        } catch (error) {
            console.error('Fehler beim Aktualisieren der Reihenfolge:', error);
            this.showSaveStatus('Fehler beim Speichern der Reihenfolge', 'error');
        }
    }

    async toggleSectionVisibility(sectionId, button) {
        try {
            const visible = button.dataset.visible === 'true';
            await updateDoc(doc(db, 'cms_sections', sectionId), {
                visible: !visible
            });

            button.dataset.visible = !visible;
            button.textContent = !visible ? 'Sichtbar' : 'Versteckt';
            this.showSaveStatus('Sichtbarkeit aktualisiert', 'success');
        } catch (error) {
            console.error('Fehler beim Ändern der Sichtbarkeit:', error);
            this.showSaveStatus('Fehler beim Aktualisieren', 'error');
        }
    }

    async loadVersions() {
        try {
            const snapshot = await getDocs(collection(db, 'cms_versions'));
            const versionList = document.querySelector('.version-list');
            versionList.innerHTML = '';

            const versions = [];
            snapshot.forEach(doc => {
                versions.push({ id: doc.id, ...doc.data() });
            });

            versions.sort((a, b) => b.timestamp - a.timestamp);
            versions.slice(0, 10).forEach(version => {
                const versionItem = this.createVersionItem(version);
                versionList.appendChild(versionItem);
            });
        } catch (error) {
            console.error('Fehler beim Laden der Versionen:', error);
        }
    }

    createVersionItem(version) {
        const div = document.createElement('div');
        div.className = 'version-item';
        const date = version.timestamp.toDate();
        div.innerHTML = `
            <div class="version-info">
                <span class="version-date">${date.toLocaleString()}</span>
                <span class="version-user">${version.userId}</span>
            </div>
            <button class="restore-btn" data-id="${version.id}">Wiederherstellen</button>
        `;

        div.querySelector('.restore-btn').addEventListener('click', () => {
            this.restoreVersion(version);
        });

        return div;
    }

    async restoreVersion(version) {
        try {
            await updateDoc(doc(db, 'cms_content', version.contentId), {
                content: version.content,
                updatedAt: serverTimestamp()
            });

            this.showSaveStatus('Version wiederhergestellt', 'success');
            this.loadContent();
        } catch (error) {
            console.error('Fehler beim Wiederherstellen:', error);
            this.showSaveStatus('Fehler beim Wiederherstellen', 'error');
        }
    }

    async publishChanges() {
        try {
            // Hier kommt später die GitHub Action Integration
            this.showSaveStatus('Änderungen werden veröffentlicht...', 'warning');
        } catch (error) {
            console.error('Fehler beim Veröffentlichen:', error);
            this.showSaveStatus('Fehler beim Veröffentlichen', 'error');
        }
    }

    previewChanges() {
        window.open('/', '_blank');
    }
}

// Initialisierung
document.addEventListener('DOMContentLoaded', () => {
    const adminAuth = new AdminAuth();
    window.contentManager = new ContentManager();
}); 