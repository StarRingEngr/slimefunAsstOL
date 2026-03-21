// app.js
import { openDB } from './services/db.js';
import { loadFiles, loadItemsFromDB, syncRecipes, getItemCount } from './services/recipeLoader.js';
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

    // 获取服务器 manifest
    let manifest;
    try {
        const resp = await fetch('./recipes/manifest.json');
        manifest = await resp.json();
    } catch (e) {
        console.error('无法获取 manifest.json', e);
        loadingOverlay.classList.add('hidden');
        return;
    }
    const allFiles = manifest.files;

    // 获取本地 metadata
    const localMetadata = {};
    const metaTx = db.transaction('metadata', 'readonly');
    const metaStore = metaTx.objectStore('metadata');
    const keys = await new Promise(resolve => {
        const req = metaStore.getAllKeys();
        req.onsuccess = () => resolve(req.result);
    });
    for (const key of keys) {
        const value = await new Promise(resolve => {
            const req = metaStore.get(key);
            req.onsuccess = () => resolve(req.result);
        });
        localMetadata[key] = value;
    }

    // 检查更新
    let hasUpdate = false;
    if (Object.keys(localMetadata).length > 0 || allFiles.length > 0) {
        loadingOverlay.classList.remove('hidden');
        updateProgress(0, 1, '检查更新...');
        try {
            hasUpdate = await syncRecipes(allFiles, localMetadata, (completed, total, msg) => {
                updateProgress(completed, total, msg);
            });
        } catch (e) {
            console.error('同步更新失败', e);
        }
        if (!hasUpdate) {
            loadingOverlay.classList.add('hidden');
        }
    }

    // 读取用户启用列表
    // 使用独立事务读取 settings
    const settingsTx = db.transaction('settings', 'readonly');
    const settingsStore = settingsTx.objectStore('settings');
    
    // 检查存储中是否有 enabledFiles 键
    const enabledFilesExist = await new Promise(resolve => {
        const req = settingsStore.get('enabledFiles');
        req.onsuccess = () => resolve(req.result !== undefined);
    });
    
    let enabledFiles = await new Promise(resolve => {
        const req = settingsStore.get('enabledFiles');
        req.onsuccess = () => resolve(req.result || []);
    });
    
    await settingsTx.complete; // 释放事务

    // 如果从未设置过，则自动填充默认的非强制文件列表
    if (!enabledFilesExist) {
        const nonForced = allFiles.filter(f => !f.forced && f.name !== 'Slimefun4.jsonl').map(f => f.name);
        const saveTx = db.transaction('settings', 'readwrite');
        const saveStore = saveTx.objectStore('settings');
        saveStore.put(nonForced, 'enabledFiles');
        await saveTx.complete;
        enabledFiles = nonForced;
    }

    const forcedFiles = allFiles.filter(f => f.forced || f.name === 'Slimefun4.jsonl').map(f => f.name);

    // 从数据库加载筛选后的物品
    const allItems = await getAllItems();
    const enabledSet = new Set([...forcedFiles, ...enabledFiles]);
    const filteredItems = allItems.filter(item => enabledSet.has(item.file));
    setItems(filteredItems);
    await loadBaseMaterialsFromDB();

    loadingOverlay.classList.add('hidden');
    const initialView = window.location.hash.slice(1) || 'browser';
    await switchView(initialView);
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

// 手机端侧边栏折叠控制
document.addEventListener('DOMContentLoaded', () => {
    let menuToggle = document.getElementById('menuToggle');
    let sidebar = document.getElementById('sidebar');
    if (!menuToggle) {
        menuToggle = document.querySelector('.menu-toggle');
    }
    if (!sidebar) {
        sidebar = document.querySelector('.sidebar');
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
    }
});