import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';

import { useContentStable } from '../core/stable';
import { getBaseTheme, lightTheme, mergeTheme } from './themes';
import type { ChartTheme, ChartThemeMode, ChartThemeModeSetting, ChartThemeOverrides } from './types';

/** @internal Value carried by the theme context. */
export interface ChartThemeContextValue {
    /** Resolved mode of this level. */
    mode: ChartThemeMode;
    /** Accumulated overrides from outer to inner providers. */
    overrides: ChartThemeOverrides[];
    /** Resolved theme at this level. */
    theme: ChartTheme;
}

/** @internal Theme context. `null` means no provider: consumers fall back to {@link lightTheme}. */
export const ChartThemeContext = createContext<ChartThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function subscribeToScheme(onChange: () => void): () => void {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
    const mql = window.matchMedia(DARK_QUERY);
    mql.addEventListener?.('change', onChange);
    return () => mql.removeEventListener?.('change', onChange);
}

function getSchemeSnapshot(): boolean {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia(DARK_QUERY).matches
        : false;
}

/**
 * Returns `true` while the page prefers a dark colour scheme. Follows changes live; returns `false` during SSR
 * and where `matchMedia` is unavailable.
 */
export function usePrefersDarkScheme(): boolean {
    return useSyncExternalStore(subscribeToScheme, getSchemeSnapshot, () => false);
}

/** Props of {@link ChartThemeProvider}. */
export interface ChartThemeProviderProps {
    /**
     * Colour mode. `'system'` follows `prefers-color-scheme` live. When omitted, a nested provider inherits the
     * outer provider's mode, and a top-level provider uses `'light'`.
     */
    mode?: ChartThemeModeSetting;
    /** Overrides deep-merged over the outer theme (inner providers win). */
    theme?: ChartThemeOverrides;
    /** Charts and other content. */
    children?: ReactNode;
}

/**
 * Supplies the chart theme to every chart below it. Providers may nest; inner overrides merge over outer ones.
 * It never touches `document.body` or global CSS.
 */
export function ChartThemeProvider({ mode, theme, children }: ChartThemeProviderProps) {
    const parent = useContext(ChartThemeContext);
    const prefersDark = usePrefersDarkScheme();
    const stableOverrides = useContentStable(theme);
    const resolvedMode: ChartThemeMode =
        mode === 'system' ? (prefersDark ? 'dark' : 'light') : (mode ?? parent?.mode ?? 'light');

    const value = useMemo<ChartThemeContextValue>(() => {
        const overrides = [...(parent?.overrides ?? []), ...(stableOverrides ? [stableOverrides] : [])];
        return { mode: resolvedMode, overrides, theme: mergeTheme(getBaseTheme(resolvedMode), ...overrides) };
    }, [parent, resolvedMode, stableOverrides]);

    return <ChartThemeContext.Provider value={value}>{children}</ChartThemeContext.Provider>;
}

/**
 * Returns the resolved chart theme: the nearest provider's theme (or {@link lightTheme} without a provider) with
 * the per-instance `overrides` merged over it. Inline override objects are fine; the result is memoised by content.
 */
export function useChartTheme(overrides?: ChartThemeOverrides | null): ChartTheme {
    const ctx = useContext(ChartThemeContext);
    const stable = useContentStable(overrides ?? null);
    const base = ctx?.theme ?? lightTheme;
    return useMemo(() => (stable ? mergeTheme(base, stable) : base), [base, stable]);
}

/** Props of {@link ResolvedChartThemeProvider}. */
export interface ResolvedChartThemeProviderProps {
    /** The fully resolved theme to hand down. */
    theme: ChartTheme;
    /** Content. */
    children?: ReactNode;
}

/**
 * Hands an already resolved theme (typically `useChartTheme(props.theme)`) to descendants, so core parts rendered
 * inside a chart (ticks, tooltip, legend) see the chart's per-instance overrides. `ChartFrame` does this for you.
 */
export function ResolvedChartThemeProvider({ theme, children }: ResolvedChartThemeProviderProps) {
    const parent = useContext(ChartThemeContext);
    const value = useMemo<ChartThemeContextValue>(() => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { mode, isDarkMode, ...rest } = theme;
        return { mode: theme.mode, overrides: [...(parent?.overrides ?? []), rest], theme };
    }, [parent, theme]);
    return <ChartThemeContext.Provider value={value}>{children}</ChartThemeContext.Provider>;
}
