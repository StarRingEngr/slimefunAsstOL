// modules/baseMaterials.js
import { getAllItems } from '../services/db.js';
import { getBaseMaterials, setBaseMaterials, saveBaseMaterialsToDB } from '../services/dataStore.js';

let allItems = [];

export async function initBaseMaterials(container) {
    allItems = await getAllItems();
    allItems.sort((a, b) => {
        const fa = a._fileIndex !== undefined ? a._fileIndex : Infinity;
        const fb = b._fileIndex !== undefined ? b._fileIndex : Infinity;
        if (fa !== fb) return fa - fb;
        const la = a._line !== undefined ? a._line : Infinity;
        const lb = b._line !== undefined ? b._line : Infinity;
        return la - lb;
    });

    const baseMats = getBaseMaterials();

    container.innerHTML = `
        <div class="base-materials-container">
            <h2>基础材料管理</h2>
            <p>在此名单中的材料将被视为基础材料，计算材料时不会进一步展开配方。</p>
            <div class="base-controls">
                <button id="export-base">📤 导出名单</button>
                <button id="import-base">📥 导入名单</button>
                <input type="file" id="import-file" accept=".json" style="display:none;">
            </div>
            <div class="base-lists">
                <div class="base-available">
                    <h3>所有物品</h3>
                    <input type="text" id="search-available" placeholder="搜索...">
                    <select id="available-list" multiple size="15"></select>
                    <button id="add-to-base">➕ 添加选中为基础材料</button>
                </div>
                <div class="base-current">
                    <h3>基础材料名单</h3>
                    <input type="text" id="search-current" placeholder="搜索...">
                    <select id="current-list" multiple size="15"></select>
                    <button id="remove-from-base">➖ 移除选中</button>
                </div>
            </div>
            <div class="base-actions">
                <button id="save-base">保存更改</button>
            </div>
        </div>
    `;

    const availableSelect = container.querySelector('#available-list');
    const currentSelect = container.querySelector('#current-list');
    const searchAvailable = container.querySelector('#search-available');
    const searchCurrent = container.querySelector('#search-current');
    const addBtn = container.querySelector('#add-to-base');
    const removeBtn = container.querySelector('#remove-from-base');
    const saveBtn = container.querySelector('#save-base');
    const exportBtn = container.querySelector('#export-base');
    const importBtn = container.querySelector('#import-base');
    const importFile = container.querySelector('#import-file');

    function renderAvailable(filter = '') {
        const filterLower = filter.toLowerCase();
        const currentSet = new Set(getBaseMaterials());
        const available = allItems
            .filter(item => !currentSet.has(item.id))
            .filter(item => item.name.toLowerCase().includes(filterLower) || item.id.toLowerCase().includes(filterLower));
        // 不改变顺序，保持文件顺序
        availableSelect.innerHTML = available.map(item => `<option value="${item.id}">${item.name} (${item.id})</option>`).join('');
    }

    function renderCurrent(filter = '') {
        const filterLower = filter.toLowerCase();
        const current = getBaseMaterials()
            .map(id => allItems.find(i => i.id === id) || { id, name: id })
            .filter(item => item.name.toLowerCase().includes(filterLower) || item.id.toLowerCase().includes(filterLower))
            .sort((a, b) => a.id.localeCompare(b.id)); // 按ID排序
        currentSelect.innerHTML = current.map(item => `<option value="${item.id}">${item.name} (${item.id})</option>`).join('');
    }

    renderAvailable();
    renderCurrent();

    searchAvailable.addEventListener('input', () => renderAvailable(searchAvailable.value));
    searchCurrent.addEventListener('input', () => renderCurrent(searchCurrent.value));

    addBtn.addEventListener('click', () => {
        const selected = Array.from(availableSelect.selectedOptions).map(opt => opt.value);
        if (selected.length === 0) return;
        const newBase = [...getBaseMaterials(), ...selected];
        setBaseMaterials(newBase);
        renderAvailable(searchAvailable.value);
        renderCurrent(searchCurrent.value);
    });

    removeBtn.addEventListener('click', () => {
        const selected = Array.from(currentSelect.selectedOptions).map(opt => opt.value);
        if (selected.length === 0) return;
        const newBase = getBaseMaterials().filter(id => !selected.includes(id));
        setBaseMaterials(newBase);
        renderAvailable(searchAvailable.value);
        renderCurrent(searchCurrent.value);
    });

    saveBtn.addEventListener('click', async () => {
        await saveBaseMaterialsToDB(getBaseMaterials());
        alert('基础材料名单已保存');
    });

    exportBtn.addEventListener('click', () => {
        const data = JSON.stringify(getBaseMaterials(), null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'base_materials.json';
        a.click();
        URL.revokeObjectURL(url);
    });

    importBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (Array.isArray(imported)) {
                    setBaseMaterials(imported);
                    renderAvailable(searchAvailable.value);
                    renderCurrent(searchCurrent.value);
                } else {
                    alert('文件格式错误：需要 JSON 数组');
                }
            } catch (err) {
                alert('解析失败：' + err.message);
            }
        };
        reader.readAsText(file);
    });
}