// services/recipeLoader.js
import { saveItem, saveMetadata, getItem, getAllItems, clearItems, deleteItemsByFile, deleteMetadata } from './db.js';
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
            for (const item of items) {
                const existing = await getItem(item.id);
                if (!existing) {
                    await saveItem(item);
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

export async function loadItemsFromDB(enabledFiles, forcedFiles) {
    const enabledSet = new Set([...forcedFiles, ...enabledFiles]);
    const allItems = await getAllItems();
    const filteredItems = allItems.filter(item => enabledSet.has(item.file));
    setItems(filteredItems);
    return filteredItems;
}

export async function syncRecipes(serverFiles, localMetadata, onProgress) {
    const toDelete = Object.keys(localMetadata).filter(f => !serverFiles.some(sf => sf.name === f));
    const toUpdate = serverFiles.filter(sf => {
        const local = localMetadata[sf.name];
        return !local || local.version !== sf.version;
    });

    if (toDelete.length === 0 && toUpdate.length === 0) {
        return false;
    }

    let completed = 0;
    const total = toUpdate.length;

    for (const fileName of toDelete) {
        await deleteItemsByFile(fileName);
        await deleteMetadata(fileName);
    }

    for (const file of toUpdate) {
        try {
            const { metadata, items } = await fetchRecipeFile(file.name, 0);
            await deleteItemsByFile(file.name);
            await saveMetadata(file.name, { ...metadata, version: file.version });
            for (const item of items) {
                await saveItem(item);
            }
        } catch (e) {
            console.error(`更新文件 ${file.name} 失败:`, e);
        }
        completed++;
        if (onProgress) onProgress(completed, total, `更新 ${file.name}...`);
    }
    return true;
}

export async function getItemCount() {
    const items = await getAllItems();
    return items.length;
}