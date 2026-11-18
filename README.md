# T3rry Study

AI·CS 기초·네트워크·운영체제를 배우고 기록하는 한국어 학습 위키입니다. Astro + Starlight의 카테고리 사이드바, 페이지 목차, Pagefind 검색, 다크모드, 모바일 메뉴와 이전/다음 문서를 사용합니다. 추적·분석 스크립트는 넣지 않습니다.

## 실행과 빌드

Node.js 24 LTS 기준입니다. Windows PowerShell에서는 `npm.cmd`를 사용합니다.

```sh
npm ci
npm run dev
npm run build
npm run preview
```

`predev`와 `prebuild`가 슬라이드를 먼저 준비합니다. 최종 배포 대상은 `dist/` 전체입니다. 검색 인덱스는 프로덕션 빌드에서 생성되므로 검색 검증은 빌드 후 preview/정적 서버에서 합니다.

```sh
node scripts/serve-check.mjs dist  # 127.0.0.1:4321, 배포 CSP를 적용하는 검증 서버
node scripts/check-site.cjs       # 별도 터미널, Playwright + Edge 필요
docker build -t ai-spatial-sense:2.0.0 .
```

Playwright는 사이트 의존성이 아닙니다. 검증용 설치 경로를 `NODE_PATH`에 지정할 수 있습니다. `check-slides.cjs`는 수정 전 파일이 `.artifacts/before/index.html`, 수정 후 파일이 `.artifacts/ai/spatial-sense/index.html`에 있는 서버(`node scripts/serve-check.mjs .artifacts`)와 비교합니다. 스크린샷·측정 결과는 `.artifacts/`에 저장합니다.

## 문서 추가

`src/content/docs/<category>/<문서이름>.md` 또는 `.mdx`를 추가합니다. 예: `src/content/docs/network/dns.md`.

```yaml
---
title: DNS
description: 이 문서에서 다루는 내용을 한 문장으로 적습니다.
sidebar:
  order: 10
---
```

파일을 추가하면 사이드바와 해당 카테고리의 문서 목차에 자동으로 표시됩니다. `sidebar.order`가 낮을수록 먼저 나옵니다. 카테고리의 `index.mdx`는 0으로 둡니다. 각 문서의 `##`/`###` 제목은 오른쪽 페이지 목차가 됩니다.

카테고리 순서·라벨·홈 카드 설명은 **`src/categories.mjs` 한 곳**에서 관리합니다. 새 카테고리는 여기에 항목을 추가하고 해당 폴더와 `index.mdx`를 만듭니다. 카테고리 index의 `CategoryContents`에 같은 slug를 전달하면 문서 목차가 자동 생성됩니다. 아직 작성하지 않은 내용은 준비 중 안내와 예정 제목만 적습니다.

## AI 인터랙티브 학습 자료

- 위키 개요·장면 목차: `/ai/spatial-sense-guide/`
- 슬라이드: `/ai/spatial-sense/`, 직접 장면 링크: `/ai/spatial-sense/#20`
- 원본: `embedding/index.html` (기존 artifact 형식 보존)
- 1편 「말은 어떻게 숫자가 될까」 38장, 2편 「그 숫자는 어떻게 계산될까」 11장, 별도 시작 목차 1장
- 슬라이드 상단 **목차**에서 편·섹션별로 이동, Esc로 닫기, **위키로**에서 AI 카테고리로 복귀
- 기존 `/#N` 링크는 홈에서 슬라이드의 같은 번호로 이동

`scripts/prepare-slides.mjs`는 원본을 단독 HTML로 감싸 `public/ai/spatial-sense/index.html`을 만들고, 실제 `CH`·`PARTS`·`BEATS`에서 위키용 장면 제목을 추출합니다. 생성 파일은 Git에서 제외합니다. `sh scripts/build.sh`도 같은 준비 작업을 실행합니다. 원본 장면 선언 구조를 바꾸면 추출 스크립트도 확인해야 합니다.

1200px 이상 화면은 본문 폭을 1240px, grid 간격을 32px로 제한합니다. 1200px 미만의 본문 CSS는 기존과 같습니다. 슬라이드는 기존 Google Fonts 링크를 유지하며, 글꼴 연결이 없으면 시스템 글꼴을 사용합니다. 위키는 시스템 글꼴을 사용합니다.

학습 자료는 문병로 교수 강연 「AI 기술의 새 사조」의 아이디어를 참고해 그림과 설명을 새로 만든 것입니다. 강연 슬라이드 원본은 포함하지 않습니다. 좌표·유사도·검색 문서는 설명용 예시이며, VRAM은 `파라미터 수 × 숫자 하나 크기 × 1.2`로 잡은 추론 기준 대략값입니다.

## 컨테이너와 배포

Dockerfile은 `node:24-alpine`에서 `npm ci`와 Astro 빌드를 수행하고, 기존 digest로 고정한 비권한 nginx 이미지에 `dist/`만 복사합니다. Compose의 read-only, cap_drop, 64MiB, PID·CPU 제한과 localhost 바인딩은 유지합니다. 이미지 태그는 `ai-spatial-sense:2.0.0`입니다.

`/healthz`는 200 `ok`, 존재하지 않는 URL은 Starlight의 `404.html`과 HTTP 404를 반환하도록 설정했습니다. CSP는 Starlight 인라인 초기화 스크립트, 같은 출처 JS·Pagefind 인덱스, WASM 실행을 허용합니다. `unsafe-eval`은 허용하지 않습니다. Google Fonts 허용은 기존 슬라이드용이며 외부 추적은 없습니다. 프록시가 별도 CSP를 덧붙이면 두 정책이 동시에 적용되므로 검색·테마·메뉴를 다시 확인해야 합니다.

빌드 단계는 기존 HTML 복사보다 시간과 메모리, 이미지 다운로드가 더 필요합니다. 런타임 64MiB 제한은 Node 빌드 단계에는 적용되지 않습니다. 최종 이미지에는 Node와 node_modules가 포함되지 않습니다. 실제 빌드 시간·이미지 크기는 배포 환경에서 측정합니다.

이 변경의 구현·검증 결과와 미검증 항목은 `docs/VERIFICATION-2.0.0.md`에 기록합니다. 검수 후 별도로 배포하며, 자동 push·배포는 수행하지 않습니다.

## 참고 문서

[Starlight 설정](https://starlight.astro.build/reference/configuration/) · [자동 사이드바](https://starlight.astro.build/guides/sidebar/)
