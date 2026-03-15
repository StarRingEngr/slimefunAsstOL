// services/calculatorCore.js
export class CraftingHelperCore {
    constructor(itemList) {
        this.itemList = itemList; // { itemId: { count, machine, materialList: [[id, count], ...] } }
    }

    solve(targetList, ignoreList, owned = {}) {
        // targetList: [{ item, count }]
        // ignoreList: Set 或数组，视为基础材料不进一步合成
        // owned: { itemId: count }
        const ownedCopy = { ...owned };
        const usedOwned = {};

        const indegree = {};
        const needsCount = {};
        const productionCount = {};
        const excessCount = {};

        // 初始化 needsCount 和 indegree
        for (const { item, count } of targetList) {
            needsCount[item] = count;
            indegree[item] = 0;
        }

        // 构建依赖图，计算入度
        const queue = Object.keys(needsCount);
        for (let i = 0; i < queue.length; i++) {
            const item = queue[i];
            if (!this.itemList[item] || ignoreList.includes(item)) continue;
            for (const [material] of this.itemList[item].materialList) {
                indegree[material] = (indegree[material] || 0) + 1;
                if (!(material in needsCount) && !queue.includes(material)) {
                    queue.push(material);
                }
            }
        }

        // 初始化入度为0的队列
        let processingQueue = queue.filter(item => indegree[item] === 0);

        while (processingQueue.length > 0) {
            const product = processingQueue.shift();

            // 跳过无配方或基础材料
            if (!this.itemList[product] || ignoreList.includes(product)) continue;

            // 先使用库存
            if (ownedCopy[product] > 0) {
                const required = needsCount[product] || 0;
                const available = ownedCopy[product];
                const used = Math.min(required, available);
                if (used > 0) {
                    needsCount[product] = (needsCount[product] || 0) - used;
                    ownedCopy[product] -= used;
                    usedOwned[product] = (usedOwned[product] || 0) + used;
                }
            }

            // 如果需求已满足，减少依赖项入度
            if (needsCount[product] <= 0) {
                if (this.itemList[product]) {
                    for (const [material] of this.itemList[product].materialList) {
                        indegree[material]--;
                        if (indegree[material] === 0) {
                            processingQueue.push(material);
                        }
                    }
                }
                continue;
            }

            const outputPerCraft = this.itemList[product].count;
            const requiredCount = needsCount[product];
            const craftCount = Math.ceil(requiredCount / outputPerCraft);
            productionCount[product] = craftCount;

            const excess = craftCount * outputPerCraft - requiredCount;
            if (excess > 0) {
                excessCount[product] = (excessCount[product] || 0) + excess;
            }

            for (const [material, perCraft] of this.itemList[product].materialList) {
                needsCount[material] = (needsCount[material] || 0) + craftCount * perCraft;
                indegree[material]--;
                if (indegree[material] === 0) {
                    processingQueue.push(material);
                }
            }
        }

        // 收集基础材料
        const basicMaterial = [];
        for (const [item, count] of Object.entries(needsCount)) {
            if (count > 0 && (!this.itemList[item] || ignoreList.includes(item))) {
                basicMaterial.push({ item, count: Math.ceil(count) });
            }
        }

        // 被库存完全满足的中间产物
        const ownedFulfilled = [];
        for (const [item, used] of Object.entries(usedOwned)) {
            if (used > 0 && (!needsCount[item] || needsCount[item] === 0) && !basicMaterial.some(b => b.item === item)) {
                ownedFulfilled.push({ item, used });
            }
        }

        // 合成步骤
        const madeRoute = [];
        for (const [product, count] of Object.entries(productionCount)) {
            if (this.itemList[product] && !ignoreList.includes(product)) {
                const table = this.itemList[product];
                const craftCount = count;
                const productCount = craftCount * table.count;
                const materialList = table.materialList.map(([mat, per]) => [mat, per * craftCount]);
                madeRoute.push({
                    product,
                    productCount,
                    machine: table.machine,
                    materialList
                });
            }
        }

        // 剩余材料
        const extraItem = [];
        for (const [product, excess] of Object.entries(excessCount)) {
            if (excess > 0) extraItem.push({ item: product, count: Math.ceil(excess) });
        }
        // 目标物品自身可能有多余
        for (const { item, count } of targetList) {
            const actualProduction = (productionCount[item] || 0) * (this.itemList[item]?.count || 1);
            const finalExcess = actualProduction - count;
            if (finalExcess > 0) {
                const existing = extraItem.find(e => e.item === item);
                if (existing) existing.count += finalExcess;
                else extraItem.push({ item, count: finalExcess });
            }
        }

        return {
            basicMaterial,
            madeRoute,
            extraItem,
            usedOwned,
            ownedFulfilled
        };
    }
}