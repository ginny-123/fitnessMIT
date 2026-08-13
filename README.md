# FitTrack Personal

A private, no-login workout and nutrition tracker built as an installable progressive web app.

## Included

- Seeded four-week upper/lower training block
- Per-set weight, reps, and reps-in-reserve logging
- Transparent double-progression recommendations
- Rest timer and exercise cues
- Seven-day Indian meal rotation with chicken, eggs, dairy, and legumes; no soy
- Meal, protein, calorie, water, weight, waist, and body-fat-estimate tracking
- 28-day progress summaries
- Local JSON backup and restore
- Responsive desktop and mobile layouts

All records are stored in the current browser. Personal source documents are excluded from Git by `.gitignore`.

## Local development

```sh
pnpm install
pnpm dev
```

## Production build

```sh
pnpm build
```

Vercel should use the Vite preset, `pnpm build` as the build command, and `dist` as the output directory.
