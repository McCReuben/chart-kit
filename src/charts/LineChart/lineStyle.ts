/**
 * Line dash styles, named as in the originals (`series[].dashStyle`). Each is a dash pattern in multiples of the line
 * width, like the originals, so `'Dash'` on a 2.5px line is `10 7.5`.
 */
export type LineDashStyle =
    | 'Solid'
    | 'ShortDash'
    | 'ShortDot'
    | 'ShortDashDot'
    | 'ShortDashDotDot'
    | 'Dot'
    | 'Dash'
    | 'LongDash'
    | 'DashDot'
    | 'LongDashDot'
    | 'LongDashDotDot';

const DASH_PATTERNS: Record<LineDashStyle, readonly number[] | null> = {
    Solid: null,
    ShortDash: [3, 1],
    ShortDot: [1, 1],
    ShortDashDot: [3, 1, 1, 1],
    ShortDashDotDot: [3, 1, 1, 1, 1, 1],
    Dot: [1, 3],
    Dash: [4, 3],
    LongDash: [8, 3],
    DashDot: [4, 3, 1, 3],
    LongDashDot: [8, 3, 1, 3],
    LongDashDotDot: [8, 3, 1, 3, 1, 3],
};

/** SVG `stroke-dasharray` for a dash style at a line width, or `undefined` for a solid line. */
export function dashArrayFor(style: LineDashStyle | undefined, width: number): string | undefined {
    const pattern = style ? DASH_PATTERNS[style] : null;
    if (!pattern) return undefined;
    return pattern.map((n) => +(n * width).toFixed(3)).join(' ');
}

/** `true` for any dash style other than solid. */
export function isDashed(style: LineDashStyle | undefined): boolean {
    return Boolean(style && DASH_PATTERNS[style]);
}

const NUMERIC_SYMBOLS = ['k', 'M', 'G', 'T', 'P', 'E'];

function plainNumber(value: number, group: boolean): string {
    const text = String(+value.toPrecision(12));
    if (!group) return text;
    const [int, frac] = text.split('.');
    const sign = int.startsWith('-') ? '-' : '';
    const digits = sign ? int.slice(1) : int;
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    return `${sign}${grouped}${frac ? `.${frac}` : ''}`;
}

/**
 * The originals' default value-axis labels: thousands become `k`, `M`, `G`… when the tick interval is at least that
 * large (`40000` with a 10 000 interval is `40k`), otherwise the plain number. Thousands are separated by a space
 * (plain numbers only from 10 000 up), as in the originals.
 */
export function defaultAxisNumber(value: number, tickInterval: number): string {
    for (let i = NUMERIC_SYMBOLS.length - 1; i >= 0; i--) {
        const multi = 1000 ** (i + 1);
        if (tickInterval >= multi && value !== 0 && (value * 10) % multi === 0) {
            return plainNumber(value / multi, true) + NUMERIC_SYMBOLS[i];
        }
    }
    return plainNumber(value, Math.abs(value) >= 10000);
}
