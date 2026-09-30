/** Props of {@link CrosshairCursor}. Recharts supplies the geometry when it clones the element. */
export interface CrosshairCursorProps {
    /** Line colour; Recharts' `stroke` is ignored. Default `'#e5e5e5'`, pass `theme.crosshair`. */
    color?: string;
    /** Line width (default 1). (Not `width`: Recharts passes the plot width under that name.) */
    lineWidth?: number;
    /** Dash pattern (default: the originals' `Dot` style at width 1, `'1 3'`). */
    dashArray?: string;
    /** Chart layout; `'vertical'` (horizontal bars) draws a horizontal line. Inferred when omitted. */
    layout?: 'horizontal' | 'vertical';
    /** Injected by Recharts in line/area/composed charts: the cursor segment. */
    points?: ReadonlyArray<{ x: number; y: number }>;
    /** Injected by Recharts in bar charts: band rectangle. */
    x?: number;
    /** Injected by Recharts in bar charts. */
    y?: number;
    /** Injected by Recharts in bar charts. */
    height?: number;
    /** Injected by Recharts: band width in bar charts, else the plot width. */
    width?: number;
    /** Injected by Recharts: plot offset. */
    top?: number;
    /** Injected by Recharts: plot offset. */
    left?: number;
}

/**
 * The originals' crosshair: a 1px dotted line in `theme.crosshair` through the hovered category, for line and bar
 * charts alike (Recharts' bar-chart band highlight is replaced by the line). Use as
 * `<Tooltip cursor={<CrosshairCursor color={theme.crosshair} />} />` or via `tooltipProps(theme)`.
 */
export function CrosshairCursor({
    color = '#e5e5e5',
    lineWidth = 1,
    dashArray = '1 3',
    layout,
    points,
    ...rest
}: CrosshairCursorProps) {
    let x1: number, y1: number, x2: number, y2: number;
    if (points && points.length >= 2) {
        [x1, y1, x2, y2] = [points[0].x, points[0].y, points[1].x, points[1].y];
    } else {
        const x = Number(rest.x ?? 0);
        const y = Number(rest.y ?? 0);
        const w = Number(rest.width ?? 0);
        const h = Number(rest.height ?? 0);
        const top = Number(rest.top ?? y);
        const left = Number(rest.left ?? x);
        const atTop = Math.abs(y - top) <= 1;
        const atLeft = Math.abs(x - left) <= 1;
        // Horizontal layout: the band spans the plot height (starts at the top); vertical: it spans the width.
        const vertical = layout ? layout === 'vertical' : atLeft && !atTop ? true : atTop && !atLeft ? false : w > h;
        if (vertical) {
            const cy = y + h / 2;
            [x1, y1, x2, y2] = [x, cy, x + w, cy];
        } else {
            const cx = x + w / 2;
            [x1, y1, x2, y2] = [cx, y, cx, y + h];
        }
    }
    if (![x1, y1, x2, y2].every(Number.isFinite)) return null;
    return (
        <line
            className="ck-crosshair"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={color}
            strokeWidth={lineWidth}
            strokeDasharray={dashArray}
            pointerEvents="none"
        />
    );
}
