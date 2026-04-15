SHELL := /bin/bash

UNIT_TIMEOUT ?= 30
COVERAGE_TIMEOUT ?= 120
E2E_TIMEOUT ?= 350
FULL_TIMEOUT ?= 350
LINT_TIMEOUT ?= 30
FORMAT_TIMEOUT ?= 30

.PHONY: test test-unit test-coverage test-e2e lint format ci

test:
	timeout -k $(FULL_TIMEOUT)s -s SIGKILL $(FULL_TIMEOUT)s npm test

test-unit:
	timeout -k $(UNIT_TIMEOUT)s -s SIGKILL $(UNIT_TIMEOUT)s npm run test:unit

test-coverage:
	timeout -k $(COVERAGE_TIMEOUT)s -s SIGKILL $(COVERAGE_TIMEOUT)s npm run test:coverage

test-e2e:
	timeout -k $(E2E_TIMEOUT)s -s SIGKILL $(E2E_TIMEOUT)s npm run test:e2e

lint:
	timeout -k $(LINT_TIMEOUT)s -s SIGKILL $(LINT_TIMEOUT)s npm run lint --if-present

format:
	timeout -k $(FORMAT_TIMEOUT)s -s SIGKILL $(FORMAT_TIMEOUT)s npm run format --if-present

ci: lint format test-coverage test-e2e
