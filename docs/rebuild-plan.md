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
npm run check:no-highcharts   # import graph from src/index.ts + grep of dist/
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

- [x] `src/theme/`: `ChartThemeProvider`, `useChartTheme`, light/dark defaults, overrides, follow page scheme
- [x] `src/core/`: axis props, tooltip frame + markers, legend, crosshair cursor, drag-to-zoom + reset button,
      hover dimming
- [x] `src/core/formatters.ts`: opt-in retail-week formatter + number/currency/percent formatters
- [x] Stable-props hook (content-keyed data, formatter refs)
- [x] Final core API recorded below under "Core API"
- [x] Storybook preview wired to the new theme (facilitator)

The first core subagent was stopped at about 300k tokens with the code written but no report. A second, narrowly
scoped subagent audited it, filled in JSDoc gaps, fixed a story formatter and wrote the API report.

## Phase 3b: rebuilds (one subagent each, parallel after 3a)

| Task              | Owner              | Status |
| ----------------- | ------------------ | ------ |
| LineChart         | subagent `line`    | [~]    |
| BarChart          | subagent `bar`     | [~]    |
| ComboBarLineChart | subagent `combo`   | [~]    |
| DualAxisChart     | subagent `dual`    | [~]    |
| WaterfallChart    | subagent `water`   | [~]    |
| ChartSegment      | subagent `segment` | [ ]    |

Shared brief for 3b: every chart agent got the same rules, file ownership, conventions, verification and
report format, plus a chart-specific feature list. Each builds Storybook into its own `storybook-static-<slug>/`
(`screenshot.py --static`), so parallel builds don't clash.

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
- Shared files are owned by the facilitator: `src/index.ts`, `src/charts/fixtures.js`, `package.json`,
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

Import from `../../core` and `../../theme` inside `src/charts/<Name>/`. Every export has JSDoc in the source.
Read the source for full option lists; this section is the contract.

### Theme (`src/theme`)
- `ChartThemeProvider({ mode?: 'light'|'dark'|'system', theme?: ChartThemeOverrides, children })`: nested providers
  inherit the mode and deep-merge overrides. 'system' follows `prefers-color-scheme` live and is SSR-safe.
- `useChartTheme(overrides?)`: context theme (or `lightTheme` with no provider) with per-instance overrides merged
  in. Memoised by content, so an inline object is fine. **Every chart calls this with its `theme` prop.**
- `lightTheme`, `darkTheme`, `LIGHT_PALETTE`, `DARK_PALETTE`, `getBaseTheme(mode)`, `mergeTheme(base, ...o)`.
- `ChartTheme` tokens: `mode`, `isDarkMode`, `background`, `componentBackground`, `componentBorder`, `surface`,
  `border`, `text.{primary,secondary}`, `axisLabel`, `gridLine`, `crosshair`, `selectionFill`, `inactiveLegend`,
  `positive`, `negative`, `forecast`, `budget`, `accent`, `fontFamily`, `fontSize.{axis,legend,tooltip,dataLabel}`,
  `tooltipInverse.*` and `palette`.

### Layout and axes
Axes ship as **prop factories** spread onto Recharts' own `<XAxis>`/`<YAxis>`/`<CartesianGrid>`. This is a
choice, not a constraint: Recharts 3 does allow wrapping `<XAxis>`. Factories keep the real element, so callers
can override any prop.
- `ChartFrame({ height, theme?, backgroundColor?, ariaLabel?, className?, style?, legend?, overlay?, children })`:
  the container. It wraps the chart in a ResponsiveContainer and applies `CHART_SPACING`, `position: relative`,
  `role="img"` and `aria-label`. `'transparent'` is a valid background.
- `CHART_MARGIN`: the default `margin` for the Recharts chart.
- `categoryAxisProps(theme, { position?, dataKey?='index', categories, labelFormatter?(cat,i), rotateLabels?,
  title?, activeValue?, interval?, hide?, axisId?, height? })`: band scale. `rotateLabels` gives −45° labels
  anchored at the end.
- `valueAxisProps(theme, { position?: 'left'|'right'|'bottom', formatter?(v), title?, scale?: NiceScale, hide?,
  axisId?, width? })`.
- `gridProps(theme, { direction? })`: grid lines along the value axis only.
- `CategoryTick` and `ActiveCategoryTick` (accent dot plus bold accent label for `activeValue`), `ROTATED_LABEL_ANGLE`,
  `estimateCategoryAxisHeight(labels, opts)`.
- `niceScale(min, max, { pixelLength?, tickPixelInterval?=72, tickCount?, includeZero? })` returns
  `{ min, max, ticks, interval, domain }` (Highcharts-like ticks).
- `PlotAreaProbe({ onChange })` reports the plot size from inside a chart (feed its height to `niceScale`).
- `HatchPattern({ id, color, background?, tintOpacity?, spacing?, strokeWidth?, angle? })` goes in `<defs>`.

### Tooltip parts
- `tooltipProps(theme, { crosshair?=true, layout? })`: spread onto `<Tooltip>`. No animation, dotted crosshair,
  offset 14.
- `SharedTooltipContent({ series: TooltipSeriesItem[], rows?, headerFormatter?, valueFormatter?(v, series),
  variant? })`: pass it as `content={<SharedTooltipContent/>}`. `rows` must be the rows actually rendered (the
  zoomed slice). Hidden series are skipped and null values show `—`.
- `TooltipFrame({ variant?: 'default'|'inverse' })`, `TooltipTitle`, `TooltipRow({ marker?, label?, value? })`,
  `TooltipMarker({ kind: 'square'|'circle'|'line'|'dashed'|'hatch', color })`: Title, Row and Marker follow the
  frame's variant through context.
- `CrosshairCursor({ color?, lineWidth?, dashArray?, layout? })` (`tooltipProps` already adds it).

### Legend
- `ChartLegend({ items: LegendItem[], onToggle?(key), onItemClick?(item), onItemHover?(key|null), symbolSize?=10,
  symbolRadius?=0 })`: `onItemClick` replaces toggling. Hidden items are drawn in `inactiveLegend`. Pass it
  through ChartFrame's `legend` prop.
- `LegendSymbol({ kind: 'square'|'circle'|'line'|'dashed'|'lineMarker'|'hatch', ... })`.
- `useSeriesVisibility(ids, resetKey?)` returns `{ hidden, isHidden, toggle, setVisible, showAll }`.

### Interactions
- `useSeriesHover({ dimOpacity?=0.4 })` returns `{ hovered, setHovered, clear, isDimmed, opacityOf, dimProps(id),
  bindItem(id) }`. `DIM_OPACITY` is 0.4 and `DIM_TRANSITION` is `opacity 120ms ease-out`.
- `NearestSeriesTracker({ series, onChange, layout? })`: render it **inside** line-type charts to pick the series
  nearest the pointer. Bars use `hover.bindItem(key)` instead.
- `useXZoom({ length, resetKey?, enabled?, minDragPx?=10 })` returns `{ range, isZoomed, sliceRows(rows),
  selection, chartHandlers, reset, consumeDragClick() }`.
- `ZoomSelection({ selection })` and `ResetZoomButton({ visible, onClick, fill? })` are both rendered **inside**
  the chart.

### Data helpers
- `buildRows(categories, series)` returns `{ index, category, s0, s1, … }`. Non-finite values become null.
- `resolveSeries(series, palette)` returns `{ key: 's<i>', name, color, index, input }`.
- `seriesExtent(rows, keys, { stacked? })`, `seriesKey(i)`, `paletteColor(palette, i)`.
- Types: `SeriesInput { name, data: (number|null)[], color? }`, `ChartRow`, `ResolvedSeries`.

### Formatters
- `formatNumber`, `formatCurrency` and `formatPercent` take `(v, { locale, decimals, compact, signDisplay, prefix,
  suffix, currency?, fromRatio? })`. Factory versions: `numberFormatter`, `currencyFormatter`, `percentFormatter`.
- `formatRetailWeek(value, year?)` and `retailWeekFormatter(year?)` (opt-in; see D10).
- `defaultValueFormatter` and `defaultCategoryFormatter` (`String`), `EMPTY_VALUE = '—'`.

### Hooks
- `useContentStable(value)`: keeps the previous reference while the content is JSON-equal.
- `useLatestRef(value)`, `useStableCallback(fn)`: stable identity that always calls the latest function.
- `useUniqueId(prefix?)` returns `ck-<prefix>-…`, safe to use in `url(#…)`.

### Recharts constraints to know
- Axis heights are estimated (`estimateCategoryAxisHeight`), not `"auto"`, because auto can oscillate with tick
  thinning.
- `NearestSeriesTracker`, `ZoomSelection` and `ResetZoomButton` use Recharts hooks, so they must be children of the
  chart.
- To keep point clicks working under zoom, guard handlers with `if (zoom.consumeDragClick()) return;`.

### Chart skeleton (contract)
```tsx
export function ExampleLineChart({ series, categories, height = 360, backgroundColor, theme: overrides,
    xAxisLabelFormatter, valueFormatter }: ExampleLineChartProps) {
    const theme = useChartTheme(overrides);
    const stableSeries = useContentStable(series);                  // equal content -> same reference
    const stableCats = useContentStable(categories);
    const resolved = useMemo(() => resolveSeries(stableSeries, theme.palette), [stableSeries, theme.palette]);
    const allRows = useMemo(() => buildRows(stableCats, stableSeries), [stableCats, stableSeries]);
    const fmtLabel = useStableCallback((v: string | number, i: number) => (xAxisLabelFormatter ?? defaultCategoryFormatter)(v, i));
    const fmtValue = useStableCallback((v: number | null) => (valueFormatter ?? defaultValueFormatter)(v));

    const visibility = useSeriesVisibility(resolved.map((s) => s.key), resolved.map((s) => s.name));
    const hover = useSeriesHover();
    const zoom = useXZoom({ length: allRows.length, resetKey: allRows });   // auto-resets on data change
    const rows = useMemo(() => zoom.sliceRows(allRows), [zoom.sliceRows, allRows]);
    const extent = seriesExtent(rows, resolved.filter((s) => !visibility.isHidden(s.key)).map((s) => s.key));
    const scale = extent ? niceScale(extent[0], extent[1], { pixelLength: height * 0.6 }) : undefined;
    const items = resolved.map((s) => ({ key: s.key, name: s.name, color: s.color, hidden: visibility.isHidden(s.key) }));

    return (
        <ChartFrame height={height} theme={theme} backgroundColor={backgroundColor} ariaLabel="Line chart"
            legend={<ChartLegend items={items.map((i) => ({ ...i, symbol: 'line' as const }))}
                onToggle={visibility.toggle} onItemHover={hover.setHovered} />}>
            <LineChart data={rows} margin={CHART_MARGIN} {...zoom.chartHandlers} onMouseLeave={hover.clear}
                style={{ userSelect: 'none' }}>
                <CartesianGrid {...gridProps(theme)} />
                <XAxis {...categoryAxisProps(theme, { categories: stableCats, labelFormatter: fmtLabel, rotateLabels: true })} />
                <YAxis {...valueAxisProps(theme, { scale, formatter: fmtValue })} />
                <Tooltip {...tooltipProps(theme)} content={<SharedTooltipContent rows={rows}
                    series={items.map((i) => ({ ...i, marker: 'square' as const }))}
                    headerFormatter={fmtLabel} valueFormatter={fmtValue} />} />
                {resolved.map((s) => (
                    <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} strokeWidth={2.5} dot={false}
                        hide={visibility.isHidden(s.key)} isAnimationActive={false} {...hover.dimProps(s.key)} />
                ))}
                <NearestSeriesTracker series={items} onChange={hover.setHovered} />
                <ZoomSelection selection={zoom.selection} />
                <ResetZoomButton visible={zoom.isZoomed} onClick={zoom.reset} fill={backgroundColor} />
            </LineChart>
        </ChartFrame>
    );
}
```
Other chart types:
- **Bars:** add `{...hover.bindItem(s.key)}` and leave out `NearestSeriesTracker`.
- **Horizontal bars:** `layout="vertical"`, `categoryAxisProps(theme, { position: 'left' })`,
  `valueAxisProps(theme, { position: 'bottom' })`, `gridProps(theme, { direction: 'vertical' })`,
  `tooltipProps(theme, { layout: 'vertical' })`.
- **Hatched bars:** `const id = useUniqueId('hatch')`, `<defs><HatchPattern id={id} color={c} /></defs>`,
  `fill={`url(#${id})`}`.

---

## Decision log

| #   | Date       | Decision                                                                                                                                                                                                   | By   |
| --- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| D1  | 2026-09-30 | Rebuilt and new components are written in **TypeScript**; prop types feed Storybook docs. Originals stay JSX.                                                                                              | User |
| D2  | 2026-09-30 | Phase 4 scope: **all**: ComparisonChart, ActualVsForecastChart, Treemap, Sankey, BubbleChart, ScatterChart (tooltip parts in core regardless).                                                             | User |
| D3  | 2026-09-30 | Fidelity: **same features + same design** (colours, spacing, font sizes, axis/tooltip/legend style, interactions); no pixel-for-pixel match; every difference listed with a reason.                        | User |
| D4  | 2026-09-30 | Default theme keeps the **source app's colour tokens** (light and dark). Default series palette is a new generic one.                                                                                      | User |
| D5  | 2026-09-30 | Package name stays **`chart-kit`**.                                                                                                                                                                        | User |
| D6  | 2026-09-30 | ~~Library entry stays `src/index.js`~~ (superseded by D9). Types are emitted by `tsc -p tsconfig.build.json` into `dist/types`, so there's no extra Vite plugin dependency.                                 | Facilitator |
| D7  | 2026-09-30 | `tooltipHeaderFormatter`, `className` and `ariaLabel` join the common props. `weekYear` is replaced by the opt-in `retailWeekFormatter(year)`.                                                             | Facilitator |
| D8  | 2026-09-30 | Originals' stories keep the old fixture `PALETTE` (so the baseline stays valid). New and comparison stories use generic, non-client colours.                                                               | Facilitator |
| D9  | 2026-09-30 | Library entry is now **`src/index.ts`**, so it can re-export types (`SeriesInput`, `ChartTheme`, …). Plain JS can't. Types are still emitted by tsc into `dist/types`. | Facilitator |
| D10 | 2026-09-30 | `formatRetailWeek` treats a null or empty year as "no year" (`'W5'` → `'RW05'`). The original gave `'0 RW05'`, since `Number(null)` is 0. Output is identical whenever a real year is given. | Facilitator |
| D11 | 2026-09-30 | Axes ship as prop factories by choice. Recharts 3 does allow wrapping `<XAxis>`, but factories keep the real element and its full prop surface. | Facilitator |

## Notes and observations

- Original WaterfallChart hardcodes `var(--Family-Primary, "Market Sans")`. Outside the source app this falls back
  to the browser's serif font (visible in the baseline). The rebuild uses the theme font token.

## Phase 4 reference notes (read 2026-09-30; visual reference only, never copy data parsing or field names)

Paths are relative to the source app's `src/`.

- **ComparisonChart** (`components/wbr/chart.jsx`, `gmbChart.jsx`, Highcharts): 620px tall (480 compact). With a
  YoY panel it has **two stacked panes sharing the x axis**: top 55% value lines, bottom 35% YoY % columns, with a
  gap. Top pane: TY (2.5px, filled circle markers r5), LY (2px, grey #9CA3AF), L2Y (2px, #6B7280), Forecast (2.5px
  Dash, no markers), Budget (1.5px ShortDash, no markers). Bottom pane: TY YoY% column, Yo2Y% column (#8890A4),
  Forecast YoY% column (translucent fill 0.18 + 1px border in forecast colour). **The references don't hatch these
  bars.** The hatched forecast bar comes from the ActualVsForecast reference, and the brief asks for hatching here,
  so ComparisonChart uses hatched forecast bars. Shared tooltip: bold period header, top-pane rows in value format,
  bottom-pane rows in %, 'NA' for nulls, marker by kind (circle for marked lines, dashed line for Forecast/Budget,
  square for columns, hatch for the hatched column). Hover dims other series to 0.5. Legend 12px, 10x10 square
  symbols. Crosshair on. Rotated -45° x labels, 12px.
- **ActualVsForecastChart** (`components/wbr/wbrView/gmbActualVsForecastChart.jsx`, `gmbGrowthAreaChart.jsx`,
  Recharts): two stacked charts synced on hovered category. Top ComposedChart (185px): TY and LY lines, forecast
  dashed "4 4", monotone, no dots, activeDot r4 with white 2px stroke, plus invisible 14px hover-target lines. The
  growth variant has an LY **Area** (fillOpacity 0.35) and a TY line (3px). Bottom BarChart (235px): actual YoY
  bars (maxBarSize 18, radius [4,4,0,0], activeBar white 2px stroke) and forecast YoY bars with an **SVG `<pattern>`
  hatch** (8x8, rotate 45, 3px stroke over chart background) + 1px stroke. ReferenceLine y=0. A vertical
  ReferenceLine at the hovered category in accent blue on both panes. **Active x tick** (dot plus bold accent label
  for the hovered category), x labels rotated -90°. Custom legend buttons toggle visibility (line / dash / bar /
  hatch symbols, opacity 0.45 when off).
- **Tooltip parts** (`components/wbr/wbrView/wbrChartTooltip.jsx`): Frame (minWidth 220, padding 10x12, radius 6,
  **always dark**: #050505 bg, #30343b border, shadow 0 6px 18px rgba(0,0,0,.28), 12px/600, line-height 18px),
  Title (12px/700, mb 4), Row (flex, gap 6, "label: value"), Marker variants circle (12px, white 2px border),
  square (14px), dash (14px dashed 2px), hatch (14px repeating-linear-gradient 45deg). Core's tooltip parts should
  offer this "inverse" look as a variant beside the default (theme surface) look.
- **Treemap** (`components/ebayLiveWbr/MarketShareChart.jsx`, `components/marketingWbr/PaidMkPerfChart.jsx`,
  Highcharts treemap): flat, or **grouped two-level** (group headers 11px/700 in text.primary; groups laid out
  slice-and-dice, leaves squarified). 1px borders (#000 on leaves; groups #bbb light / #666 dark). Colour by
  **status/threshold** (for example >=+2% green, -2..+2 grey #bfbfbf, -8..-2 brown, < -8 red; or a two-signal
  rule). **Minimum tile floor** (4-5% of max) so tiny items stay visible. **Size-adaptive labels**: hidden if
  w<24 or h<18, name only if w<48 or h<32, 2 lines if h<52, else 3 lines (name / value / %), white 10-11px, but
  **dark text on light tiles**. Tooltip: bold name + metric lines. **Threshold legend**: 10px circles + 12px
  text.secondary labels, placed in the header. No hover brightness.
- **BubbleChart** (`components/cbtWbr/CbtEvolutionModule.jsx`, Highcharts bubble / highcharts-more): 440px,
  series grouped by category (one colour per group), bubble size minSize 12 / maxSize 72 px, fillOpacity 0.85,
  **data labels** (name, 10px/700 white with dark outline), light grid both axes, axis titles 11px/600, x
  **reference line at the average** (dashed, 1.5px, labelled "Avg …"), legend with circle symbols, tooltip with a
  bold name + metric lines (radius 12, shadow). **Animated transitions (500ms) when data changes** (the app drives
  a period play/pause slider and a large watermark label for the period; the slider is host UI, and the
  watermark can be an optional prop).
- **ScatterChart** (`components/max/budgetPlayground/tabs/MaxBudgetNationalEfficiencyTab.jsx` Highcharts;
  `pages/quantumDashboard/components/quantumHealthMap.jsx` Recharts): numeric x/y; optional z size (sqrt-normalised,
  ZAxis range [120, 2200]); **centred padded domains**; ReferenceLine y=0; **vertical reference lines with labels
  and dash styles**; **colour by rule** (for example sign of a field → positive/negative); **click to
  select/deselect** (selected 0.9 opacity + text.primary 2px stroke, others 0.15 when any selected, default 0.55);
  optional **trend/overlay line series** (for example a moving average) including a secondary right axis;
  crosshair; legend; custom tooltip.
- **Sankey** (`components/max/national/HaloCard.jsx`, `pages/adminTracking/AdminTrackingPage.jsx`, Highcharts):
  nodes `{id, name, color}`, links `{from, to, weight}`, multi-column. Node colours per node, by column/field, or
  by role (source vs target). **Links tinted with the source node colour** at opacity 0.2 light / 0.3 dark. Node
  labels 11px text.primary. Tooltip: node → name + total; link → "From → To" + weight. **Auto height** from the
  largest column (max(220, n*55+50)). **Top-N + "Other"** bucketing (grey #9CA3AF) and label truncation (28 chars
  + ellipsis) as generic helpers. Hovering a node or link highlights connected links.

## Log

- 2026-09-30: Setup done (phase 0). Core subagent started for 3a. Scope added mid-task: inverse tooltip variant,
  inverse marker sizes, `ActiveCategoryTick`, `accent` token (all needed by phase 4).
