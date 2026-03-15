// modules/recipeManager.js
import { openDB } from '../services/db.js';

export async function initRecipeManager(container) {
    const manifestResp = await fetch('./recipes/manifest.json');
    const manifest = await manifestResp.json();
    const allFiles = manifest.files;

    const db = await openDB();
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const enabledFiles = await new Promise(resolve => {
        const req = store.get('enabledFiles');
        req.onsuccess = () => resolve(req.result || []);
    });

    container.innerHTML = `
        <div class="recipe-manager">
            <h2>配方文件管理</h2>
            <p>勾选启用的配方文件，点击保存后刷新页面生效。强制文件不可禁用。</p>
            <table class="recipe-table">
                <thead>
                    <tr>
                        <th>启用</th>
                        <th>文件名</th>
                        <th>版本</th>
                        <th>大小</th>
                        <th>强制</th>
                    </tr>
                </thead>
                <tbody id="recipe-tbody"></tbody>
            </table>
            <div class="recipe-actions">
                <button id="save-recipe-btn">保存设置</button>
            </div>
        </div>
    `;

    const tbody = container.querySelector('#recipe-tbody');
    const saveBtn = container.querySelector('#save-recipe-btn');

    function renderTable() {
        tbody.innerHTML = allFiles.map(file => {
            // 强制文件：文件名 Slimefun4.jsonl 或 manifest 中 forced 为 true
            const isForced = file.forced || file.name === 'Slimefun4.jsonl';
            const isEnabled = isForced || enabledFiles.includes(file.name);
            const checkedAttr = isEnabled ? 'checked' : '';
            const disabledAttr = isForced ? 'disabled' : '';
            return `
                <tr data-name="${file.name}">
                    <td><input type="checkbox" class="enable-checkbox" ${checkedAttr} ${disabledAttr}></td>
                    <td>${file.name}</td>
                    <td>${file.version || '1.0'}</td>
                    <td>${(file.size / 1024).toFixed(1)} KB</td>
                    <td>${isForced ? '是' : '否'}</td>
                </tr>
            `;
        }).join('');
    }
    renderTable();

    saveBtn.addEventListener('click', async () => {
        const checkboxes = tbody.querySelectorAll('.enable-checkbox');
        const newEnabled = [];
        checkboxes.forEach(cb => {
            if (cb.checked && !cb.disabled) {
                const tr = cb.closest('tr');
                const name = tr.dataset.name;
                newEnabled.push(name);
            }
        });
        const db = await openDB();
        // 清空物品和元数据，强制下次重新下载
        const tx = db.transaction(['items', 'metadata', 'settings'], 'readwrite');
        tx.objectStore('items').clear();
        tx.objectStore('metadata').clear();
        tx.objectStore('settings').put(newEnabled, 'enabledFiles');
        await tx.complete;
        if (confirm('设置已保存，需要刷新页面重新加载数据。是否立即刷新？')) {
            window.location.reload();
        }
    });
}