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
                // 物品存储：以 id 为主键
                db.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(METADATA_STORE)) {
                // 元数据存储：键值对，key 为文件名，value 为元数据对象
                db.createObjectStore(METADATA_STORE);
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 保存单个物品（用于解析时批量写入）
export async function saveItems(items) {
    const db = await openDB();
    const tx = db.transaction(ITEMS_STORE, 'readwrite');
    const store = tx.objectStore(ITEMS_STORE);
    for (const item of items) {
        store.put(item);
    }
    return new Promise((resolve, reject) => {
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
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

// 保存元数据（如文件版本）
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

// 清空物品库（用于重新加载）
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