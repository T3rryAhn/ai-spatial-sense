#!/bin/sh
# embedding/index.html(artifact 원본, doctype 없음)을 단독 실행용 dist/index.html로 감싼다.
# <style> 이전 줄(title·meta·link)은 <head>로, 나머지는 <body>로 들어간다.
set -eu
cd "$(dirname "$0")/.."
SRC=embedding/index.html
mkdir -p dist
{
  printf '<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
  printf '<meta name="description" content="AI의 지능은 공간감각이다 — 임베딩·유사도·RAG·신경망·GPU를 한 장면씩 넘기며 체험하는 학습 자료">\n'
  awk '/^<style>/{exit} {print}' "$SRC"
  printf '</head>\n<body>\n'
  awk 'f{print; next} /^<style>/{f=1; print}' "$SRC"
  printf '</body>\n</html>\n'
} > dist/index.html
echo "built dist/index.html ($(wc -c < dist/index.html) bytes)"
