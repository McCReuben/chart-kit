import { createContext, useContext, type CSSProperties, type ReactElement, type ReactNode } from 'react';

import { useChartTheme } from '../theme/ChartThemeProvider';
import type { ChartTheme } from '../theme/types';
import { CrosshairCursor } from './CrosshairCursor';
import type { ChartRow } from './data';
import { defaultCategoryFormatter, defaultValueFormatter } from './formatters';
import { useUniqueId } from './stable';

/** Look of a tooltip: `'default'` (theme surface, like the originals) or `'inverse'` (always dark). */
export type TooltipVariant = 'default' | 'inverse';

/** Series marker kinds shown in tooltips. */
export type MarkerKind = 'square' | 'circle' | 'line' | 'dashed' | 'hatch';

const TooltipVariantContext = createContext<TooltipVariant>('default');

/** Returns the variant of the enclosing {@link TooltipFrame} (`'default'` outside one). */
export function useTooltipVariant(): TooltipVariant {
    return useContext(TooltipVariantContext);
}

/** Props of {@link TooltipFrame}. */
export interface TooltipFrameProps {
    /** `'default'`: theme `surface` background, 1px `border`, radius 3, soft shadow, 12px `text.primary`, inner padding 4px 6px. `'inverse'`: the `theme.tooltipInverse` tokens. */
    variant?: TooltipVariant;
    /** Theme; default the context theme. */
    theme?: ChartTheme;
    /** Extra styles. */
    style?: CSSProperties;
    /** Title and rows. */
    children?: ReactNode;
}

/**
 * Tooltip box. Its `variant` is passed to {@link TooltipTitle}, {@link TooltipRow} and {@link TooltipMarker} inside
 * it via context.
 */
export function TooltipFrame({ variant = 'default', theme: themeProp, style, children }: TooltipFrameProps) {
    const contextTheme = useChartTheme();
    const theme = themeProp ?? contextTheme;
    const inv = theme.tooltipInverse;
    const base: CSSProperties =
        variant === 'inverse'
            ? {
                  minWidth: inv.minWidth,
                  padding: inv.padding,
                  borderRadius: inv.radius,
                  background: inv.background,
                  border: `1px solid ${inv.border}`,
                  boxShadow: inv.shadow,
                  color: inv.text,
                  fontSize: inv.fontSize,
                  fontWeight: inv.fontWeight,
                  lineHeight: `${inv.lineHeight}px`,
              }
            : {
                  // Originals: 8px label padding + the originals' inner `padding:4px 6px`.
                  padding: '12px 14px',
                  borderRadius: 3,
                  background: theme.surface,
                  border: `1px solid ${theme.border}`,
                  boxShadow: '1px 1px 3px rgba(0,0,0,0.15)',
                  color: theme.text.primary,
                  fontSize: theme.fontSize.tooltip,
                  lineHeight: 'normal',
              };
    return (
        <TooltipVariantContext.Provider value={variant}>
            <div
                className="ck-tooltip"
                style={{
                    boxSizing: 'border-box',
                    fontFamily: theme.fontFamily,
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    ...base,
                    ...style,
                }}
            >
                {children}
            </div>
        </TooltipVariantContext.Provider>
    );
}

/** Props of {@link TooltipTitle}. */
export interface TooltipTitleProps {
    /** Header text. */
    children?: ReactNode;
    /** Extra styles. */
    style?: CSSProperties;
}

/** Tooltip header: bold (default look) or 12px/700 with 4px bottom margin (inverse look). */
export function TooltipTitle({ children, style }: TooltipTitleProps) {
    const variant = useTooltipVariant();
    const theme = useChartTheme();
    const s: CSSProperties =
        variant === 'inverse'
            ? { fontSize: theme.tooltipInverse.fontSize, fontWeight: 700, marginBottom: 4 }
            : { fontWeight: 700 };
    return <div style={{ ...s, ...style }}>{children}</div>;
}

/** Props of {@link TooltipRow}. */
export interface TooltipRowProps {
    /** Marker element (usually a {@link TooltipMarker}). */
    marker?: ReactNode;
    /** Series name; rendered as `"label: value"` when `value` is given. */
    label?: ReactNode;
    /** Formatted value. */
    value?: ReactNode;
    /** Custom content instead of `label`/`value`. */
    children?: ReactNode;
    /** Extra styles. */
    style?: CSSProperties;
}

/**
 * One tooltip line: `marker + "label: value"`. Default look: `display:flex; align-items:center; gap:5px;
 * margin-top:3px`. Inverse look: flex, gap 6, min-height 18.
 */
export function TooltipRow({ marker, label, value, children, style }: TooltipRowProps) {
    const variant = useTooltipVariant();
    const s: CSSProperties =
        variant === 'inverse'
            ? { display: 'flex', alignItems: 'center', gap: 6, minHeight: 18 }
            : { display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 };
    return (
        <div style={{ ...s, ...style }}>
            {marker}
            <span>
                {children ?? (
                    <>
                        {label}
                        {value !== undefined ? <>: {value}</> : null}
                    </>
                )}
            </span>
        </div>
    );
}

/** Props of {@link TooltipMarker}. */
export interface TooltipMarkerProps {
    /** Marker shape. Default `'square'`. */
    kind?: MarkerKind;
    /** Series colour. */
    color: string;
    /**
     * Size set. Default: inherited from the enclosing {@link TooltipFrame} variant.
     * `'default'`: square 8×8 r2, circle 8, line 16×2, dashed 14px 2px dashed top, hatch 8×8 SVG pattern.
     * `'inverse'`: circle 12 with a 2px white border, square 14, dashed 14 wide, hatch 14 with a 1px colour border and a
     * 45° striped gradient; line 16×2.
     */
    look?: TooltipVariant;
    /** Extra styles. */
    style?: CSSProperties;
}

/** Series swatch for tooltips (and anywhere a small series key is needed). */
export function TooltipMarker({ kind = 'square', color, look, style }: TooltipMarkerProps) {
    const variant = useTooltipVariant();
    const theme = useChartTheme();
    const hatchId = useUniqueId('marker-hatch');
    const inverse = (look ?? variant) === 'inverse';
    const contrast = theme.tooltipInverse.markerContrast;
    const common: CSSProperties = { display: 'inline-block', flexShrink: 0, boxSizing: 'border-box' };
    let s: CSSProperties;
    switch (kind) {
        case 'circle':
            s = inverse
                ? { width: 12, height: 12, borderRadius: '50%', background: color, border: `2px solid ${contrast}` }
                : { width: 8, height: 8, borderRadius: '50%', background: color };
            break;
        case 'line':
            s = { width: 16, height: 2, borderRadius: 1, background: color, marginBottom: inverse ? 0 : 2 };
            break;
        case 'dashed':
            s = { width: 14, height: 2, borderTop: `2px dashed ${color}`, marginBottom: inverse ? 0 : 2 };
            break;
        case 'hatch':
            if (inverse) {
                s = {
                    width: 14,
                    height: 14,
                    borderRadius: 2,
                    border: `1px solid ${color}`,
                    background: `repeating-linear-gradient(45deg, ${color} 0 3px, ${contrast} 3px 5px)`,
                };
                break;
            }
            return (
                <svg width={8} height={8} style={{ ...common, ...style }} aria-hidden="true">
                    <defs>
                        <pattern id={hatchId} width={3} height={3} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <rect width={3} height={3} fill={color} fillOpacity={0.25} />
                            <line x1={0} y1={0} x2={0} y2={3} stroke={color} strokeWidth={2} />
                        </pattern>
                    </defs>
                    <rect x={0.5} y={0.5} width={7} height={7} rx={2} fill={`url(#${hatchId})`} stroke={color} strokeWidth={1} />
                </svg>
            );
        case 'square':
        default:
            s = inverse
                ? { width: 14, height: 14, borderRadius: 2, background: color }
                : { width: 8, height: 8, borderRadius: 2, background: color };
    }
    return <span aria-hidden="true" style={{ ...common, ...s, ...style }} />;
}

/** A series as listed in a shared tooltip. */
export interface TooltipSeriesItem {
    /** Row key of the series (`s0`, ...). */
    key: string;
    /** Display name. */
    name: string;
    /** Colour. */
    color: string;
    /** Marker kind; default `'square'`. */
    marker?: MarkerKind;
    /** Hidden series are left out. */
    hidden?: boolean;
}

/** Props of {@link SharedTooltipContent}. Recharts injects `active`, `payload`, `label` and `activeIndex`. */
export interface SharedTooltipContentProps {
    /** Series in display order (typically the resolved series with visibility and marker). */
    series: ReadonlyArray<TooltipSeriesItem>;
    /** Rows currently given to the chart; used to look up the hovered row by `activeIndex` (falls back to the Recharts payload). */
    rows?: ReadonlyArray<ChartRow>;
    /** Header formatter `(category, index)`; default `String(category)`. `index` is the original category index. */
    headerFormatter?: (category: string | number, index: number) => string;
    /** Value formatter `(value, series)`; default: the number, or `'—'` for null. */
    valueFormatter?: (value: number | null, series: TooltipSeriesItem) => string;
    /** Frame look; default `'default'`. */
    variant?: TooltipVariant;
    /** Injected by Recharts. */
    active?: boolean;
    /** Injected by Recharts. */
    payload?: ReadonlyArray<{ payload?: unknown }>;
    /** Injected by Recharts. */
    activeIndex?: number | string;
    /** Injected by Recharts (unused; the row supplies the category). */
    label?: unknown;
}

/**
 * Ready-made shared (category) tooltip in the originals' layout: bold header, then one row per visible series
 * `marker + "Name: value"`, null values as `'—'`. Use as `<Tooltip content={<SharedTooltipContent series={...} />} />`
 * or render it directly with `active` and `rows` + `activeIndex` for static display.
 */
export function SharedTooltipContent({
    series,
    rows,
    headerFormatter = defaultCategoryFormatter,
    valueFormatter,
    variant = 'default',
    active,
    payload,
    activeIndex,
}: SharedTooltipContentProps) {
    if (!active) return null;
    const idx = activeIndex === undefined || activeIndex === null ? NaN : Number(activeIndex);
    const row = ((rows && Number.isInteger(idx) ? rows[idx] : undefined) ??
        (payload?.[0]?.payload as ChartRow | undefined)) as ChartRow | undefined;
    if (!row) return null;
    const visible = series.filter((s) => !s.hidden);
    if (!visible.length) return null;
    return (
        <TooltipFrame variant={variant}>
            <TooltipTitle>{headerFormatter(row.category, row.index)}</TooltipTitle>
            {visible.map((s) => {
                const raw = row[s.key];
                const value = typeof raw === 'number' && Number.isFinite(raw) ? raw : null;
                return (
                    <TooltipRow
                        key={s.key}
                        marker={<TooltipMarker kind={s.marker ?? 'square'} color={s.color} />}
                        label={s.name}
                        value={valueFormatter ? valueFormatter(value, s) : defaultValueFormatter(value)}
                    />
                );
            })}
        </TooltipFrame>
    );
}

/** Options of {@link tooltipProps}. */
export interface TooltipPropsOptions {
    /** Draw the dotted crosshair cursor (default `true`). */
    crosshair?: boolean;
    /** Layout of the chart, for the crosshair direction (default `'horizontal'`, i.e. a vertical line). */
    layout?: 'horizontal' | 'vertical';
}

/** Return type of {@link tooltipProps}: a subset of Recharts `TooltipProps`. */
export interface ChartTooltipBaseProps {
    /** Always `false` (the originals' tooltips do not animate). */
    isAnimationActive: boolean;
    /** Crosshair cursor element, or `false`. */
    cursor: ReactElement | false;
    /** Wrapper styles (no outline, above the plot, no pointer events). */
    wrapperStyle: CSSProperties;
    /** Distance from the pointer in px. */
    offset: number;
    /** Keep the tooltip inside the chart. */
    allowEscapeViewBox: {
        /** Allow escaping horizontally (always `false`). */
        x: boolean;
        /** Allow escaping vertically (always `false`). */
        y: boolean;
    };
}

/**
 * Common `<Tooltip>` props of the originals: no animation, dotted crosshair cursor in `theme.crosshair`, no focus
 * outline, stays inside the chart. Add `content` yourself: `<Tooltip {...tooltipProps(theme)} content={...} />`.
 */
export function tooltipProps(theme: ChartTheme, opts: TooltipPropsOptions = {}): ChartTooltipBaseProps {
    return {
        isAnimationActive: false,
        cursor: opts.crosshair === false ? false : <CrosshairCursor color={theme.crosshair} layout={opts.layout} />,
        wrapperStyle: { outline: 'none', zIndex: 10, pointerEvents: 'none' },
        offset: 14,
        allowEscapeViewBox: { x: false, y: false },
    };
}
