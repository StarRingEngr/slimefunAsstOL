// services/db.js
const DB_NAME = 'SlimefunDB';
const DB_VERSION = 2; // 升级版本号

export async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log('数据库升级:', event.oldVersion, '->', event.newVersion);
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
        request.onsuccess = () => {
            console.log('数据库连接成功');
            resolve(request.result);
        };
        request.onerror = () => {
            console.error('数据库连接失败', request.error);
            reject(request.error);
        };
    });
}

// 保存单个物品
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

// 获取所有物品
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

// 获取单个物品
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

// 保存元数据
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

// 获取元数据
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

// 清空物品库
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