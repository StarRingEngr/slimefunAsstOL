// modules/itemDetail.js
import { getAllItems } from '../services/db.js';
import { getBaseMaterials } from '../services/dataStore.js';
import { CraftingCalculator } from '../services/calculator.js';

let allItems = [];
let baseMaterials = [];

let activeModal = null;
let modalState = {
    history: [],
    currentIndex: -1,
    modalElement: null,
    resultDiv: null,
    contentDiv: null
};

export async function showItemDetail(itemId) {
    if (!allItems.length) {
        allItems = await getAllItems();
    }
    baseMaterials = getBaseMaterials();

    if (activeModal) {
        navigateToItem(itemId);
    } else {
        createModal(itemId);
    }
}

function createModal(itemId) {
    const modal = document.createElement('div');
    modal.className = 'detail-modal';
    modal.innerHTML = `
        <div class="detail-content">
            <div class="detail-header">
                <span class="back-btn" style="display:none;">← 返回</span>
                <h2 class="item-title"></h2>
                <span class="close-btn">&times;</span>
            </div>
            <div class="item-info"></div>
            <h3>合成配方</h3>
            <div class="recipe-grid" id="recipe-grid"></div>
            <div class="detail-actions">
                <button class="calc-materials-btn">计算材料</button>
                <button class="calc-steps-btn">合成步骤</button>
            </div>
            <div class="detail-result"></div>
        </div>
    `;
    document.body.appendChild(modal);

    activeModal = modal;
    modalState.modalElement = modal;
    modalState.history = [itemId];
    modalState.currentIndex = 0;
    modalState.resultDiv = modal.querySelector('.detail-result');

    const closeBtn = modal.querySelector('.close-btn');
    closeBtn.onclick = closeModal;

    const backBtn = modal.querySelector('.back-btn');
    backBtn.onclick = goBack;

    const calcMaterialsBtn = modal.querySelector('.calc-materials-btn');
    const calcStepsBtn = modal.querySelector('.calc-steps-btn');
    calcMaterialsBtn.onclick = () => calculateMaterials(itemId);
    calcStepsBtn.onclick = () => calculateSteps(itemId);

    renderItem(itemId);
    updateBackButton();
}

function closeModal() {
    if (activeModal) {
        activeModal.remove();
        activeModal = null;
        modalState = { history: [], currentIndex: -1 };
    }
}

function goBack() {
    if (modalState.currentIndex > 0) {
        modalState.currentIndex--;
        const itemId = modalState.history[modalState.currentIndex];
        renderItem(itemId);
        updateBackButton();
    }
}

function navigateToItem(itemId) {
    if (modalState.currentIndex < modalState.history.length - 1) {
        modalState.history = modalState.history.slice(0, modalState.currentIndex + 1);
    }
    modalState.history.push(itemId);
    modalState.currentIndex++;
    renderItem(itemId);
    updateBackButton();
}

function updateBackButton() {
    const backBtn = activeModal.querySelector('.back-btn');
    if (modalState.currentIndex > 0) {
        backBtn.style.display = 'inline-block';
    } else {
        backBtn.style.display = 'none';
    }
}

function renderItem(itemId) {
    const item = allItems.find(i => i.id === itemId);
    if (!item) {
        modalState.resultDiv.textContent = '物品不存在';
        return;
    }

    const titleEl = activeModal.querySelector('.item-title');
    titleEl.innerHTML = `${escapeHtml(item.name)} <span class="item-id">(${item.id})</span>`;

    const infoEl = activeModal.querySelector('.item-info');
    infoEl.innerHTML = `
        <p><strong>配方类型:</strong> ${item.recipeType || '未知'}</p>
        ${item.output ? `<p><strong>输出数量:</strong> ${item.output}</p>` : ''}
        ${item.research ? `<p><strong>研究项目:</strong> ${item.research} ${item.researchCost ? `(消耗: ${item.researchCost})` : ''}</p>` : ''}
    `;

    const grid = activeModal.querySelector('#recipe-grid');
    grid.innerHTML = '';
    renderRecipeGrid(item, grid);

    modalState.resultDiv.textContent = '';
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
            const materialId = slot.material;
            const materialItem = allItems.find(it => it.id === materialId);
            // 判断是否可以展开：有配方且配方非空
            const hasRecipe = materialItem && materialItem.recipe && Array.isArray(materialItem.recipe) && materialItem.recipe.length > 0 && materialItem.recipe.some(s => s && s.material);
            const isClickable = hasRecipe;

            cell.textContent = slot.name || materialId;
            if (slot.amount) cell.textContent += `\n×${slot.amount}`;
            cell.dataset.material = materialId;

            if (isClickable) {
                cell.style.cursor = 'pointer';
                cell.classList.add('clickable');
                cell.addEventListener('click', () => {
                    navigateToItem(materialId);
                });
            } else {
                cell.style.backgroundColor = '#dff4ff'; // #dff4ff色表示不可展开
                cell.style.cursor = 'default';
            }
        } else {
            cell.textContent = '';
            cell.style.backgroundColor = '#f0f0f0';
        }
        container.appendChild(cell);
    }
}

async function calculateMaterials(itemId) {
    try {
        const result = await CraftingCalculator.calculate({ [itemId]: 1 }, {});
        const formatted = CraftingCalculator.formatMaterialList(result, { [itemId]: 1 });
        modalState.resultDiv.textContent = formatted;
    } catch (e) {
        modalState.resultDiv.textContent = '计算失败：' + e.message;
    }
}

async function calculateSteps(itemId) {
    try {
        const result = await CraftingCalculator.calculate({ [itemId]: 1 }, {});
        const formatted = CraftingCalculator.formatCraftingSteps(result, { [itemId]: 1 });
        modalState.resultDiv.textContent = formatted;
    } catch (e) {
        modalState.resultDiv.textContent = '计算失败：' + e.message;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}