#!/usr/bin/env node
/**
 * check:line-endings — 检查项目文本文件是否全部为 LF 行尾
 *
 * 排除 node_modules / .next / .git 及已知二进制扩展名。
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const errors = [];

const BINARY_EXT = new Set([
	".ico", ".png", ".jpg", ".jpeg", ".gif", ".webp",
	".svg", ".woff", ".woff2", ".eot", ".ttf",
]);

function walk(dir) {
	const result = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const rel = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
			result.push(...walk(rel));
		} else {
			result.push(rel);
		}
	}
	return result;
}

for (const file of walk(root)) {
	const ext = path.extname(file).toLowerCase();
	if (BINARY_EXT.has(ext)) continue;

	const content = fs.readFileSync(file);
	const newlineIdx = content.indexOf(0x0a);
	if (newlineIdx === -1) continue; // no newline = binary or empty

	if (newlineIdx > 0 && content[newlineIdx - 1] === 0x0d) {
		const rel = path.relative(root, file).replaceAll(path.sep, "/");
		errors.push(rel);
	}
}

if (errors.length > 0) {
	console.error("check:line-endings FAILED — CRLF found:\n");
	for (const file of errors) console.error(`  ${file}`);
	console.error(`\nFix with: node scripts/fix-line-endings.mjs`);
	process.exit(1);
}

console.log("check:line-endings passed — all files LF");
