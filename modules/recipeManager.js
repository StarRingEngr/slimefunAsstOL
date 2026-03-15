// modules/recipeManager.js
import { openDB } from '../services/db.js';

export async function initRecipeManager(container) {
    // 获取 manifest.json
    const manifestResp = await fetch('./recipes/manifest.json');
    const manifest = await manifestResp.json();
    const allFiles = manifest.files; // [{ name, version, forced, size }]

    // 获取当前启用的文件列表（从 settings store）
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
            <p>勾选启用的配方文件，点击保存后刷新页面生效。</p>
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

    // 渲染表格
    function renderTable() {
        tbody.innerHTML = allFiles.map(file => {
            const isEnabled = enabledFiles.includes(file.name);
            const forcedAttr = file.forced ? 'checked disabled' : '';
            const enabledAttr = isEnabled ? 'checked' : '';
            return `
                <tr data-name="${file.name}">
                    <td><input type="checkbox" class="enable-checkbox" ${enabledAttr} ${forcedAttr}></td>
                    <td>${file.name}</td>
                    <td>${file.version}</td>
                    <td>${(file.size / 1024).toFixed(1)} KB</td>
                    <td>${file.forced ? '是' : '否'}</td>
                </tr>
            `;
        }).join('');
    }
    renderTable();

    saveBtn.addEventListener('click', async () => {
        const checkboxes = tbody.querySelectorAll('.enable-checkbox');
        const newEnabled = [];
        checkboxes.forEach(cb => {
            if (cb.checked) {
                const tr = cb.closest('tr');
                const name = tr.dataset.name;
                newEnabled.push(name);
            }
        });
        // 保存到 settings store
        const db = await openDB();
        const tx = db.transaction('settings', 'readwrite');
        const store = tx.objectStore('settings');
        store.put(newEnabled, 'enabledFiles');
        await tx.complete;
        if (confirm('设置已保存，需要刷新页面才能生效。是否立即刷新？')) {
            window.location.reload();
        }
    });
}