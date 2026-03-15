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

export async function loadAllRecipes(onProgress) {
    const manifestResp = await fetch(MANIFEST_URL);
    const manifest = await manifestResp.json();
    const files = manifest.files;

    await clearItems();

    const total = files.length;
    let completed = 0;

    for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
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
        onProgress(completed, total, `下载 ${file.name}...`);
    }

    // 更新内存数据
    const allItems = await getAllItems();
    setItems(allItems);

    onProgress(completed, total, '数据加载完成');
}

export async function getItemCount() {
    const items = await getAllItems();
    return items.length;
}