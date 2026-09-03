FROM golang:1.24-alpine AS build

WORKDIR /src
COPY go.mod main.go ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/apple-provider .

FROM alpine:3.22

COPY --from=build /out/apple-provider /usr/local/bin/apple-provider
EXPOSE 8090
ENTRYPOINT ["/usr/local/bin/apple-provider"]
