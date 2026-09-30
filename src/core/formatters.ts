/** Placeholder shown for missing values (`null`, `undefined`, `NaN`, non-finite). */
export const EMPTY_VALUE = '—';

/** A value formatter as accepted by chart props. */
export type ValueFormatter = (value: number | null | undefined) => string;

/** A category label formatter as accepted by `xAxisLabelFormatter` / `tooltipHeaderFormatter`. */
export type CategoryFormatter = (value: string | number, index?: number) => string;

function isMissing(value: unknown): value is null | undefined {
    return value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value));
}

/**
 * Formats a retail-week or retail-quarter category, keeping a year prefix when one is known. Non-week labels are
 * returned unchanged (trimmed).
 *
 * - `'2026 RQ2'`, `'2026Q2'` → `'2026 Q2'`
 * - `'W5'`, `'RW05'` → `'RW05'`, or `'2026 RW05'` with `year = 2026`
 * - `'2025 W5'` → `'2025 RW05'` (the embedded year wins)
 * - `5` or `'05'` → `'2026 RW05'` only when a `year` is given
 *
 * One deliberate difference from the original helper: there `Number(null) === 0` counted as a year, so a call
 * without a year gave `'0 RW05'`. Here a `null`/`''` year means "no year" (`'RW05'`, and bare numbers stay as-is).
 */
export function formatRetailWeek(value: unknown, year: number | string | null = null): string {
    const text = String(value ?? '').trim();
    const quarter = text.match(/^(\d{4})\s*R?Q\s*0*([1-4])$/i);
    if (quarter) return `${quarter[1]} Q${quarter[2]}`;

    const yearNumber = year === null || year === '' ? NaN : Number(year);
    const resolvedFallbackYear = Number.isFinite(yearNumber) ? String(yearNumber) : null;

    const match = text.match(/^(?:(\d{4})\s*)?(?:RW|W)\s*0*(\d{1,2})$/i);
    if (match) {
        const week = String(Number(match[2])).padStart(2, '0');
        const resolvedYear = match[1] ?? resolvedFallbackYear;
        return resolvedYear ? `${resolvedYear} RW${week}` : `RW${week}`;
    }

    if (/^\d{1,2}$/.test(text) && resolvedFallbackYear) {
        return `${resolvedFallbackYear} RW${String(Number(text)).padStart(2, '0')}`;
    }

    return text;
}

/**
 * Returns a category formatter that applies {@link formatRetailWeek} with a fixed year. Opt-in: charts default to
 * `String(value)`. Example: `xAxisLabelFormatter={retailWeekFormatter(2026)}`.
 */
export function retailWeekFormatter(year: number | string | null = null): CategoryFormatter {
    return (value) => formatRetailWeek(value, year);
}

/** Options shared by the number formatters. */
export interface BaseFormatOptions {
    /** BCP 47 locale (default `'en-US'`, so output is deterministic across machines). */
    locale?: string;
    /** Fixed number of fraction digits (sets both minimum and maximum). */
    decimals?: number;
    /** Compact notation, e.g. `1.2K`, `3.4M`. */
    compact?: boolean;
    /** Sign display, e.g. `'exceptZero'` for `+1.2`. */
    signDisplay?: Intl.NumberFormatOptions['signDisplay'];
    /** Text placed before the formatted number. */
    prefix?: string;
    /** Text placed after the formatted number. */
    suffix?: string;
}

/** Options of {@link formatNumber}. */
export interface NumberFormatOptions extends BaseFormatOptions {
    /** Maximum fraction digits when `decimals` is not set (default 2, or 1 when `compact`). */
    maximumFractionDigits?: number;
}

/** Options of {@link formatCurrency}. */
export interface CurrencyFormatOptions extends BaseFormatOptions {
    /** ISO 4217 currency code (default `'USD'`). */
    currency?: string;
    /** How to show the currency (default `'symbol'`; `'narrowSymbol'` gives `$` for any dollar). */
    currencyDisplay?: Intl.NumberFormatOptions['currencyDisplay'];
}

/** Options of {@link formatPercent}. */
export interface PercentFormatOptions extends BaseFormatOptions {
    /** Treat the value as a ratio (`0.123` → `12.3%`). Default `false`: the value is already in percent. */
    fromRatio?: boolean;
}

const cache = new Map<string, Intl.NumberFormat>();
function getFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
    const key = `${locale}|${JSON.stringify(options)}`;
    let fmt = cache.get(key);
    if (!fmt) {
        fmt = new Intl.NumberFormat(locale, options);
        cache.set(key, fmt);
    }
    return fmt;
}

function digits(decimals: number | undefined, maxDefault: number): Intl.NumberFormatOptions {
    return decimals !== undefined
        ? { minimumFractionDigits: decimals, maximumFractionDigits: decimals }
        : { maximumFractionDigits: maxDefault };
}

function wrap(text: string, opts: BaseFormatOptions): string {
    return `${opts.prefix ?? ''}${text}${opts.suffix ?? ''}`;
}

/**
 * Formats a number with `Intl.NumberFormat` (grouping, optional compact notation). Missing values give `'—'`.
 * `formatNumber(1234.5)` → `'1,234.5'`; `formatNumber(1234567, { compact: true })` → `'1.2M'`.
 */
export function formatNumber(value: number | null | undefined, opts: NumberFormatOptions = {}): string {
    if (isMissing(value)) return EMPTY_VALUE;
    const fmt = getFormat(opts.locale ?? 'en-US', {
        ...(opts.compact ? { notation: 'compact' } : {}),
        ...digits(opts.decimals, opts.maximumFractionDigits ?? (opts.compact ? 1 : 2)),
        ...(opts.signDisplay ? { signDisplay: opts.signDisplay } : {}),
    });
    return wrap(fmt.format(value), opts);
}

/**
 * Formats a currency amount. Default 2 decimals, or up to 1 decimal when `compact`. Missing values give `'—'`.
 * `formatCurrency(1234.5)` → `'$1,234.50'`; `formatCurrency(1_200_000, { compact: true })` → `'$1.2M'`.
 */
export function formatCurrency(value: number | null | undefined, opts: CurrencyFormatOptions = {}): string {
    if (isMissing(value)) return EMPTY_VALUE;
    const decimals = opts.decimals ?? (opts.compact ? undefined : 2);
    const fmt = getFormat(opts.locale ?? 'en-US', {
        style: 'currency',
        currency: opts.currency ?? 'USD',
        currencyDisplay: opts.currencyDisplay ?? 'symbol',
        ...(opts.compact ? { notation: 'compact' } : {}),
        ...digits(decimals, 1),
        ...(opts.signDisplay ? { signDisplay: opts.signDisplay } : {}),
    });
    return wrap(fmt.format(value), opts);
}

/**
 * Formats a percentage. By default the value is already in percent (`12.34` → `'12.3%'`); with `fromRatio` it is
 * a ratio (`0.1234` → `'12.3%'`). Default up to 1 decimal. Missing values give `'—'`.
 */
export function formatPercent(value: number | null | undefined, opts: PercentFormatOptions = {}): string {
    if (isMissing(value)) return EMPTY_VALUE;
    const ratio = opts.fromRatio ? value : value / 100;
    const fmt = getFormat(opts.locale ?? 'en-US', {
        style: 'percent',
        ...digits(opts.decimals, 1),
        ...(opts.signDisplay ? { signDisplay: opts.signDisplay } : {}),
    });
    return wrap(fmt.format(ratio), opts);
}

/** Returns `(v) => formatNumber(v, opts)`, for passing as a formatter prop. */
export function numberFormatter(opts: NumberFormatOptions = {}): ValueFormatter {
    return (v) => formatNumber(v, opts);
}

/** Returns `(v) => formatCurrency(v, opts)`, for passing as a formatter prop. */
export function currencyFormatter(opts: CurrencyFormatOptions = {}): ValueFormatter {
    return (v) => formatCurrency(v, opts);
}

/** Returns `(v) => formatPercent(v, opts)`, for passing as a formatter prop. */
export function percentFormatter(opts: PercentFormatOptions = {}): ValueFormatter {
    return (v) => formatPercent(v, opts);
}

/**
 * Default tooltip value formatting used by the charts: `'—'` for missing values, otherwise `String(value)`
 * (the originals print the raw number).
 */
export function defaultValueFormatter(value: number | null | undefined): string {
    return isMissing(value) ? EMPTY_VALUE : String(value);
}

/** Default category label formatting used by the charts: `String(value)` (`''` for null/undefined). */
export function defaultCategoryFormatter(value: string | number | null | undefined): string {
    return value === null || value === undefined ? '' : String(value);
}
