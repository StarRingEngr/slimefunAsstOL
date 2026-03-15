// services/calculator.js
import { getAllItems } from './db.js';
import { CraftingHelperCore } from './calculatorCore.js';

export class CraftingCalculator {
    /**
     * 计算所需材料
     * @param {Object} itemQuantities 目标物品及数量 { itemId: count }
     * @param {Object} owned 库存物品 { itemId: count }
     * @returns {Promise<Object>} 计算结果
     */
    static async calculate(itemQuantities, owned = {}) {
        const items = await getAllItems(); // 从 IndexedDB 获取所有物品
        // 构建 itemList 供核心算法使用
        const itemList = {};
        for (const item of items) {
            if (item.recipe && Array.isArray(item.recipe) && item.recipe.length > 0) {
                // 统计每个材料的总用量
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
        // 基础材料列表暂时为空，后续可从存储读取
        const baseMats = []; // TODO: 从全局配置读取

        const demands = Object.entries(itemQuantities).map(([item, count]) => ({ item, count }));
        const result = helper.solve(demands, baseMats, owned);
        return result;
    }

    /**
     * 格式化数量显示（如 64 -> 1*64，128+1 等）
     */
    static formatQuantity(quantity) {
        if (quantity < 64) return String(quantity);
        const groups = Math.floor(quantity / 64);
        const remainder = quantity % 64;
        if (remainder === 0) return `${groups}*64`;
        else return `${groups}*64+${remainder}`;
    }

    /**
     * 格式化材料清单输出（纯文本）
     */
    static formatMaterialList(result, itemQuantities) {
        // 从全局获取 idToName（临时从所有物品构建，但这里简单用空对象，实际需传入）
        // 为了简化，我们在 calculator 模块中传入 idToName，这里稍作修改，改为从参数接收
        // 但为保持兼容，我们可以假设外部传入 idToName，这里暂时不实现，等待完善。
        // 注意：此函数需要 idToName，我们可以在调用前从外部传入。
        // 为了能让当前代码运行，我们暂时返回简单字符串，提醒需要完善。
        return '格式化函数需要 idToName，请稍后完善。\n' + JSON.stringify(result, null, 2);
    }
}