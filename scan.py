#!/usr/bin/env python3
"""
generate_manifest.py

扫描指定目录下的所有 .jsonl 文件，读取每个文件的元数据（第一行），
生成 manifest.json，包含文件名、版本、大小、作者、描述、强制标记等。
元数据中的 forced 字段优先，若未提供则根据文件名是否为 "Slimefun4.jsonl" 决定。

自动搜索 recipes 目录：从当前目录开始向下递归搜索，找到第一个名为 "recipes" 的文件夹。
"""

import os
import json
import argparse
from pathlib import Path
import zipfile

def find_recipes_dir(start_path=None):
    """从当前目录开始向下递归搜索 recipes 目录，返回第一个找到的 Path 对象，若找不到返回 None。"""
    if start_path is None:
        start_path = Path.cwd()
    else:
        start_path = Path(start_path).resolve()

    for root, dirs, files in os.walk(start_path):
        if "recipes" in dirs:
            return Path(root) / "recipes"
    return None

def read_metadata(file_path):
    """读取 JSONL 文件的第一行作为元数据，返回字典。"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            first_line = f.readline().strip()
            if not first_line:
                print(f"警告: 文件 {file_path} 为空")
                return {}
            metadata = json.loads(first_line)
            return metadata
    except Exception as e:
        print(f"警告: 无法解析文件 {file_path} 的元数据: {e}")
        return {}

def main():
    parser = argparse.ArgumentParser(description='生成配方文件的 manifest.json')
    parser.add_argument('--dir', help='配方文件目录 (默认: 自动向下递归搜索 recipes 目录)')
    args = parser.parse_args()

    # 确定 recipes 目录
    if args.dir:
        recipes_dir = Path(args.dir)
        if not recipes_dir.is_dir():
            print(f"错误: 指定的目录不存在: {recipes_dir}")
            return
    else:
        recipes_dir = find_recipes_dir()
        if not recipes_dir:
            print("错误: 无法找到 recipes 目录。请确保在当前目录或其子目录中存在 recipes 文件夹，或使用 --dir 参数指定。")
            return
        print(f"自动找到 recipes 目录: {recipes_dir}")

    manifest = {"files": []}
    jsonl_files = sorted(recipes_dir.glob("*.jsonl"))

    if not jsonl_files:
        print("警告: 未找到任何 .jsonl 文件")
        # 仍然生成空清单
    else:
        for file_path in jsonl_files:
            fname = file_path.name
            metadata = read_metadata(file_path)
            # 从元数据读取字段，若不存在则使用默认值
            name = metadata.get('name', fname)
            version = metadata.get('version', '1.0')
            description = metadata.get('description', '')
            author = metadata.get('author', '未知')
            # forced 字段优先使用元数据中的，若无则根据文件名判断
            forced = metadata.get('forced', fname == 'Slimefun4.jsonl')
            size = file_path.stat().st_size

            manifest["files"].append({
                "name": fname,
                "displayName": name,
                "version": version,
                "description": description,
                "author": author,
                "size": size,
                "forced": forced
            })
            print(f"已处理: {fname} (displayName={name}, version={version}, author={author}, forced={forced})")

    # 写入 manifest.json
    manifest_path = recipes_dir / "manifest.json"
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"\nmanifest.json 已生成: {manifest_path}")

    zip_path = recipes_dir / "recipes.zip"
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for jsonl_file in jsonl_files:
            zf.write(jsonl_file, arcname=jsonl_file.name)
    print(f"已打包 {len(jsonl_files)} 个文件到 {zip_path}")

if __name__ == "__main__":
    main()