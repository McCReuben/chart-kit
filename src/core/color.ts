/**
 * Parses `#rgb`, `#rrggbb` or `rgb()/rgba()` into `[r, g, b]` (0–255), or `null` when the format is not supported
 * (named colours, `hsl()`, CSS variables).
 */
export function parseRgb(color: string): [number, number, number] | null {
    const c = color.trim();
    const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c);
    if (hex) {
        const h = hex[1].length === 3 ? hex[1].replace(/./g, (ch) => ch + ch) : hex[1];
        return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
    }
    const m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(c);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    return null;
}

/**
 * The original charts' `brighten`: adds `amount * 255` to each RGB channel, clamped to 0–255, and returns
 * `rgb(r, g, b)`. A negative `amount` darkens (hover states use -0.05 to -0.1). Colours it cannot parse
 * (see {@link parseRgb}) are returned unchanged. Alpha is dropped.
 */
export function brighten(color: string, amount: number): string {
    const rgb = parseRgb(color);
    if (!rgb) return color;
    const d = Math.round(255 * amount);
    const out = rgb.map((ch) => Math.max(0, Math.min(255, ch + d)));
    return `rgb(${out.join(', ')})`;
}
