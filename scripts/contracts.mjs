// Renders the reference pages from straum at a pinned commit (ECO-D-23):
// each source file is fetched at PIN and written to src/content/docs/reference/
// with only these mechanical changes: the first "# " heading becomes the
// page title, a line names the source and the commit, links between the
// rendered files point at their pages, and other relative links point at
// the file on GitHub at PIN. The pages are never edited by hand; CI fails
// when the committed pages differ from what this script writes.
//
//   node scripts/contracts.mjs           render the pages at PIN
//   node scripts/contracts.mjs --ahead   warn (exit 0) naming each source
//                                        that differs on straum main
//
// The pin moves only in a site PR (ECO-D-14 A): change PIN to a merged
// straum main commit, run `npm run check`, commit the regenerated pages.
import { writeFileSync } from 'node:fs';
import { posix } from 'node:path';

const PIN = 'ed502c59d2427b1f97a7391f00a2a81d549dc8de';
const REPO = 'straum-io/straum';
// source path in straum -> page slug under reference/
const SOURCES = {
	'docs/protocol.md': 'protocol',
	'docs/guarantees.md': 'guarantees',
};

const raw = (rev, path) =>
	fetch(`https://raw.githubusercontent.com/${REPO}/${rev}/${path}`).then((r) => {
		if (!r.ok) throw new Error(`fetching straum ${path} at ${rev}: HTTP ${r.status}`);
		return r.text();
	});

function render(path, text, pin) {
	const lines = text.split('\n');
	const h1 = lines.findIndex((l) => l.startsWith('# '));
	if (h1 < 0) throw new Error(`straum ${path} has no "# " heading`);
	const title = lines[h1].slice(2).trim();
	const body = [...lines.slice(0, h1), ...lines.slice(h1 + 1)].join('\n').replace(/^\n+/, '');
	const dir = posix.dirname(path);
	const linked = body.replace(/\]\(([^)\s]+)\)/g, (whole, target) => {
		if (/^([a-z]+:|#)/i.test(target)) return whole;
		const [file, anchor] = target.split('#');
		const resolved = posix.normalize(posix.join(dir, file));
		const hash = anchor === undefined ? '' : `#${anchor}`;
		if (SOURCES[resolved]) return `](../${SOURCES[resolved]}/${hash})`;
		return `](https://github.com/${REPO}/blob/${pin}/${resolved}${hash})`;
	});
	return [
		'---',
		`title: ${JSON.stringify(title)}`,
		'---',
		'',
		`Generated from [\`${path}\`](https://github.com/${REPO}/blob/${pin}/${path}) at straum commit \`${pin.slice(0, 7)}\`. The file in straum is the source of truth; change it there.`,
		'',
		linked,
	].join('\n');
}

if (process.argv.includes('--ahead')) {
	// Non-blocking: any failure is a warning too.
	try {
		const changed = [];
		for (const path of Object.keys(SOURCES)) {
			const [pinned, head] = await Promise.all([raw(PIN, path), raw('main', path)]);
			if (pinned !== head) changed.push(path);
		}
		if (changed.length === 0) console.log(`reference sources unchanged on straum main since ${PIN.slice(0, 7)}`);
		for (const path of changed) {
			console.log(`::warning title=straum main is ahead of the pin::${path} differs on straum main from ${PIN.slice(0, 7)}; move PIN in scripts/contracts.mjs in a site PR`);
		}
	} catch (e) {
		console.log(`::warning title=straum main check failed::${e.message}`);
	}
	process.exit(0);
}

for (const [path, slug] of Object.entries(SOURCES)) {
	const page = new URL(`../src/content/docs/reference/${slug}.md`, import.meta.url);
	writeFileSync(page, render(path, await raw(PIN, path), PIN));
}
console.log(`reference pages rendered from straum ${PIN.slice(0, 7)}`);
