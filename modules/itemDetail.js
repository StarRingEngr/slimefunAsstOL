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
            <div class="quantity-control">
                <label for="detail-quantity">制作数量：</label>
                <input type="number" id="detail-quantity" min="1" value="1" step="1">
            </div>
            <h3>合成配方</h3>
            <div class="recipe-grid" id="recipe-grid"></div>
            <div class="detail-actions">
                <button class="calc-materials-btn">📋 计算材料</button>
                <button class="calc-steps-btn">📝 合成步骤</button>
            </div>
            <div class="result-header">
                <span>计算结果</span>
                <div class="result-tools">
                    <button class="copy-result-btn" title="复制到剪贴板">📋 复制</button>
                    <button class="download-result-btn" title="下载为文本文件">📥 下载</button>
                </div>
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

    const copyBtn = modal.querySelector('.copy-result-btn');
    const downloadBtn = modal.querySelector('.download-result-btn');
    copyBtn.onclick = copyResult;
    downloadBtn.onclick = downloadResult;

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

function getQuantity() {
    const input = activeModal.querySelector('#detail-quantity');
    let qty = parseInt(input.value, 10);
    if (isNaN(qty) || qty < 1) {
        qty = 1;
        input.value = 1;
    }
    return qty;
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
                cell.style.backgroundColor = '#dff4ff'; // 浅蓝表示不可展开
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
    const quantity = getQuantity();
    try {
        const result = await CraftingCalculator.calculate({ [itemId]: quantity }, {});
        const formatted = CraftingCalculator.formatMaterialList(result, { [itemId]: quantity });
        modalState.resultDiv.textContent = formatted;
    } catch (e) {
        modalState.resultDiv.textContent = '计算失败：' + e.message;
    }
}

async function calculateSteps(itemId) {
    const quantity = getQuantity();
    try {
        const result = await CraftingCalculator.calculate({ [itemId]: quantity }, {});
        const formatted = CraftingCalculator.formatCraftingSteps(result, { [itemId]: quantity });
        modalState.resultDiv.textContent = formatted;
    } catch (e) {
        modalState.resultDiv.textContent = '计算失败：' + e.message;
    }
}

function copyResult() {
    const text = modalState.resultDiv.textContent;
    if (!text || text === '') {
        alert('没有可复制的内容');
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        alert('已复制到剪贴板');
    }).catch(err => {
        alert('复制失败：' + err.message);
    });
}

function downloadResult() {
    const text = modalState.resultDiv.textContent;
    if (!text || text === '') {
        alert('没有可下载的内容');
        return;
    }
    // 生成文件名：基于当前物品和数量
    const currentItemId = modalState.history[modalState.currentIndex];
    const item = allItems.find(i => i.id === currentItemId);
    const quantity = getQuantity();
    const itemName = item ? item.name : currentItemId;
    const date = new Date();
    const timeStr = `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()} ${date.getHours()}.${date.getMinutes()}.${date.getSeconds()}`;
    const filename = `${quantity}个${itemName}_${timeStr}.txt`.replace(/[\\/*?:"<>|]/g, '_');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}