import type { SVGProps } from 'react';
import type { CartesianGridProps, XAxisProps, YAxisProps } from 'recharts';

import { useChartTheme } from '../theme/ChartThemeProvider';
import type { ChartTheme } from '../theme/types';
import type { NiceScale } from './niceScale';
import { cachedProps, optionsKey } from './propCache';

/** Rotation for crowded category labels. */
export const ROTATED_LABEL_ANGLE = -45;

/**
 * Default font size (px) of value-axis titles: 13px (0.8em of a 16px root), larger than the 11px tick labels.
 * Category-axis titles default to `theme.fontSize.axis` (11px).
 */
export const AXIS_TITLE_FONT_SIZE = 13;

/** Space (px) reserved above labels for the active-category dot of {@link ActiveCategoryTick}. */
const ACTIVE_DOT_SPACE = 8;

/** Props Recharts passes to a custom tick, plus the ones core ticks add. */
export interface CategoryTickProps {
    /** Tick x (from Recharts). */
    x?: number | string;
    /** Tick y (from Recharts). */
    y?: number | string;
    /** Tick item (from Recharts); `payload.value` is the raw axis value. */
    payload?: {
        /** Raw axis value (category or number). */
        value: unknown;
        /** Index of the tick in the axis domain. */
        index?: number;
        /** Pixel coordinate of the tick along the axis. */
        coordinate?: number;
    };
    /** Tick index among visible ticks (from Recharts). */
    index?: number;
    /** Rotation in degrees, e.g. -45 or -90 (Recharts passes the axis `angle`). */
    angle?: number;
    /**
     * Text anchor. Recharts passes the axis `textAnchor` (set by `categoryAxisProps`: `'end'` when rotated) or its own
     * default (`'middle'` bottom, `'end'` left). Set `angle`/`textAnchor` on the axis; they reach the tick.
    */
    textAnchor?: 'start' | 'middle' | 'end' | 'inherit';
    /** Label formatter (Recharts passes the axis `tickFormatter`). */
    tickFormatter?: (value: never, index: number) => string;
    /** Axis orientation (from Recharts). */
    orientation?: string;
    /** Theme; default the context theme (a `ChartFrame` provides the chart's resolved theme). */
    theme?: ChartTheme;
    /** Label colour; default `theme.axisLabel`. */
    color?: string;
}

/** Props of {@link ActiveCategoryTick}. */
export interface ActiveCategoryTickProps extends CategoryTickProps {
    /** Raw axis value of the active (hovered) category; compared with `payload.value` (`===`, then as strings). */
    activeValue?: unknown;
    /** Highlight colour of the active label and dot; default `theme.accent`. */
    accent?: string;
}

function tickLabel(props: CategoryTickProps): string {
    const value = props.payload?.value;
    if (props.tickFormatter) return String((props.tickFormatter as (v: unknown, i: number) => string)(value, props.index ?? 0));
    return value === null || value === undefined ? '' : String(value);
}

function isActive(value: unknown, active: unknown): boolean {
    if (active === undefined || active === null) return false;
    return value === active || String(value) === String(active);
}

function renderTick(props: ActiveCategoryTickProps, theme: ChartTheme, highlight: boolean) {
    const x = Number(props.x ?? 0);
    const y = Number(props.y ?? 0);
    const angle = props.angle ?? 0;
    const left = props.orientation === 'left' || props.orientation === 'right';
    const active = highlight && isActive(props.payload?.value, props.activeValue);
    const accent = props.accent ?? theme.accent;
    const anchor =
        props.textAnchor && props.textAnchor !== 'inherit'
            ? props.textAnchor
            : angle !== 0
              ? 'end'
              : left
                ? props.orientation === 'right'
                    ? 'start'
                    : 'end'
                : 'middle';
    const shift = highlight && !left ? ACTIVE_DOT_SPACE : 0;
    const textProps: SVGProps<SVGTextElement> = {
        // Recharts measures elements with this class for `width="auto"` y axes.
        className: 'recharts-cartesian-axis-tick-value',
        textAnchor: anchor,
        fill: active ? accent : (props.color ?? theme.axisLabel),
        fontSize: theme.fontSize.axis,
        fontFamily: theme.fontFamily,
        fontWeight: active ? 700 : 400,
    };
    let text;
    if (left) {
        text = (
            <text x={0} y={0} dy="0.355em" {...textProps}>
                {tickLabel(props)}
            </text>
        );
    } else if (angle !== 0) {
        // Rotated labels hang from the tick, their end anchored just below it.
        text = (
            <text x={0} y={0} dy="0.355em" transform={`translate(0, ${shift + 4}) rotate(${angle})`} {...textProps}>
                {tickLabel(props)}
            </text>
        );
    } else {
        text = (
            <text x={0} y={shift} dy="0.71em" {...textProps}>
                {tickLabel(props)}
            </text>
        );
    }
    return (
        <g transform={`translate(${x},${y})`} className="ck-axis-tick">
            {active && !left ? <circle cx={0} cy={1} r={3} fill={accent} stroke="#ffffff" strokeWidth={1} /> : null}
            {active && left ? <circle cx={4} cy={0} r={3} fill={accent} stroke="#ffffff" strokeWidth={1} /> : null}
            {text}
        </g>
    );
}

/**
 * Category axis tick with the standard label style (`theme.axisLabel`, 11px, theme font). Supports rotation
 * (`angle`) and `textAnchor`; rotated labels are anchored at their end below the tick.
 * Used by {@link categoryAxisProps}; pass as `tick={<CategoryTick />}` for custom axes.
 */
export function CategoryTick(props: CategoryTickProps) {
    const contextTheme = useChartTheme();
    return renderTick(props, props.theme ?? contextTheme, false);
}

/**
 * Category tick that highlights the active category: when `payload.value` equals `activeValue` it draws a
 * 3px-radius accent dot (1px white stroke) just above the label and renders the label bold in the accent colour.
 * Other labels are normal weight in `theme.axisLabel`. Labels are always pushed down 8px so the layout does not
 * jump. Supports `angle` (e.g. -45, -90) and `textAnchor`.
 * Use via `categoryAxisProps(theme, { activeValue })`, or `tick={<ActiveCategoryTick activeValue={i} />}`.
 */
export function ActiveCategoryTick(props: ActiveCategoryTickProps) {
    const contextTheme = useChartTheme();
    return renderTick(props, props.theme ?? contextTheme, true);
}

/** Options of {@link categoryAxisProps}. */
export interface CategoryAxisOptions {
    /** Where the category axis sits: `'bottom'` (XAxis, default) or `'left'` (YAxis, horizontal bar charts). */
    position?: 'bottom' | 'left';
    /** Row key of the axis value. Default {@link ROW_INDEX_KEY} (`'index'`), so duplicate categories stay distinct. */
    dataKey?: string;
    /**
     * Categories, when the `dataKey` holds the category index (the default). The label formatter then receives
     * `(categories[index], index)` instead of the raw index.
    */
    categories?: ReadonlyArray<string | number>;
    /** Label formatter `(category, index) => string`; default `String(category)`. Pass a stable function. */
    labelFormatter?: (value: string | number, index: number) => string;
    /** Rotate labels: `true` = -45°, a number = that angle, `false`/omitted = horizontal. */
    rotateLabels?: boolean | number;
    /** Axis title (x title uses `theme.axisLabel`, 11px). */
    title?: string;
    /** Title font size in px; default `theme.fontSize.axis` (11). */
    titleFontSize?: number;
    /**
     * Draw small tick marks between the axis line and the labels. Default `false`. The label
     * offset is the same either way, so turning them on does not move the labels.
    */
    tickMarks?: boolean;
    /**
     * Enables {@link ActiveCategoryTick}: the category whose axis value equals this is highlighted. Pass `null` to
     * reserve the dot space without highlighting anything (keeps labels from jumping when hover starts).
    */
    activeValue?: unknown;
    /** Recharts `interval`; default `'preserveStartEnd'` (0 shows every label). */
    interval?: XAxisProps['interval'];
    /** Hide the axis entirely. */
    hide?: boolean;
    /** Recharts axis id (default 0). */
    axisId?: string | number;
    /** Bottom axis height in px. Default: estimated from `categories` (see `estimateCategoryAxisHeight`), else `'auto'`. */
    height?: number | 'auto';
}

const ROW_INDEX = 'index';

function makeTickFormatter(opts: CategoryAxisOptions) {
    const { categories, labelFormatter } = opts;
    if (!categories && !labelFormatter) return undefined;
    return (value: unknown, tickIndex: number) => {
        if (categories) {
            const i = Number(value);
            const category = categories[i];
            if (category === undefined) return '';
            return labelFormatter ? labelFormatter(category, i) : String(category);
        }
        return labelFormatter ? labelFormatter(value as string | number, tickIndex) : String(value);
    };
}

/**
 * Estimated height (px) of a bottom category axis: tick + margin + the tallest (possibly rotated) label, plus the
 * title and the active-dot space. Estimated from label length (0.6em per character) rather than measured, because
 * Recharts' `height="auto"` feeds back into tick thinning and plot size and can oscillate.
 */
export function estimateCategoryAxisHeight(
    labels: ReadonlyArray<string>,
    opts: { angle?: number; fontSize?: number; title?: boolean; activeDot?: boolean } = {},
): number {
    const fontSize = opts.fontSize ?? 11;
    const rad = (Math.abs(opts.angle ?? 0) * Math.PI) / 180;
    const longest = labels.reduce((m, l) => Math.max(m, l.length), 0);
    const textW = longest * fontSize * 0.6;
    const labelH = rad === 0 ? fontSize * 1.2 : textW * Math.sin(rad) + fontSize * Math.cos(rad);
    return Math.ceil(6 + 2 + labelH + 6 + (opts.title ? fontSize + 8 : 0) + (opts.activeDot ? ACTIVE_DOT_SPACE : 0));
}

/** Category axis on the bottom (an `XAxis`). */
export function categoryAxisProps(theme: ChartTheme, opts?: CategoryAxisOptions & { position?: 'bottom' }): XAxisProps;
/** Category axis on the left (a `YAxis`, for horizontal bar charts). */
export function categoryAxisProps(theme: ChartTheme, opts: CategoryAxisOptions & { position: 'left' }): YAxisProps;
/**
 * Props for the category axis: labels `theme.axisLabel` 11px in the theme font, axis
 * line `theme.componentBorder`, no tick marks (see `tickMarks`), optional -45° rotated labels anchored at their end,
 * optional title.
 * Spread onto `<XAxis>` (or `<YAxis>` with `position: 'left'`): `<XAxis {...categoryAxisProps(theme, {...})} />`.
 *
 * Stable identity: equal inputs return the **same object** (and so the same `tick` element and `tickFormatter`).
 * Options are compared by content, functions (`labelFormatter`) by identity and `theme` by identity, so pass stable
 * formatters (`useStableCallback`). This keeps `width="auto"` axes from re-measuring in a loop. The result is shared:
 * spread it, never mutate it.
 */
export function categoryAxisProps(theme: ChartTheme, opts: CategoryAxisOptions = {}): XAxisProps | YAxisProps {
    return cachedProps(theme, `category:${optionsKey(opts)}`, () => buildCategoryAxisProps(theme, opts));
}

function buildCategoryAxisProps(theme: ChartTheme, opts: CategoryAxisOptions): XAxisProps | YAxisProps {
    const left = opts.position === 'left';
    const angle = left ? 0 : opts.rotateLabels === true ? ROTATED_LABEL_ANGLE : typeof opts.rotateLabels === 'number' ? opts.rotateLabels : 0;
    const highlight = opts.activeValue !== undefined;
    const tick = highlight ? (
        <ActiveCategoryTick theme={theme} activeValue={opts.activeValue} />
    ) : (
        <CategoryTick theme={theme} />
    );
    const common = {
        type: 'category' as const,
        dataKey: opts.dataKey ?? ROW_INDEX,
        allowDuplicatedCategory: true,
        hide: opts.hide,
        axisLine: { stroke: theme.componentBorder },
        tickLine: opts.tickMarks ? { stroke: theme.componentBorder } : false,
        tickSize: highlight && !left ? 4 : 6,
        tickMargin: 2,
        tick,
        tickFormatter: makeTickFormatter(opts),
        interval: opts.interval ?? ('preserveStartEnd' as const),
        fontSize: theme.fontSize.axis,
        minTickGap: 4,
    };
    if (left) {
        return {
            ...common,
            yAxisId: opts.axisId ?? 0,
            orientation: 'left',
            scale: 'band' as const,
            width: 'auto',
            label: opts.title
                ? {
                      value: opts.title,
                      angle: -90,
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' },
                      fill: theme.axisLabel,
                      fontSize: opts.titleFontSize ?? theme.fontSize.axis,
                      fontFamily: theme.fontFamily,
                  }
                : undefined,
        } satisfies YAxisProps;
    }
    const formatter = common.tickFormatter;
    const labels = opts.categories
        ? opts.categories.map((_, i) => (formatter ? formatter(i, i) : String(opts.categories?.[i])))
        : [];
    return {
        ...common,
        xAxisId: opts.axisId ?? 0,
        orientation: 'bottom',
        angle,
        // Recharts hands the axis `textAnchor` to the tick; rotated labels hang from their end.
        ...(angle !== 0 ? { textAnchor: 'end' as const } : {}),
        // Band scale: each category is centred in its band with half a band of padding at both ends
        // (also for lines, so the first/last labels are not clipped).
        scale: 'band' as const,
        height:
            opts.height ??
            (opts.categories
                ? estimateCategoryAxisHeight(labels, {
                      angle,
                      fontSize: theme.fontSize.axis,
                      title: Boolean(opts.title),
                      activeDot: highlight,
                  })
                : 'auto'),
        padding: { left: 0, right: 0 },
        label: opts.title
            ? {
                  value: opts.title,
                  position: 'insideBottom',
                  fill: theme.axisLabel,
                  fontSize: opts.titleFontSize ?? theme.fontSize.axis,
                  fontFamily: theme.fontFamily,
              }
            : undefined,
    } satisfies XAxisProps;
}

/** Options of {@link valueAxisProps}. */
export interface ValueAxisOptions {
    /** `'left'` (default) or `'right'` (a `YAxis`), or `'bottom'` (an `XAxis`, horizontal bar charts). */
    position?: 'left' | 'right' | 'bottom';
    /** Tick label formatter; default Recharts' number formatting. Pass a stable function. */
    formatter?: (value: number) => string;
    /** Axis title (y title uses `theme.text.primary`, {@link AXIS_TITLE_FONT_SIZE} px, rotated). */
    title?: string;
    /** Title font size in px; default {@link AXIS_TITLE_FONT_SIZE} (13). */
    titleFontSize?: number;
    /** Nice scale from `niceScale()`; sets `domain` and `ticks` (one tick about every 72px). */
    scale?: NiceScale;
    /** Hide the axis (labels and title) but keep scaling. */
    hide?: boolean;
    /** Recharts axis id (default 0; use 1 for a secondary axis). */
    axisId?: string | number;
    /** Axis width in px or `'auto'` (default). Only for left/right. */
    width?: number | 'auto';
}

/** Value axis on the left or right (a `YAxis`). */
export function valueAxisProps(theme: ChartTheme, opts?: ValueAxisOptions & { position?: 'left' | 'right' }): YAxisProps;
/** Value axis on the bottom (an `XAxis`, horizontal bar charts). */
export function valueAxisProps(theme: ChartTheme, opts: ValueAxisOptions & { position: 'bottom' }): XAxisProps;
/**
 * Props for the value axis: no axis line, no tick marks, labels `theme.axisLabel` 11px in
 * the theme font, optional 13px title in `theme.text.primary`, optional nice ticks.
 * Spread onto `<YAxis>` (or `<XAxis>` with `position: 'bottom'`).
 *
 * Stable identity: equal inputs return the same object (options, including `scale`, by content; `formatter` by
 * identity; `theme` by identity). See {@link categoryAxisProps}. The result is shared: never mutate it.
 */
export function valueAxisProps(theme: ChartTheme, opts: ValueAxisOptions = {}): XAxisProps | YAxisProps {
    return cachedProps(theme, `value:${optionsKey(opts)}`, () => buildValueAxisProps(theme, opts));
}

function buildValueAxisProps(theme: ChartTheme, opts: ValueAxisOptions): XAxisProps | YAxisProps {
    const common = {
        type: 'number' as const,
        hide: opts.hide,
        axisLine: false,
        tickLine: false,
        tick: { fill: theme.axisLabel, fontSize: theme.fontSize.axis, fontFamily: theme.fontFamily },
        tickFormatter: opts.formatter,
        domain: opts.scale ? opts.scale.domain : (['auto', 'auto'] as [string, string]),
        ticks: opts.scale?.ticks,
        allowDataOverflow: Boolean(opts.scale),
        interval: 0 as const,
        tickMargin: 6,
        fontSize: theme.fontSize.axis,
    };
    const titleLabel = (angle: number, position: 'insideLeft' | 'insideRight' | 'insideBottom') =>
        opts.title
            ? {
                  value: opts.title,
                  angle,
                  position,
                  style: { textAnchor: 'middle' as const },
                  fill: theme.text.primary,
                  fontSize: opts.titleFontSize ?? AXIS_TITLE_FONT_SIZE,
                  fontFamily: theme.fontFamily,
              }
            : undefined;
    if (opts.position === 'bottom') {
        return {
            ...common,
            xAxisId: opts.axisId ?? 0,
            orientation: 'bottom',
            height: opts.title ? 44 : 26,
            label: titleLabel(0, 'insideBottom'),
        } satisfies XAxisProps;
    }
    const right = opts.position === 'right';
    return {
        ...common,
        yAxisId: opts.axisId ?? 0,
        orientation: right ? 'right' : 'left',
        width: opts.width ?? 'auto',
        label: titleLabel(right ? 90 : -90, right ? 'insideRight' : 'insideLeft'),
    } satisfies YAxisProps;
}

/** Options of {@link gridProps}. */
export interface GridOptions {
    /** `'horizontal'` lines (default, value axis vertical) or `'vertical'` lines (horizontal bar charts). */
    direction?: 'horizontal' | 'vertical';
    /** Axis ids the grid follows (Recharts `xAxisId`/`yAxisId`). */
    xAxisId?: string | number;
    /** See `xAxisId`. */
    yAxisId?: string | number;
}

/**
 * Props for `<CartesianGrid>`: solid grid lines in `theme.gridLine` along the value axis only, no
 * background fill. Equal inputs return the same object (see {@link categoryAxisProps}).
 */
export function gridProps(theme: ChartTheme, opts: GridOptions = {}): CartesianGridProps {
    return cachedProps(theme, `grid:${optionsKey(opts)}`, () => buildGridProps(theme, opts));
}

function buildGridProps(theme: ChartTheme, opts: GridOptions): CartesianGridProps {
    const vertical = opts.direction === 'vertical';
    return {
        stroke: theme.gridLine,
        strokeDasharray: undefined,
        horizontal: !vertical,
        vertical,
        fill: 'none',
        ...(opts.xAxisId !== undefined ? { xAxisId: opts.xAxisId } : {}),
        ...(opts.yAxisId !== undefined ? { yAxisId: opts.yAxisId } : {}),
    };
}
