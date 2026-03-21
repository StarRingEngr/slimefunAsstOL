// services/recipeLoader.js
import { saveItem, saveMetadata, clearItems, getAllItems } from './db.js';
import { setItems } from './dataStore.js';

const MANIFEST_URL = './recipes/manifest.json';
const ZIP_URL = './recipes/recipes.zip';

async function fetchZip() {
    const response = await fetch(ZIP_URL);
    if (!response.ok) throw new Error('下载 recipes.zip 失败');
    const blob = await response.blob();
    return blob;
}

async function parseZip(blob) {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const unzipped = fflate.unzipSync(uint8Array); // 同步解压，返回对象 { fileName: Uint8Array }
    const itemsByFile = [];
    for (const [fileName, data] of Object.entries(unzipped)) {
        if (!fileName.endsWith('.jsonl')) continue;
        const content = new TextDecoder().decode(data);
        const lines = content.split('\n').filter(l => l.trim());
        if (lines.length === 0) continue;
        const metadata = JSON.parse(lines[0]);
        const items = [];
        for (let i = 1; i < lines.length; i++) {
            try {
                const item = JSON.parse(lines[i]);
                item._fileIndex = itemsByFile.length;
                item._line = i - 1;
                item.file = fileName;
                items.push(item);
            } catch (e) {
                console.warn(`解析 ${fileName} 第 ${i+1} 行失败`, e);
            }
        }
        itemsByFile.push({ fileName, metadata, items });
    }
    return itemsByFile;
}

export async function loadAllRecipesFromZip(onProgress) {
    try {
        // 下载阶段
        onProgress(0, 1, '正在下载配方包...');
        const blob = await fetchZip();

        // 解压阶段
        onProgress(0, 1, '正在解压...');
        const itemsByFile = await parseZip(blob);

        // 写入数据库阶段
        await clearItems();
        let completed = 0;
        const total = itemsByFile.length;
        for (const { fileName, metadata, items } of itemsByFile) {
            await saveMetadata(fileName, metadata);
            for (const item of items) {
                await saveItem(item);
            }
            completed++;
            // 可选：更新百分比（但不显示文件名）
            onProgress(completed, total, `正在保存数据... ${Math.round(completed/total*100)}%`);
        }
        const allItems = await getAllItems();
        setItems(allItems);
        onProgress(1, 1, '数据加载完成');
        return true;
    } catch (e) {
        console.error('从 ZIP 加载失败', e);
        onProgress(1, 1, '加载失败，请刷新页面重试');
        return false;
    }
}

export async function getItemCount() {
    const items = await getAllItems();
    return items.length;
}