// modules/about.js
import { clearItems } from '../services/db.js';

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
版本：v0.3.0 (MVP3)

当前功能：
- 物品浏览与搜索（按原始配方文件顺序显示）
- 配方数据本地缓存（IndexedDB）
- 多物品材料计算（支持库存扣除）

计划中功能：
- 物品详情（配方网格、基础材料计算）
- 基础材料管理
- 配方文件管理（导入/启用/禁用）
- 图文合成步骤

开发者：bilibili星環工程師
            </textarea>

            <div style="margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1rem;">
                <button id="clear-cache-btn" class="about-button" style="background-color: #ef4444;">🧹 清除本地缓存</button>
                <p style="font-size: 0.9rem; color: #64748b; margin-top: 0.5rem;">清除后将重新下载配方数据，当前页面将刷新。</p>
            </div>
        </div>
    `;

    const clearBtn = container.querySelector('#clear-cache-btn');
    clearBtn.addEventListener('click', async () => {
        if (confirm('确定清除所有本地缓存数据吗？页面将刷新并重新下载配方。')) {
            try {
                await clearItems(); // 清空物品库
                // 可选：同时清空元数据，但为了简单，只清空物品，下次启动会重新下载所有文件
                localStorage.clear(); // 可选
                window.location.reload();
            } catch (e) {
                alert('清除失败：' + e.message);
            }
        }
    });
}