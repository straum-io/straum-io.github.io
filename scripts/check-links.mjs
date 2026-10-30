// Every same-site href and src in the built site, relative or root-relative,
// must resolve to a file in dist/.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const base = '/';
const origin = 'https://site.invalid';
const dist = new URL('../dist/', import.meta.url).pathname;
const broken = new Set();

for (const file of readdirSync(dist, { recursive: true })) {
	if (!file.endsWith('.html')) continue;
	const pageUrl = new URL(base + file.replace(/(^|\/)index\.html$/, '$1'), origin);
	for (const [, href] of readFileSync(join(dist, file), 'utf8').matchAll(/(?:href|src)="([^"]*)"/g)) {
		const url = new URL(href, pageUrl);
		if (url.origin !== origin) continue;
		const path = decodeURIComponent(url.pathname);
		if (!path.startsWith(base)) {
			broken.add(`${file}: ${href} (outside ${base})`);
			continue;
		}
		const target = join(dist, path.slice(base.length));
		if (!existsSync(target) && !existsSync(join(target, 'index.html'))) broken.add(`${file}: ${href}`);
	}
}

if (broken.size) {
	console.error([...broken].join('\n'));
	process.exit(1);
}
console.log('links: ok');
