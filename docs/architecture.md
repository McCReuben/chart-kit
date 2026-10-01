# Architecture and contributor guide

How the library is put together, and what a new chart has to follow. Every export has JSDoc in the source; this page is
the overview and the contract.

## Conventions

- **Recharts only** for drawing. No other charting library.
- TypeScript (`.ts`/`.tsx`). Every public prop gets a JSDoc comment, because Storybook's docs read them.
- One folder per chart: `src/charts/<Name>/<Name>.tsx`, `index.ts` (public exports), `<Name>.stories.tsx` (title
  `Charts/<Name>`), `<Name>.test.tsx`, plus any local helpers. Export the chart from `src/index.ts`.
- No global CSS class names. Use inline styles from the theme. Any class or id must be prefixed `ck-`, and SVG
  pattern/clip ids must be unique per instance (`useUniqueId`).
- Story data is invented and lives in `src/charts/fixtures.js`. Never use real or customer data.
- Run `npm run verify` before committing. For visual changes, also run `npm run screenshots` and check both themes.

## Common props

The public data shape is `series: [{ name, data, color? }]` plus `categories`. Each chart converts it to Recharts rows
internally.

```ts
interface SeriesInput {
    name: string;
    data: Array<number | null>; // aligned to categories; null = gap
    color?: string; // default: theme.palette[i % n]
}

interface CommonChartProps<S extends SeriesInput = SeriesInput> {
    series: S[];
    categories: Array<string | number>;
    height?: number; // px, legend included; default per chart
    showLegend?: boolean;
    xAxisLabelFormatter?: (value: string | number, index: number) => string; // default: String(value)
    yAxisFormatter?: (value: number) => string;
    tooltipValueFormatter?: (value: number | null, series: S) => string; // default: value or '—'
    tooltipHeaderFormatter?: (category: string | number, index: number) => string; // default: xAxisLabelFormatter
    backgroundColor?: string; // default theme.componentBackground; 'transparent' ok
    theme?: ChartThemeOverrides; // per-instance overrides merged over the context theme
    className?: string;
    ariaLabel?: string;
    defaultTooltipIndex?: number; // show the tooltip at this category without hovering
}
```

Formatters may be inline arrow functions. A chart must not re-render or re-animate because a formatter's identity
changed (read them through `useStableCallback`), or because `series`/`categories` were rebuilt with the same content
(`useContentStable`).

## Core API

Import from `../../core` and `../../theme` inside `src/charts/<Name>/`.

### Theme (`src/theme`)

- `ChartThemeProvider({ mode?: 'light'|'dark'|'system', theme?: ChartThemeOverrides, children })`: nested providers
  inherit the mode and deep-merge overrides. `'system'` follows `prefers-color-scheme` live and is SSR-safe.
- `useChartTheme(overrides?)`: the context theme (or `lightTheme` with no provider) with per-instance overrides merged
  in. Memoised by content, so an inline object is fine. **Every chart calls this with its `theme` prop.**
- `lightTheme`, `darkTheme`, `LIGHT_PALETTE`, `DARK_PALETTE`, `getBaseTheme(mode)`, `mergeTheme(base, ...overrides)`.
- `ChartTheme` tokens: `mode`, `isDarkMode`, `background`, `componentBackground`, `componentBorder`, `surface`,
  `border`, `text.{primary,secondary}`, `axisLabel`, `gridLine`, `crosshair`, `selectionFill`, `inactiveLegend`,
  `positive`, `negative`, `neutral`, `forecast`, `budget`, `accent`, `fontFamily`,
  `fontSize.{axis,legend,tooltip,dataLabel}`, `tooltipInverse.*` and `palette`.

### Layout and axes

Axes ship as **prop factories** spread onto Recharts' own `<XAxis>`/`<YAxis>`/`<CartesianGrid>`. This keeps the real
Recharts element, so callers can override any prop. Equal inputs return the same object (cached per theme); treat
results as read-only.

- `ChartFrame({ height, theme?, backgroundColor?, ariaLabel?, className?, style?, legend?, overlay?, children })`: the
  container. It wraps the chart in a ResponsiveContainer and applies `CHART_SPACING`, `position: relative`,
  `role="img"` and `aria-label`.
- `CHART_MARGIN`: the default `margin` for the Recharts chart.
- `categoryAxisProps(theme, { position?, dataKey?='index', categories, labelFormatter?(cat, i), rotateLabels?, title?,
titleFontSize?, tickMarks?=false, activeValue?, interval?, hide?, axisId?, height? })`: band scale. `rotateLabels`
  gives −45° labels anchored at their end.
- `valueAxisProps(theme, { position?: 'left'|'right'|'bottom', formatter?(v), title?, titleFontSize?=13, scale?:
NiceScale, hide?, axisId?, width? })`.
- `gridProps(theme, { direction? })`: grid lines along the value axis only.
- `CategoryTick`, `ActiveCategoryTick` (accent dot plus bold accent label for `activeValue`), `ROTATED_LABEL_ANGLE`,
  `estimateCategoryAxisHeight(labels, opts)`.
- `niceScale(min, max, { pixelLength?, tickPixelInterval?=72, tickCount?, includeZero? })` returns
  `{ min, max, ticks, interval, domain }` with ticks at 1/2/2.5/5 × 10ⁿ, starting and ending on a tick.
- `PlotAreaProbe({ onChange })` reports the plot size from inside a chart (feed its height to `niceScale`).
- `HatchPattern({ id, color, background?, tintOpacity?, spacing?, strokeWidth?, angle? })` goes in `<defs>`.

### Tooltip parts

- `tooltipProps(theme, { crosshair?: boolean | { color?, width?, dashArray? }, layout? })`: spread onto `<Tooltip>`.
  No animation, dotted crosshair, stays inside the chart.
- `SharedTooltipContent({ series: TooltipSeriesItem[], rows?, headerFormatter?, valueFormatter?(v, series), variant?,
skipNull? })`: pass it as `content={<SharedTooltipContent … />}`. `rows` must be the rows actually rendered (the
  zoomed slice). Hidden series are skipped; null values show `—` or, with `skipNull`, are left out.
- `TooltipFrame({ variant?: 'default'|'inverse' })`, `TooltipTitle`, `TooltipRow({ marker?, label?, value? })`,
  `TooltipMarker({ kind: 'square'|'circle'|'line'|'dashed'|'hatch', color })`. Title, Row and Marker follow the
  frame's variant through context.
- `CrosshairCursor({ color?, lineWidth?, dashArray?, layout? })` (`tooltipProps` already adds it).

### Legend

- `ChartLegend({ items: LegendItem[], onToggle?(key), onItemClick?(item), onItemHover?(key | null), symbolSize?=10,
symbolRadius?=0, symbolGap?=5 })`: `onItemClick` replaces toggling. Hidden items are drawn in `inactiveLegend`.
  Pass it through ChartFrame's `legend` prop.
- `LegendSymbol({ kind: 'square'|'circle'|'line'|'dashed'|'lineMarker'|'marker'|'hatch', … })`.
- `useSeriesVisibility(ids, resetKey?)` returns `{ hidden, isHidden, toggle, setVisible, showAll }`.

### Interactions

- `useSeriesHover({ dimOpacity?: number | ((id) => number) })` returns `{ hovered, setHovered, clear, isDimmed,
opacityOf, dimProps(id), bindItem(id) }`. `DIM_OPACITY` is 0.4; returning 1 from a `dimOpacity` function means
  that series is never dimmed.
- `NearestSeriesTracker({ series, onChange, layout? })`: render it **inside** line-type charts to pick the series
  nearest the pointer. Bars use `hover.bindItem(key)` instead.
- `useXZoom({ length, resetKey?, enabled?, minDragPx?=10 })` returns `{ range, isZoomed, sliceRows(rows), selection,
chartHandlers, reset, consumeDragClick() }`.
- `ZoomSelection({ selection })` and `ResetZoomButton({ visible, onClick, fill? })` are both rendered **inside** the
  chart.

### Data, colour and formatters

- `buildRows(categories, series)` returns rows `{ index, category, s0, s1, … }`. Non-finite values become null.
- `resolveSeries(series, palette)` returns `{ key: 's<i>', name, color, index, input }`.
- `seriesExtent(rows, keys, { stacked? })`, `seriesKey(i)`, `paletteColor(palette, i)`.
- `brighten(color, amount)` and `parseRgb(color)`.
- `formatNumber`, `formatCurrency`, `formatPercent` and their factories `numberFormatter`, `currencyFormatter`,
  `percentFormatter`; `formatRetailWeek(value, year?)` and `retailWeekFormatter(year?)`;
  `defaultValueFormatter`, `defaultCategoryFormatter`, `EMPTY_VALUE = '—'`.

### Hooks

- `useContentStable(value)`: keeps the previous reference while the content is JSON-equal.
- `useLatestRef(value)`, `useStableCallback(fn)`: stable identity that always calls the latest function.
- `useUniqueId(prefix?)` returns `ck-<prefix>-…`, safe to use in `url(#…)`.

### Recharts constraints

- Axis heights are estimated (`estimateCategoryAxisHeight`), not `"auto"`, because auto can oscillate with tick
  thinning.
- `NearestSeriesTracker`, `ZoomSelection`, `ResetZoomButton` and `PlotAreaProbe` use Recharts hooks, so they must be
  children of the chart.
- To keep point clicks working under zoom, guard handlers with `if (zoom.consumeDragClick()) return;`.

## Chart skeleton

```tsx
export function ExampleLineChart({
    series,
    categories,
    height = 320,
    backgroundColor,
    theme: overrides,
    xAxisLabelFormatter,
    yAxisFormatter,
}: ExampleLineChartProps) {
    const theme = useChartTheme(overrides);
    const stableSeries = useContentStable(series); // equal content -> same reference
    const stableCats = useContentStable(categories);
    const resolved = useMemo(() => resolveSeries(stableSeries, theme.palette), [stableSeries, theme.palette]);
    const allRows = useMemo(() => buildRows(stableCats, stableSeries), [stableCats, stableSeries]);
    const fmtLabel = useStableCallback((v: string | number, i: number) =>
        (xAxisLabelFormatter ?? defaultCategoryFormatter)(v, i),
    );
    const fmtValue = useStableCallback((v: number | null) => (yAxisFormatter ?? defaultValueFormatter)(v));

    const visibility = useSeriesVisibility(resolved.map((s) => s.key));
    const hover = useSeriesHover();
    const zoom = useXZoom({ length: allRows.length, resetKey: allRows }); // resets when the data changes
    const rows = useMemo(() => zoom.sliceRows(allRows), [zoom.sliceRows, allRows]);
    const extent = seriesExtent(
        rows,
        resolved.filter((s) => !visibility.isHidden(s.key)).map((s) => s.key),
    );
    const scale = extent ? niceScale(extent[0], extent[1], { pixelLength: height * 0.6 }) : undefined;
    const items = resolved.map((s) => ({
        key: s.key,
        name: s.name,
        color: s.color,
        hidden: visibility.isHidden(s.key),
    }));

    return (
        <ChartFrame
            height={height}
            theme={theme}
            backgroundColor={backgroundColor}
            ariaLabel="Line chart"
            legend={
                <ChartLegend
                    items={items.map((i) => ({ ...i, symbol: 'line' as const }))}
                    onToggle={visibility.toggle}
                    onItemHover={hover.setHovered}
                />
            }
        >
            <LineChart
                data={rows}
                margin={CHART_MARGIN}
                {...zoom.chartHandlers}
                onMouseLeave={hover.clear}
                style={{ userSelect: 'none' }}
            >
                <CartesianGrid {...gridProps(theme)} />
                <XAxis
                    {...categoryAxisProps(theme, {
                        categories: stableCats,
                        labelFormatter: fmtLabel,
                        rotateLabels: true,
                    })}
                />
                <YAxis {...valueAxisProps(theme, { scale, formatter: fmtValue })} />
                <Tooltip
                    {...tooltipProps(theme)}
                    content={
                        <SharedTooltipContent
                            rows={rows}
                            series={items.map((i) => ({ ...i, marker: 'square' as const }))}
                            headerFormatter={fmtLabel}
                            valueFormatter={fmtValue}
                        />
                    }
                />
                {resolved.map((s) => (
                    <Line
                        key={s.key}
                        dataKey={s.key}
                        name={s.name}
                        stroke={s.color}
                        strokeWidth={2.5}
                        dot={false}
                        hide={visibility.isHidden(s.key)}
                        isAnimationActive={false}
                        {...hover.dimProps(s.key)}
                    />
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
