import { type ReactElement, type ReactNode, useMemo } from 'react';

import { Bar, BarChart, Cell, LabelList, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';

import {
    ChartFrame,
    TooltipFrame,
    TooltipMarker,
    TooltipRow,
    TooltipTitle,
    niceScale,
    tooltipProps,
    useContentStable,
    useStableCallback,
    valueAxisProps,
} from '../../core';
import { type ChartTheme, type ChartThemeOverrides, useChartTheme } from '../../theme';

import { type WaterfallRow, resolveWaterfallColor } from './waterfallRows';

/** Props handed to `renderXTick` (Recharts tick props plus the row). */
export interface WaterfallTickProps {
    /** Tick x position in px (bar centre). */
    x: number;
    /** Tick y position in px (top of the label area). */
    y: number;
    /** Recharts payload; `payload.value` is the row's `name`. */
    payload: { value: string | number };
    /** Row index. */
    index: number;
    /** The row of this tick. */
    row: WaterfallRow;
    /** Resolved theme, for colours and fonts. */
    theme: ChartTheme;
}

/** Props handed to `renderBarLabel`. */
export interface WaterfallBarLabelProps {
    /** Left edge of the visible bar in px. */
    x: number;
    /** Top of the visible bar in px (Recharts may give the bottom with a negative `height`). */
    y: number;
    /** Bar width in px. */
    width: number;
    /** Bar height in px (may be negative). */
    height: number;
    /** Row index. */
    index: number;
    /** The row of this bar. */
    row: WaterfallRow;
    /** Resolved bar colour. */
    color: string;
    /** Resolved theme, for colours and fonts. */
    theme: ChartTheme;
}

/** Props of {@link WaterfallChart}. */
export interface WaterfallChartProps {
    /** Bars in order, usually built with `toWaterfallRows(start, steps, end)`. Was `chartData`. */
    data: readonly WaterfallRow[];
    /** Bar width in px. Default 80. */
    barSize?: number;
    /** Total height in px. Default 450. */
    height?: number;
    /** Plot margin top in px (room for the bar labels). Default 28. */
    marginTop?: number;
    /** Plot margin right in px. Default 80. */
    marginRight?: number;
    /** Plot margin left in px. Default 20. */
    marginLeft?: number;
    /** Plot margin bottom in px (room for multi-line category labels and sub-labels). Default 52. */
    marginBottom?: number;
    /** Adds a "YoY" line under the label of rows with `pillar: true` (default tick only). Default false. */
    showYoY?: boolean;
    /** Show the value axis on the left. Default false. */
    showYAxis?: boolean;
    /** Value axis tick formatter; also formats the default tooltip value. Default `String(v)`. May be inline. */
    yAxisFormatter?: (value: number) => string;
    /** Category label formatter for the default tick (before it is split into words). Default `String`. */
    xAxisLabelFormatter?: (name: string, index: number) => string;
    /** Text above each bar. No labels unless this or `renderBarLabel` is given. May be inline. */
    formatBarLabel?: (row: WaterfallRow) => string;
    /** Custom bar label element; replaces the default label (which uses `formatBarLabel`). May be inline. */
    renderBarLabel?: (props: WaterfallBarLabelProps) => ReactElement | null;
    /** Custom category tick element; replaces the default multi-line tick. May be inline. */
    renderXTick?: (props: WaterfallTickProps) => ReactElement;
    /**
     * Custom tooltip content for the hovered bar (was the `TooltipContent` component). Return a full tooltip, for
     * example built from `TooltipFrame`/`TooltipTitle`/`TooltipRow`. Giving it turns the tooltip on.
     */
    renderTooltip?: (row: WaterfallRow, index: number) => ReactNode;
    /** Show the built-in tooltip (row name and signed value) when `renderTooltip` is not given. Default false. */
    showDefaultTooltip?: boolean;
    /** Default tooltip value text. Default: sign plus `yAxisFormatter(|value|)`. May be inline. */
    tooltipValueFormatter?: (value: number, row: WaterfallRow) => string;
    /** Default tooltip header text. Default: the row name. May be inline. */
    tooltipHeaderFormatter?: (name: string, index: number) => string;
    /** Show this bar's tooltip on first render (for static screenshots and docs). */
    defaultTooltipIndex?: number;
    /** Fixed value axis domain `[min, max]`. Default: data extent with 0, padded by 12% (at least 0.5). */
    yDomain?: readonly [number, number];
    /** Draw a zero line labelled "0" when the rows have both positive and negative values. Default false. */
    showZeroLine?: boolean;
    /** Colour of totals and rows without `kind`/`color`. Default `theme.palette[0]`. */
    totalColor?: string;
    /** Background colour. Default `theme.componentBackground`; `'transparent'` is allowed. */
    backgroundColor?: string;
    /** Per-instance theme overrides (for example `positive`/`negative`). */
    theme?: ChartThemeOverrides;
    /** Class name on the outer element. */
    className?: string;
    /** Accessible name of the chart. Default `'Waterfall chart'`. */
    ariaLabel?: string;
}

const defaultYFormatter = (v: number) => String(v);

function paddedDomain(rows: readonly WaterfallRow[]): [number, number] | null {
    const vals = rows
        .flatMap((d) => [d.offset, d.offset + d.delta])
        .filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (!vals.length) return null;
    const min = Math.min(...vals, 0);
    const max = Math.max(...vals, 0);
    const pad = Math.max(0.5, (max - min || 1) * 0.12);
    return [min - pad, max + pad];
}

/**
 * Waterfall chart: a start total, floating bars for each signed step (increases in `theme.positive`, decreases in
 * `theme.negative`) and an end total. Build the rows with `toWaterfallRows`.
 */
export function WaterfallChart({
    data,
    barSize = 80,
    height = 450,
    marginTop = 28,
    marginRight = 80,
    marginLeft = 20,
    marginBottom = 52,
    showYoY = false,
    showYAxis = false,
    yAxisFormatter,
    xAxisLabelFormatter,
    formatBarLabel,
    renderBarLabel,
    renderXTick,
    renderTooltip,
    showDefaultTooltip = false,
    tooltipValueFormatter,
    tooltipHeaderFormatter,
    defaultTooltipIndex,
    yDomain,
    showZeroLine = false,
    totalColor,
    backgroundColor,
    theme: overrides,
    className,
    ariaLabel = 'Waterfall chart',
}: WaterfallChartProps) {
    const theme = useChartTheme(overrides);
    const rows = useContentStable(data);
    const stableYDomain = useContentStable(yDomain);

    const colors = useMemo(
        () => rows.map((r) => resolveWaterfallColor(r, theme, totalColor)),
        [rows, theme, totalColor],
    );

    const fmtY = useStableCallback((v: number) => (yAxisFormatter ?? defaultYFormatter)(v));
    const fmtLabel = useStableCallback((name: string, i: number) => (xAxisLabelFormatter ?? String)(name, i));
    const fmtHeader = useStableCallback((name: string, i: number) => (tooltipHeaderFormatter ?? String)(name, i));
    const fmtTooltipValue = useStableCallback((v: number, row: WaterfallRow) =>
        tooltipValueFormatter ? tooltipValueFormatter(v, row) : `${v < 0 ? '-' : ''}${fmtY(Math.abs(v))}`,
    );
    const fmtBarLabel = useStableCallback((row: WaterfallRow) => formatBarLabel?.(row));
    const barLabelFn = useStableCallback((p: WaterfallBarLabelProps) => renderBarLabel?.(p) ?? null);
    const xTickFn = useStableCallback((p: WaterfallTickProps) => renderXTick?.(p) ?? <g />);
    const tooltipFn = useStableCallback((row: WaterfallRow, i: number) => renderTooltip?.(row, i));

    const hasBarLabel = Boolean(renderBarLabel || formatBarLabel);
    const hasCustomTick = Boolean(renderXTick);
    const hasCustomTooltip = Boolean(renderTooltip);

    const hasMixedSigns = useMemo(() => {
        const nums = rows.map((d) => d.value).filter((v) => Number.isFinite(v));
        return nums.some((v) => v > 0) && nums.some((v) => v < 0);
    }, [rows]);

    const { domain, ticks } = useMemo(() => {
        const d = stableYDomain ? ([stableYDomain[0], stableYDomain[1]] as [number, number]) : paddedDomain(rows);
        if (!d) return { domain: undefined, ticks: undefined };
        // Nice ticks from the unpadded extent, kept inside the (padded) domain.
        const lo = stableYDomain ? d[0] : Math.min(0, ...rows.map((r) => Math.min(r.offset, r.offset + r.delta)));
        const hi = stableYDomain ? d[1] : Math.max(0, ...rows.map((r) => Math.max(r.offset, r.offset + r.delta)));
        const s = niceScale(lo, hi, { pixelLength: Math.max(80, height - marginTop - marginBottom - 60) });
        return { domain: d, ticks: s.ticks.filter((t) => t >= d[0] - 1e-9 && t <= d[1] + 1e-9) };
    }, [rows, stableYDomain, height, marginTop, marginBottom]);

    // The original draws bar labels and the main x-tick lines at 12px and sub-labels at 10px. There is no 12px axis
    // token, so the 12px legend size stands in for it. Labels use `text.secondary` (as the original), which stays
    // readable on the dark background where `axisLabel` is too dim.
    const labelSize = theme.fontSize.legend;
    const subLabelSize = theme.fontSize.dataLabel;
    const lineHeight = Math.round(labelSize * 1.5);
    const subLineHeight = Math.round(subLabelSize * 1.6);
    const textStyle = { fontFamily: theme.fontFamily, fill: theme.text.secondary };

    const tick = (raw: unknown) => {
        const { x, y, payload, index } = raw as {
            x: number;
            y: number;
            payload: { value: string | number };
            index: number;
        };
        const row = rows[index];
        if (!row) return <g />;
        if (hasCustomTick) return xTickFn({ x, y, payload, index, row, theme });
        const words = fmtLabel(String(payload.value ?? ''), index).split(' ');
        const yoy = showYoY && row.pillar;
        const subLines = (row.subLabel ?? '').split('\n').filter(Boolean);
        const subTop = words.length * subLineHeight + 12 + (yoy ? lineHeight : 0);
        return (
            <g transform={`translate(${x},${y})`} className="ck-axis-tick">
                {words.map((word, i) => (
                    <text key={i} x={0} y={-4 + i * lineHeight} textAnchor="middle" fontSize={labelSize} {...textStyle}>
                        {word}
                    </text>
                ))}
                {yoy ? (
                    <text
                        x={0}
                        y={-4 + words.length * lineHeight}
                        textAnchor="middle"
                        fontSize={labelSize}
                        {...textStyle}
                    >
                        YoY
                    </text>
                ) : null}
                {subLines.map((sub, i) => (
                    <text
                        key={`sub-${i}`}
                        x={0}
                        y={subTop + i * subLineHeight}
                        textAnchor="middle"
                        fontSize={subLabelSize}
                        {...textStyle}
                    >
                        {sub}
                    </text>
                ))}
            </g>
        );
    };

    const barLabel = (raw: unknown) => {
        const p = raw as {
            x?: number | string;
            y?: number | string;
            width?: number | string;
            height?: number | string;
            index?: number;
        };
        const index = p.index ?? -1;
        const row = rows[index];
        if (!row) return null;
        const x = Number(p.x);
        const y = Number(p.y);
        const width = Number(p.width);
        const h = Number(p.height);
        if (renderBarLabel)
            return barLabelFn({ x, y, width, height: h, index, row, color: colors[index] ?? '', theme });
        const label = fmtBarLabel(row);
        if (label === undefined) return null;
        // Very short bars push the label further up so it clears the bar.
        const extra = Math.abs(h) < 18 ? 18 - Math.abs(h) + 10 : 0;
        return (
            <text
                x={x + width / 2}
                y={Math.min(y, y + h) - 8 - extra}
                textAnchor="middle"
                dominantBaseline="alphabetic"
                fontSize={labelSize}
                {...textStyle}
            >
                {label}
            </text>
        );
    };

    const tooltipContent = ({
        active,
        payload,
    }: {
        active?: boolean;
        payload?: ReadonlyArray<{ dataKey?: unknown; payload?: unknown }>;
    }) => {
        if (!active || !payload?.length) return null;
        const entry = payload.find((p) => p.dataKey === 'delta') ?? payload[0];
        const row = entry?.payload as WaterfallRow | undefined;
        if (!row) return null;
        const index = rows.indexOf(row);
        if (hasCustomTooltip) return tooltipFn(row, index);
        const color = colors[index] ?? resolveWaterfallColor(row, theme, totalColor);
        return (
            <TooltipFrame theme={theme}>
                <TooltipTitle>{fmtHeader(row.name, index)}</TooltipTitle>
                <TooltipRow marker={<TooltipMarker kind="square" color={color} />}>
                    <span style={{ fontWeight: 700 }}>{fmtTooltipValue(row.value, row)}</span>
                </TooltipRow>
            </TooltipFrame>
        );
    };

    return (
        <ChartFrame
            height={height}
            theme={theme}
            backgroundColor={backgroundColor}
            ariaLabel={ariaLabel}
            className={className}
        >
            <BarChart
                data={rows as WaterfallRow[]}
                margin={{ top: marginTop, right: marginRight, left: marginLeft, bottom: marginBottom }}
            >
                <XAxis dataKey="name" tickLine={false} axisLine={false} interval={0} tick={tick} />
                <YAxis
                    {...valueAxisProps(theme, { formatter: fmtY, hide: !showYAxis, width: 52 })}
                    tick={{ fill: theme.text.secondary, fontSize: theme.fontSize.axis, fontFamily: theme.fontFamily }}
                    domain={domain ?? ['auto', 'auto']}
                    ticks={ticks}
                    allowDataOverflow={false}
                />
                {hasCustomTooltip || showDefaultTooltip ? (
                    <Tooltip
                        {...tooltipProps(theme)}
                        cursor={{ fill: theme.text.primary, fillOpacity: 0.04 }}
                        defaultIndex={defaultTooltipIndex}
                        content={tooltipContent}
                    />
                ) : null}
                {showZeroLine && hasMixedSigns ? (
                    <ReferenceLine
                        y={0}
                        stroke={theme.gridLine}
                        strokeWidth={1}
                        ifOverflow="visible"
                        zIndex={50}
                        // The "0" label is skipped when the visible y axis already has a 0 tick.
                        label={
                            showYAxis && ticks?.includes(0)
                                ? undefined
                                : {
                                      value: '0',
                                      position: 'left',
                                      fill: theme.text.secondary,
                                      fontSize: theme.fontSize.axis,
                                      fontFamily: theme.fontFamily,
                                  }
                        }
                    />
                ) : null}
                {/* Invisible base: lifts each visible bar to its waterfall level. */}
                <Bar
                    dataKey="offset"
                    stackId="w"
                    barSize={barSize}
                    fill="transparent"
                    isAnimationActive={false}
                    legendType="none"
                    tooltipType="none"
                    pointerEvents="none"
                />
                <Bar dataKey="delta" stackId="w" barSize={barSize} isAnimationActive={false}>
                    {rows.map((r, i) => (
                        <Cell key={i} fill={colors[i]} />
                    ))}
                    {hasBarLabel ? <LabelList content={barLabel} /> : null}
                </Bar>
            </BarChart>
        </ChartFrame>
    );
}
