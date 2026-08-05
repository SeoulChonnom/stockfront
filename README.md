# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and Biome lint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Lint and format

Linting and formatting are both handled by [Biome](https://biomejs.dev) (`biome.json`). ESLint and Prettier are not used.

```sh
pnpm lint      # biome check — format, lint, and import-order checks
pnpm lint:fix  # biome check --write — applies the safe fixes
```

Note: do not run `npx biome`. The bare `biome` name on npm is an unrelated package — use the `@biomejs/biome` devDependency through the pnpm scripts above.

Biome does not do type-aware linting, so it will not catch the class of problems `typescript-eslint`'s `recommendedTypeChecked` used to. `pnpm build` (`tsc -b && vite build`) is the typecheck.
