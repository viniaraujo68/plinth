# plinth

A personal Svelte 5 design system: theme, application shell, interface primitives and formatters,
built on Tailwind 4 and daisyUI 5.

The library lives in `src/lib` and is published with `svelte-package`. Everything in `src/routes`
is the showcase — a static site that doubles as the documentation — and is never published.

## Status

Scaffold only. The modules described above land phase by phase; the public entry point currently
exports nothing but `LIBRARY_VERSION`.

## Install

```sh
npm i github:viniaraujo68/plinth
```

npm runs the `prepare` script for a git dependency, which builds `dist` on the consumer's machine,
so the built output is not committed.

## Development

```sh
npm install
npm run dev        # showcase at localhost:5173
npm run check      # svelte-check
npm run lint       # prettier --check and eslint
npm run test:unit  # vitest: browser project + node project
npm run test       # the above, plus the playwright end-to-end run
npm run build      # showcase build, then svelte-package and publint
```

`npm run test:unit` needs a Chromium build: `npx playwright install chromium`.

## License

MIT
