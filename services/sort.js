// services/sort.js
/**
 * 统一的物品排序函数
 * 优先级：
 * 1. sortid 存在且为数字 -> 按 sortid 升序（缺失或无效当作 0）
 * 2. 如果 sortid 相同（或都缺失），按 _fileIndex 升序
 * 3. 如果 _fileIndex 相同，按 _line 升序
 * 4. 如果 _line 相同，按物品名称升序（可选，保证稳定）
 */
export function sortItems(items) {
    return [...items].sort((a, b) => {
        // 1. sortid 优先级最高
        const sortA = (a.sortid !== undefined && typeof a.sortid === 'number') ? a.sortid : 0;
        const sortB = (b.sortid !== undefined && typeof b.sortid === 'number') ? b.sortid : 0;
        if (sortA !== sortB) return sortA - sortB;

        // 2. 文件分组（_fileIndex 越小越靠前）
        const fileA = a._fileIndex !== undefined ? a._fileIndex : Infinity;
        const fileB = b._fileIndex !== undefined ? b._fileIndex : Infinity;
        if (fileA !== fileB) return fileA - fileB;

        // 3. 文件内行号
        const lineA = a._line !== undefined ? a._line : Infinity;
        const lineB = b._line !== undefined ? b._line : Infinity;
        if (lineA !== lineB) return lineA - lineB;

        // 4. 按名称排序（保证稳定性）
        if (a.name && b.name) return a.name.localeCompare(b.name);
        return 0;
    });

}