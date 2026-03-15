// services/recipeLoader.js
import { saveItem, saveMetadata, getMetadata, getItem, clearItems } from './db.js';

const MANIFEST_URL = './recipes/manifest.json';

// 解析单个JSONL文件，返回元数据和物品数组（物品已添加_fileIndex和_line）
async function fetchRecipeFile(fileName, fileIndex) {
    const url = `./recipes/${fileName}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`下载失败: ${fileName}`);
    const text = await response.text();
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return { metadata: null, items: [] };

    const metadata = JSON.parse(lines[0]); // 第一行元数据
    const items = [];
    for (let i = 1; i < lines.length; i++) {
        try {
            const item = JSON.parse(lines[i]);
            // 添加顺序字段：文件索引（从0开始）和行号（从0开始）
            item._fileIndex = fileIndex;
            item._line = i - 1;
            items.push(item);
        } catch (e) {
            console.error(`解析文件 ${fileName} 第 ${i+1} 行失败:`, e);
        }
    }
    return { metadata, items };
}

// 主加载函数：强制重新加载所有文件以保持顺序
export async function loadAllRecipes(onProgress) {
    // 1. 获取清单
    const manifestResp = await fetch(MANIFEST_URL);
    const manifest = await manifestResp.json();
    const files = manifest.files; // 数组，按希望显示的顺序排列

    // 2. 清空所有现有物品（确保顺序完全从清单重建）
    await clearItems();

    const total = files.length;
    let completed = 0;

    // 3. 按清单顺序逐个下载并存储
    for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        try {
            const { metadata, items } = await fetchRecipeFile(file.name, idx);
            // 保存元数据
            await saveMetadata(file.name, { ...metadata, version: file.version });

            // 存储物品（检查ID冲突，保留首次出现）
            for (const item of items) {
                const existing = await getItem(item.id);
                if (!existing) {
                    await saveItem(item);
                } else {
                    // 可选：记录冲突日志，但不影响主流程
                    console.log(`物品ID ${item.id} 已存在，跳过（保留首次出现）`);
                }
            }
        } catch (e) {
            console.error(`处理文件 ${file.name} 失败:`, e);
        }
        completed++;
        onProgress(completed, total, `下载 ${file.name}...`);
    }

    onProgress(completed, total, '数据加载完成');
}

// 获取物品总数（用于判断是否需要首次加载）
export async function getItemCount() {
    const items = await getAllItems();
    return items.length;
}