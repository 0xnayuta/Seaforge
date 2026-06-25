#!/usr/bin/env node
/**
 * docs:check — 文档元数据合规校验
 *
 * 检查 docs/ 下所有 .md 文件是否包含正确的 frontmatter：
 *   ---
 *   status: <按目录范围限制>
 *   last_verified: YYYY-MM-DD
 *   ---
 *
 * 规则定义在 DOC_META_RULES 中，scoped 数组按 path pattern 优先匹配，
 * 第一条匹配的 rule 生效，无匹配回退 defaultStatus。
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const errors = [];

// =============================================================================
// 规则定义
// =============================================================================

const DOC_META_RULES = {
	defaultStatus: new Set(["current", "draft", "deprecated", "archived"]),
	scoped: [
		{
			pattern: /^docs\/adr\/ADR-\d{4}-/,
			status: new Set([
				"proposed",
				"accepted",
				"rejected",
				"deprecated",
				"superseded",
			]),
		},
		{
			pattern: /^docs\/archive\//,
			status: new Set(["archived"]),
		},
	],
};

// =============================================================================
// 工具函数
// =============================================================================

function read(file) {
	return fs.readFileSync(path.join(root, file), "utf8");
}

function walk(dir) {
	const result = [];
	for (const entry of fs.readdirSync(path.join(root, dir), {
		withFileTypes: true,
	})) {
		const rel = path.join(dir, entry.name);
		if (entry.isDirectory()) result.push(...walk(rel));
		else result.push(rel.replaceAll(path.sep, "/"));
	}
	return result;
}

function parseFrontmatter(content) {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
	if (!match) return null;
	const data = {};
	for (const line of match[1].split(/\r?\n/)) {
		const index = line.indexOf(":");
		if (index === -1) continue;
		data[line.slice(0, index).trim()] = line.slice(index + 1).trim();
	}
	return data;
}

function matchingRulesFor(file, key) {
	return DOC_META_RULES.scoped.filter(
		(rule) => rule.pattern.test(file) && rule[key],
	);
}

function ruleFor(file, key) {
	const matches = matchingRulesFor(file, key);
	if (matches.length > 0) return matches[0][key];
	return DOC_META_RULES.defaultStatus;
}

function scopeNameFor(file, key) {
	const matches = matchingRulesFor(file, key);
	return matches.length > 0
		? matches[0].pattern.toString()
		: "defaultStatus";
}

function markdownFilesUnder(...dirs) {
	const result = [];
	for (const dir of dirs) {
		if (fs.existsSync(path.join(root, dir))) {
			result.push(
				...walk(dir).filter((f) => f.endsWith(".md")),
			);
		}
	}
	return result.sort();
}

// =============================================================================
// 检查：规则冲突
// =============================================================================

function checkDocMetaRuleConflicts() {
	for (const file of markdownFilesUnder("docs")) {
		for (const key of ["status"]) {
			const matches = matchingRulesFor(file, key);
			if (matches.length > 1) {
				errors.push(
					`${file}: conflicting ${key} rules matched (${matches
						.map((rule) => rule.pattern.toString())
						.join(" | ")})`,
				);
			}
		}
	}
}

// =============================================================================
// 检查：Frontmatter
// =============================================================================

function checkDocFrontmatter() {
	const files = markdownFilesUnder("docs");
	if (files.length === 0) {
		errors.push("no markdown files found under docs/");
		return;
	}

	for (const file of files) {
		const fm = parseFrontmatter(read(file));
		if (!fm) {
			errors.push(`${file}: missing frontmatter`);
			continue;
		}

		// status
		if (!fm.status) {
			errors.push(`${file}: missing required field 'status'`);
		} else {
			const allowed = ruleFor(file, "status");
			const scope = scopeNameFor(file, "status");
			if (!allowed.has(fm.status)) {
				errors.push(
					`${file}: invalid status '${fm.status}' for scope '${scope}' (allowed: ${[...allowed].join(", ")})`,
				);
			}
		}

		// last_verified
		if (!fm.last_verified) {
			errors.push(`${file}: missing required field 'last_verified'`);
		} else if (!/^\d{4}-\d{2}-\d{2}$/.test(fm.last_verified)) {
			if (!(fm.status === "template" && fm.last_verified === "YYYY-MM-DD")) {
				errors.push(
					`${file}: invalid last_verified '${fm.last_verified}' (expected YYYY-MM-DD)`,
				);
			}
		}

		// 禁止多余的字段
		for (const key of Object.keys(fm)) {
			if (key !== "status" && key !== "last_verified") {
				errors.push(
					`${file}: unexpected frontmatter field '${key}' (only status and last_verified allowed)`,
				);
			}
		}
	}
}

// =============================================================================
// 检查：内部链接完整性
// =============================================================================

function checkLinks() {
	for (const file of markdownFilesUnder("docs")) {
		// Strip fenced code blocks before scanning for links
		const content = read(file).replace(/```[\s\S]*?```/g, "");
		for (const match of content.matchAll(
			/\[[^\]]*\]\((?!https?:|mailto:|#|\.\.\/\.\.\/)([^)]+)\)/g,
		)) {
			const target = match[1].split("#")[0];
			if (!target) continue;
			const resolved = path.normalize(
				path.join(root, path.dirname(file), target),
			);
			if (!fs.existsSync(resolved)) {
				errors.push(`${file}: broken link '${match[1]}'`);
			}
		}
	}
}

// =============================================================================
// 主流程
// =============================================================================

checkDocMetaRuleConflicts();
checkDocFrontmatter();
checkLinks();

if (errors.length > 0) {
	console.error("docs:check failed\n");
	console.error(errors.join("\n"));
	process.exit(1);
}

console.log("docs:check passed");
