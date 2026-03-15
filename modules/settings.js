// modules/settings.js
import { openDB, getAllItems } from '../services/db.js';
import { getBaseMaterials } from '../services/dataStore.js';

export async function initSettings(container) {
    const items = await getAllItems();
    const db = await openDB();
    const tx = db.transaction(['metadata', 'settings'], 'readonly');
    const metadataStore = tx.objectStore('metadata');
    const metadataCount = await new Promise(resolve => {
        const countReq = metadataStore.count();
        countReq.onsuccess = () => resolve(countReq.result);
    });
    const settingsStore = tx.objectStore('settings');
    const enabledFiles = await new Promise(resolve => {
        const req = settingsStore.get('enabledFiles');
        req.onsuccess = () => resolve(req.result || []);
    });
    const baseMats = getBaseMaterials();

    // 获取 manifest 中的强制文件数
    let forcedCount = 0;
    try {
        const manifestResp = await fetch('./recipes/manifest.json');
        const manifest = await manifestResp.json();
        forcedCount = manifest.files.filter(f => f.forced || f.name === 'Slimefun4.jsonl').length;
    } catch (e) {
        console.error('无法读取 manifest.json', e);
    }

    const totalEnabled = forcedCount + enabledFiles.length;

    container.innerHTML = `
        <div class="settings-container">
            <h2>设置</h2>
            <div class="stats-card">
                <h3>缓存统计</h3>
                <p>物品总数：${items.length}</p>
                <p>配方文件数：${metadataCount}</p>
                <p>基础材料数：${baseMats.length}</p>
                <p>已启用的配方文件：${totalEnabled} 个</p>
            </div>
            <div class="danger-zone">
                <h3>危险操作</h3>
                <button id="clear-items-btn" class="danger-btn">🧹 清除物品缓存</button>
                <p class="note">仅清除物品数据，保留配方文件元数据和设置。</p>
                <button id="reset-all-btn" class="danger-btn">⚠️ 重置所有数据</button>
                <p class="note">清除所有物品、元数据、设置，恢复到首次打开状态。</p>
            </div>
        </div>
    `;

    const clearBtn = container.querySelector('#clear-items-btn');
    const resetBtn = container.querySelector('#reset-all-btn');

    clearBtn.addEventListener('click', async () => {
        if (confirm('确定清除所有物品缓存吗？页面将刷新并重新下载配方。')) {
            const db = await openDB();
            const tx = db.transaction(['items', 'metadata'], 'readwrite');
            tx.objectStore('items').clear();
            tx.objectStore('metadata').clear();
            await tx.complete;
            window.location.reload();
        }
    });

    resetBtn.addEventListener('click', async () => {
        if (confirm('确定重置所有数据吗？所有配方、基础材料和设置将被清除，页面将刷新。')) {
            const db = await openDB();
            const tx = db.transaction(['items', 'metadata', 'settings'], 'readwrite');
            tx.objectStore('items').clear();
            tx.objectStore('metadata').clear();
            tx.objectStore('settings').clear();
            await tx.complete;
            window.location.reload();
        }
    });
}