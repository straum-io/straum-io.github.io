// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// GitHub Pages at the account root (ECO-D-13, amended). Sitemap and canonical URLs use it.
export default defineConfig({
	site: 'https://straum-io.github.io',
	integrations: [
		starlight({
			title: 'Straum',
			description: 'Straum is a durable event log for one server, experimental, version 0.',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/straum-io/straum' }],
			sidebar: [
				{ label: 'Start here', items: [{ autogenerate: { directory: 'start' } }] },
				// Generated from straum at a pinned commit by scripts/contracts.mjs.
				{ label: 'Reference', items: [{ autogenerate: { directory: 'reference' } }] },
			],
		}),
	],
});
