# Uni Series

Cozy 2D browser minigames set at Philippine university landmarks (working title). Minigame #1: **PUP Lagoon — Merienda sa Lagoon**.
Built with Phaser 4 + TypeScript + Vite. Unofficial fan project; not affiliated with any university.

- **What to build:** [SPEC.md](SPEC.md) (draft)
- **Choices and open questions:** [DECISIONS.md](DECISIONS.md)
- **How AI agents work here (Orca):** [AGENTS.md](AGENTS.md)
- **Asset licenses:** [CREDITS.md](CREDITS.md)

## Quick start

Needs Node.js 24 or newer.

```bash
npm ci              # install
npm run dev         # play at the printed URL (Network URL works on your phone on the same Wi-Fi)
npm test            # unit tests
npm run lint        # lint
npm run build       # type-check + production build in dist/
npx playwright install && npm run test:e2e   # browser smoke tests
```

Every push and PR runs lint, tests and the build in GitHub Actions (`.github/workflows/deploy.yml`); pushes to `main`
also deploy to GitHub Pages (repo Settings → Pages → Source: GitHub Actions).
