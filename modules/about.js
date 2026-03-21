// modules/about.js
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
版本：v0.7.0

当前功能：
- 物品浏览与搜索（按原始配方文件顺序显示）
- 配方数据本地缓存（IndexedDB）
- 多物品材料计算（支持库存扣除）
- 基础材料管理（自定义基础材料名单）
- 配方文件管理（启用/禁用，增量更新）
- 设置（缓存统计、清除/重置）

开发者：bilibili星環工程師
            </textarea>

            <div class="acknowledgement">
                <h3>鸣谢</h3>
                <p>感谢以下开源项目提供的支持：</p>
                <ul>
                    <li><a href="https://github.com/ybw0014/slimefun-helper" target="_blank">Slimefun Helper</a> 作者：<strong>鬼斩</strong></li>
                    <li><a href="https://github.com/flycloudc/Utils-and-Games" target="_blank">Utils-and-Games</a> 作者：<strong>FLYC飘云</strong></li>
                </ul>
            </div>
        </div>
    `;
}