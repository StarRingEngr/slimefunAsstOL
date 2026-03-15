// services/dataStore.js
import { openDB } from './db.js';   // 必须导入，因为 loadBaseMaterialsFromDB 使用了 openDB

let items = [];
let idToName = {};
let baseMaterials = [];

export function setItems(newItems) {
    items = newItems;
    idToName = {};
    items.forEach(item => {
        idToName[item.id] = item.name;
    });
}

export function getItems() {
    return items;
}

export function getIdToName() {
    return idToName;
}

export function setBaseMaterials(mats) {
    baseMaterials = mats;
}

export function getBaseMaterials() {
    return baseMaterials;
}

export async function loadBaseMaterialsFromDB() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const request = store.get('baseMaterials');
        request.onsuccess = () => {
            const mats = request.result || [];
            setBaseMaterials(mats);
            resolve(mats);
        };
        request.onerror = () => reject(request.error);
    });
}

export async function saveBaseMaterialsToDB(mats) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        const request = store.put(mats, 'baseMaterials');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}