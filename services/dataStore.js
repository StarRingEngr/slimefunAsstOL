// services/dataStore.js
import { openDB } from './db.js';

let items = [];
let idToName = {};
let baseMaterials = [];

const DEFAULT_BASE_MATERIALS = [
    "IRON_DUST", "GOLD_DUST", "COPPER_DUST",
    "TIN_DUST", "LEAD_DUST", "SILVER_DUST",
    "ALUMINUM_DUST", "ZINC_DUST", "MAGNESIUM_DUST",
    "BUCKET_OF_OIL", "SULFATE", "SLIME_BALL", "BORAX", "NETHER_ICE",
    "VEX_GEM", "BASIC_CIRCUIT_BOARD", "GHOSTLY_ESSENCE", "STARDUST_METEOR",
    "SEGGANESSON", "OSMIUM_DUST", "ARSENIC", "TINY_URANIUM",
    "LANTHANUM_INGOT", "NEODYMIUM_INGOT", "GADOLINIUM_INGOT",
    "TERBIUM_INGOT", "DYSPROSIUM_INGOT", "HOLMIUM_INGOT",
    "ERBIUM_INGOT", "YTTERBIUM_INGOT", "MONAZITE",
    "QUIRP_UP", "QUIRP_DOWN", "QUIRP_LEFT", "QUIRP_RIGHT", "QUIRPCONDENSATE",
    "ZOT_UP_2", "ZOT_DOWN_2", "ZOT_LEFT_2", "ZOT_RIGHT_2", "TE_INFO",
    "MOON_DUST", "MOON_ROCK", "MARS_DUST", "MARS_ROCK", "FALLEN_METEOR",
    "DRY_ICE", "METHANE_ICE", "SULFUR_BLOCK", "VENTSTONE", "LASERITE_ORE",
    "MOON_CHEESE", "BROKEN_SOLAR_PANEL_RELIC", "FALLEN_SATELLITE_RELIC"
];

export function setItems(newItems) {
    items = newItems;
    idToName = {};
    // 先添加物品自身的名称
    items.forEach(item => {
        idToName[item.id] = item.name;
    });
    // 再遍历所有物品的配方，补充材料名称
    items.forEach(item => {
        if (item.recipe && Array.isArray(item.recipe)) {
            item.recipe.forEach(slot => {
                if (slot && slot.material) {
                    const mid = slot.material;
                    if (!idToName[mid]) {
                        // 使用配方中提供的名称，如果没有则用ID
                        idToName[mid] = slot.name || mid;
                    }
                }
            });
        }
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
            let mats = request.result;
            if (!mats || mats.length === 0) {
                mats = DEFAULT_BASE_MATERIALS;
                // 异步保存默认名单
                saveBaseMaterialsToDB(mats).catch(console.error);
            }
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