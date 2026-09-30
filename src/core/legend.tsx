import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';

import { useChartTheme } from '../theme/ChartThemeProvider';
import type { ChartTheme } from '../theme/types';
import { HatchPattern } from './HatchPattern';
import { contentKey, useUniqueId } from './stable';

/**
 * Legend symbol kinds: `square` (bars/areas), `circle` (scatter/bubble), `line`/`dashed` (lines), `lineMarker`
 * (line with circle marker), `marker` (the hollow point marker alone: a `size` px ring with a 2px series-colour
 * stroke and `markerFill` inside, as the original DualAxisChart's solid splines), `hatch` (hatched bars, e.g.
 * forecasts).
 */
export type LegendSymbolKind = 'square' | 'circle' | 'line' | 'dashed' | 'lineMarker' | 'marker' | 'hatch';

/** One legend entry. */
export interface LegendItem {
    /** Series id (row key, e.g. `s0`). Passed to `onToggle` / `onItemHover`. */
    key: string;
    /** Label. */
    name: string;
    /** Series colour. */
    color: string;
    /** Symbol kind; default `'square'`. */
    symbol?: LegendSymbolKind;
    /** Hidden series are drawn in `theme.inactiveLegend`. */
    hidden?: boolean;
}

/** Props of {@link LegendSymbol}. */
export interface LegendSymbolProps {
    /** Kind of symbol. */
    kind?: LegendSymbolKind;
    /** Colour. */
    color: string;
    /** Square/circle size in px (default 10; the original BarChart and DualAxisChart use 12). */
    size?: number;
    /** Square corner radius (default 0; BarChart and DualAxisChart use 2). */
    radius?: number;
    /** Background colour inside a `lineMarker`/`marker` circle (default white, as the original DualAxisChart). */
    markerFill?: string;
}

/** A single legend symbol, drawn as inline SVG. */
export function LegendSymbol({ kind = 'square', color, size = 10, radius = 0, markerFill = '#FFFFFF' }: LegendSymbolProps) {
    const hatchId = useUniqueId('legend-hatch');
    if (kind === 'hatch') {
        return (
            <svg width={size} height={size} aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
                <defs>
                    <HatchPattern id={hatchId} color={color} spacing={4} strokeWidth={1.5} />
                </defs>
                <rect x={0.5} y={0.5} width={size - 1} height={size - 1} rx={radius} fill={`url(#${hatchId})`} stroke={color} strokeWidth={1} />
            </svg>
        );
    }
    if (kind === 'marker') {
        return (
            <svg width={size} height={size} aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
                <circle cx={size / 2} cy={size / 2} r={Math.max(1, size / 2 - 1)} fill={markerFill} stroke={color} strokeWidth={2} />
            </svg>
        );
    }
    if (kind === 'line' || kind === 'dashed' || kind === 'lineMarker') {
        const w = kind === 'lineMarker' ? 16 : 12;
        const h = kind === 'lineMarker' ? 10 : Math.max(size, 2);
        return (
            <svg width={w} height={h} aria-hidden="true" style={{ flexShrink: 0, display: 'block' }}>
                <line
                    x1={0}
                    x2={w}
                    y1={h / 2}
                    y2={h / 2}
                    stroke={color}
                    strokeWidth={2}
                    strokeDasharray={kind === 'dashed' ? '4 2' : undefined}
                    strokeLinecap={kind === 'line' ? 'round' : 'butt'}
                />
                {kind === 'lineMarker' ? <circle cx={w / 2} cy={h / 2} r={4} fill={markerFill} stroke={color} strokeWidth={2} /> : null}
            </svg>
        );
    }
    return (
        <span
            aria-hidden="true"
            style={{
                display: 'block',
                flexShrink: 0,
                width: size,
                height: size,
                borderRadius: kind === 'circle' ? '50%' : radius,
                background: color,
            }}
        />
    );
}

/** Props of {@link ChartLegend}. */
export interface ChartLegendProps {
    /** Entries in series order. */
    items: ReadonlyArray<LegendItem>;
    /** Default click action: toggle the series (wire to `useSeriesVisibility().toggle`). */
    onToggle?: (key: string) => void;
    /** Click override: when given it is called **instead of** `onToggle` (the original BarChart's `onLegendClick`). */
    onItemClick?: (item: LegendItem) => void;
    /**
     * Hover report: series key on enter (`null` for hidden items), `null` on leave. Wire to
     * `useSeriesHover().setHovered` for dimming.
     */
    onItemHover?: (key: string | null) => void;
    /** Square/circle symbol size (default 10; 12 for BarChart/DualAxisChart). */
    symbolSize?: number;
    /** Square symbol radius (default 0; 2 for BarChart/DualAxisChart). */
    symbolRadius?: number;
    /** Gap in px between a symbol and its label (default 5, the originals' `symbolPadding`). */
    symbolGap?: number;
    /** Theme; default the context theme. */
    theme?: ChartTheme;
    /** Extra styles on the legend container. */
    style?: CSSProperties;
}

/**
 * The originals' legend: centred below the chart, horizontal (wrapping), 12px normal-weight `text.primary`, 20px
 * between items, 5px between symbol and label (`symbolGap`). Clicking toggles the series unless `onItemClick` is given; hidden
 * items are drawn in `theme.inactiveLegend`. Items are buttons with `aria-pressed` (pressed = visible).
 */
export function ChartLegend({
    items,
    onToggle,
    onItemClick,
    onItemHover,
    symbolSize = 10,
    symbolRadius = 0,
    symbolGap = 5,
    theme: themeProp,
    style,
}: ChartLegendProps) {
    const contextTheme = useChartTheme();
    const theme = themeProp ?? contextTheme;
    const interactive = Boolean(onItemClick || onToggle);
    return (
        <div
            className="ck-legend"
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                columnGap: 20,
                rowGap: 4,
                padding: '8px 8px 0',
                fontFamily: theme.fontFamily,
                fontSize: theme.fontSize.legend,
                fontWeight: 400,
                ...style,
            }}
        >
            {items.map((item) => {
                const color = item.hidden ? theme.inactiveLegend : item.color;
                return (
                    <button
                        key={item.key}
                        type="button"
                        aria-pressed={onItemClick ? undefined : !item.hidden}
                        disabled={!interactive}
                        onClick={() => (onItemClick ? onItemClick(item) : onToggle?.(item.key))}
                        onMouseEnter={() => onItemHover?.(item.hidden ? null : item.key)}
                        onMouseLeave={() => onItemHover?.(null)}
                        onFocus={() => onItemHover?.(item.hidden ? null : item.key)}
                        onBlur={() => onItemHover?.(null)}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: symbolGap,
                            margin: 0,
                            padding: 0,
                            border: 0,
                            background: 'none',
                            font: 'inherit',
                            lineHeight: '16px',
                            color: item.hidden ? theme.inactiveLegend : theme.text.primary,
                            cursor: interactive ? 'pointer' : 'default',
                        }}
                    >
                        <LegendSymbol kind={item.symbol} color={color} size={symbolSize} radius={symbolRadius} />
                        <span>{item.name}</span>
                    </button>
                );
            })}
        </div>
    );
}

/** Result of {@link useSeriesVisibility}. */
export interface SeriesVisibility {
    /** Ids of hidden series. */
    hidden: ReadonlySet<string>;
    /** `true` when the series is hidden. */
    isHidden: (id: string) => boolean;
    /** Toggle one series. */
    toggle: (id: string) => void;
    /** Show or hide one series. */
    setVisible: (id: string, visible: boolean) => void;
    /** Show all series. */
    showAll: () => void;
}

/**
 * Tracks which series are hidden (legend toggling). `ids` are series ids (row keys such as `s0`). Hidden ids that
 * disappear from `ids` are dropped; everything resets when `resetKey` changes by content (pass e.g. the series
 * names, so a different set of series starts fully visible).
 */
export function useSeriesVisibility(ids: ReadonlyArray<string>, resetKey?: unknown): SeriesVisibility {
    const [state, setState] = useState<{ key: string; hidden: ReadonlySet<string> }>(() => ({
        key: contentKey(resetKey ?? null),
        hidden: new Set(),
    }));
    const key = contentKey(resetKey ?? null);
    const hiddenRaw = state.key === key ? state.hidden : EMPTY;
    const idsKey = ids.join('\u0000');
    const hidden = useMemo(() => {
        const valid = new Set(ids);
        const next = new Set([...hiddenRaw].filter((id) => valid.has(id)));
        return next.size === hiddenRaw.size ? hiddenRaw : next;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hiddenRaw, idsKey]);
    const keyRef = useRef(key);
    keyRef.current = key;

    const update = useCallback((fn: (prev: ReadonlySet<string>) => ReadonlySet<string>) => {
        setState((prev) => {
            const base = prev.key === keyRef.current ? prev.hidden : EMPTY;
            return { key: keyRef.current, hidden: fn(base) };
        });
    }, []);
    const setVisible = useCallback(
        (id: string, visible: boolean) =>
            update((prev) => {
                const next = new Set(prev);
                if (visible) next.delete(id);
                else next.add(id);
                return next;
            }),
        [update],
    );
    const toggle = useCallback(
        (id: string) =>
            update((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
            }),
        [update],
    );
    const showAll = useCallback(() => update(() => EMPTY), [update]);
    const isHidden = useCallback((id: string) => hidden.has(id), [hidden]);
    return useMemo(() => ({ hidden, isHidden, toggle, setVisible, showAll }), [hidden, isHidden, toggle, setVisible, showAll]);
}

const EMPTY: ReadonlySet<string> = new Set();
