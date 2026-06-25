#!/usr/bin/env node
/**
 * fix-line-endings — 将项目所有文本文件转换为 LF 行尾
 *
 * 用法：node scripts/fix-line-endings.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const fixed = [];
const skipped = [];

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
	if (BINARY_EXT.has(ext)) {
		skipped.push(file);
		continue;
	}

	const content = fs.readFileSync(file);
	if (content.indexOf(0x0a) === -1) {
		skipped.push(file);
		continue; // binary or empty
	}

	const lf = content.filter(b => b !== 0x0d);
	if (lf.length !== content.length) {
		fs.writeFileSync(file, lf);
		fixed.push(path.relative(root, file).replaceAll(path.sep, "/"));
	}
}

console.log(`fixed: ${fixed.length} file(s)`);
for (const f of fixed) console.log(`  ${f}`);
console.log(`\nskipped (binary/no-newline/already-LF): ${skipped.length} file(s)`);
