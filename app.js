// app.js
import { openDB } from './services/db.js';
import { loadAllRecipes, getItemCount } from './services/recipeLoader.js';
import { initBrowser } from './modules/browser.js';
import { initAbout } from './modules/about.js';
import { initCalculator } from './modules/calculator.js';
import { initBaseMaterials } from './modules/baseMaterials.js';
import { loadBaseMaterialsFromDB, setItems } from './services/dataStore.js';
import { getAllItems } from './services/db.js';

const menuItems = document.querySelectorAll('.menu-item');
const views = document.querySelectorAll('.view');
const loadingOverlay = document.getElementById('loading-overlay');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

let currentView = 'browser';

async function switchView(viewId) {
    views.forEach(view => view.classList.remove('active-view'));
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add('active-view');

    menuItems.forEach(item => item.classList.remove('active'));
    const activeItem = Array.from(menuItems).find(item => item.dataset.view === viewId);
    if (activeItem) activeItem.classList.add('active');

    currentView = viewId;

    if (targetView && targetView.children.length === 0) {
        switch (viewId) {
            case 'browser':
                await initBrowser(targetView);
                break;
            case 'calculator':
                await initCalculator(targetView);
                break;
            case 'base-materials':
                await initBaseMaterials(targetView);
                break;
            case 'about':
                initAbout(targetView);
                break;
            default:
                targetView.innerHTML = '<div class="placeholder">功能开发中</div>';
        }
    }
}

function updateProgress(completed, total, message) {
    const percent = Math.round((completed / total) * 100);
    progressFill.style.width = percent + '%';
    progressText.textContent = message || `${percent}% (${completed}/${total})`;
}

async function firstLoad() {
    await openDB();

    const count = await getItemCount().catch(() => 0);
    if (count > 0) {
        // 已有数据，加载到内存
        const allItems = await getAllItems();
        setItems(allItems);  // 关键修复：更新 idToName
        await loadBaseMaterialsFromDB();
        loadingOverlay.classList.add('hidden');
        const initialView = window.location.hash.slice(1) || 'browser';
        await switchView(initialView);
        return;
    }

    loadingOverlay.classList.remove('hidden');
    updateProgress(0, 1, '准备下载...');

    try {
        await loadAllRecipes((completed, total, message) => {
            updateProgress(completed, total, message);
        });
        await loadBaseMaterialsFromDB();
        loadingOverlay.classList.add('hidden');
        const initialView = window.location.hash.slice(1) || 'browser';
        await switchView(initialView);
    } catch (e) {
        console.error('加载失败', e);
        progressText.textContent = '加载失败，请刷新页面重试';
    }
}

menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewId = item.dataset.view;
        switchView(viewId);
        window.location.hash = viewId;
    });
});

firstLoad();

window.addEventListener('hashchange', () => {
    const viewId = window.location.hash.slice(1) || 'browser';
    switchView(viewId);
});