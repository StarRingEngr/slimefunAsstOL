// services/db.js
const DB_NAME = 'SlimefunDB';
const DB_VERSION = 1;
const ITEMS_STORE = 'items';
const METADATA_STORE = 'metadata';

export async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(ITEMS_STORE)) {
                db.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(METADATA_STORE)) {
                db.createObjectStore(METADATA_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 保存单个物品（用于批量存储优化，这里保留单个存储方便调用）
export async function saveItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ITEMS_STORE, 'readwrite');
        const store = tx.objectStore(ITEMS_STORE);
        const request = store.put(item);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// 获取所有物品
export async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ITEMS_STORE, 'readonly');
        const store = tx.objectStore(ITEMS_STORE);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 获取单个物品（用于检查ID冲突）
export async function getItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(ITEMS_STORE, 'readonly');
        const store = tx.objectStore(ITEMS_STORE);
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 保存元数据
export async function saveMetadata(key, value) {
    const db = await openDB();
    const tx = db.transaction(METADATA_STORE, 'readwrite');
    const store = tx.objectStore(METADATA_STORE);
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
        const tx = db.transaction(METADATA_STORE, 'readonly');
        const store = tx.objectStore(METADATA_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 清空物品库
export async function clearItems() {
    const db = await openDB();
    const tx = db.transaction(ITEMS_STORE, 'readwrite');
    const store = tx.objectStore(ITEMS_STORE);
    store.clear();
    return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
    });
}