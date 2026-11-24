// Entry program for the make.fun bounty
// "post-x-promote-make-your-own-bounty-01" (program/v1, Node 22,
// standard library only, no network).
//
// The entry itself is the X post: its address lives in POST.json at the
// repository root. The house reads the post (and its replies, reposts and
// quotes) from X itself, so all this program has to do is hand POST.json
// to the gate by copying it into the output directory.
//
// Run it locally the way the grader does:
//   mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts

import { chmodSync, copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const botDir = process.env.MAKEFUN_BOT_DIR ?? '/bot';
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const sourcePath = join(botDir, 'POST.json');
const targetPath = join(outDir, 'POST.json');

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// Parse before copying: a malformed file must fail loudly here instead of
// handing the gate something it cannot read.
const text = readFileSync(sourcePath, 'utf8');
let data: unknown;
try {
  data = JSON.parse(text);
} catch {
  fail(`POST.json is not valid JSON: ${sourcePath}`);
}

if (typeof data !== 'object' || data === null || Array.isArray(data)) {
  fail('POST.json must be a JSON object, e.g. {"url": "https://x.com/<handle>/status/<id>"}');
}

const url = (data as Record<string, unknown>).url;
if (typeof url !== 'string' || url.length === 0) {
  fail('POST.json must hold a non-empty string `url`');
}

// The gate reads the post from X itself, so the URL must point at a real
// X status — anything else (a homepage, a profile, another site) is not
// an entry and must fail loudly here instead of reaching the gate.
const statusUrl = /^https:\/\/(?:x\.com|twitter\.com)\/[A-Za-z0-9_]{1,15}\/status\/\d+$/;
if (!statusUrl.test(url)) {
  fail(`POST.json \`url\` must be an X status URL, e.g. https://x.com/<handle>/status/<id> (got: ${url})`);
}

if (text.length > 16384) {
  fail(`POST.json is ${text.length} bytes, over the gate's 16384-byte cap`);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(sourcePath, targetPath);
// The grader collects the output directory as another user, so the copy
// must stay world-readable.
chmodSync(targetPath, 0o644);

const digest = createHash('sha256').update(text, 'utf8').digest('hex');
console.log(`POST.json -> ${targetPath} (${text.length} bytes, sha256 ${digest})`);
console.log(`url: ${url}`);
