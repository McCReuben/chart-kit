# chart-kit

Reusable, theme-aware React chart components built on [Recharts](https://recharts.org).

- Six ready-made charts plus the core building blocks (axes, tooltips, legend, zoom, hover) to build new ones.
- Light and dark themes with per-chart overrides. A theme provider is optional.
- Typed props with JSDoc, documented and playable in Storybook.
- No global CSS. Everything is styled inline from the theme.

## Getting started

Requires Node ≥ 20.19 (`nvm use` picks up `.nvmrc`).

```sh
npm install
npm run storybook        # docs + playground at http://localhost:6006
npm run build            # library build → dist/chart-kit.js + dist/types
```

Peer dependencies: `react` and `react-dom` 19, `recharts` 3.

## Usage

```tsx
import { ChartThemeProvider, LineChart, numberFormatter } from 'chart-kit';

<ChartThemeProvider mode="system">
    <LineChart
        categories={['Jan', 'Feb', 'Mar']}
        series={[
            { name: 'This year', data: [42.1, 43.8, 41.5] },
            { name: 'Last year', data: [39.4, 40.2, 40.9], dashStyle: 'Dash' },
        ]}
        yAxisFormatter={numberFormatter({ prefix: '$', suffix: 'M' })}
        showLegend
    />
</ChartThemeProvider>;
```

The series charts take `series: [{ name, data, color? }]` with `data` aligned to `categories`, and `null` for a gap
(`WaterfallChart` takes `data` rows instead). Colours default to the theme palette. Formatters can be inline functions; a new function identity never re-renders or
re-animates a chart.

## Components

| Export              | What it draws                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `LineChart`         | Smooth lines with x-zoom, hover dimming, dash styles, optional sweep-in animation (`animateKey`) and `hoverTrail`     |
| `BarChart`          | `mode`: `grouped`, `stacked` or `horizontal`; stack totals, data labels, point/legend click handlers, `renderTooltip` |
| `ComboBarLineChart` | Columns plus smooth lines on one shared value axis (`type: 'column' \| 'spline'` per series)                          |
| `DualAxisChart`     | Left and right value axes with aligned grid lines (`axis: 'left' \| 'right'`, `type: 'spline' \| 'column'`)           |
| `WaterfallChart`    | Waterfall / bridge chart; build its rows with `toWaterfallRows(start, steps, end)`                                    |
| `ChartSegment`      | Renders a JSON `ChartSpec` (`line`, `dual-axis`, `grouped-bar`, `stacked-bar`, `horizontal-bar`) as a titled card     |

Common props: `height`, `xAxisLabelFormatter`, `yAxisFormatter`, `tooltipValueFormatter`, `tooltipHeaderFormatter`,
`backgroundColor` (`'transparent'` is allowed), `theme` (per-chart overrides), `className`, `ariaLabel` and
`defaultTooltipIndex` (show the tooltip without hovering). The series charts also take `showLegend`. See each chart's
Storybook page for the full prop list.

### Chart specs

`ChartSegment` draws a chart from data, which suits charts produced by a backend or an LLM:

```tsx
<ChartSegment
    spec={{
        type: 'dual-axis',
        x: ['Jan', 'Feb', 'Mar'],
        data: [
            { revenue: 42.1, conversion: 2.8 },
            { revenue: 43.8, conversion: 2.9 },
            { revenue: 41.5, conversion: 2.7 },
        ],
        series: [
            { key: 'revenue', label: 'Revenue ($M)', seriesType: 'column' },
            { key: 'conversion', label: 'Conversion (%)', axis: 'right' },
        ],
        layout: { title: 'Revenue vs conversion', yLabel: 'Revenue ($M)', y2Label: 'Conversion (%)' },
    }}
/>
```

An unknown `type` or an empty `series` renders nothing. `planChartSegment(spec)` returns the resolved chart plan
without rendering it, and `hasChartSegment(message)` checks a message's `segments` for a `{ type: 'chart' }` entry.

## Theming

Charts read their theme from the nearest `ChartThemeProvider`, or use `lightTheme` when there is none.

```tsx
<ChartThemeProvider mode="dark" theme={{ palette: ['#3987e5', '#e5a539'], fontFamily: 'Inter, sans-serif' }}>
    …
    <BarChart theme={{ gridLine: 'transparent' }} … />  {/* per-chart override */}
</ChartThemeProvider>
```

- `mode`: `'light'`, `'dark'` or `'system'` (follows `prefers-color-scheme` live, SSR-safe). Nested providers inherit
  the mode and deep-merge their overrides.
- Tokens: background and border colours, `text.{primary,secondary}`, `axisLabel`, `gridLine`, `crosshair`,
  `positive`/`negative`/`neutral`, `fontFamily` (default `inherit`, so charts use the page font), `fontSize.*`,
  `tooltipInverse.*` and the series `palette`. See `ChartTheme` in [src/theme/types.ts](src/theme/types.ts).
- `lightTheme`, `darkTheme`, `mergeTheme(base, ...overrides)` and `useChartTheme(overrides?)` are exported for custom
  charts.

## Formatters

`formatNumber`, `formatCurrency` and `formatPercent` take `(value, { locale, decimals, compact, signDisplay, prefix,
suffix, … })`. `numberFormatter`, `currencyFormatter` and `percentFormatter` return ready-made formatter functions
for chart props. `retailWeekFormatter(year?)` formats retail-week categories (`'2026 W5'` → `'2026 RW05'`).

## Building your own chart

The core building blocks are exported too: axis and grid prop factories (`categoryAxisProps`, `valueAxisProps`,
`gridProps`), `niceScale`, `ChartFrame`, `ChartLegend`, `SharedTooltipContent` and the tooltip parts,
`useSeriesHover`, `useSeriesVisibility`, `useXZoom` with `ZoomSelection`/`ResetZoomButton`, `HatchPattern`, data
helpers and stable-props hooks. The **Core/Building blocks** stories show each one, and
[docs/architecture.md](docs/architecture.md) has the full API and a chart skeleton.

## Development

| Script                    | What it does                                                                    |
| ------------------------- | ------------------------------------------------------------------------------- |
| `npm run storybook`       | Storybook dev server; the toolbar's **Theme** control switches light/dark       |
| `npm test`                | Vitest unit tests                                                               |
| `npm run typecheck`       | `tsc` over `src/`                                                               |
| `npm run build`           | Library build (ES module) and type declarations into `dist/`                    |
| `npm run build-storybook` | Static Storybook into `storybook-static/`                                       |
| `npm run verify`          | typecheck, tests, build and Storybook build                                     |
| `npm run screenshots`     | Screenshots every story in both themes (needs `build-storybook` and Playwright) |

Layout:

```
src/
  theme/          ChartThemeProvider, built-in themes, ChartTheme types
  core/           shared building blocks (axes, tooltip, legend, zoom, hover, formatters, hooks)
  charts/<Name>/  one folder per chart: component, helpers, stories, tests
  spec/           ChartSegment and the ChartSpec format
  index.ts        public entry point
```

Story data in `src/charts/fixtures.js` is invented.
