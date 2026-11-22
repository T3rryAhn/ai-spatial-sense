#!/usr/bin/env bash
# VM230: sudo bash deploy_210.sh /path/to/extracted-lf-source
set -euo pipefail
umask 077

base=/srv/apps/ai-spatial-sense
app=$base/app
compose=$base/compose.yaml
old_tag=ai-spatial-sense:2.0.0-history1
new_tag=ai-spatial-sense:2.1.0
public_health=http://192.168.0.34:8082/healthz
inside=http://127.0.0.1:8080

die() { echo "$*" >&2; exit 1; }
dc() { docker compose -f "$compose" "$@"; }

check_ready() {
  local id=$1 body attempt
  for ((attempt = 0; attempt < 30; attempt++)); do
    if body=$(docker exec "$id" wget -q -T 2 -O - "$inside/healthz") && [[ $body == ok ]]; then
      return 0
    fi
    sleep 1
  done
  echo "No healthy response from $id" >&2
  return 1
}

check_home() {
  # Read the whole response so pipefail also catches truncated responses.
  docker exec "$1" wget -q -T 5 -O - "$inside/" |
    grep -E 'href="https://t3rryahn\.duckdns\.org/feedback/\?service=study&(amp;)?from=%2F"' >/dev/null
}

check_live() {
  local expected=$1 id body
  id=$(dc ps -q web) && [[ -n $id ]] &&
    [[ $(docker inspect -f '{{.Image}}' "$id") == "$expected" ]] &&
    check_ready "$id" &&
    body=$(curl --noproxy '*' -fsS --max-time 5 "$public_health") &&
    [[ $body == ok ]]
}

[[ $EUID == 0 && $# == 1 ]] || die "Usage (root): bash deploy_210.sh <extracted LF source directory>"
upload=$(realpath -e -- "$1")
cd "$base"
exec 9>"$base/.deploy.lock"
flock -n 9 || die "Another Study deployment holds .deploy.lock"
[[ -d $upload && -d $app && ! -L $app && -f $compose && ! -L $compose ]] || die "Missing source or production layout"
[[ $app/ != "$upload/"* && $upload/ != "$app/"* && $upload != / ]] || die "Upload and production app must be separate directories"
for name in Dockerfile package.json package-lock.json deploy/nginx.conf; do
  [[ -f $upload/$name ]] || die "Upload missing $name"
done
for tool in docker curl tar sha256sum; do command -v "$tool" >/dev/null || die "Missing $tool"; done

old_container=$(dc ps -q web)
[[ -n $old_container && $(docker inspect -f '{{.State.Running}} {{.Config.Image}}' "$old_container") == "true $old_tag" ]] ||
  die "The running web service must use $old_tag"
old_id=$(docker inspect -f '{{.Image}}' "$old_container")
[[ $(docker image inspect -f '{{.Id}}' "$old_tag") == "$old_id" ]] || die "The old tag and running image ID differ"
[[ $(dc config --images web) == "$old_tag" ]] || die "Unexpected web image in compose.yaml"

mkdir -p "$base/backups"
backup=$(mktemp -d "$base/backups/2.1.0-$(date -u +%Y%m%dT%H%M%SZ)-XXXXXX")
work=$(mktemp -d "$base/.deploy-2.1.0-XXXXXX")
candidate=study-candidate-${work##*.deploy-2.1.0-}
candidate_idfile=$work/candidate.cid
tag_change=0
switch_started=0

finish() {
  local status=$? recovered=1 config_restored=1
  trap - EXIT
  trap '' HUP INT TERM
  set +e
  if [[ $status != 0 ]]; then
    echo "Deployment failed. Recovery files: $backup" >&2
    # The directory rename itself marks when source recovery becomes necessary.
    if [[ -d $work/previous ]]; then
      if [[ ! -e $app ]] || mv -T "$app" "$work/rejected"; then
        mv -T "$work/previous" "$app" || recovered=0
      else
        recovered=0
      fi
    fi
    if (( tag_change )); then
      cp -p "$backup/compose.yaml" "$work/compose.restore" &&
        mv -fT "$work/compose.restore" "$compose" || config_restored=0
    fi
    if (( switch_started && config_restored )); then
      docker image tag "$old_id" "$old_tag" &&
        dc up -d --no-build web &&
        check_live "$old_id" || recovered=0
    fi
  fi
  if [[ -s $candidate_idfile ]]; then
    docker rm -f "$(cat "$candidate_idfile")" >/dev/null || echo "Check candidate cleanup: $candidate" >&2
  fi
  if (( recovered && config_restored )); then
    rm -rf -- "$work"
  else
    echo "Recovery incomplete. Keep $work and restore from $backup." >&2
  fi
  exit "$status"
}
trap finish EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

echo "Recovery files: $backup"
printf '%s\n' "$old_id" > "$backup/old-image-id"
cp -p "$compose" "$backup/compose.yaml"
tar -czpf "$backup/app.tar.gz" -C "$base" app
(cd "$backup" && sha256sum app.tar.gz compose.yaml old-image-id > SHA256SUMS && sha256sum -c SHA256SUMS)

mkdir "$work/upload"
tar -C "$upload" --exclude=node_modules --exclude=dist --exclude=.git --exclude=.local \
  --exclude=.astro --exclude=.artifacts -cf - . | tar -C "$work/upload" --no-same-owner -xpf -
# Keep the existing clone's history and remote; do not import Git metadata from an upload.
if [[ -d $app/.git ]]; then cp -a "$app/.git" "$work/upload/.git"; fi

# Match one complete literal image scalar, retaining quotes, comments, spacing and line endings.
cp -p "$compose" "$work/compose.next"
old_pattern=${old_tag//./[.]}
image_line="^[[:blank:]]*image:[[:blank:]]*([\"']?)${old_pattern}\\1[[:space:]]*(#.*)?$"
[[ $(grep -Ec "$image_line" "$compose") == 1 ]] || die "Expected exactly one old image tag line"
sed -E "/$image_line/s/$old_pattern/$new_tag/" "$compose" > "$work/compose.next"
[[ $(docker compose --project-directory "$base" -f "$work/compose.next" config --images web) == "$new_tag" ]] ||
  die "Patched compose does not target the new web image"

mv -T "$app" "$work/previous"
mv -T "$work/upload" "$app"
DOCKER_BUILDKIT=0 docker build -t "$new_tag" "$app"
new_id=$(docker image inspect -f '{{.Id}}' "$new_tag")
docker run -d --cidfile "$candidate_idfile" --name "$candidate" --network none --read-only \
  --tmpfs /tmp:size=8m,mode=1777 --cap-drop ALL --security-opt no-new-privileges:true \
  --memory 64m --cpus 0.25 --pids-limit 32 --env NGINX_ENTRYPOINT_WORKER_PROCESSES_AUTOTUNE= \
  --log-driver json-file --log-opt max-size=2m --log-opt max-file=2 "$new_id"
limits='{{.HostConfig.Memory}} {{.HostConfig.MemorySwap}} {{.HostConfig.NanoCpus}} {{.HostConfig.CpuQuota}} {{.HostConfig.CpuPeriod}} {{.HostConfig.PidsLimit}}'
candidate_limits=$(docker inspect -f "$limits" "$candidate")
live_limits=$(docker inspect -f "$limits" "$old_container")
[[ $candidate_limits == "$live_limits" ]] || die "Candidate resource limits differ from the running web service"
check_ready "$candidate"
check_home "$candidate" || die "Candidate home lacks the Study feedback link"
docker rm -f "$candidate" >/dev/null
rm -- "$candidate_idfile"

[[ $(dc ps -q web) == "$old_container" ]] && cmp -s "$compose" "$backup/compose.yaml" ||
  die "Live service or compose.yaml changed during the build"
tag_change=1
mv -fT "$work/compose.next" "$compose"
switch_started=1
dc up -d --no-build web
check_live "$new_id" || die "Live image or health check failed"
check_home "$(dc ps -q web)" || die "Live home lacks the Study feedback link"
echo "Verified $new_tag. Recovery files: $backup"
