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
            <p>勾选启用的配方文件，点击保存后立即生效。强制文件不可禁用。</p>
            <table class="recipe-table">
                <thead>
                    <tr>
                        <th>启用</th>
                        <th>名称</th>
                        <th>版本</th>
                        <th>配方文件作者</th>
                        <th>描述</th>
                        <th>大小</th>
                        <th>强制</th>
                    </tr>
                </thead>
                <tbody id="recipe-tbody"></tbody>
            </table>
            <div class="recipe-actions">
                <button id="save-recipe-btn">保存设置</button>
            </div>
            <div id="update-progress" style="display:none; margin-top:1rem;">
                <p>正在更新文件...</p>
                <div class="progress-bar"><div id="progress-fill" class="progress-fill" style="width:0%"></div></div>
            </div>
        </div>
    `;

    const tbody = container.querySelector('#recipe-tbody');
    const saveBtn = container.querySelector('#save-recipe-btn');
    const progressDiv = container.querySelector('#update-progress');
    const progressFill = container.querySelector('#progress-fill');

    function renderTable() {
        tbody.innerHTML = allFiles.map(file => {
            const isForced = file.forced || file.name === 'Slimefun4.jsonl';
            const isEnabled = isForced || enabledFiles.includes(file.name);
            const checkedAttr = isEnabled ? 'checked' : '';
            const disabledAttr = isForced ? 'disabled' : '';
            // 优先显示友好名称，若无则显示文件名
            const displayName = file.displayName || file.name;
            const author = file.author || '未知';
            const description = file.description || '';
            const sizeKB = (file.size / 1024).toFixed(1);
            return `
                <tr data-name="${file.name}">
                    <td><input type="checkbox" class="enable-checkbox" ${checkedAttr} ${disabledAttr}></td>
                    <td title="${file.name}">${escapeHtml(displayName)}</td>
                    <td>${escapeHtml(file.version)}</td>
                    <td>${escapeHtml(author)}</td>
                    <td title="${escapeHtml(description)}">${escapeHtml(description.slice(0,16))}${description.length > 30 ? '...' : ''}</td>
                    <td>${sizeKB} KB</td>
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

        if (JSON.stringify(enabledFiles) === JSON.stringify(newEnabled)) {
            alert('设置无变化');
            return;
        }

        // 计算差异并执行增量更新（此处代码与之前相同，略）
        // ... 省略增量更新逻辑（参考之前实现）
        // 更新后保存设置并刷新页面
        alert('设置已保存，需要刷新页面才能生效。');
        window.location.reload();
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}