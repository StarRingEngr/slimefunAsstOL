// app.js
import { loadAllRecipes, getItemCount } from './services/recipeLoader.js';
import { initBrowser } from './modules/browser.js';
import { initAbout } from './modules/about.js';

const menuItems = document.querySelectorAll('.menu-item');
const views = document.querySelectorAll('.view');
const loadingOverlay = document.getElementById('loading-overlay');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

let currentView = 'browser';

// 切换视图，如果目标视图容器为空则初始化对应模块
async function switchView(viewId) {
    // 隐藏所有视图
    views.forEach(view => view.classList.remove('active-view'));
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add('active-view');

    // 更新菜单激活状态
    menuItems.forEach(item => item.classList.remove('active'));
    const activeItem = Array.from(menuItems).find(item => item.dataset.view === viewId);
    if (activeItem) activeItem.classList.add('active');

    currentView = viewId;

    // 如果目标视图容器没有子元素（未初始化），则调用对应的初始化函数
    if (targetView && targetView.children.length === 0) {
        switch (viewId) {
            case 'browser':
                await initBrowser(targetView);
                break;
            case 'about':
                initAbout(targetView);
                break;
            // 其他视图暂留空（开发中）
            default:
                // 对于未实现功能的视图，可插入占位符
                targetView.innerHTML = '<div class="placeholder">功能开发中</div>';
        }
    }
}

// 更新进度条
function updateProgress(completed, total, message) {
    const percent = Math.round((completed / total) * 100);
    progressFill.style.width = percent + '%';
    progressText.textContent = message || `${percent}% (${completed}/${total})`;
}

// 首次加载流程
async function firstLoad() {
    const count = await getItemCount().catch(() => 0);
    if (count > 0) {
        // 有数据，直接隐藏遮罩并切换到初始视图
        loadingOverlay.classList.add('hidden');
        const initialView = window.location.hash.slice(1) || 'browser';
        await switchView(initialView);
        return;
    }

    // 无数据，显示加载遮罩
    loadingOverlay.classList.remove('hidden');
    updateProgress(0, 1, '准备下载...');

    try {
        await loadAllRecipes((completed, total, message) => {
            updateProgress(completed, total, message);
        });
        // 下载完成，隐藏遮罩，切换到初始视图
        loadingOverlay.classList.add('hidden');
        const initialView = window.location.hash.slice(1) || 'browser';
        await switchView(initialView);
    } catch (e) {
        console.error('加载失败', e);
        progressText.textContent = '加载失败，请刷新页面重试';
    }
}

// 绑定菜单点击事件
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        const viewId = item.dataset.view;
        switchView(viewId);
        // 更新 URL hash 以便刷新后恢复
        window.location.hash = viewId;
    });
});

// 启动应用
firstLoad();

// 监听 hash 变化，允许通过浏览器前进后退切换视图
window.addEventListener('hashchange', () => {
    const viewId = window.location.hash.slice(1) || 'browser';
    switchView(viewId);
});