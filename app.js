// app.js
import { openDB } from './services/db.js';
import { loadFiles, getItemCount } from './services/recipeLoader.js';
import { initBrowser } from './modules/browser.js';
import { initAbout } from './modules/about.js';
import { initCalculator } from './modules/calculator.js';
import { initBaseMaterials } from './modules/baseMaterials.js';
import { initSettings } from './modules/settings.js';
import { initRecipeManager } from './modules/recipeManager.js';
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
        targetView.innerHTML = `
            <div class="view-loading">
                <div class="spinner"></div>
                <p>正在加载，请稍候...</p>
            </div>
        `;

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
            case 'recipe-manager':
                await initRecipeManager(targetView);
                break;
            case 'settings':
                await initSettings(targetView);
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
    const db = await openDB();

    const count = await getItemCount().catch(() => 0);
    if (count > 0) {
        // 已有数据，立即隐藏加载遮罩
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        const allItems = await getAllItems();
        setItems(allItems);
        await loadBaseMaterialsFromDB();
        const initialView = window.location.hash.slice(1) || 'browser';
        await switchView(initialView);
        return;
    }

    // 无数据，保持遮罩显示，并开始下载
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
    updateProgress(0, 1, '准备下载...');

    try {
        const tx = db.transaction('settings', 'readonly');
        const store = tx.objectStore('settings');
        const enabledFiles = await new Promise(resolve => {
            const req = store.get('enabledFiles');
            req.onsuccess = () => resolve(req.result || null);
        });

        const manifestResp = await fetch('./recipes/manifest.json');
        const manifest = await manifestResp.json();
        const allFiles = manifest.files;

        const forcedFiles = allFiles.filter(f => f.forced || f.name === 'Slimefun4.jsonl').map(f => f.name);
        let filesToDownload;
        if (enabledFiles === null) {
            filesToDownload = allFiles;
        } else {
            const enabledSet = new Set([...forcedFiles, ...enabledFiles]);
            filesToDownload = allFiles.filter(f => enabledSet.has(f.name));
        }

        filesToDownload.sort((a, b) => {
            const indexA = allFiles.findIndex(f => f.name === a.name);
            const indexB = allFiles.findIndex(f => f.name === b.name);
            return indexA - indexB;
        });

        await loadFiles(filesToDownload, (completed, total, message) => {
            updateProgress(completed, total, message);
        });

        if (enabledFiles === null) {
            const nonForced = allFiles.filter(f => !f.forced && f.name !== 'Slimefun4.jsonl').map(f => f.name);
            const saveTx = db.transaction('settings', 'readwrite');
            const saveStore = saveTx.objectStore('settings');
            saveStore.put(nonForced, 'enabledFiles');
            await saveTx.complete;
        }

        await loadBaseMaterialsFromDB();
        // 下载完成，隐藏加载遮罩
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        const initialView = window.location.hash.slice(1) || 'browser';
        await switchView(initialView);
    } catch (e) {
        console.error('加载失败', e);
        progressText.textContent = '加载失败，请刷新页面重试';
        // 出错后也隐藏遮罩，避免一直卡住
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
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

// ========== 手机端侧边栏折叠控制（支持 class fallback） ==========
document.addEventListener('DOMContentLoaded', () => {
    let menuToggle = document.getElementById('menuToggle');
    let sidebar = document.getElementById('sidebar');
    if (!menuToggle) {
        menuToggle = document.querySelector('.menu-toggle');
        if (menuToggle) console.log('通过 class 找到菜单按钮');
    }
    if (!sidebar) {
        sidebar = document.querySelector('.sidebar');
        if (sidebar) console.log('通过 class 找到侧边栏');
    }
    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });
        const content = document.querySelector('.content');
        if (content) {
            content.addEventListener('click', () => {
                if (sidebar.classList.contains('open')) {
                    sidebar.classList.remove('open');
                }
            });
        }
    } else {
        console.error('未找到菜单按钮或侧边栏元素，请检查 HTML');
    }
});