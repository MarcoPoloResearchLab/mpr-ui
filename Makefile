SHELL := /bin/bash

UNIT_TIMEOUT ?= 30
E2E_TIMEOUT ?= 350
FULL_TIMEOUT ?= 350

.PHONY: test test-unit test-e2e

test:
	npm test

test-unit:
	npm run test:unit

test-e2e:
	npm run test:e2e
