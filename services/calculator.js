// services/calculator.js
import { getAllItems } from './db.js';
import { CraftingHelperCore } from './calculatorCore.js';
import { getIdToName, getBaseMaterials } from './dataStore.js';

export class CraftingCalculator {
    static async calculate(itemQuantities, owned = {}) {
        const items = await getAllItems();
        const itemList = {};
        for (const item of items) {
            if (item.recipe && Array.isArray(item.recipe) && item.recipe.length > 0) {
                const materialCounts = {};
                for (const slot of item.recipe) {
                    if (slot && slot.material) {
                        const mid = slot.material;
                        const amt = slot.amount || 1;
                        materialCounts[mid] = (materialCounts[mid] || 0) + amt;
                    }
                }
                itemList[item.id] = {
                    count: item.output || 1,
                    machine: item.recipeType || '工作台',
                    materialList: Object.entries(materialCounts).map(([id, cnt]) => [id, cnt])
                };
            }
        }

        const helper = new CraftingHelperCore(itemList);
        const baseMats = getBaseMaterials();
        const demands = Object.entries(itemQuantities).map(([item, count]) => ({ item, count }));
        const result = helper.solve(demands, baseMats, owned);
        return result;
    }

    static formatQuantity(quantity) {
        const q = Number(quantity);
        if (isNaN(q) || q < 0) return '0';
        if (q < 64) return String(q);
        const groups = Math.floor(q / 64);
        const remainder = q % 64;
        if (remainder === 0) return `${groups}*64`;
        else return `${groups}*64+${remainder}`;
    }

    static formatMaterialList(result, itemQuantities) {
        const idToName = getIdToName();
        const basicMaterial = result.basicMaterial || [];
        const ownedFulfilled = result.ownedFulfilled || [];
        const usedOwned = result.usedOwned || {};

        const materialDict = {};
        for (const mat of basicMaterial) {
            const count = Number(mat.count);
            if (!isNaN(count)) {
                materialDict[mat.item] = (materialDict[mat.item] || 0) + count;
            }
        }
        for (const item of ownedFulfilled) {
            if (!materialDict[item.item]) materialDict[item.item] = 0;
        }

        const materialList = [];
        let totalItems = 0;
        for (const [matId, amount] of Object.entries(materialDict)) {
            const matName = idToName[matId] || matId;
            const remaining = Math.ceil(amount);
            const used = Math.ceil(usedOwned[matId] || 0);
            let display;
            if (used > 0) {
                if (remaining > 0) {
                    display = `${matName} (${matId}) × ${this.formatQuantity(remaining)} (已有 ${this.formatQuantity(used)}，还需 ${this.formatQuantity(remaining)})`;
                } else {
                    display = `${matName} (${matId}) × 0 (已有 ${this.formatQuantity(used)}，已满足需求)`;
                }
            } else {
                display = `${matName} (${matId}) × ${this.formatQuantity(remaining)}`;
            }
            materialList.push({ name: matName, display });
            totalItems += remaining;
        }

        materialList.sort((a, b) => a.name.localeCompare(b.name));

        const titleParts = [];
        for (const [itemId, count] of Object.entries(itemQuantities)) {
            const itemName = idToName[itemId] || itemId;
            titleParts.push(`${count}个${itemName}`);
        }
        const title = `制作 ${titleParts.join(' + ')} 所需的基础材料:`;

        const lines = [title];
        lines.push(`总共需要 ${materialList.length} 种基础材料，合计 ${totalItems} 个物品\n`);
        materialList.forEach((item, idx) => {
            lines.push(`[${idx + 1}]. ${item.display}`);
        });

        return lines.join('\n');
    }
}