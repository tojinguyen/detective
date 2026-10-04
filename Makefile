PORT ?= 3000

.PHONY: default dev build start install test clean

# Lenh mac dinh khi chi go `make`: chay dev server
default: dev

dev:
	npx next dev --port $(PORT)

dev-vite:
	npm run dev

build:
	npm run build

start:
	npm run start

install:
	npm install

test:
	npm test

clean:
	powershell -Command "if (Test-Path .next) { Remove-Item -Recurse -Force .next }"
