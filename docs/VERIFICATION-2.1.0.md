# Study 2.1.0 검증 기록

2026-11-22 · `claude/study-apple` · 기준 커밋 `4fdd7a8` · 로컬 검증


## 운영 반영 (2026-11-22)

2026-11-22 15:40 KST경 사용자 승인 후 커밋 `89eacc8`에서 `sudo bash /var/tmp/study-2.1.0/deploy/deploy_210.sh /var/tmp/study-2.1.0`으로 배포했다. 스크립트는 `Verified ai-spatial-sense:2.1.0`으로 끝났다. 복구 파일은 `/srv/apps/ai-spatial-sense/backups/2.1.0-20261122T064016Z-hJ6hZl`에 있다. 배포 후 `ai-spatial-sense:2.1.0`이 healthy 상태다. https://study.t3rryahn.duckdns.org/ 의 홈, `/ai/spatial-sense/`, `/ai/spatial-sense-guide/`, `/healthz`가 HTTP 200을 반환한다. 홈에는 `service=study&from=%2F` 의견 링크가 있다. 실기기, Safari, 검색 모달의 실제 사용은 아직 확인하지 않았다.

## 화면과 동작

- 홈의 좌표 평면 그림, 네 분야의 선 아이콘과 시작 버튼은 SVG와 CSS로 만들었다. 시스템 글꼴을 쓰고, 문서·카테고리·장면 목록은 인디고 계열의 같은 탐색 색을 쓴다.
- 헤더와 사이드바는 불투명 배경에서 시작한다. 브라우저가 배경 흐림을 지원하면 반투명 재질을 적용하고 투명도 감소 설정에서는 단색으로 돌아간다. 문서 제목, 넓은 화면의 목차 카드, 표, 코드, 안내 상자에 공통 크기와 모서리를 적용했다.
- 검색은 기존 Pagefind와 네이티브 `dialog`를 사용한다. 작은 화면에서는 하단 시트, 큰 화면에서는 중앙 대화상자로 열린다. 검색 상태 문구를 한국어로 제공한다.
- 기본 푸터의 페이지 이동 컴포넌트를 감싸서 이전·다음 링크와 ‘의견 보내기’를 함께 제공한다. 후자는 빌드 시 `Astro.url.pathname`을 `URLSearchParams`로 인코딩한다. 단독 슬라이드의 하단 링크는 고정 경로 `/ai/spatial-sense/`를 담고 장면 번호는 보내지 않는다.
- 슬라이드의 위키 복귀·장면 목차·하단 탐색을 정리하고 위키에서 고른 테마를 읽도록 했다. `CH`, `PARTS`, `BEATS` 선언은 기준 커밋과 동일하다. 기존 학습 경로, 홈 숫자 해시 이동, ‘Study 개선 이력’ 링크와 사이트 URL을 유지했다.

## 검증 결과

Windows, Node 24.19.0, Playwright + Edge headless. 로컬 검증 서버에 배포 CSP를 적용했다. 슬라이드의 기존 외부 글꼴 요청은 테스트에서 빈 CSS로 응답했다.

| 검증 | 결과 또는 실제 마지막 출력 |
| --- | --- |
| `npm.cmd run build` | `Prepared slides and 50 scene titles.` · `12:45:04 [build] 7 page(s) built in 2.70s` · `12:45:04 [build] Complete!` |
| Pagefind | `12:45:04 [starlight:pagefind] Found 8 HTML files.` · `12:45:04 [starlight:pagefind] Finished building search index in 172ms.` |
| `node scripts/check-site.cjs` | `Wiki routes, scene links, search, theme, mobile, redirect, healthz, 404: PASS; console errors: 0` |
| `node scripts/check-slides.cjs` | 종료 0. JSON 끝의 `"errors": []` · 전후 56회 측정, 390·860·1000px × 4개 장면의 본문·그림 좌표 일치, 모바일 50개 장면 이동 확인 |
| `node scripts/check-redesign.cjs` | `PASS: theme override, persistence, system preference, static feedback URL; 32 PNGs` |
| 같은 검사에서 문서·검색만 재촬영 | `PASS: theme override, persistence, system preference, static feedback URL; 16 PNGs` |
| 배포 셸 구문 및 diff 공백 | `bash -n deploy/deploy_210.sh: PASS` · `git diff --check: PASS` (명시한 성공 표식) |
| 서버 Compose 예시 문자열과 빌드된 홈 HTML 검사 | `Compose image-only patch and home feedback probe: PASS` |
| PNG 파일명·개수·크기, 셸 줄바꿈, 잠금 파일 비교 | `32 screenshot files, dimensions and deploy LF: PASS` · `Lockfile version-only change: PASS` |

320·390·768·1440px에서 홈·문서·검색·슬라이드의 가로 넘침을 검사했다. 검색과 장면 목차를 Esc로 닫으면 열기 버튼으로 포커스가 돌아온다. 사용자가 고른 테마가 시스템 설정보다 우선하고, 자동으로 되돌리면 시스템 설정을 따른다. 자바스크립트를 끈 문서에서 쿼리와 해시가 붙은 주소로 접속해도 의견 링크는 다음과 같았다.

```text
https://t3rryahn.duckdns.org/feedback/?service=study&from=%2Fai%2Fspatial-sense-guide%2F
```

검수 중 `Transition was aborted because of invalid state. ViewTransition opt-in disabled`가 발생해 위키와 슬라이드의 전환 설정을 첫 렌더링 전 head에서 읽게 했다. 슬라이드 검사에서 `좁은 화면의 본문 위치·크기가 바뀌었습니다.`가 발생한 원인은 장 제목 글꼴로 인한 1px 높이 차이였다. 기존 장 제목 글꼴을 유지해 전후 좌표를 맞췄다. 화면 검토 후에는 좁은 화면의 제목 줄바꿈, 표 폭, 검색 취소 버튼, 슬라이드 다음 버튼을 다듬었다.

## 로컬 재현 명령

저장소 루트에서 실행한다. WASM 경로는 이 Windows 작업용 설정이다. 패키지 의존성과 Docker 빌드 과정은 그대로다.

```powershell
$env:NODE_PATH = (Resolve-Path .local/study-wasi/node_modules).Path
$env:NAPI_RS_FORCE_WASI = 'true'
$env:ASTRO_TELEMETRY_DISABLED = '1'
npm.cmd run build
```

정적 서버와 Playwright는 별도 PowerShell에서 실행한다. 포트를 지정하지 않으면 4321이다.

```powershell
# 터미널 1
$env:STUDY_CHECK_PORT = '47632'
node scripts/serve-check.mjs dist

# 터미널 2
$env:NODE_PATH = 'C:/Users/codexadmin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
$env:STUDY_CHECK_PORT = '47632'
node scripts/check-site.cjs
node scripts/check-redesign.cjs

# 검사는 모두 수행하고, 지정한 화면의 PNG만 갱신할 때
$env:STUDY_CAPTURE_PAGES = 'article,search'
node scripts/check-redesign.cjs
Remove-Item Env:STUDY_CAPTURE_PAGES
```

슬라이드 비교는 다음 두 파일을 사용한다. 기준 커밋에서 읽은 소스를 이전 빌드와 같은 head/body 경계로 포장한다.

```powershell
# 터미널 1 또는 별도 터미널
New-Item -ItemType Directory -Force .artifacts/before,.artifacts/ai/spatial-sense | Out-Null
@'
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const source = execFileSync('git', ['show', '4fdd7a8:embedding/index.html'], { encoding: 'utf8' });
const split = source.indexOf('<style>');
fs.writeFileSync('.artifacts/before/index.html', '<!doctype html><html lang="ko"><head><meta charset="utf-8">' + source.slice(0, split) + '</head><body>' + source.slice(split) + '</body></html>');
'@ | node
Copy-Item dist/ai/spatial-sense/index.html .artifacts/ai/spatial-sense/index.html
$env:STUDY_CHECK_PORT = '47631'
node scripts/serve-check.mjs .artifacts

# 터미널 2 (위 Playwright NODE_PATH 사용)
$env:STUDY_CHECK_PORT = '47631'
node scripts/check-slides.cjs
& 'C:/Program Files/Git/bin/bash.exe' -n deploy/deploy_210.sh
git diff --check
```

### 화면 파일

[32개 PNG](../.local/shots-apple/)는 `{home|article|search|slides}-{320|390|768|1440}-{light|dark}.png` 형식이다. 홈과 문서는 전체 길이로, 검색과 슬라이드는 뷰포트 크기로 저장했다. 문서는 구성 표와 VRAM 계산 인라인 코드가 있는 `/ai/spatial-sense-guide/`, 슬라이드는 방향 벡터를 설명하는 23번 장면이다. 문서에 펜스 코드 블록 예제는 없다.

### Modern Web Guidance

공유 저장소의 `docs/reference/modern-web-guidance/guides/`에서 적용한 기준이다.

| 가이드 | 적용 지점 |
| --- | --- |
| `css/css.md`, `css/responsive-design.md` | 테마 변수, 모바일 줄바꿈, 카드의 가용 폭 |
| `html/html.md`, `forms/forms.md`, `ui-components/dialog.md` | 검색 입력, 링크·버튼 구분, 기존 dialog와 Esc·포커스 복귀 |
| `visual-design/dark-mode.md`, `ui-components/dark-mode-toggle.md` | 시스템 설정과 명시적 테마 선택 |
| `accessibility/accessibility.md` | 포커스 표시, 장식 SVG 숨김, 터치 영역 |
| `ui-behaviors/motion.md`, `animate-element-entry-exit.md`, `cross-document-transitions.md` (모두 `ui-behaviors/`) | 모션 감소 설정, 시트 등장과 지원 브라우저의 문서 전환 |
| `performance/performance.md` | 시스템 글꼴, 빌드 시 링크 생성 |

## VM230 배포와 복구

운영 전환은 별도 승인 후 시행한다. LF 소스 디렉터리에는 이 버전의 전체 소스와 Dockerfile이 필요하다. VM의 Docker 빌드 단계에는 베이스 이미지와 npm 레지스트리에 접근할 수 있는 네트워크가 필요하다. 예를 들어 승인된 업로드를 `/var/tmp/study-2.1.0`에 풀었다면 다음 명령을 쓴다.

```sh
sudo bash /var/tmp/study-2.1.0/deploy/deploy_210.sh /var/tmp/study-2.1.0
```

1. `/srv/apps/ai-spatial-sense/.deploy.lock`을 잡고 실제 `web` 컨테이너의 실행 상태·태그·이미지 ID를 확인한다. 예상 기준 태그는 `ai-spatial-sense:2.0.0-history1`이다.
2. 출력되는 `backups/2.1.0-<UTC>-<임의 접미사>/`에 전체 `app.tar.gz`, 서버 원본 `compose.yaml`, `old-image-id`, `SHA256SUMS`를 저장하고 체크섬을 검증한다.
3. 기존 복제본의 `.git`을 보존하고 업로드에서 `node_modules`, `dist`, 검증 산출물을 제외해 `app/`을 교체한다. `DOCKER_BUILDKIT=0`으로 `ai-spatial-sense:2.1.0`을 빌드한다.
4. 후보는 포트 공개 없이 `--network none --read-only`로 띄운다. 64MiB, CPU 0.25, PID 32, tmpfs, 권한 제거를 적용하고 실행 중인 컨테이너의 자원 제한과 비교한다. 후보 내부에서 `/healthz` 응답과 홈의 정확한 의견 링크를 확인한다.
5. **서버 상위 디렉터리의 Compose 원본에서 기존 이미지 행이 정확히 하나인지 검사한 뒤 그 태그만 교체한다.** `docker compose config --images web`으로 임시 파일을 확인하고, 교체 직전에 원본과 백업이 여전히 같은지도 비교한다. 저장소의 localhost용 Compose는 업로드된 `app/` 안에만 있다. 상위 Compose의 `build: ./app`, `192.168.0.34:8082:8080` 바인딩, 기존 서비스 설정을 보존한다.
6. `docker compose -f /srv/apps/ai-spatial-sense/compose.yaml up -d --no-build web` 뒤 새 이미지 ID, 컨테이너 내부와 호스트 바인딩의 health, 실제 홈 링크를 확인한다.

실패하거나 HUP·INT·TERM을 받으면 스크립트는 진행한 단계에 맞춰 소스와 Compose를 복구한다. 서비스 전환을 시도한 뒤의 실패라면 기록한 이미지 ID로 기존 태그를 다시 지정하고 `web`을 복구한 뒤 health를 확인한다. 복구 자체가 실패하면 백업과 임시 디렉터리를 남기고 오류로 종료한다.

### 승인 후 수동 롤백

아래는 VM230의 root Bash에서 실행한다. 배포 결과에 출력된 실제 백업 디렉터리를 `B`에 넣는다. 복구 전 소스는 `.restore-*/displaced`에 남는다.

```bash
(
  set -euo pipefail
  cd /srv/apps/ai-spatial-sense
  B='/srv/apps/ai-spatial-sense/backups/실제-백업-디렉터리'
  exec 9>.deploy.lock
  flock -n 9
  (cd "$B" && sha256sum -c SHA256SUMS)
  old_id=$(cat "$B/old-image-id")
  docker image inspect "$old_id" >/dev/null
  restore=$(mktemp -d "$PWD/.restore-XXXXXX")
  tar -xzpf "$B/app.tar.gz" -C "$restore"
  cp -p "$B/compose.yaml" "$restore/compose.original"
  if [[ -e app ]]; then mv -T app "$restore/displaced"; fi
  mv -T "$restore/app" app
  mv -fT "$restore/compose.original" compose.yaml
  docker image tag "$old_id" ai-spatial-sense:2.0.0-history1
  docker compose -f compose.yaml up -d --no-build web
  id=$(docker compose -f compose.yaml ps -q web)
  test "$(docker inspect -f '{{.Image}}' "$id")" = "$old_id"
  test "$(curl --noproxy '*' --retry 15 --retry-connrefused --retry-delay 1 -fsS --max-time 5 http://192.168.0.34:8082/healthz)" = ok
)
```

## 미검증 범위

Docker 이미지 빌드, VM230의 자원 제한·포트·실제 nginx 응답, 서비스 전환 및 실서버 장애 복구는 운영 검수 대상이다. 브라우저 검사는 Edge에서 수행했다. Safari·Firefox와 실제 모바일 기기는 미검증이다. 빌드에서는 기본 404용 문서 엔트리가 없다는 경고가 나오지만, 생성된 404 HTML과 로컬 HTTP 404 응답은 확인했다. 커밋과 배포는 수행하지 않았다.
