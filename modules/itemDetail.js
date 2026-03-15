// modules/itemDetail.js
import { getAllItems } from '../services/db.js';
import { getIdToName } from '../services/dataStore.js';
import { CraftingCalculator } from '../services/calculator.js';

let allItems = [];

export async function showItemDetail(itemId) {
    if (!allItems.length) {
        allItems = await getAllItems();
    }
    const item = allItems.find(i => i.id === itemId);
    if (!item) {
        alert('物品不存在');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'detail-modal';
    modal.innerHTML = `
        <div class="detail-content">
            <span class="close-btn">&times;</span>
            <h2>${escapeHtml(item.name)} <span class="item-id">(${item.id})</span></h2>
            <p><strong>配方类型:</strong> ${item.recipeType || '未知'}</p>
            ${item.output ? `<p><strong>输出数量:</strong> ${item.output}</p>` : ''}
            ${item.research ? `<p><strong>研究项目:</strong> ${item.research} ${item.researchCost ? `(消耗: ${item.researchCost})` : ''}</p>` : ''}
            <h3>合成配方</h3>
            <div class="recipe-grid" id="recipe-grid"></div>
            <div class="detail-actions">
                <button id="calc-materials-detail">计算材料</button>
                <button id="calc-steps-detail">合成步骤</button>
            </div>
            <div id="detail-result" class="detail-result"></div>
        </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.onclick = () => modal.remove();

    const grid = modal.querySelector('#recipe-grid');
    renderRecipeGrid(item, grid);

    const calcMaterialsBtn = modal.querySelector('#calc-materials-detail');
    const calcStepsBtn = modal.querySelector('#calc-steps-detail');
    const resultDiv = modal.querySelector('#detail-result');

    calcMaterialsBtn.onclick = async () => {
        try {
            const result = await CraftingCalculator.calculate({ [itemId]: 1 }, {});
            const formatted = CraftingCalculator.formatMaterialList(result, { [itemId]: 1 });
            resultDiv.textContent = formatted;
        } catch (e) {
            resultDiv.textContent = '计算失败：' + e.message;
        }
    };

    calcStepsBtn.onclick = async () => {
        try {
            const result = await CraftingCalculator.calculate({ [itemId]: 1 }, {});
            const formatted = CraftingCalculator.formatCraftingSteps(result, { [itemId]: 1 });
            resultDiv.textContent = formatted;
        } catch (e) {
            resultDiv.textContent = '计算失败：' + e.message;
        }
    };
}

function renderRecipeGrid(item, container) {
    const recipe = item.recipe || [];
    const size = recipe.length > 9 ? 6 : 3;
    container.style.gridTemplateColumns = `repeat(${size}, 1fr)`;

    for (let i = 0; i < size * size; i++) {
        const cell = document.createElement('div');
        cell.className = 'recipe-cell';
        const slot = recipe[i];
        if (slot && slot.material) {
            cell.textContent = slot.name || slot.material;
            if (slot.amount) cell.textContent += `\n×${slot.amount}`;
            cell.dataset.material = slot.material;
            cell.style.cursor = 'pointer';
            cell.addEventListener('click', () => {
                showItemDetail(slot.material);
            });
        } else {
            cell.textContent = '';
        }
        container.appendChild(cell);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}