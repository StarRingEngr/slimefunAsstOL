// modules/about.js
import { openDB } from '../services/db.js';   // 用于重置功能

export function initAbout(container) {
    container.innerHTML = `
        <div class="about-container">
            <h2>关于粘液科技助手</h2>
            <p>本程序是一个开源的《粘液科技》配方查询与材料计算工具。完全在浏览器本地运行，数据缓存在您的设备中。</p>
            
            <div class="about-buttons">
                <a href="https://space.bilibili.com/3493137687251407" target="_blank" class="about-button">📺 作者B站</a>
                <a href="https://github.com/StarRingEngr/slimefunAsstOL" target="_blank" class="about-button">📦 项目仓库</a>
                <a href="https://ifdian.net/a/StarRingEngr" target="_blank" class="about-button">☕ 赞助支持</a>
            </div>

            <h3>项目说明</h3>
            <textarea class="about-textarea" rows="8" readonly>
粘液科技助手 Web 版
版本：v0.4.0

当前功能：
- 物品浏览与搜索（按原始配方文件顺序显示）
- 配方数据本地缓存（IndexedDB）
- 多物品材料计算（支持库存扣除）
- 基础材料管理（自定义基础材料名单）
- 配置导入/导出、重置所有数据

开发者：bilibili星環工程師
            </textarea>

            <div style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
                <button id="clear-cache-btn" class="about-button" style="background-color: #ef4444;">🧹 清除缓存</button>
                <button id="reset-all-btn" class="about-button" style="background-color: #ef4444; margin-left: 1rem;">⚠️ 重置所有数据</button>
                <p style="font-size: 0.9rem; color: #64748b; margin-top: 0.5rem;">清除缓存仅删除物品数据，重置将清除所有配方和设置。</p>
            </div>
        </div>
    `;

    const clearBtn = container.querySelector('#clear-cache-btn');
    const resetBtn = container.querySelector('#reset-all-btn');

    clearBtn.addEventListener('click', async () => {
        if (confirm('确定清除所有缓存数据吗？页面将刷新并重新下载配方。')) {
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