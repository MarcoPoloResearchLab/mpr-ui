SHELL := /bin/bash

UNIT_TIMEOUT ?= 30
COVERAGE_TIMEOUT ?= 120
E2E_TIMEOUT ?= 350
FULL_TIMEOUT ?= 350
LINT_TIMEOUT ?= 30
FORMAT_TIMEOUT ?= 30
RELEASE_ARGS ?=
RELEASE_HELPER := $(abspath $(CURDIR)/scripts/release/release_helper.py)
PUBLISH_RELEASE_ARGS ?=
DEPLOY_ARGS ?=
RELEASE_TOOL_DIR := $(abspath $(CURDIR)/scripts/release)

.PHONY: test test-unit test-coverage test-e2e lint format ci
.PHONY: test-apple-provider
.PHONY: up down
.PHONY: release publish deploy

test:
	timeout -k $(FULL_TIMEOUT)s -s SIGKILL $(FULL_TIMEOUT)s npm test

test-unit:
	timeout -k $(UNIT_TIMEOUT)s -s SIGKILL $(UNIT_TIMEOUT)s npm run test:unit

test-coverage:
	timeout -k $(COVERAGE_TIMEOUT)s -s SIGKILL $(COVERAGE_TIMEOUT)s npm run test:coverage

test-e2e: test-apple-provider
	timeout -k $(E2E_TIMEOUT)s -s SIGKILL $(E2E_TIMEOUT)s npm run test:e2e

test-apple-provider:
	cd demo/apple-provider && test -z "$$(gofmt -l .)"
	cd demo/apple-provider && go vet ./...
	cd demo/apple-provider && go test ./...

lint:
	timeout -k $(LINT_TIMEOUT)s -s SIGKILL $(LINT_TIMEOUT)s npm run lint --if-present

format:
	timeout -k $(FORMAT_TIMEOUT)s -s SIGKILL $(FORMAT_TIMEOUT)s npm run format --if-present

ci: lint format test-coverage test-e2e

up:
	@./up.sh

down:
	@./down.sh

release:
	@RELEASE_HELPER="$(RELEASE_HELPER)" "$(RELEASE_TOOL_DIR)/prepare_release.sh" $(RELEASE_ARGS)

publish:
	@RELEASE_HELPER="$(RELEASE_HELPER)" "$(RELEASE_TOOL_DIR)/publish_release.sh" $(PUBLISH_RELEASE_ARGS)

deploy:
	@bash scripts/deploy-jsdelivr.sh $(DEPLOY_ARGS)
