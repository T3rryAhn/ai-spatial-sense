# 2.0.0 구현·검증 보고서

작업일: 2026-11-18. 작업 브랜치: main. 배포·push 없음.

**위키 소스 구현과 슬라이드 검증은 완료했으나, 전체 완료 기준은 충족하지 못했습니다.** Astro 빌드는 네이티브 모듈 접근 거부로 중단되었고, `.git` 쓰기 권한 제한으로 커밋도 만들지 못했습니다. 사용자의 승인 부족이 아니라 현재 실행 환경의 제한입니다.

## 변경 파일

| 파일 | 변경 |
| --- | --- |
| `astro.config.mjs` | 한국어 Starlight, 자동 사이드바, 사이트 URL·CSS·Head 구성 |
| `package.json`, `package-lock.json` | 사전 설치된 의존성을 버전 관리에 포함; 슬라이드 준비를 predev/prebuild에 연결 |
| `src/content.config.ts` | Starlight docsLoader와 docsSchema |
| `src/categories.mjs` | 카테고리 순서·라벨·홈 설명의 단일 설정 |
| `src/components/Categories.astro` | 홈 카테고리 카드 |
| `src/components/CategoryContents.astro` | 카테고리 문서 목차 자동 생성 |
| `src/components/SlideContents.astro` | 실제 장면 제목과 편·섹션별 직접 링크 |
| `src/components/Head.astro` | 기존 루트 숫자 해시 주소 호환 |
| `src/styles/custom.css` | 위키 카드와 반응형 스타일 |
| `src/content/docs/index.mdx` | 위키 소개·카테고리·대표 문서 |
| `src/content/docs/ai/index.mdx`, `src/content/docs/ai/spatial-sense-guide.mdx` | AI 카테고리와 학습 자료 개요·목차 |
| `src/content/docs/cs/index.mdx`, `src/content/docs/network/index.mdx`, `src/content/docs/os/index.mdx` | 준비 중 안내·예정 제목·문서 목차 |
| `embedding/index.html` | 넓은 화면 간격, 목차 dialog, 현재 장면, 키보드·해시 이동·위키 링크 |
| `scripts/prepare-slides.mjs`, `scripts/build.sh` | 원본의 단독 HTML 포장과 목차 데이터 추출 |
| `scripts/serve-check.mjs` | nginx CSP를 적용하는 로컬 정적 검증 서버 |
| `scripts/check-slides.cjs` | Playwright 전후 측정·스크린샷·모바일·목차 검증 |
| `scripts/check-site.cjs` | 빌드 후 위키·검색·모바일·호환 링크 검증용 실행 파일 |
| `Dockerfile`, `.dockerignore`, `compose.yaml` | Node 빌드 → 기존 digest nginx, 2.0.0 태그; 기존 보안·자원 제한 유지 |
| `deploy/nginx.conf` | 보안 헤더 유지, Pagefind용 CSP, 404 페이지 설정 |
| `.gitignore`, `README.md`, `docs/CHANGELOG.md`, 이 파일 | 생성물 제외·추가 방법·배포와 검증 기록 |

`public/ai/spatial-sense/index.html`, `src/generated/slides.json`, `.artifacts/`는 생성물이며 Git에서 제외합니다. 원본의 `CH`·`PARTS`·`BEATS` 선언 블록은 수정 전과 문자열 단위로 동일합니다. 본문은 1편 38장·2편 11장, 별도 시작 목차 1장입니다.

## 실행한 주요 명령과 결과

| 명령 | 결과 |
| --- | --- |
| UTF-8 `Get-Content`, `rg`, `git status`, `git diff` | 공유 문맥·원본·설정·변경 범위 확인 |
| `npm.cmd ci --offline --no-audit --no-fund` | 성공, 캐시에서 265개 패키지 설치, 약 10초 |
| `npm.cmd run build` (`ASTRO_TELEMETRY_DISABLED=1`) | 슬라이드 준비 성공 후 Astro 네이티브 모듈 로드 실패; 재실행도 같은 오류 |
| `node scripts/prepare-slides.mjs` | 성공, 50개 장면 메타데이터·슬라이드 HTML 생성 |
| `node scripts/serve-check.mjs .artifacts` | localhost:4321에서 전후 파일을 배포 CSP와 함께 서빙 |
| `node scripts/check-slides.cjs` | Playwright + msedge headless 검증 성공 |
| `@astrojs/compiler-rs`의 `transform` | Astro 컴포넌트 4개의 구문 진단 0건 |
| YAML frontmatter 파싱 | 문서 6개 title/description 확인 |
| `node --check` (검증·준비·서버 스크립트 4개) | 성공 |
| `git diff --check` | 성공 |
| `Get-Command docker` | 실행 파일 발견되지 않음; Docker 빌드 미실행 |
| `wsl --list --quiet` | WSL 미설치 확인 |
| `npm.cmd view @bruits/satteri-wasm32-wasi@0.11.7 version --fetch-retries=0 --fetch-timeout=10000` | 네트워크 EACCES; 추가 패키지 설치 안 함 |
| `git add ...` | `.git/index.lock: Permission denied`; 커밋 단계 진행 불가 |

검증 시 `NODE_PATH`는 `C:/Users/codexadmin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules`로 지정했습니다. Playwright를 사이트 의존성에 추가하지 않았습니다.

## 간격 측정

Edge headless, light mode, reduced motion, 시스템 글꼴 조건입니다. Google Fonts 요청은 전후 동일하게 빈 CSS로 응답했습니다. 데스크톱 높이는 1080px, 390·860px 폭에서는 844px입니다. 원본은 hashchange를 처리하지 않으므로 장면마다 문서를 새로 로드했습니다.

- **박스 간격**: `.stage.left - .copy.right`.
- **보이는 콘텐츠 간격**: `.copy` 안 표시되는 텍스트 Range의 가장 오른쪽 좌표와 SVG getBBox를 화면 좌표로 변환한 가장 왼쪽 좌표의 차이. 패널 장면 #30은 표시 중인 패널 콘텐츠 박스의 왼쪽 좌표를 사용합니다. 그림 자체의 여백 때문에 박스 간격과 값이 다릅니다.
- #1은 그림이 없는 단독 목차 화면이므로 수평 간격 측정 대상이 아닙니다.

| 화면 폭 | 박스 간격 전 → 후 | #10 콘텐츠 전 → 후 | #20 콘텐츠 전 → 후 | #30 콘텐츠 전 → 후 |
| ---: | ---: | ---: | ---: | ---: |
| 1366 | 54.6 → 32.0 | 214.2 → 197.0 | 204.6 → 187.3 | 91.3 → 73.1 |
| 1440 | 57.6 → 32.0 | 196.4 → 197.0 | 241.3 → 187.3 | 61.5 → 73.1 |
| 1920 | 224.0 → 32.0 | 444.1 → 197.0 | 483.5 → 187.3 | 243.4 → 73.1 |
| 2560 | 490.7 → 32.0 | 809.6 → 197.0 | 843.4 → 187.3 | 510.1 → 73.1 |

단위는 CSS px입니다. 글줄 재배치로 1440px의 일부 콘텐츠 간격은 조금 늘지만, 넓은 화면의 과도한 벌어짐은 사라집니다. 수정 후 그림 영역은 약 704.7px로 일정하며, 기존 1366px 화면의 698.5px와 유사합니다. 1440px의 기존 737.4px보다 약 4.4% 작습니다.

**390·860·1000px의 #1·#10·#20·#30 모두 `.copy`와 `.stage`의 x/y/width/height가 전후 정확히 동일합니다.** 좁은 창의 원래 CSS는 수정하지 않았습니다. 새 헤더 버튼은 헤더 높이에 영향을 주지 않습니다.

## Playwright 검증 결과

- 폭 1366·1440·1920·2560·390·860·1000 × 4개 장면 × 전후 = 56개 측정, 가로 넘침 없음.
- 375px에서 전체 50개 장면의 직접 해시 이동·실제 제목 일치·문서 가로 넘침 없음 확인.
- 목차 50개 링크, 현재 장면 표시, 목차 안 ArrowRight의 배경 장면 이동 방지, Esc 닫기, 열기 버튼으로 포커스 복귀, #30 선택 이동 확인.
- 슬라이드 `위키로` 링크의 `/ai/` 목적지 확인. 위키 페이지 자체는 빌드되지 않아 복귀 후 렌더링은 미검증.
- 해당 슬라이드 검증 실행의 JavaScript 오류·콘솔 error: **0건**.
- Astro 컴포넌트 구문과 frontmatter 검사는 통과했으나, 이는 전체 Astro 빌드 성공을 대신하지 않습니다.

## 스크린샷과 원시 결과

저장소 기준 `.artifacts/screenshots/`에 34개 PNG를 저장했습니다. 전후 각 16개(1366·1920·2560·390 × #1·#10·#20·#30), 375px 본문·목차 2개입니다.

- 전체 측정: [slide-results.json](../.artifacts/slide-results.json)
- 1920px #10: [수정 전](../.artifacts/screenshots/before-1920-scene-10.png) / [수정 후](../.artifacts/screenshots/after-1920-scene-10.png)
- 2560px #20: [수정 전](../.artifacts/screenshots/before-2560-scene-20.png) / [수정 후](../.artifacts/screenshots/after-2560-scene-20.png)
- 1366px #30: [수정 전](../.artifacts/screenshots/before-1366-scene-30.png) / [수정 후](../.artifacts/screenshots/after-1366-scene-30.png)
- 390px #1: [수정 전](../.artifacts/screenshots/before-390-scene-1.png) / [수정 후](../.artifacts/screenshots/after-390-scene-1.png)
- [375px 목차 dialog](../.artifacts/screenshots/slide-dialog-375.png)

전체 경로 형식: `C:/Users/codexadmin/Documents/ai-spatial-sense/.artifacts/screenshots/{before|after}-{1366|1920|2560|390}-scene-{1|10|20|30}.png`.

## 미검증·환경 제약

Astro 빌드는 `node_modules/@astrojs/markdown-satteri/node_modules/@bruits/satteri-win32-x64-msvc/satteri_napi.win32-x64-msvc.node`를 로드하면서 `ERR_DLOPEN_FAILED: Access is denied`로 실패했습니다. 파일은 존재하고 npm ci도 성공했습니다. 정확한 운영체제 차단 원인은 확인되지 않았습니다. 권한·보안 설정을 바꾸거나 의존성 코드를 우회 수정하지 않았습니다.

따라서 다음은 **미검증**입니다: 최종 dist 생성, 홈·각 카테고리의 실제 렌더링, 자동 사이드바·이전/다음, Pagefind 검색, 위키 테마·모바일 메뉴·375px 넘침, 홈 해시 리다이렉트 통합 동작, nginx 실제 404·보안 헤더, Docker 이미지 빌드·크기·기동 메모리. `check-site.cjs`는 이를 검수 환경에서 실행하기 위해 추가했으며 아직 실행하지 못했습니다.

현재 `.git`은 쓰기 제한 상태라 staging에서 실패했고 **커밋은 생성하지 못했습니다**. 변경 파일은 작업 폴더에 남아 있습니다. push·배포는 실행하지 않았습니다.

## 검수 환경에서 이어서 실행할 작업

1. 네이티브 모듈 실행이 가능한 환경에서 `npm ci && npm run build`를 실행합니다.
2. `node scripts/serve-check.mjs dist` 실행 후 별도 터미널에서 Playwright 경로를 지정하고 `node scripts/check-site.cjs`를 실행합니다. 전체 사이트 테스트를 통과한 뒤 시각 검수를 진행합니다.
3. `docker build -t ai-spatial-sense:2.0.0 .`으로 Linux Alpine용 의존성과 최종 이미지를 검증합니다.
4. Git 쓰기 권한이 있는 기존 작업 환경에서 변경 범위를 검토한 후 `git add`와 `git commit -m "종합 학습 위키 구성 및 AI 슬라이드 간격 개선"`을 실행합니다. push는 하지 않습니다.

설계상 추가 사용자 결정은 필요하지 않습니다. 남은 일은 실행 환경에서의 빌드·통합 검증과 커밋, Claude 검수입니다.

## 배포 시 주의점

- 기존 nginx 이미지 digest와 Compose read_only·cap_drop·no-new-privileges·64MiB·CPU/PID 제한은 유지했습니다.
- CSP의 `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'`와 `connect-src 'self'`는 Starlight 초기화·Pagefind fetch/WASM을 위한 설정입니다. 실제 검색은 빌드 환경에서 검증해야 합니다. 프록시에서 더 엄격한 CSP를 중복 추가하면 검색 등이 차단될 수 있습니다.
- 외부 Google Fonts 허용은 기존 슬라이드 호환용입니다. 외부 추적·분석 스크립트는 추가하지 않았습니다.
- 빌드는 Node·플랫폼 네이티브 의존성 다운로드와 검색 인덱스 생성을 포함하므로 기존 HTML 포장보다 자원이 더 필요합니다. 빌드 시간과 최종 이미지 크기는 **미측정**입니다. npm ci의 로컬 캐시 설치 시간 약 10초를 배포 빌드 시간으로 간주하면 안 됩니다.
- 다단계 빌드이므로 최종 nginx 이미지에는 Node/node_modules를 넣지 않습니다. 런타임 64MiB 제한과 빌드 단계 자원 요구는 별개입니다.
