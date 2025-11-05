# syntax=docker/dockerfile:1.7

# Build ghttp from source included in the repository
FROM golang:1.25 AS ghttp-builder
WORKDIR /src

COPY tools/ghttp/go.mod tools/ghttp/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download

COPY tools/ghttp/ ./
RUN --mount=type=cache,target=/root/.cache/go-build go build -ldflags="-s -w" -o /out/ghttp ./cmd/ghttp

# Runtime image with shell and envsubst support
FROM alpine:3.20
RUN apk add --no-cache ca-certificates gettext
WORKDIR /app

COPY --from=ghttp-builder /out/ghttp /usr/local/bin/ghttp
COPY docker/entrypoint.sh /entrypoint.sh
COPY docker/index.html.template /templates/index.html.template
COPY docker/auth-demo.js.template /templates/auth-demo.js.template

RUN chmod +x /entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/entrypoint.sh"]
