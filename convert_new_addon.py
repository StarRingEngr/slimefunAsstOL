#!/usr/bin/env python3
"""
convert_json_to_jsonl.py

将标准 JSON 数组文件（物品列表）转换为 JSONL 格式，自动添加元数据行，
并根据主文件（Slimefun4.jsonl）的转换映射为物品 ID 和配方引用添加前缀。
支持批量处理多个文件，为每个文件单独指定前缀。
"""

import os
import json
import shutil
from pathlib import Path

def read_json_array(file_path):
    """读取 JSON 数组文件，返回物品列表。"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        if not isinstance(data, list):
            raise ValueError("文件不是 JSON 数组")
        return data
    except Exception as e:
        print(f"读取文件 {file_path} 失败: {e}")
        return None

def get_metadata_input(default_name):
    """交互式输入元数据信息。"""
    print(f"\n请输入元数据信息 (直接回车使用默认值):")
    name = input(f"名称 (默认: {default_name}): ").strip()
    if not name:
        name = default_name
    version = input("版本 (默认: 1.0): ").strip()
    if not version:
        version = "1.0"
    description = input("描述 (默认: 自动生成的配方文件): ").strip()
    if not description:
        description = "自动生成的配方文件"
    author = input("作者 (默认: 未知): ").strip()
    if not author:
        author = "未知"
    forced = input("是否强制启用 (true/false, 默认: false): ").strip().lower()
    if forced in ('true', 'yes', '1'):
        forced = True
    else:
        forced = False
    return {
        "name": name,
        "version": version,
        "description": description,
        "author": author,
        "forced": forced
    }

def get_new_id(old_id, prefix):
    """根据前缀生成新ID。"""
    if not prefix:
        return old_id
    prefix = prefix.rstrip(':')
    if ':' in old_id:
        return f"{prefix}:{old_id.split(':', 1)[1]}"
    else:
        return f"{prefix}:{old_id}"

def convert_items(items, prefix, mapping):
    """
    转换物品列表：
    - 为物品 ID 添加前缀（prefix）
    - 更新配方中的材料引用（优先使用 mapping，其次使用本文件内部的新ID）
    返回修改后的物品列表和内部映射。
    """
    new_items = []
    internal_map = {}
    # 第一步：构建内部映射（旧ID -> 新ID）
    for item in items:
        old_id = item.get('id')
        if old_id:
            new_id = get_new_id(old_id, prefix)
            if new_id != old_id:
                internal_map[old_id] = new_id
    # 第二步：修改物品ID和配方引用
    for item in items:
        new_item = item.copy()
        old_id = item.get('id')
        if old_id and old_id in internal_map:
            new_item['id'] = internal_map[old_id]
        # 处理配方
        recipe = new_item.get('recipe')
        if recipe and isinstance(recipe, list):
            new_recipe = []
            for slot in recipe:
                if slot and isinstance(slot, dict) and 'material' in slot:
                    mat_id = slot['material']
                    new_mat_id = mat_id
                    # 优先使用主文件映射
                    if mat_id in mapping:
                        new_mat_id = mapping[mat_id]
                    # 其次使用内部映射
                    elif mat_id in internal_map:
                        new_mat_id = internal_map[mat_id]
                    if new_mat_id != mat_id:
                        slot = slot.copy()
                        slot['material'] = new_mat_id
                new_recipe.append(slot)
            new_item['recipe'] = new_recipe
        new_items.append(new_item)
    return new_items, internal_map

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

def main():
    # 定位 recipes 目录
    recipes_dir = Path.cwd() / "recipes"
    if not recipes_dir.is_dir():
        print("错误: 未找到 recipes 目录，请将脚本放在项目根目录。")
        return

    # 主文件映射
    main_file = recipes_dir / "Slimefun4.jsonl"
    main_bak = main_file.with_suffix(main_file.suffix + ".bak")
    if not main_file.exists() or not main_bak.exists():
        print("错误: 未找到主文件 Slimefun4.jsonl 或其备份，请确保已运行过规范化脚本。")
        return

    print("读取主文件转换映射...")
    # 读取主文件备份和当前版本，建立映射
    def read_jsonl_items(file_path):
        items = []
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = [line.strip() for line in f if line.strip()]
            if lines:
                for line in lines[1:]:
                    items.append(json.loads(line))
        except:
            pass
        return items
    orig_items = read_jsonl_items(main_bak)
    new_items = read_jsonl_items(main_file)
    mapping = {}
    for i in range(min(len(orig_items), len(new_items))):
        oid = orig_items[i].get('id')
        nid = new_items[i].get('id')
        if oid and nid and nid != oid:
            mapping[oid] = nid
    print(f"获取到 {len(mapping)} 条主文件转换映射。")

    # 获取要转换的 JSON 文件列表
    print("\n请输入要转换的 JSON 文件路径（多个文件用空格分隔），或直接拖入文件: ")
    input_str = input().strip()
    if not input_str:
        print("未输入文件，退出。")
        return
    file_paths = [Path(p.strip()) for p in input_str.split()]
    # 过滤不存在的文件
    valid_files = []
    for p in file_paths:
        if p.exists() and p.suffix.lower() == '.json':
            valid_files.append(p)
        else:
            print(f"警告: 文件不存在或不是 JSON: {p}")
    if not valid_files:
        print("没有有效的 JSON 文件。")
        return

    # 逐个处理
    for src_path in valid_files:
        print(f"\n处理文件: {src_path.name}")
        items = read_json_array(src_path)
        if items is None:
            continue

        # 输入前缀
        prefix = input(f"请输入该文件的前缀（不包含冒号，例如 'dynatech'，直接回车则跳过该文件）: ").strip()
        prefix = prefix.rstrip(':')
        if not prefix:
            print("跳过该文件（前缀为空）。")
            continue

        # 输入元数据
        default_name = src_path.stem  # 文件名（不含扩展名）作为默认名称
        metadata = get_metadata_input(default_name)

        # 转换物品
        new_items, internal = convert_items(items, prefix, mapping)
        # 输出文件名：原文件名 + .jsonl
        out_name = src_path.stem + ".jsonl"
        out_path = recipes_dir / out_name
        # 如果已存在，询问是否覆盖
        if out_path.exists():
            ans = input(f"目标文件 {out_path.name} 已存在，是否覆盖？(y/n): ").strip().lower()
            if ans != 'y':
                print("跳过该文件。")
                continue

        # 备份
        backup = out_path.with_suffix(out_path.suffix + ".bak")
        if out_path.exists():
            shutil.copy2(out_path, backup)
            print(f"已备份现有文件到 {backup.name}")
        else:
            print("创建新文件。")

        # 写入
        if write_jsonl(out_path, metadata, new_items):
            print(f"✓ 已成功转换为 {out_path.name}")
        else:
            print(f"✗ 写入失败")

    print("\n所有文件处理完成。")

if __name__ == "__main__":
    main()