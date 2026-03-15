// modules/about.js
export function initAbout(container) {
    container.innerHTML = `
        <div class="about-container">
            <h2>关于粘液科技助手</h2>
            <p>本程序是一个开源的《粘液科技》配方查询与材料计算工具。完全在浏览器本地运行，数据缓存在您的设备中。</p>
            
            <div class="about-buttons">
                <a href="https://space.bilibili.com/3493137687251407" target="_blank" class="about-button">📺 作者B站</a>
                <a href="https://gitee.com/StarRingEngr/slimefun-recipe-assistant" target="_blank" class="about-button">📦 项目仓库</a>
                <a href="#" target="_blank" class="about-button">☕ 赞助支持</a>
            </div>

            <h3>项目说明</h3>
            <textarea class="about-textarea" rows="8" readonly>
粘液科技助手 Web 版
版本：v0.2.0 (MVP2)

当前功能：
- 物品浏览与搜索（按原始配方文件顺序显示）
- 配方数据本地缓存（IndexedDB）
- 支持多配方文件加载（按 manifest.json 顺序）

计划中功能：
- 物品详情（配方网格、基础材料计算）
- 多物品材料计算
- 基础材料管理
- 配方文件管理（导入/启用/禁用）
- 图文合成步骤

开发者：bilibili星環工程師
            </textarea>
        </div>
    `;
}