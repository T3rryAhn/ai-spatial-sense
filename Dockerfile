# 1) 원본을 단독 HTML로 감싼다
FROM alpine:3.20 AS build
WORKDIR /src
COPY embedding/ embedding/
COPY scripts/build.sh scripts/build.sh
RUN sh scripts/build.sh

# 2) 정적 파일만 비권한 nginx로 서빙한다
FROM nginxinc/nginx-unprivileged:stable-alpine@sha256:ed04ec1ff34502c339ee5c3ae3f855442398edc1d05591e2b98981dcbbd20b1e
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist/ /usr/share/nginx/html/
USER 101
