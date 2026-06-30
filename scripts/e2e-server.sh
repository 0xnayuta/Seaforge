#!/usr/bin/env bash
# Playwright E2E webServer wrapper
# 确保 E2E 测试数据库 schema 是最新的
bun prisma db push --accept-data-loss 2>&1

# 使用 Turbopack（不含 --webpack）。webpack 在页面级重建时有 "Manifest file is empty" 问题
exec env -u NO_COLOR npx next dev "$@"
