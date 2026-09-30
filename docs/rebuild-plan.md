# chart-kit rebuild plan

Facilitator: Claude (main session). Re-read this file whenever work resumes. It overrides the README roadmap
wherever they conflict.

**Goal:** rebuild every chart in **Recharts only**. Highcharts needs a paid licence, and the library must not depend
on one. Highcharts stays as a devDependency **only** so the frozen originals in `src/originals/` render in Storybook
for side-by-side comparison.

Branch: `rebuild`. Node 22: prefix commands with `PATH=~/.nvm/versions/node/v22.22.3/bin:$PATH`.

## Verification (run for every task)

```sh
npm run typecheck
npm run build                 # vite lib build + d.ts (dist/types)
npm run check:no-highcharts   # import graph from src/index.js + grep of dist/
npm run build-storybook
python3 scripts/screenshot.py --run <NN-name> [--filter <story-id-substr> ...]
```

`npm run verify` runs the first four. Screenshots go to `screenshots/<run>/` (gitignored), along with `report.json`.
Highcharts console messages are listed separately from real errors.

Baseline of the originals: `screenshots/00-baseline-originals/` (42 shots, 0 real errors, only the Highcharts
accessibility-module advisory).

## Status legend

`[ ]` todo · `[~]` in progress · `[x]` done and verified · `[-]` dropped (see decision log)

## Phase 0: setup (owner: facilitator)

- [x] Branch `rebuild`
- [x] Freeze originals into `src/originals/` (charts, CSS, ChartSegment, ThemeContext, formatRetailWeek); stories
      retitled `Originals/*`; removed from `src/index.js`; build verified not to include them
- [x] Highcharts removed from `peerDependencies` (kept as devDependency); peers = react, react-dom, recharts
- [x] `scripts/check-no-highcharts.mjs` + `npm run check:no-highcharts` (negative-tested)
- [x] `scripts/screenshot.py` + baseline run `00-baseline-originals`
- [x] TypeScript: `tsconfig.json`, `tsconfig.build.json` (d.ts to `dist/types`), `npm run typecheck`, `npm run verify`
- [x] This plan file

## Phase 3a: core foundation (owner: subagent `core`)

- [ ] `src/theme/`: `ChartThemeProvider`, `useChartTheme`, light/dark defaults, overrides, follow page scheme
- [ ] `src/core/`: axis props, tooltip frame + markers, legend, crosshair cursor, drag-to-zoom + reset button,
      hover dimming
- [ ] `src/core/formatters.ts`: opt-in retail-week formatter + number/currency/percent formatters
- [ ] Stable-props hook (content-keyed data, formatter refs)
- [ ] Final core API recorded below under "Core API"
- [ ] Storybook preview wired to the new theme (facilitator)

## Phase 3b: rebuilds (one subagent each, parallel after 3a)

| Task              | Owner              | Status |
| ----------------- | ------------------ | ------ |
| LineChart         | subagent `line`    | [ ]    |
| BarChart          | subagent `bar`     | [ ]    |
| ComboBarLineChart | subagent `combo`   | [ ]    |
| DualAxisChart     | subagent `dual`    | [ ]    |
| WaterfallChart    | subagent `water`   | [ ]    |
| ChartSegment      | subagent `segment` | [ ]    |

## Phase 4: new components (all confirmed in scope, see D2)

| Task                                     | Owner                    | Status |
| ---------------------------------------- | ------------------------ | ------ |
| Tooltip parts (in core)                  | subagent `core`          | [ ]    |
| ComparisonChart                          | subagent `comparison`    | [ ]    |
| ActualVsForecastChart                    | subagent `avf`           | [ ]    |
| Treemap                                  | subagent `treemap`       | [ ]    |
| Sankey                                   | subagent `sankey`        | [ ]    |
| BubbleChart                              | subagent `bubble`        | [ ]    |
| ScatterChart                             | subagent `scatter`       | [ ]    |

## Phase 5: documentation

- [ ] Docs pages: Introduction, Getting Started, Theming, Formatters, Chart spec, Migration guide
- [ ] One MDX page per component
- [ ] README rewrite (Recharts only, no licence caveat)
- [ ] Cold-reader review subagent

## Final check

- [ ] Fresh verify + screenshot run, manual review of every Comparison story in both themes, report to user

---

## Conventions for all new code

- **Recharts only.** Never import `highcharts*` or anything in `src/originals/` from library code. (Stories under
  `Comparison/*` may import originals; stories are not part of the library.)
- TypeScript (`.tsx`/`.ts`). Every public prop gets a JSDoc comment, because Storybook's docs read them.
- File layout per chart: `src/charts/<Name>/<Name>.tsx`, `index.ts`, `<Name>.stories.tsx` (title `Charts/<Name>`),
  `<Name>.comparison.stories.tsx` (title `Comparison/<Name>`, only where an original exists).
- No global CSS class names. Prefer inline styles. Any class or id must be prefixed `ck-` and made unique per
  instance with `useId()` where it has to be (SVG pattern/clip ids).
- No client identifiers: no client names, no GMB/GMV or other client metric names, no "Market Sans", no copied data.
  Fixtures are invented and live in `src/charts/fixtures.js` (facilitator-owned).
- Shared files are owned by the facilitator: `src/index.js`, `src/charts/fixtures.js`, `package.json`,
  `.storybook/*`, `scripts/*`, `tsconfig*.json`, `vite.config.js`, this file. Subagents request changes in their
  report.

## Common props (every chart)

Public data shape stays close to the originals: `series: [{ name, data, color, ... }]` plus `categories`. Each
component converts to Recharts rows internally.

```ts
interface SeriesInput {
    name: string;
    data: Array<number | null>;   // aligned to categories; null = gap
    color?: string;               // default: theme.palette[i % n]
}

interface CommonChartProps<S extends SeriesInput = SeriesInput> {
    series: S[];
    categories: Array<string | number>;
    height?: number;                                        // px; default per chart (as in original)
    showLegend?: boolean;                                   // default false
    xAxisLabelFormatter?: (value: string | number, index: number) => string;   // default: String(value)
    yAxisFormatter?: (value: number) => string;
    tooltipValueFormatter?: (value: number | null, series: S) => string;       // default: value or '—'
    tooltipHeaderFormatter?: (category: string | number, index: number) => string; // default: xAxisLabelFormatter
    backgroundColor?: string;                               // default theme.componentBackground; 'transparent' ok
    theme?: ChartThemeOverrides;                            // per-instance overrides merged over context theme
    className?: string;
    ariaLabel?: string;                                     // accessible name for the chart
}
```

- `weekYear` (originals) is gone. Retail-week labels are opt-in:
  `xAxisLabelFormatter={retailWeekFormatter(2026)}`.
- Formatters may be inline arrow functions. Charts must not re-render or re-animate because a formatter's identity
  changed (read them through refs), or because `series`/`categories` were rebuilt with the same content.

## Core API

_To be filled in from the core subagent's report._

---

## Decision log

| #   | Date       | Decision                                                                                                                                                                                                   | By   |
| --- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| D1  | 2026-09-30 | Rebuilt and new components are written in **TypeScript**; prop types feed Storybook docs. Originals stay JSX.                                                                                              | User |
| D2  | 2026-09-30 | Phase 4 scope: **all**: ComparisonChart, ActualVsForecastChart, Treemap, Sankey, BubbleChart, ScatterChart (tooltip parts in core regardless).                                                             | User |
| D3  | 2026-09-30 | Fidelity: **same features + same design** (colours, spacing, font sizes, axis/tooltip/legend style, interactions); no pixel-for-pixel match; every difference listed with a reason.                        | User |
| D4  | 2026-09-30 | Default theme keeps the **source app's colour tokens** (light and dark). Default series palette is a new generic one.                                                                                      | User |
| D5  | 2026-09-30 | Package name stays **`chart-kit`**.                                                                                                                                                                        | User |
| D6  | 2026-09-30 | Library entry stays `src/index.js` (re-exports .ts/.tsx). Types are emitted by `tsc -p tsconfig.build.json` into `dist/types`, so there's no extra Vite plugin dependency.                                 | Facilitator |
| D7  | 2026-09-30 | `tooltipHeaderFormatter`, `className` and `ariaLabel` join the common props. `weekYear` is replaced by the opt-in `retailWeekFormatter(year)`.                                                             | Facilitator |
| D8  | 2026-09-30 | Originals' stories keep the old fixture `PALETTE` (so the baseline stays valid). New and comparison stories use generic, non-client colours.                                                               | Facilitator |

## Notes and observations

- Original WaterfallChart hardcodes `var(--Family-Primary, "Market Sans")`. Outside the source app this falls back
  to the browser's serif font (visible in the baseline). The rebuild uses the theme font token.
