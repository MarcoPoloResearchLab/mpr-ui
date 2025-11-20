SHELL := /bin/bash

UNIT_TIMEOUT ?= 30
E2E_TIMEOUT ?= 350
FULL_TIMEOUT ?= 350

.PHONY: build test test-unit test-e2e

build:
	cat src/mpr-ui-core.js src/mpr-ui-header.js src/mpr-ui-footer.js > mpr-ui.js

test:
	npm test

test-unit:
	npm run test:unit

test-e2e:
	npm run test:e2e
