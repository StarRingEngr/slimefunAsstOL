// modules/recipeManager.js
import { openDB } from '../services/db.js';
import { loadFiles, deleteFiles } from '../services/recipeLoader.js';

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

        if (JSON.stringify(enabledFiles) === JSON.stringify(newEnabled)) {
            alert('设置无变化');
            return;
        }

        // 计算差异
        const oldSet = new Set(enabledFiles);
        const newSet = new Set(newEnabled);
        const toDelete = [...oldSet].filter(f => !newSet.has(f));
        const toAdd = [...newSet].filter(f => !oldSet.has(f));

        // 获取文件信息
        const filesToDelete = allFiles.filter(f => toDelete.includes(f.name));
        const filesToAdd = allFiles.filter(f => toAdd.includes(f.name));

        progressDiv.style.display = 'block';
        saveBtn.disabled = true;

        try {
            if (filesToDelete.length > 0) {
                await deleteFiles(filesToDelete.map(f => f.name), (completed, total) => {
                    const percent = Math.round((completed / total) * 100);
                    progressFill.style.width = percent + '%';
                });
            }
            if (filesToAdd.length > 0) {
                await loadFiles(filesToAdd, (completed, total, message) => {
                    const percent = Math.round((completed / total) * 100);
                    progressFill.style.width = percent + '%';
                });
            }

            // 保存新设置
            enabledFiles.length = 0;
            enabledFiles.push(...newEnabled);
            const db = await openDB();
            const tx = db.transaction('settings', 'readwrite');
            const store = tx.objectStore('settings');
            store.put(newEnabled, 'enabledFiles');
            await tx.complete;

            alert('设置已生效');
            window.location.reload(); // 刷新页面以重新构建关系
        } catch (e) {
            console.error(e);
            alert('更新失败：' + e.message);
        } finally {
            progressDiv.style.display = 'none';
            saveBtn.disabled = false;
        }
    });
}