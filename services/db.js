// services/db.js
const DB_NAME = 'SlimefunDB';
const DB_VERSION = 4;

export async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('items')) {
                db.createObjectStore('items', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata');
            }
            if (!db.objectStoreNames.contains('settings')) {
                db.createObjectStore('settings');
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('items', 'readwrite');
        const store = tx.objectStore('items');
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export async function saveItems(items) {
    const db = await openDB();
    const tx = db.transaction('items', 'readwrite');
    const store = tx.objectStore('items');
    return new Promise((resolve, reject) => {
        items.forEach(item => store.put(item));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

export async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('items', 'readonly');
        const store = tx.objectStore('items');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('items', 'readonly');
        const store = tx.objectStore('items');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveMetadata(key, value) {
    const db = await openDB();
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');
    store.put(value, key);
    return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}

export async function getMetadata(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('metadata', 'readonly');
        const store = tx.objectStore('metadata');
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function getMetadataCount() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('metadata', 'readonly');
        const store = tx.objectStore('metadata');
        const request = store.count();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function clearItems() {
    const db = await openDB();
    const tx = db.transaction('items', 'readwrite');
    const store = tx.objectStore('items');
    store.clear();
    return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}