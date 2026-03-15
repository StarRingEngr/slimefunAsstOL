// modules/browser.js
import { getAllItems } from '../services/db.js';

export async function initBrowser(container) {
    container.innerHTML = `
        <div class="search-box">
            <input type="text" id="search-input" placeholder="搜索物品名称或ID...">
        </div>
        <div class="item-list" id="item-list"></div>
    `;

    const searchInput = container.querySelector('#search-input');
    const listDiv = container.querySelector('#item-list');

    // 加载所有物品并按文件索引和行号排序
    let items = await getAllItems();
    // 排序：先按_fileIndex升序，再按_line升序
    items.sort((a, b) => {
        if (a._fileIndex !== b._fileIndex) return a._fileIndex - b._fileIndex;
        return a._line - b._line;
    });

    renderItems(items, listDiv);

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

    const html = items.map(item => `
        <div class="item-row" data-id="${item.id}">
            <span class="item-name">${escapeHtml(item.name)}</span>
            <span class="item-id">${escapeHtml(item.id)}</span>
        </div>
    `).join('');

    container.innerHTML = html;

    // 双击事件（暂为alert，后续替换）
    container.querySelectorAll('.item-row').forEach(row => {
        row.addEventListener('dblclick', () => {
            const id = row.dataset.id;
            alert(`双击物品：${id}\n后续将显示详情`);
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}