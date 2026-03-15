// services/recipeLoader.js
import { saveItem, saveMetadata, getMetadata, getItem, clearItems, getAllItems } from './db.js';
import { setItems } from './dataStore.js';

const MANIFEST_URL = './recipes/manifest.json';

// 解析单个JSONL文件，返回元数据和物品数组
async function fetchRecipeFile(fileName, fileIndex) {
    const url = `./recipes/${fileName}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`下载失败: ${fileName}`);
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return { metadata: null, items: [] };

    const metadata = JSON.parse(lines[0]);
    const items = [];
    for (let i = 1; i < lines.length; i++) {
        try {
            const item = JSON.parse(lines[i]);
            item._fileIndex = fileIndex;
            item._line = i - 1;
            items.push(item);
        } catch (e) {
            console.error(`解析文件 ${fileName} 第 ${i+1} 行失败:`, e);
        }
    }
    return { metadata, items };
}

/**
 * 加载配方文件
 * @param {Array} userEnabledFiles 用户在设置中启用的文件名列表（不包括强制文件）
 * @param {Function} onProgress 进度回调
 */
export async function loadAllRecipes(userEnabledFiles = null, onProgress) {
    // 1. 获取 manifest
    const manifestResp = await fetch(MANIFEST_URL);
    const manifest = await manifestResp.json();
    const allFiles = manifest.files; // [{ name, version, forced, size }]

    // 2. 确定要下载的文件列表
    let filesToDownload = [];
    if (userEnabledFiles === null) {
        // 首次加载且无设置：下载所有文件（强制 + 非强制）
        filesToDownload = allFiles;
    } else {
        // 根据用户启用的列表，加上强制文件
        const forcedFiles = allFiles.filter(f => f.forced).map(f => f.name);
        // 合并：强制文件 + 用户启用的非强制文件（去重）
        const enabledSet = new Set([...forcedFiles, ...userEnabledFiles]);
        filesToDownload = allFiles.filter(f => enabledSet.has(f.name));
    }

    // 按 manifest 中的原始顺序排序
    filesToDownload.sort((a, b) => {
        const indexA = allFiles.findIndex(f => f.name === a.name);
        const indexB = allFiles.findIndex(f => f.name === b.name);
        return indexA - indexB;
    });

    // 3. 清空现有物品（准备重新加载）
    await clearItems();

    const total = filesToDownload.length;
    let completed = 0;

    for (let idx = 0; idx < filesToDownload.length; idx++) {
        const file = filesToDownload[idx];
        try {
            const { metadata, items } = await fetchRecipeFile(file.name, idx);
            // 保存元数据
            await saveMetadata(file.name, { ...metadata, version: file.version });

            // 存储物品，检查ID冲突
            for (const item of items) {
                const existing = await getItem(item.id);
                if (!existing) {
                    await saveItem(item);
                } else {
                    console.log(`物品ID ${item.id} 已存在，跳过（保留首次出现）`);
                }
            }
        } catch (e) {
            console.error(`处理文件 ${file.name} 失败:`, e);
        }
        completed++;
        if (onProgress) onProgress(completed, total, `下载 ${file.name}...`);
    }

    // 更新内存数据
    const allItems = await getAllItems();
    setItems(allItems);

    if (onProgress) onProgress(completed, total, '数据加载完成');
}

// 获取物品总数（用于判断是否需要首次加载）
export async function getItemCount() {
    const items = await getAllItems();
    return items.length;
}