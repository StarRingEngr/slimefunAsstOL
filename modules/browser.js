// modules/browser.js
import { getAllItems } from '../services/db.js';
import { getMetadataCount } from '../services/db.js';
import { showItemDetail } from './itemDetail.js';

export async function initBrowser(container) {
    const items = await getAllItems();
    const fileCount = await getMetadataCount();

    container.innerHTML = `
        <div class="stats-bar">
            <span>📦 当前加载物品数: ${items.length}</span>
            <span>📁 配方文件数: ${fileCount}</span>
        </div>
        <div class="search-box">
            <input type="text" id="search-input" placeholder="搜索物品名称或ID...">
        </div>
        <div class="item-list" id="item-list"></div>
    `;

    const searchInput = container.querySelector('#search-input');
    const listDiv = container.querySelector('#item-list');

    items.sort((a, b) => {
        const fa = a._fileIndex !== undefined ? a._fileIndex : Infinity;
        const fb = b._fileIndex !== undefined ? b._fileIndex : Infinity;
        if (fa !== fb) return fa - fb;
        const la = a._line !== undefined ? a._line : Infinity;
        const lb = b._line !== undefined ? b._line : Infinity;
        return la - lb;
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

    container.querySelectorAll('.item-row').forEach(row => {
        row.addEventListener('dblclick', () => {
            const id = row.dataset.id;
            showItemDetail(id);
        });
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}