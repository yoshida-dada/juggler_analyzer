#!/usr/bin/env python3
"""
build.py

src/ 以下のモジュール群 (HTML/CSS/JS) を1枚の build/index.html に統合するビルドスクリプト。
Node.js 等のビルドツールに依存せず、標準ライブラリのみで動作する。

生成される build/index.html は単体で(サーバー不要・file:// でも)動作する。
PWA用の manifest.json / service-worker.js / icons はサーバー配信時にのみ意味を持つため、
build/ 配下に別ファイルとしてコピーする(単体HTML動作を妨げない)。

GitHub Pages は配信元として リポジトリ直下 か /docs フォルダしか選べないため、
build/ の内容をそのまま docs/ にもミラーリングする (GitHub Pages公開用)。
成果物としての正本はあくまで build/index.html であり、docs/ は配信用の複製。
"""

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / 'src'
BUILD = ROOT / 'build'
DOCS = ROOT / 'docs'

SCRIPT_ORDER = [
    'machineData.js',
    'calculator.js',
    'bayes.js',
    'charts.js',
    'ui.js',
    'app.js',
]


def build():
    BUILD.mkdir(exist_ok=True)
    (BUILD / 'icons').mkdir(exist_ok=True)

    html = (SRC / 'index.html').read_text(encoding='utf-8')
    css = (SRC / 'styles.css').read_text(encoding='utf-8')

    # <link rel="stylesheet" href="styles.css" /> -> <style>...</style>
    html = re.sub(
        r'<link rel="stylesheet" href="styles\.css"\s*/?>',
        f'<style>\n{css}\n</style>',
        html,
    )

    # 各 <script src="X.js"></script> をファイル内容のインラインに置換 (依存順を維持)
    for filename in SCRIPT_ORDER:
        js = (SRC / filename).read_text(encoding='utf-8')
        pattern = f'<script src="{filename}"></script>'
        replacement = f'<script>\n{js}\n</script>'
        if pattern not in html:
            raise RuntimeError(f'index.html 内に {pattern} が見つかりません')
        html = html.replace(pattern, replacement)

    (BUILD / 'index.html').write_text(html, encoding='utf-8')

    # PWA関連ファイルはサーバー配信用に別ファイルとしてコピーする
    shutil.copy(SRC / 'manifest.json', BUILD / 'manifest.json')
    shutil.copy(SRC / 'service-worker.js', BUILD / 'service-worker.js')
    for icon_file in ['apple-touch-icon.png', 'icon-192.png', 'icon-512.png']:
        shutil.copy(SRC / 'icons' / icon_file, BUILD / 'icons' / icon_file)

    # GitHub Pages配信用に docs/ へミラーリング (常に build/ の内容で上書き)
    if DOCS.exists():
        shutil.rmtree(DOCS)
    shutil.copytree(BUILD, DOCS)

    print(f'Build complete: {BUILD / "index.html"}')
    print(f'GitHub Pages mirror: {DOCS / "index.html"}')


if __name__ == '__main__':
    build()
