# straum-io.github.io

The Straum website, https://straum-io.github.io/: a landing page and the
developer documentation, built with Astro and Starlight. It is being
rebuilt together with Straum itself.

- `src/pages/index.astro`: the landing page.
- `src/content/docs/start/`: getting started, written here.
- `src/content/docs/reference/`: the protocol and guarantees pages,
  generated from straum. Do not edit them; change the file in straum.
- `scripts/contracts.mjs`: renders the reference pages; `check-links.mjs`:
  every same-site link resolves.
- `.github/`: the build and GitHub Pages deploy (`site.yml`), the paused
  daily drift Issue (`core-drift.yml`), the PR body check
  (`pr-contract.yml`), the Issue and PR templates.

```bash
npm ci
npm run check     # render the reference pages, build, check links
```

## Reference pages and the pin

`scripts/contracts.mjs` fetches straum's `docs/protocol.md` and
`docs/guarantees.md` at the commit in `PIN` and writes them to
`src/content/docs/reference/`. The only changes are mechanical: the first
heading becomes the page title, a line names the source and commit, and
relative links point at the other reference page or at the file on GitHub
at the pin.

CI fails when the committed pages differ from the ones rendered at the
pin. When straum `main` has changed one of the source files since the pin,
CI warns and names the file, without failing.

To follow straum, in a PR on this repository:

1. Set `PIN` in `scripts/contracts.mjs` to a merged straum `main` commit.
2. Run `npm run check` and commit the regenerated pages.
3. Reread the pages written here (getting started, the landing page)
   against the straum diff, and name the new commit in the PR.

The previous content is kept under the tag
[`archive/main-2026-10-23`](https://github.com/straum-io/straum-io.github.io/tree/archive/main-2026-10-23).

Apache License 2.0.
