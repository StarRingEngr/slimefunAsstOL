#!/usr/bin/env python3
"""
convert_new_addon.py

基于主文件 Slimefun4.jsonl 的转换映射，为新的附属文件添加前缀并更新配方引用。
使用前请确保主文件已通过之前的规范化脚本处理过，并生成了 .bak 备份。
"""

import json
import shutil
from pathlib import Path

def read_jsonl(file_path):
    """读取 JSONL 文件，返回元数据和物品列表（按原顺序）。"""
    metadata = None
    items = []
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f if line.strip()]
        if not lines:
            return None, []
        metadata = json.loads(lines[0])
        for line in lines[1:]:
            try:
                items.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    except Exception as e:
        print(f"读取文件 {file_path} 失败: {e}")
        return None, []
    return metadata, items

def write_jsonl(file_path, metadata, items):
    """写入 JSONL 文件。"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(metadata, ensure_ascii=False) + "\n")
            for item in items:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")
        return True
    except Exception as e:
        print(f"写入文件 {file_path} 失败: {e}")
        return False

def get_new_id(old_id, prefix):
    """
    根据前缀生成新ID。
    如果 old_id 已经包含冒号，则替换冒号前的部分为 prefix。
    否则，返回 prefix + ":" + old_id。
    """
    if not prefix:
        return old_id
    prefix = prefix.rstrip(':')
    if ':' in old_id:
        return f"{prefix}:{old_id.split(':', 1)[1]}"
    else:
        return f"{prefix}:{old_id}"

def main():
    recipes_dir = Path.cwd() / "recipes"
    if not recipes_dir.is_dir():
        print("错误: 未找到 recipes 目录，请将脚本放在项目根目录。")
        return

    # 主文件及其备份
    main_file = recipes_dir / "Slimefun4.jsonl"
    main_bak = main_file.with_suffix(main_file.suffix + ".bak")
    if not main_file.exists() or not main_bak.exists():
        print("错误: 未找到主文件 Slimefun4.jsonl 或其备份文件，请确保已运行过规范化脚本。")
        return

    # 构建主文件映射（原始ID -> 新ID），假设物品顺序一致
    print("读取主文件转换映射...")
    _, orig_items = read_jsonl(main_bak)
    _, new_items = read_jsonl(main_file)
    if len(orig_items) != len(new_items):
        print("警告: 主文件备份和当前文件物品数量不一致，映射可能出错。")
    mapping = {}
    for i in range(min(len(orig_items), len(new_items))):
        orig_id = orig_items[i].get('id')
        new_id = new_items[i].get('id')
        if orig_id and new_id and new_id != orig_id:
            mapping[orig_id] = new_id
    print(f"从主文件获取到 {len(mapping)} 条转换映射。")

    # 列出所有 .jsonl 文件，让用户选择
    all_files = sorted(recipes_dir.glob("*.jsonl"))
    if not all_files:
        print("未找到任何 .jsonl 文件。")
        return

    print("\n可用的配方文件:")
    for idx, f in enumerate(all_files, 1):
        print(f"{idx}. {f.name}")
    print("\n请输入要转换的新文件编号: ", end='')
    try:
        choice = int(input().strip())
        if choice < 1 or choice > len(all_files):
            raise ValueError
        target_file = all_files[choice-1]
    except:
        print("输入无效，退出。")
        return

    # 输入前缀
    print(f"\n请输入要为 {target_file.name} 添加的前缀（不包含冒号，例如 'dynatech'）:")
    prefix = input().strip()
    prefix = prefix.rstrip(':')
    if not prefix:
        print("前缀为空，将不修改物品ID。")
    else:
        print(f"将使用前缀: {prefix}")

    # 处理目标文件
    print(f"\n处理文件: {target_file.name}")
    metadata, items = read_jsonl(target_file)
    if metadata is None:
        return

    # 备份
    backup_path = target_file.with_suffix(target_file.suffix + ".bak")
    try:
        shutil.copy2(target_file, backup_path)
        print(f"已备份到: {backup_path.name}")
    except Exception as e:
        print(f"备份失败: {e}，继续处理...")

    # 1. 为当前文件中的物品ID添加前缀，并记录内部映射
    internal_map = {}
    modified = False
    for item in items:
        old_id = item.get('id')
        if old_id:
            new_id = get_new_id(old_id, prefix)
            if new_id != old_id:
                internal_map[old_id] = new_id
                item['id'] = new_id
                modified = True

    # 2. 修改配方中的材料引用
    for item in items:
        recipe = item.get('recipe')
        if recipe and isinstance(recipe, list):
            for slot in recipe:
                if slot and isinstance(slot, dict) and 'material' in slot:
                    mat_id = slot['material']
                    new_mat_id = mat_id
                    # 优先主文件映射
                    if mat_id in mapping:
                        new_mat_id = mapping[mat_id]
                    # 其次当前文件内部映射
                    elif mat_id in internal_map:
                        new_mat_id = internal_map[mat_id]
                    if new_mat_id != mat_id:
                        slot['material'] = new_mat_id
                        modified = True

    if modified:
        if write_jsonl(target_file, metadata, items):
            print(f"✓ 已更新物品ID和配方引用")
        else:
            print(f"✗ 写入失败，请检查备份文件")
    else:
        print("无需修改，已跳过。")

    print("\n处理完成。")

if __name__ == "__main__":
    main()