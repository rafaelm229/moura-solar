FROM golang:1.24.8-alpine AS server-build
ENV CGO_ENABLED=0
RUN go install github.com/minio/minio@RELEASE.2025-10-15T17-29-55Z

FROM golang:1.24.8-alpine AS client-build
ENV CGO_ENABLED=0
RUN go install github.com/minio/mc@RELEASE.2025-08-13T08-35-41Z

FROM alpine:3.22 AS base
RUN apk add --no-cache ca-certificates

FROM base AS server
COPY --from=server-build /go/bin/minio /usr/local/bin/minio
ENTRYPOINT ["minio"]
CMD ["server", "/data", "--console-address", ":9001"]

FROM base AS client
COPY --from=client-build /go/bin/mc /usr/local/bin/mc
ENTRYPOINT ["mc"]
