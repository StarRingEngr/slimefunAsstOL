// services/recipeLoader.js
import { saveItems, saveMetadata, deleteItemsByFile, getAllItems } from './db.js';
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
            item.file = fileName;
            items.push(item);
        } catch (e) {
            console.error(`解析文件 ${fileName} 第 ${i+1} 行失败:`, e);
        }
    }
    return { metadata, items };
}

export async function loadFiles(filesToDownload, onProgress) {
    const total = filesToDownload.length;
    let completed = 0;

    for (let idx = 0; idx < filesToDownload.length; idx++) {
        const file = filesToDownload[idx];
        try {
            const { metadata, items } = await fetchRecipeFile(file.name, idx);
            await saveMetadata(file.name, { ...metadata, version: file.version });
            if (items.length > 0) {
                await saveItems(items);
            }
        } catch (e) {
            console.error(`处理文件 ${file.name} 失败:`, e);
        }
        completed++;
        if (onProgress) onProgress(completed, total, `下载 ${file.name}...`);
    }

    const allItems = await getAllItems();
    setItems(allItems);
    if (onProgress) onProgress(completed, total, '数据更新完成');
}

export async function deleteFiles(fileNames, onProgress) {
    const total = fileNames.length;
    for (let i = 0; i < fileNames.length; i++) {
        await deleteItemsByFile(fileNames[i]);
        if (onProgress) onProgress(i + 1, total, `删除 ${fileNames[i]} 的数据`);
    }
    const allItems = await getAllItems();
    setItems(allItems);
}

export async function getItemCount() {
    const items = await getAllItems();
    return items.length;
}