import { useCallback, useId, useMemo, useRef } from 'react';

/**
 * Serialises JSON-compatible data for content comparison. Functions and `undefined` are dropped, `NaN`/`Infinity`
 * become `null` (as in `JSON.stringify`).
 */
export function contentKey(value: unknown): string {
    if (value === undefined) return 'undefined';
    try {
        return JSON.stringify(value) ?? 'undefined';
    } catch {
        // Cyclic or otherwise unserialisable: fall back to identity (never equal to another render's value).
        return `__unserialisable__${Math.random()}`;
    }
}

/**
 * Returns the previous reference while `value` is deep-equal by content (JSON-serialisable data such as `series`,
 * `categories` or theme overrides). A caller that rebuilds equal arrays inline on every render therefore gets a
 * stable reference, so memoised rows are not rebuilt and Recharts does not re-animate.
 * Modelled on the original LineChart's `contentKey`. Functions inside `value` are ignored by the comparison.
 */
export function useContentStable<T>(value: T): T {
    const ref = useRef<{ key: string; value: T } | null>(null);
    const key = contentKey(value);
    if (ref.current === null || ref.current.key !== key) {
        ref.current = { key, value };
    }
    return ref.current.value;
}

/**
 * Returns a ref whose `.current` is always the latest `value` (assigned during render). Read it from callbacks
 * (tick formatters, tooltip content, event handlers) so a new function identity never rebuilds anything.
 */
export function useLatestRef<T>(value: T): { readonly current: T } {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}

/**
 * Returns a function with a permanently stable identity that always calls the latest `fn`. Useful for passing
 * inline formatters to Recharts props (`tickFormatter`) without invalidating memoised elements.
 * Note: because the identity never changes, a change that only swaps the formatter does not by itself re-render
 * memoised Recharts parts; the new formatter is used on their next render.
 */
export function useStableCallback<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R {
    const ref = useLatestRef(fn);
    return useCallback((...args: A) => ref.current(...args), [ref]);
}

/**
 * Returns an id that is unique per component instance and safe inside `url(#id)` references
 * (React's `useId` output contains characters such as `:` or `«`, which are stripped). Prefixed `ck-<prefix>-`.
 */
export function useUniqueId(prefix = 'id'): string {
    const raw = useId();
    return useMemo(() => `ck-${prefix}-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`, [prefix, raw]);
}
