// app.js
import { loadAllRecipes, getItemCount } from './services/recipeLoader.js';
import { initBrowser } from './modules/browser.js';

// 获取 DOM 元素
const menuItems = document.querySelectorAll('.menu-item');
const views = document.querySelectorAll('.view');
const loadingOverlay = document.getElementById('loading-overlay');
const progressFill = document.getElementById('progress-fill');
const progressText = document.getElementById('progress-text');

// 当前激活的视图
let currentView = 'browser';

// 切换视图
function switchView(viewId) {
    views.forEach(view => view.classList.remove('active-view'));
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) targetView.classList.add('active-view');

    menuItems.forEach(item => item.classList.remove('active'));
    const activeItem = Array.from(menuItems).find(item => item.dataset.view === viewId);
    if (activeItem) activeItem.classList.add('active');

    currentView = viewId;

    // 如果切换到 browser 且尚未初始化，可在此处初始化
    // 但为了简单，我们在首次加载数据后统一初始化
}

// 初始化所有视图（目前只有 browser）
async function initializeViews() {
    if (currentView === 'browser') {
        const browserContainer = document.getElementById('view-browser');
        await initBrowser(browserContainer);
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
    // 检查是否有数据
    const count = await getItemCount().catch(() => 0);
    if (count > 0) {
        // 有数据，直接初始化
        loadingOverlay.classList.add('hidden');
        await initializeViews();
        return;
    }

    // 无数据，显示加载遮罩
    loadingOverlay.classList.remove('hidden');
    updateProgress(0, 1, '准备下载...');

    try {
        await loadAllRecipes((completed, total, message) => {
            updateProgress(completed, total, message);
        });
        // 下载完成，隐藏遮罩，初始化视图
        loadingOverlay.classList.add('hidden');
        await initializeViews();
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
    });
});

// 启动应用
firstLoad();