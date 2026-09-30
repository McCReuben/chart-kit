import type { Decorator, Meta, StoryObj } from '@storybook/react-vite';
import { useMemo, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ReferenceLine,
    Tooltip,
    XAxis,
    YAxis,
    type MouseHandlerDataParam,
    type PlotArea,
} from 'recharts';

import { ChartThemeProvider, useChartTheme } from '../theme/ChartThemeProvider';
import { darkTheme, lightTheme } from '../theme/themes';
import type { ChartTheme, ChartThemeOverrides } from '../theme/types';
import { categoryAxisProps, gridProps, valueAxisProps } from './axes';
import { CHART_MARGIN, ChartFrame } from './ChartFrame';
import { buildRows, resolveSeries, seriesExtent, type SeriesInput } from './data';
import { EMPTY_VALUE, formatCurrency, retailWeekFormatter } from './formatters';
import { HatchPattern, PlotAreaProbe } from './HatchPattern';
import { NearestSeriesTracker, useSeriesHover } from './hover';
import { ChartLegend, LegendSymbol, useSeriesVisibility, type LegendItem } from './legend';
import { niceScale } from './niceScale';
import { useContentStable, useStableCallback, useUniqueId } from './stable';
import {
    SharedTooltipContent,
    TooltipFrame,
    TooltipMarker,
    TooltipRow,
    TooltipTitle,
    tooltipProps,
    type MarkerKind,
    type TooltipSeriesItem,
} from './tooltip';
import { ResetZoomButton, ZoomSelection, useXZoom, type IndexRange } from './zoom';

// ── Local theme decorator (until the facilitator rewires .storybook/preview) ─────────────────────────────
const withChartTheme: Decorator = (Story, context) => {
    const mode = context.globals.theme === 'dark' ? 'dark' : 'light';
    const page = (mode === 'dark' ? darkTheme : lightTheme).background;
    return (
        <ChartThemeProvider mode={mode}>
            <div style={{ background: page, padding: 24, minHeight: '100%' }}>
                <Story />
            </div>
        </ChartThemeProvider>
    );
};

// ── Invented demo data ─────────────────────────────────────────────────────────────────────────────────────
const WEEKS = Array.from({ length: 12 }, (_, i) => `W${i + 1}`);
const DEMO_SERIES: DemoSeries[] = [
    { name: 'Orders', data: [31.2, 33.5, 32.1, 35.8, 38.4, 37.2, 39.9, 42.3, 41.0, 43.6, 45.1, 46.8] },
    { name: 'Orders LY', data: [29.4, 30.1, 30.8, 31.6, 33.0, 33.9, 34.2, 35.8, 36.1, 37.4, 38.2, 39.0] },
    {
        name: 'Plan',
        data: [30.0, 31.5, 32.4, 33.6, null, null, 36.9, 38.4, 39.7, 40.6, 42.0, 43.5],
        dashed: true,
    },
];

interface DemoSeries extends SeriesInput {
    /** Draw dashed. */
    dashed?: boolean;
}

// ── Small presentational helpers ───────────────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: ReactNode }) {
    const theme = useChartTheme();
    return (
        <section style={{ marginBottom: 24 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 600, color: theme.text.primary }}>{title}</h3>
            {children}
        </section>
    );
}

function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
    const theme = useChartTheme();
    return (
        <div
            style={{
                background: theme.componentBackground,
                border: `1px solid ${theme.componentBorder}`,
                borderRadius: 8,
                padding: 16,
                color: theme.text.primary,
                ...style,
            }}
        >
            {children}
        </div>
    );
}

// ── Demo chart: the reference wiring of every core part ───────────────────────────────────────────────────
interface DemoLineChartProps {
    series: DemoSeries[];
    categories: Array<string | number>;
    height?: number;
    showLegend?: boolean;
    xAxisLabelFormatter?: (value: string | number, index: number) => string;
    yAxisFormatter?: (value: number) => string;
    tooltipValueFormatter?: (value: number | null) => string;
    backgroundColor?: string;
    theme?: ChartThemeOverrides;
    ariaLabel?: string;
    /** Demo only: keep the tooltip open at this category index. */
    staticTooltipIndex?: number;
    /** Demo only: start with this series hovered. */
    initialHovered?: string;
    /** Demo only: start zoomed. */
    initialZoom?: IndexRange;
    /** Demo only: start with these series hidden. */
    initialHidden?: string[];
    /** Highlight the hovered category tick and draw an accent reference line. */
    highlightActive?: boolean;
}

function DemoLineChart({
    series,
    categories,
    height = 320,
    showLegend = true,
    xAxisLabelFormatter,
    yAxisFormatter,
    tooltipValueFormatter,
    backgroundColor,
    theme: themeOverrides,
    ariaLabel,
    staticTooltipIndex,
    initialHovered,
    initialZoom,
    initialHidden,
    highlightActive = false,
}: DemoLineChartProps) {
    const theme = useChartTheme(themeOverrides);
    // 1. Content-stable inputs: inline arrays with equal content keep their identity.
    const stableSeries = useContentStable(series);
    const stableCategories = useContentStable(categories);
    const resolved = useMemo(() => resolveSeries(stableSeries, theme.palette), [stableSeries, theme.palette]);
    const allRows = useMemo(() => buildRows(stableCategories, stableSeries), [stableCategories, stableSeries]);
    // 2. Formatters through stable callbacks: a new inline function never rebuilds anything.
    const formatLabel = useStableCallback((v: string | number, i: number) =>
        xAxisLabelFormatter ? xAxisLabelFormatter(v, i) : String(v),
    );
    const formatY = useStableCallback((v: number) => (yAxisFormatter ? yAxisFormatter(v) : String(v)));
    const formatValue = useStableCallback((v: number | null) =>
        tooltipValueFormatter ? tooltipValueFormatter(v) : v === null ? '—' : String(v),
    );
    // 3. Interaction state.
    const visibility = useSeriesVisibility(
        resolved.map((s) => s.key),
        resolved.map((s) => s.name),
    );
    const [hiddenDemo] = useState(() => new Set(initialHidden ?? []));
    const isHidden = (key: string) => visibility.isHidden(key) !== hiddenDemo.has(key);
    const hover = useSeriesHover({ initial: initialHovered ?? null });
    const zoom = useXZoom({ length: allRows.length, resetKey: allRows, initialRange: initialZoom });
    const { sliceRows } = zoom;
    const rows = useMemo(() => sliceRows(allRows), [sliceRows, allRows]);
    const [active, setActive] = useState<number | null>(staticTooltipIndex !== undefined ? rows[staticTooltipIndex]?.index ?? null : null);
    // 4. Highcharts-like y ticks from the plot height.
    const [plot, setPlot] = useState<PlotArea | undefined>();
    const extent = seriesExtent(
        rows,
        resolved.filter((s) => !isHidden(s.key)).map((s) => s.key),
    );
    // niceScale is cached by input, so its domain/ticks arrays keep their identity between renders.
    const scale = extent ? niceScale(extent[0], extent[1], { pixelLength: plot?.height ?? height * 0.55 }) : undefined;

    const tooltipSeries: TooltipSeriesItem[] = resolved.map((s) => ({
        key: s.key,
        name: s.name,
        color: s.color,
        marker: s.input.dashed ? 'dashed' : 'square',
        hidden: isHidden(s.key),
    }));
    const legendItems: LegendItem[] = resolved.map((s) => ({
        key: s.key,
        name: s.name,
        color: s.color,
        symbol: s.input.dashed ? 'dashed' : 'line',
        hidden: isHidden(s.key),
    }));

    const onMouseMove = (state: MouseHandlerDataParam, event: ReactMouseEvent) => {
        zoom.chartHandlers.onMouseMove(state, event);
        if (highlightActive) {
            const i = Number(state.activeTooltipIndex);
            setActive(Number.isInteger(i) ? (rows[i]?.index ?? null) : null);
        }
    };

    return (
        <ChartFrame
            height={height}
            theme={theme}
            backgroundColor={backgroundColor}
            ariaLabel={ariaLabel ?? 'Demo line chart'}
            legend={
                showLegend ? (
                    <ChartLegend
                        items={legendItems}
                        onToggle={visibility.toggle}
                        onItemHover={hover.setHovered}
                    />
                ) : null
            }
        >
            <LineChart
                data={rows}
                margin={CHART_MARGIN}
                onMouseDown={zoom.chartHandlers.onMouseDown}
                onMouseMove={onMouseMove}
                onMouseLeave={() => {
                    hover.clear();
                    if (highlightActive && staticTooltipIndex === undefined) setActive(null);
                }}
                style={{ cursor: 'crosshair', userSelect: 'none' }}
            >
                <CartesianGrid {...gridProps(theme)} />
                <XAxis
                    {...categoryAxisProps(theme, {
                        categories: stableCategories,
                        labelFormatter: formatLabel,
                        rotateLabels: true,
                        activeValue: highlightActive ? active : undefined,
                    })}
                />
                <YAxis {...valueAxisProps(theme, { formatter: formatY, scale })} />
                <Tooltip
                    {...tooltipProps(theme)}
                    {...(staticTooltipIndex !== undefined ? { defaultIndex: staticTooltipIndex, active: true } : {})}
                    content={
                        <SharedTooltipContent
                            series={tooltipSeries}
                            rows={rows}
                            headerFormatter={formatLabel}
                            valueFormatter={formatValue}
                        />
                    }
                />
                {highlightActive && active !== null ? (
                    <ReferenceLine x={active} stroke={theme.accent} strokeWidth={1} ifOverflow="hidden" />
                ) : null}
                {resolved.map((s) => (
                    <Line
                        key={s.key}
                        type="monotone"
                        dataKey={s.key}
                        name={s.name}
                        stroke={s.color}
                        strokeWidth={2.5}
                        strokeDasharray={s.input.dashed ? '8 6' : undefined}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0, fill: s.color }}
                        hide={isHidden(s.key)}
                        connectNulls={false}
                        isAnimationActive={false}
                        {...hover.dimProps(s.key)}
                    />
                ))}
                <NearestSeriesTracker
                    series={resolved.map((s) => ({ key: s.key, hidden: isHidden(s.key) }))}
                    onChange={(key) => {
                        // Demo only: pinned stories keep their preset state.
                        if (initialHovered === undefined && staticTooltipIndex === undefined) hover.setHovered(key);
                    }}
                />
                <ZoomSelection selection={zoom.selection} />
                <ResetZoomButton visible={zoom.isZoomed} onClick={zoom.reset} fill={backgroundColor} />
                <PlotAreaProbe onChange={setPlot} />
            </LineChart>
        </ChartFrame>
    );
}

// ── Token swatches ─────────────────────────────────────────────────────────────────────────────────────────
function Swatch({ color, label, border }: { color: string; label: string; border: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, minWidth: 0 }}>
            <span
                style={{
                    width: 28,
                    height: 20,
                    borderRadius: 4,
                    background: color,
                    border: `1px solid ${border}`,
                    flexShrink: 0,
                }}
            />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <b style={{ fontWeight: 600 }}>{label}</b> <span style={{ opacity: 0.7 }}>{color}</span>
            </span>
        </div>
    );
}

function ThemePanel({ theme }: { theme: ChartTheme }) {
    const tokens: Array<[string, string]> = [
        ['background', theme.background],
        ['componentBackground', theme.componentBackground],
        ['componentBorder', theme.componentBorder],
        ['surface', theme.surface],
        ['border', theme.border],
        ['text.primary', theme.text.primary],
        ['text.secondary', theme.text.secondary],
        ['axisLabel', theme.axisLabel],
        ['gridLine', theme.gridLine],
        ['crosshair', theme.crosshair],
        ['selectionFill', theme.selectionFill],
        ['inactiveLegend', theme.inactiveLegend],
        ['positive', theme.positive],
        ['negative', theme.negative],
        ['forecast', theme.forecast],
        ['budget', theme.budget],
        ['accent', theme.accent],
        ['tooltipInverse.background', theme.tooltipInverse.background],
        ['tooltipInverse.border', theme.tooltipInverse.border],
    ];
    return (
        <div
            style={{
                background: theme.componentBackground,
                color: theme.text.primary,
                border: `1px solid ${theme.componentBorder}`,
                borderRadius: 8,
                padding: 16,
                flex: '1 1 420px',
                minWidth: 0,
            }}
        >
            <div style={{ fontWeight: 600, marginBottom: 12 }}>{theme.mode} theme</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 8 }}>
                {tokens.map(([k, v]) => (
                    <Swatch key={k} label={k} color={v} border={theme.componentBorder} />
                ))}
            </div>
            <div style={{ fontWeight: 600, margin: '16px 0 8px' }}>palette</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {theme.palette.map((c, i) => (
                    <div key={c} style={{ textAlign: 'center', fontSize: 11 }}>
                        <div style={{ width: 44, height: 28, borderRadius: 4, background: c }} />
                        <div style={{ marginTop: 2 }}>{i + 1}</div>
                    </div>
                ))}
            </div>
            <div style={{ fontSize: 12, marginTop: 12, color: theme.text.secondary }}>
                font sizes: axis {theme.fontSize.axis} · legend {theme.fontSize.legend} · tooltip{' '}
                {theme.fontSize.tooltip} · data label {theme.fontSize.dataLabel} · font {theme.fontFamily}
            </div>
        </div>
    );
}

// ── Stories ───────────────────────────────────────────────────────────────────────────────────────────────
const meta: Meta = {
    title: 'Core/Building blocks',
    decorators: [withChartTheme],
    parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

/** Every theme token of the built-in light and dark themes, side by side. */
export const ThemeTokens: Story = {
    render: () => (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <ThemePanel theme={lightTheme} />
            <ThemePanel theme={darkTheme} />
        </div>
    ),
};

const MARKERS: MarkerKind[] = ['square', 'circle', 'line', 'dashed', 'hatch'];

/** Every `TooltipMarker` kind, in the default look and the inverse look. */
export const TooltipMarkers: Story = {
    render: function Render() {
        const theme = useChartTheme();
        return (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <TooltipFrame>
                    <TooltipTitle>Default look</TooltipTitle>
                    {MARKERS.map((k, i) => (
                        <TooltipRow
                            key={k}
                            marker={<TooltipMarker kind={k} color={theme.palette[i]} />}
                            label={k}
                            value={formatCurrency(1200 + i * 350)}
                        />
                    ))}
                </TooltipFrame>
                <TooltipFrame variant="inverse">
                    <TooltipTitle>Inverse look</TooltipTitle>
                    {MARKERS.map((k, i) => (
                        <TooltipRow
                            key={k}
                            marker={<TooltipMarker kind={k} color={lightTheme.palette[i]} />}
                            label={k}
                            value={formatCurrency(1200 + i * 350)}
                        />
                    ))}
                </TooltipFrame>
            </div>
        );
    },
};

/** `SharedTooltipContent` rendered statically (default and inverse), with a null value and a hidden series. */
export const SharedTooltip: Story = {
    render: function Render() {
        const theme = useChartTheme();
        const rows = buildRows(WEEKS, DEMO_SERIES);
        const series: TooltipSeriesItem[] = resolveSeries(DEMO_SERIES, theme.palette).map((s) => ({
            key: s.key,
            name: s.name,
            color: s.color,
            marker: s.input.dashed ? 'dashed' : 'square',
        }));
        const withHidden = [...series, { key: 's0', name: 'Hidden series', color: '#999', hidden: true }];
        const header = retailWeekFormatter(2026);
        const value = (v: number | null) => (v === null ? '—' : `$${v.toFixed(1)}M`);
        return (
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                <SharedTooltipContent active rows={rows} activeIndex={4} series={withHidden} headerFormatter={header} valueFormatter={value} />
                <SharedTooltipContent
                    active
                    variant="inverse"
                    rows={rows}
                    activeIndex={4}
                    series={series.map((s, i) => ({ ...s, marker: (['circle', 'hatch', 'dashed'] as const)[i] }))}
                    headerFormatter={header}
                    valueFormatter={value}
                />
            </div>
        );
    },
};

/** `ChartLegend` with every symbol kind, a hidden item (click to toggle), and the 12px/radius-2 variant. */
export const Legend: Story = {
    render: function Render() {
        const theme = useChartTheme();
        const [hovered, setHovered] = useState<string | null>(null);
        const kinds = ['square', 'circle', 'line', 'dashed', 'lineMarker', 'hatch'] as const;
        const vis = useSeriesVisibility([...kinds, 'hidden']);
        const items: LegendItem[] = [
            ...kinds.map((k, i) => ({ key: k, name: k, color: theme.palette[i], symbol: k, hidden: vis.isHidden(k) })),
            { key: 'hidden', name: 'Hidden item', color: theme.palette[6], hidden: !vis.isHidden('hidden') },
        ];
        return (
            <div style={{ display: 'grid', gap: 16 }}>
                <Card>
                    <ChartLegend items={items} onToggle={vis.toggle} onItemHover={setHovered} />
                    <div style={{ fontSize: 12, textAlign: 'center', marginTop: 8, color: theme.text.secondary }}>
                        hovered: {hovered ?? 'none'}
                    </div>
                </Card>
                <Card>
                    <ChartLegend items={items.slice(0, 3)} symbolSize={12} symbolRadius={2} onToggle={() => {}} />
                </Card>
                <Card style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {kinds.map((k, i) => (
                        <LegendSymbol key={k} kind={k} color={theme.palette[i]} size={12} radius={2} />
                    ))}
                </Card>
            </div>
        );
    },
};

const demoArgs = {
    series: DEMO_SERIES,
    categories: WEEKS,
    xAxisLabelFormatter: retailWeekFormatter(2026),
    yAxisFormatter: (v: number) => `$${v}M`,
    tooltipValueFormatter: (v: number | null) => (v === null ? '—' : `$${v.toFixed(1)}M`),
};

/**
 * A small line chart wiring every core part: axis props, nice y ticks, crosshair, shared tooltip (held open here at
 * W6), legend toggle, hover dimming (nearest series), drag-to-zoom with reset. Hover and drag in Storybook to try it.
 */
export const DemoLineChartStory: Story = {
    name: 'Demo line chart',
    render: () => <DemoLineChart {...demoArgs} staticTooltipIndex={5} />,
};

/** The demo chart, live (no pinned tooltip): hover to dim, drag across a few weeks to zoom, click the legend. */
export const DemoInteractive: Story = {
    name: 'Demo interactive',
    render: () => <DemoLineChart {...demoArgs} highlightActive />,
};

/** Hover dimming: "Orders LY" is hovered, so the other series drop to 40% opacity. */
export const DemoHoverDimmed: Story = {
    name: 'Demo hover dimming',
    render: () => <DemoLineChart {...demoArgs} initialHovered="s1" />,
};

/** Zoomed into W3–W8, with the reset-zoom button top-right; "Plan" is hidden via the legend. */
export const DemoZoomed: Story = {
    name: 'Demo zoomed + hidden series',
    render: () => <DemoLineChart {...demoArgs} initialZoom={{ start: 2, end: 7 }} initialHidden={['s2']} />,
};

/** `ActiveCategoryTick`: the hovered category's label is bold in the accent colour with a dot; accent reference line. */
export const ActiveTick: Story = {
    name: 'Active category tick',
    render: () => <DemoLineChart {...demoArgs} highlightActive staticTooltipIndex={7} showLegend={false} height={280} />,
};

/** Transparent background and per-instance theme overrides (`theme` prop). */
export const TransparentAndOverrides: Story = {
    name: 'Transparent + overrides',
    render: () => (
        <DemoLineChart
            {...demoArgs}
            backgroundColor="transparent"
            height={260}
            theme={{ palette: ['#9085e9', '#eb6834', '#1baf7a'], gridLine: '#9aa0a6' }}
        />
    ),
};

/** One formatter for the HatchBars axis ticks and tooltip values, so both read `$19M`. */
const formatMillions = (v: number | null | undefined): string => (v == null || Number.isNaN(v) ? EMPTY_VALUE : `$${v}M`);

/** Hatch patterns inside a bar chart (phase-4 forecast bars), with the crosshair and 12px/radius-2 legend. */
export const HatchBars: Story = {
    name: 'Hatch pattern bars',
    render: function Render() {
        const theme = useChartTheme();
        const hatchA = useUniqueId('hatch');
        const hatchB = useUniqueId('hatch');
        const cats = ['Q1', 'Q2', 'Q3', 'Q4'];
        const rows = buildRows(cats, [
            { data: [18, 21, 19, 23] },
            { data: [null, null, 20, 24] },
            { data: [14, 16, 16, 17] },
        ]);
        const scale = niceScale(0, 24, { includeZero: true, pixelLength: 180 });
        const hover = useSeriesHover();
        const items: LegendItem[] = [
            { key: 's0', name: 'Actual', color: theme.palette[0] },
            { key: 's1', name: 'Forecast (hatched)', color: theme.forecast, symbol: 'hatch' },
            { key: 's2', name: 'Budget (hatched)', color: theme.budget, symbol: 'hatch' },
        ];
        return (
            <ChartFrame
                height={300}
                ariaLabel="Hatched bars"
                legend={<ChartLegend items={items} symbolSize={12} symbolRadius={2} onItemHover={hover.setHovered} />}
            >
                <BarChart data={rows} margin={CHART_MARGIN} onMouseLeave={hover.clear}>
                    <defs>
                        <HatchPattern id={hatchA} color={theme.forecast} />
                        <HatchPattern id={hatchB} color={theme.budget} spacing={5} angle={135} />
                    </defs>
                    <CartesianGrid {...gridProps(theme)} />
                    <XAxis {...categoryAxisProps(theme, { categories: cats })} />
                    <YAxis {...valueAxisProps(theme, { scale, formatter: formatMillions })} />
                    <Tooltip
                        {...tooltipProps(theme)}
                        defaultIndex={2}
                        active
                        content={
                            <SharedTooltipContent
                                rows={rows}
                                series={items.map((it, i) => ({ ...it, marker: i === 0 ? 'square' : 'hatch' }))}
                                valueFormatter={formatMillions}
                            />
                        }
                    />
                    <Bar dataKey="s0" fill={theme.palette[0]} radius={[3, 3, 0, 0]} isAnimationActive={false} {...hover.dimProps('s0')} {...hover.bindItem('s0')} />
                    <Bar dataKey="s1" fill={`url(#${hatchA})`} stroke={theme.forecast} radius={[3, 3, 0, 0]} isAnimationActive={false} {...hover.dimProps('s1')} {...hover.bindItem('s1')} />
                    <Bar dataKey="s2" fill={`url(#${hatchB})`} stroke={theme.budget} radius={[3, 3, 0, 0]} isAnimationActive={false} {...hover.dimProps('s2')} {...hover.bindItem('s2')} />
                </BarChart>
            </ChartFrame>
        );
    },
};

/** Horizontal (vertical-layout) bars: category axis on the left, value axis at the bottom, vertical grid lines. */
export const HorizontalAxes: Story = {
    name: 'Horizontal bar axes',
    render: function Render() {
        const theme = useChartTheme();
        const cats = ['Search', 'Social', 'Email', 'Display', 'Referral'];
        const rows = buildRows(cats, [{ data: [48, 31, 12, 22, 9] }]);
        const scale = niceScale(0, 48, { includeZero: true, pixelLength: 700, tickPixelInterval: 100 });
        return (
            <ChartFrame height={260} ariaLabel="Horizontal bars">
                {/* Extra right margin: the last value label is centred on the plot edge. */}
                <BarChart data={rows} layout="vertical" margin={{ ...CHART_MARGIN, right: 16 }}>
                    <CartesianGrid {...gridProps(theme, { direction: 'vertical' })} />
                    <XAxis {...valueAxisProps(theme, { position: 'bottom', scale, title: 'Spend ($K)' })} />
                    <YAxis {...categoryAxisProps(theme, { position: 'left', categories: cats, interval: 0 })} />
                    <Tooltip
                        {...tooltipProps(theme, { layout: 'vertical' })}
                        defaultIndex={1}
                        active
                        content={<SharedTooltipContent rows={rows} series={[{ key: 's0', name: 'Spend', color: theme.palette[0] }]} />}
                    />
                    <Bar dataKey="s0" fill={theme.palette[0]} radius={[0, 3, 3, 0]} isAnimationActive={false} />
                </BarChart>
            </ChartFrame>
        );
    },
};
