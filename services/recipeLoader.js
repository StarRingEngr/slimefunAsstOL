// services/recipeLoader.js
import { saveItems, saveMetadata, getMetadata, clearItems } from './db.js';

// 获取清单文件
const MANIFEST_URL = './recipes/manifest.json';

// 解析单行 JSONL
function parseJSONL(text) {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return { metadata: null, items: [] };
    try {
        const metadata = JSON.parse(lines[0]); // 第一行是元数据
        const items = lines.slice(1).map(line => JSON.parse(line));
        return { metadata, items };
    } catch (e) {
        console.error('解析 JSONL 失败:', e);
        return { metadata: null, items: [] };
    }
}

// 下载单个文件
async function fetchRecipeFile(fileName) {
    const url = `./recipes/${fileName}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`下载失败: ${fileName}`);
    const text = await response.text();
    return parseJSONL(text);
}

// 检查是否需要更新
async function shouldUpdate(fileName, remoteMetadata) {
    const local = await getMetadata(fileName);
    if (!local) return true;
    // 简单版本比较：如果元数据中的 version 字段不同则更新
    return local.version !== remoteMetadata.version;
}

// 主加载函数：传入进度回调
export async function loadAllRecipes(onProgress) {
    // 1. 获取清单
    const manifestResp = await fetch(MANIFEST_URL);
    const manifest = await manifestResp.json();
    const files = manifest.files; // 数组，每个元素包含 name, version 等

    // 2. 检查哪些文件需要更新
    const needUpdate = [];
    for (const file of files) {
        const localMeta = await getMetadata(file.name);
        if (!localMeta || localMeta.version !== file.version) {
            needUpdate.push(file);
        }
    }

    if (needUpdate.length === 0) {
        // 无更新，直接完成
        onProgress(1, 1, '数据已是最新');
        return;
    }

    // 3. 需要更新，先清空物品库（简单处理，也可以增量更新，这里先清空）
    await clearItems();

    let completed = 0;
    const total = needUpdate.length;

    // 4. 逐个下载并存储
    for (const file of needUpdate) {
        try {
            const { metadata, items } = await fetchRecipeFile(file.name);
            // 保存元数据
            await saveMetadata(file.name, { ...metadata, version: file.version });
            // 保存物品
            if (items.length > 0) {
                await saveItems(items);
            }
        } catch (e) {
            console.error(`处理文件 ${file.name} 失败:`, e);
            // 继续处理下一个，不中断
        }
        completed++;
        onProgress(completed, total, `下载 ${file.name}...`);
    }

    onProgress(completed, total, '数据加载完成');
}

// 获取物品总数（用于判断是否需要首次加载）
export async function getItemCount() {
    const items = await getAllItems(); // 复用，但效率低，可优化
    return items.length;
}