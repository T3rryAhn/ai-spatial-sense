#!/bin/sh
# 기존 진입점 호환: 슬라이드를 준비한다. 전체 위키는 npm run build로 빌드한다.
set -eu
cd "$(dirname "$0")/.."
node scripts/prepare-slides.mjs
