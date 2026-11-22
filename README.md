# Uni Series

Cozy 2D browser minigames set at Philippine university landmarks (working title). Minigame #1: **PUP — Lagoon Merienda**,
an endless budgeting and shopping game at the PUP Lagoon. Built with Phaser 4 + TypeScript + Vite.
Unofficial fan project; not affiliated with any university.

**Play the current build:** https://maryruth17.github.io/uni-series/

- **What to build:** [SPEC.md](SPEC.md) (whole game), [SPEC-homepage.md](SPEC-homepage.md) (landing + campus map),
  [SPEC-pup-lagoon.md](SPEC-pup-lagoon.md) (Lagoon Merienda; its section 0 has the owner's latest changes). All drafts.
- **Choices and open questions:** [DECISIONS.md](DECISIONS.md)
- **How AI agents work here (Orca) and milestone status:** [AGENTS.md](AGENTS.md)
- **Asset licenses:** [CREDITS.md](CREDITS.md)

## Quick start

Needs Node.js 24 or newer.

```bash
npm ci              # install
npm run dev         # play at the printed URL (Network URL works on your phone on the same Wi-Fi)
npm test            # unit tests
npm run sim         # Lagoon Merienda balance bot (1,000 seeds × 40 vacants; add "-- 50 40" for a quick run)
npm run lint        # lint
npm run build       # type-check + production build in dist/
npx playwright install && npm run test:e2e   # browser smoke tests
```

Every push and PR runs lint, tests and the build in GitHub Actions (`.github/workflows/deploy.yml`); pushes to `main`
also deploy to GitHub Pages.
