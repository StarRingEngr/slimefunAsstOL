// 在 dataService.js 末尾添加
export let idToName = {};
export let baseMaterials = [];

// 在加载所有物品后调用此函数更新
export function updateMaps(items) {
    idToName = {};
    items.forEach(item => { idToName[item.id] = item.name; });
    // 基础材料可以从 IndexedDB 的某个存储中读取，这里先设为空数组（或从配置读取）
}

export function getBaseMaterials() {
    return baseMaterials; // 后续可以改为从存储动态获取
}

export function setBaseMaterials(mats) {
    baseMaterials = mats;
}

let craftingHelper = null;
export function setCraftingHelper(helper) {
    craftingHelper = helper;
}
export function getCraftingHelper() {
    return craftingHelper;
}