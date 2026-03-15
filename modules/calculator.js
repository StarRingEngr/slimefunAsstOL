// modules/calculator.js
import { getAllItems } from '../services/db.js';
import { CraftingCalculator } from '../services/calculator.js';

let allItems = []; // 缓存所有物品
let targetItems = {}; // { id: quantity }
let ownedItems = {}; // { id: quantity }

export async function initCalculator(container) {
    // 加载所有物品
    allItems = await getAllItems();

    container.innerHTML = `
        <div class="calculator-layout">
            <div class="calc-left">
                <h3>目标物品</h3>
                <div class="item-selector">
                    <input type="text" id="target-search" placeholder="搜索物品...">
                    <select id="target-select" size="8"></select>
                    <div class="quantity-input">
                        <label>数量:</label>
                        <input type="number" id="target-quantity" value="1" min="1">
                        <button id="add-target">添加</button>
                    </div>
                </div>
                <div class="selected-list">
                    <h4>已选目标</h4>
                    <ul id="target-list"></ul>
                </div>
            </div>
            <div class="calc-right">
                <h3>库存物品</h3>
                <div class="item-selector">
                    <input type="text" id="owned-search" placeholder="搜索物品...">
                    <select id="owned-select" size="8"></select>
                    <div class="quantity-input">
                        <label>数量:</label>
                        <input type="number" id="owned-quantity" value="1" min="1">
                        <button id="add-owned">添加</button>
                    </div>
                </div>
                <div class="selected-list">
                    <h4>已有库存</h4>
                    <ul id="owned-list"></ul>
                </div>
            </div>
        </div>
        <div class="calc-actions">
            <button id="calc-materials">计算基础材料</button>
            <button id="calc-steps">合成步骤</button>
        </div>
        <div class="calc-result">
            <h3>计算结果</h3>
            <pre id="result-text"></pre>
            <div style="margin-top: 0.5rem;">
                <button id="download-result" class="about-button" style="background-color: #3498db;">📥 下载结果</button>
            </div>
        </div>
    `;
    // 初始化两个选择器
    const targetSelect = container.querySelector('#target-select');
    const ownedSelect = container.querySelector('#owned-select');
    const targetSearch = container.querySelector('#target-search');
    const ownedSearch = container.querySelector('#owned-search');
    const targetQuantity = container.querySelector('#target-quantity');
    const ownedQuantity = container.querySelector('#owned-quantity');
    const addTargetBtn = container.querySelector('#add-target');
    const addOwnedBtn = container.querySelector('#add-owned');
    const targetListEl = container.querySelector('#target-list');
    const ownedListEl = container.querySelector('#owned-list');
    const calcMaterialsBtn = container.querySelector('#calc-materials');
    const calcStepsBtn = container.querySelector('#calc-steps');
    const resultText = container.querySelector('#result-text');

    // 填充选择器
    function populateSelect(select, filter = '') {
        const filterLower = filter.toLowerCase();
        const options = allItems
            .filter(item => item.name.toLowerCase().includes(filterLower) || item.id.toLowerCase().includes(filterLower))
            .map(item => `<option value="${item.id}">${item.name} (${item.id})</option>`)
            .join('');
        select.innerHTML = options;
    }
    populateSelect(targetSelect);
    populateSelect(ownedSelect);

    targetSearch.addEventListener('input', () => populateSelect(targetSelect, targetSearch.value));
    ownedSearch.addEventListener('input', () => populateSelect(ownedSelect, ownedSearch.value));

    // 添加目标
    addTargetBtn.addEventListener('click', () => {
        const selected = targetSelect.value;
        if (!selected) return alert('请选择一个物品');
        const qty = parseInt(targetQuantity.value);
        if (isNaN(qty) || qty < 1) return alert('数量必须为正整数');
        targetItems[selected] = (targetItems[selected] || 0) + qty;
        renderTargetList();
    });

    // 添加库存
    addOwnedBtn.addEventListener('click', () => {
        const selected = ownedSelect.value;
        if (!selected) return alert('请选择一个物品');
        const qty = parseInt(ownedQuantity.value);
        if (isNaN(qty) || qty < 1) return alert('数量必须为正整数');
        ownedItems[selected] = (ownedItems[selected] || 0) + qty;
        renderOwnedList();
    });

    // 渲染目标列表
    function renderTargetList() {
        const entries = Object.entries(targetItems);
        if (entries.length === 0) {
            targetListEl.innerHTML = '<li>暂无目标</li>';
            return;
        }
        targetListEl.innerHTML = entries.map(([id, qty]) => {
            const name = allItems.find(i => i.id === id)?.name || id;
            return `<li>${name} (${id}) × ${qty} <button class="remove-target" data-id="${id}">移除</button></li>`;
        }).join('');
        // 绑定移除事件
        targetListEl.querySelectorAll('.remove-target').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                delete targetItems[id];
                renderTargetList();
            });
        });
    }

    // 渲染库存列表
    function renderOwnedList() {
        const entries = Object.entries(ownedItems);
        if (entries.length === 0) {
            ownedListEl.innerHTML = '<li>暂无库存</li>';
            return;
        }
        ownedListEl.innerHTML = entries.map(([id, qty]) => {
            const name = allItems.find(i => i.id === id)?.name || id;
            return `<li>${name} (${id}) × ${qty} <button class="remove-owned" data-id="${id}">移除</button></li>`;
        }).join('');
        ownedListEl.querySelectorAll('.remove-owned').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                delete ownedItems[id];
                renderOwnedList();
            });
        });
    }

    // 在 modules/calculator.js 中，calcMaterialsBtn 的事件监听部分
    calcMaterialsBtn.addEventListener('click', async () => {
        if (Object.keys(targetItems).length === 0) {
            alert('请至少添加一个目标物品');
            return;
        }
        try {
            const result = await CraftingCalculator.calculate(targetItems, ownedItems);
            // 传入 allItems 以获取名称
            const formatted = CraftingCalculator.formatMaterialList(result, targetItems, allItems);
            resultText.textContent = formatted;
        } catch (e) {
            console.error(e);
            resultText.textContent = '计算失败：' + e.message;
        }
    });

    // 计算步骤（暂未实现）
    calcStepsBtn.addEventListener('click', () => {
        alert('合成步骤功能开发中');
    });

    const downloadBtn = container.querySelector('#download-result');
    downloadBtn.addEventListener('click', () => {
        const text = resultText.textContent;
        if (!text || text === '计算结果' || text === '') {
            alert('没有可下载的结果');
            return;
        }
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '计算结果.txt';
        a.click();
        URL.revokeObjectURL(url);
    });
}