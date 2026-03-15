#!/usr/bin/env python3
"""
generate_manifest.py

扫描指定目录下的所有 .jsonl 文件，读取每个文件的元数据（第一行），
生成 manifest.json，包含文件名、版本、大小和强制标记。
其中 Slimefun4.jsonl 被标记为强制启用 (forced: true)，其余为 false。
"""

import os
import json
import argparse
from pathlib import Path

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
    parser.add_argument('--dir', default='recipes', help='配方文件目录 (默认: ./recipes)')
    args = parser.parse_args()

    recipes_dir = Path(args.dir)
    if not recipes_dir.exists():
        print(f"错误: 目录 {recipes_dir} 不存在")
        return

    manifest = {"files": []}
    jsonl_files = sorted(recipes_dir.glob("*.jsonl"))

    if not jsonl_files:
        print("警告: 未找到任何 .jsonl 文件")
        # 仍然生成空清单
    else:
        for file_path in jsonl_files:
            fname = file_path.name
            metadata = read_metadata(file_path)
            version = metadata.get('version', '1.0')
            size = file_path.stat().st_size
            forced = (fname == "Slimefun4.jsonl")  # 主文件强制启用
            manifest["files"].append({
                "name": fname,
                "version": version,
                "size": size,
                "forced": forced
            })
            print(f"已处理: {fname} (version={version}, size={size}, forced={forced})")

    # 写入 manifest.json
    manifest_path = recipes_dir / "manifest.json"
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    print(f"\nmanifest.json 已生成: {manifest_path}")

if __name__ == "__main__":
    main()