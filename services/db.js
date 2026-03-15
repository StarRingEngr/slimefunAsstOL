// services/db.js
const DB_NAME = 'SlimefunDB';
const DB_VERSION = 6;  // 升级到6以确保索引存在

export async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            const oldVersion = event.oldVersion;
            console.log(`数据库升级: ${oldVersion} -> ${DB_VERSION}`);

            // 创建 items 存储，如果不存在则创建，并确保有 file 索引
            if (!db.objectStoreNames.contains('items')) {
                const store = db.createObjectStore('items', { keyPath: 'id' });
                store.createIndex('file', 'file', { unique: false });
            } else {
                // 如果 items 已存在，检查是否有 file 索引，没有则创建
                const store = event.target.transaction.objectStore('items');
                if (!store.indexNames.contains('file')) {
                    store.createIndex('file', 'file', { unique: false });
                }
            }

            // 创建 metadata 存储
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata');
            }

            // 创建 settings 存储
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

export async function deleteItemsByFile(fileName) {
    const db = await openDB();
    const tx = db.transaction('items', 'readwrite');
    const store = tx.objectStore('items');
    const index = store.index('file');
    return new Promise((resolve, reject) => {
        const request = index.openCursor(IDBKeyRange.only(fileName));
        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                cursor.delete();
                cursor.continue();
            } else {
                resolve();
            }
        };
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