// services/dataStore.js
let items = [];
let idToName = {};
let baseMaterials = []; // 基础材料ID数组

export function setItems(newItems) {
    items = newItems;
    // 构建 idToName 映射
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

// 从 IndexedDB 加载基础材料（将在 app.js 初始化时调用）
export async function loadBaseMaterialsFromDB() {
    // 从 IndexedDB 的 settings 存储读取
    const db = await openDB(); // 需要导入 db.js 的 openDB
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