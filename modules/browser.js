// modules/browser.js
import { getAllItems } from '../services/db.js';

export async function initBrowser(container) {
    // 渲染基础结构
    container.innerHTML = `
        <div class="search-box">
            <input type="text" id="search-input" placeholder="搜索物品名称或ID...">
        </div>
        <div class="item-list" id="item-list"></div>
    `;

    const searchInput = container.querySelector('#search-input');
    const listDiv = container.querySelector('#item-list');

    // 加载所有物品
    const items = await getAllItems();
    renderItems(items, listDiv);

    // 搜索过滤
    searchInput.addEventListener('input', (e) => {
        const keyword = e.target.value.trim().toLowerCase();
        if (!keyword) {
            renderItems(items, listDiv);
            return;
        }
        const filtered = items.filter(item =>
            item.name.toLowerCase().includes(keyword) ||
            (item.id && item.id.toLowerCase().includes(keyword))
        );
        renderItems(filtered, listDiv);
    });
}

function renderItems(items, container) {
    if (items.length === 0) {
        container.innerHTML = '<div class="item-row" style="justify-content:center;color:#94a3b8;">暂无物品</div>';
        return;
    }
    // 直接生成 HTML（如果物品数量巨大，可优化为分批插入或虚拟滚动，MVP1 先这样）
    const html = items.map(item => `
        <div class="item-row" data-id="${item.id}">
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span class="item-id">${escapeHtml(item.id)}</span>
        </div>
    `).join('');

    container.innerHTML = html;

    // 绑定双击事件（MVP1 先 alert，后续替换）
    container.querySelectorAll('.item-row').forEach(row => {
        row.addEventListener('dblclick', () => {
            const id = row.dataset.id;
            alert(`双击物品：${id}\n后续将显示详情`);
        });
    });
}

// 简单的转义，防止 XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}