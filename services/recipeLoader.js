// services/recipeLoader.js
import { saveItem, saveMetadata, getMetadata, getItem, clearItems, getAllItems } from './db.js';
import { setItems } from './dataStore.js';

const MANIFEST_URL = './recipes/manifest.json';

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

export async function loadAllRecipes(userEnabledFiles = null, onProgress) {
    const manifestResp = await fetch(MANIFEST_URL);
    const manifest = await manifestResp.json();
    const allFiles = manifest.files;

    // 确定强制文件：文件名 Slimefun4.jsonl 或 manifest 中 forced 为 true
    const forcedFiles = allFiles.filter(f => f.forced || f.name === 'Slimefun4.jsonl').map(f => f.name);

    let filesToDownload = [];
    if (userEnabledFiles === null) {
        filesToDownload = allFiles;
    } else {
        const enabledSet = new Set([...forcedFiles, ...userEnabledFiles]);
        filesToDownload = allFiles.filter(f => enabledSet.has(f.name));
    }

    // 按 manifest 中的原始顺序排序
    filesToDownload.sort((a, b) => {
        const indexA = allFiles.findIndex(f => f.name === a.name);
        const indexB = allFiles.findIndex(f => f.name === b.name);
        return indexA - indexB;
    });

    await clearItems();

    const total = filesToDownload.length;
    let completed = 0;

    for (let idx = 0; idx < filesToDownload.length; idx++) {
        const file = filesToDownload[idx];
        try {
            const { metadata, items } = await fetchRecipeFile(file.name, idx);
            await saveMetadata(file.name, { ...metadata, version: file.version });

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

    const allItems = await getAllItems();
    setItems(allItems);

    if (onProgress) onProgress(completed, total, '数据加载完成');
}

export async function getItemCount() {
    const items = await getAllItems();
    return items.length;
}