import type { ChartTheme, ChartThemeMode, ChartThemeOverrides, ChartTooltipInverseTokens } from './types';

/**
 * Generic 8-colour categorical palette for light backgrounds. Validated for colour-vision-deficiency separation
 * between adjacent slots and for lightness/chroma on `#ffffff`. Assign in order; never cycle past 8 if avoidable.
 */
export const LIGHT_PALETTE: readonly string[] = [
    '#2a78d6', // blue
    '#eb6834', // orange
    '#1baf7a', // aqua
    '#eda100', // yellow
    '#e87ba4', // magenta
    '#008300', // green
    '#4a3aa7', // violet
    '#e34948', // red
];

/** The same eight hues as {@link LIGHT_PALETTE}, stepped for the dark chart background `#2B2C2F` (all >= 3:1). */
export const DARK_PALETTE: readonly string[] = [
    '#3987e5',
    '#d95926',
    '#199e70',
    '#c98500',
    '#d55181',
    '#1f951f',
    '#9085e9',
    '#e66767',
];

const TOOLTIP_INVERSE: ChartTooltipInverseTokens = {
    background: '#050505',
    border: '#30343b',
    text: '#ffffff',
    shadow: '0 6px 18px rgba(0,0,0,.28)',
    radius: 6,
    padding: '10px 12px',
    minWidth: 220,
    fontSize: 12,
    fontWeight: 600,
    lineHeight: 18,
    markerContrast: '#ffffff',
};

const FONT_SIZES = { axis: 11, legend: 12, tooltip: 12, dataLabel: 10 };

/** Built-in light theme (source application's light tokens). */
export const lightTheme: ChartTheme = {
    mode: 'light',
    isDarkMode: false,
    background: '#f8f9fa',
    componentBackground: '#ffffff',
    componentBorder: '#e5e5e5',
    surface: '#ffffff',
    border: '#e5e5e5',
    text: { primary: '#191919', secondary: '#707070' },
    axisLabel: '#707070',
    gridLine: '#e5e5e5',
    crosshair: '#e5e5e5',
    selectionFill: 'rgba(9,104,246,0.10)',
    inactiveLegend: '#cccccc',
    positive: '#288034',
    negative: '#D50B0B',
    forecast: '#F3511B',
    budget: '#0968F6',
    accent: '#60A5FA',
    fontFamily: 'inherit',
    fontSize: { ...FONT_SIZES },
    tooltipInverse: { ...TOOLTIP_INVERSE },
    palette: [...LIGHT_PALETTE],
};

/** Built-in dark theme (source application's dark tokens). */
export const darkTheme: ChartTheme = {
    mode: 'dark',
    isDarkMode: true,
    background: '#000000',
    componentBackground: '#2B2C2F',
    componentBorder: '#3B4043',
    surface: '#000000',
    border: '#3a3a3a',
    text: { primary: '#FFFFFF', secondary: '#C0C0C0' },
    axisLabel: '#707070',
    gridLine: '#3B4043',
    crosshair: '#3B4043',
    selectionFill: 'rgba(9,104,246,0.10)',
    inactiveLegend: '#5f6368',
    positive: '#507D17',
    negative: '#FF5C5C',
    forecast: '#71E3E2',
    budget: '#0968F6',
    accent: '#60A5FA',
    fontFamily: 'inherit',
    fontSize: { ...FONT_SIZES },
    tooltipInverse: { ...TOOLTIP_INVERSE },
    palette: [...DARK_PALETTE],
};

/** Returns the built-in theme for a mode. */
export function getBaseTheme(mode: ChartThemeMode): ChartTheme {
    return mode === 'dark' ? darkTheme : lightTheme;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function deepMerge(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = { ...base };
    for (const [key, value] of Object.entries(patch)) {
        if (value === undefined) continue;
        const current = out[key];
        out[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
    }
    return out;
}

/**
 * Deep-merges overrides over a base theme and returns a new theme. Arrays (`palette`) are replaced,
 * `undefined` values are ignored, and `mode`/`isDarkMode` always come from the base.
 */
export function mergeTheme(base: ChartTheme, ...overrides: Array<ChartThemeOverrides | null | undefined>): ChartTheme {
    let out = base as unknown as Record<string, unknown>;
    for (const o of overrides) {
        if (o) out = deepMerge(out, o as Record<string, unknown>);
    }
    const merged = out as unknown as ChartTheme;
    return merged === base ? base : { ...merged, mode: base.mode, isDarkMode: base.isDarkMode };
}
