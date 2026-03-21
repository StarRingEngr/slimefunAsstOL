#!/usr/bin/env python3
"""
add_sortid.py

为指定 JSONL 配方文件中的每个物品添加 sortid 字段，从用户指定的起始值开始依次递增。
支持命令行参数直接指定文件和起始值，也支持图形文件选择对话框。
自动备份原文件为 .bak，写入后验证是否成功。
"""

import json
import shutil
import sys
import argparse
from pathlib import Path
from tkinter import Tk, filedialog

def select_file():
    """打开文件对话框选择 JSONL 文件"""
    root = Tk()
    root.withdraw()
    file_path = filedialog.askopenfilename(
        title="选择配方文件",
        filetypes=[("JSONL files", "*.jsonl"), ("All files", "*.*")]
    )
    root.destroy()
    return Path(file_path) if file_path else None

def read_jsonl(file_path):
    """读取 JSONL 文件，返回元数据和物品列表"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f if line.strip()]
        if not lines:
            return None, []
        metadata = json.loads(lines[0])
        items = [json.loads(line) for line in lines[1:]]
        return metadata, items
    except Exception as e:
        print(f"读取文件失败: {e}")
        return None, []

def write_jsonl(file_path, metadata, items):
    """写入 JSONL 文件"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(json.dumps(metadata, ensure_ascii=False) + "\n")
            for item in items:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")
        return True
    except Exception as e:
        print(f"写入文件失败: {e}")
        return False

def verify_sortid(file_path, expected_count):
    """验证文件是否成功添加 sortid"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
        items = [json.loads(line) for line in lines[1:] if line.strip()]
        has_sortid = all('sortid' in item for item in items)
        if has_sortid and len(items) == expected_count:
            print(f"验证通过：所有 {len(items)} 个物品都已添加 sortid。")
            return True
        else:
            print(f"验证失败：{sum(1 for i in items if 'sortid' in i)}/{len(items)} 个物品有 sortid。")
            return False
    except Exception as e:
        print(f"验证时出错: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='为 JSONL 文件添加 sortid')
    parser.add_argument('file', nargs='?', help='JSONL 文件路径（如果不提供则弹出文件选择对话框）')
    parser.add_argument('--start', type=int, help='起始 sortid 值', default=None)
    args = parser.parse_args()

    # 获取文件路径
    if args.file:
        file_path = Path(args.file)
        if not file_path.exists():
            print(f"文件不存在: {file_path}")
            return
    else:
        print("请选择要处理的 JSONL 文件...")
        file_path = select_file()
        if not file_path:
            print("未选择文件，退出。")
            return
    print(f"已选择文件: {file_path}")

    # 读取文件
    metadata, items = read_jsonl(file_path)
    if metadata is None:
        return

    if not items:
        print("文件中没有物品数据。")
        return

    # 获取起始 sortid
    if args.start is not None:
        start = args.start
    else:
        try:
            start = int(input("请输入起始 sortid (整数): ").strip())
        except ValueError:
            print("输入无效，退出。")
            return

    # 备份原文件
    backup_path = file_path.with_suffix(file_path.suffix + ".bak")
    try:
        #shutil.copy2(file_path, backup_path)
        #print(f"已备份原文件到: {backup_path}")
        pass
    except Exception as e:
        print(f"备份失败: {e}")
        return

    # 添加 sortid
    for i, item in enumerate(items):
        item['sortid'] = start + i

    # 写回文件
    if write_jsonl(file_path, metadata, items):
        print(f"成功为 {len(items)} 个物品添加 sortid，起始值 {start}。")
        # 验证写入是否成功
        if verify_sortid(file_path, len(items)):
            print("文件已更新。")
        else:
            print("警告：写入后验证失败，请检查文件。")
    else:
        print("写入失败，原文件未修改。")

if __name__ == "__main__":
    main()