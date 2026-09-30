import { useEffect, useRef } from 'react';
import { usePlotArea, type PlotArea } from 'recharts';

/** Props of {@link HatchPattern}. */
export interface HatchPatternProps {
    /** Pattern id; reference it as `fill={\`url(#${id})\`}`. Create it with `useUniqueId('hatch')`. */
    id: string;
    /** Stripe colour. */
    color: string;
    /** Background between stripes (default `'transparent'`). */
    background?: string;
    /** Opacity of the background tint in the stripe colour, drawn under the stripes (default 0.2; 0 disables). */
    tintOpacity?: number;
    /** Distance between stripes in px (default 6). */
    spacing?: number;
    /** Stripe width in px (default 2). */
    strokeWidth?: number;
    /** Stripe angle in degrees (default 45). */
    angle?: number;
}

/**
 * SVG `<pattern>` of diagonal stripes, for hatched bars (e.g. forecast columns). Render inside `<defs>` in the chart:
 * `<defs><HatchPattern id={id} color={c} /></defs>` then `<Bar fill={\`url(#${id})\`} />`.
 */
export function HatchPattern({
    id,
    color,
    background = 'transparent',
    tintOpacity = 0.2,
    spacing = 6,
    strokeWidth = 2,
    angle = 45,
}: HatchPatternProps) {
    return (
        <pattern id={id} width={spacing} height={spacing} patternUnits="userSpaceOnUse" patternTransform={`rotate(${angle})`}>
            <rect width={spacing} height={spacing} fill={background} />
            {tintOpacity > 0 ? <rect width={spacing} height={spacing} fill={color} fillOpacity={tintOpacity} /> : null}
            <line x1={strokeWidth / 2} y1={0} x2={strokeWidth / 2} y2={spacing} stroke={color} strokeWidth={strokeWidth} />
        </pattern>
    );
}

/** Props of {@link PlotAreaProbe}. */
export interface PlotAreaProbeProps {
    /** Called with the plot area whenever its size or position changes. */
    onChange: (area: PlotArea) => void;
}

/**
 * Render inside a Recharts chart to learn the plot area size in the parent, e.g. to feed
 * `niceScale(min, max, { pixelLength: plot.height })` for original-style tick density. Reports only when a value
 * changes by at least 1px (rounded). Keep everything derived from it referentially stable (`niceScale` is cached).
 */
export function PlotAreaProbe({ onChange }: PlotAreaProbeProps) {
    const area = usePlotArea();
    const last = useRef<string>('');
    const cb = useRef(onChange);
    cb.current = onChange;
    useEffect(() => {
        if (!area) return;
        // Rounded, so sub-pixel re-measurements do not cause parent re-renders.
        const key = [area.x, area.y, area.width, area.height].map(Math.round).join('|');
        if (key !== last.current) {
            last.current = key;
            cb.current(area);
        }
    });
    return null;
}
