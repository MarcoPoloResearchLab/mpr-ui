SHELL := /bin/bash

UNIT_TIMEOUT ?= 30
E2E_TIMEOUT ?= 350
FULL_TIMEOUT ?= 350
LINT_TIMEOUT ?= 120
FORMAT_TIMEOUT ?= 120

.PHONY: test test-unit test-e2e lint format ci

test:
	npm test

test-unit:
	npm run test:unit

test-e2e:
	npm run test:e2e

lint:
	npm run lint --if-present

format:
	npm run format --if-present

ci: lint format test
