/**
 * Identity cache for the prop factories (`categoryAxisProps`, `valueAxisProps`, `gridProps`, `tooltipProps`).
 *
 * Recharts re-measures and re-registers an axis whenever its props change identity. With `width="auto"` axes (and a
 * `PlotAreaProbe` that feeds the plot size back into state) fresh `tick`/`tickFormatter`/`label` objects on every
 * render can loop forever. The factories therefore return the **same object** for equal inputs: data options are
 * compared by content, functions by identity, and the theme by identity.
 */

const functionIds = new WeakMap<object, number>();
let nextFunctionId = 1;
/** Marker prefix for identity-keyed values (a NUL character, so it never equals a real category string). */
const ID_MARK = `${String.fromCharCode(0)}id#`;

function functionId(fn: object): number {
    let id = functionIds.get(fn);
    if (id === undefined) {
        id = nextFunctionId++;
        functionIds.set(fn, id);
    }
    return id;
}

/**
 * Cache key for factory options: JSON content, with functions and React elements replaced by a per-identity id
 * (so two different formatters never share an entry, and the same formatter always does).
 */
export function optionsKey(value: unknown): string {
    try {
        return (
            JSON.stringify(value, (_k, v: unknown) => {
                if (typeof v === 'function') return `${ID_MARK}${functionId(v)}`;
                if (v && typeof v === 'object' && '$$typeof' in v) return `${ID_MARK}${functionId(v)}`;
                if (typeof v === 'number' && !Number.isFinite(v)) return `n:${String(v)}`;
                return v;
            }) ?? 'undefined'
        );
    } catch {
        // Unserialisable (cyclic): never equal to another call's key.
        return `unserialisable#${nextFunctionId++}`;
    }
}

/** Maximum cached results per theme object (least recently used are dropped first). */
export const PROP_CACHE_LIMIT = 256;

const caches = new WeakMap<object, Map<string, unknown>>();

/**
 * Returns the cached result for `(theme, key)`, creating it with `create` on a miss. Entries are held per theme
 * object (released with it) in a small LRU of {@link PROP_CACHE_LIMIT} entries. Results are shared between callers,
 * so treat them as read-only (spread them; never mutate).
 */
export function cachedProps<T>(theme: object, key: string, create: () => T): T {
    let cache = caches.get(theme);
    if (!cache) {
        cache = new Map();
        caches.set(theme, cache);
    }
    if (cache.has(key)) {
        const hit = cache.get(key) as T;
        // Refresh the LRU position.
        cache.delete(key);
        cache.set(key, hit);
        return hit;
    }
    const value = create();
    cache.set(key, value);
    if (cache.size > PROP_CACHE_LIMIT) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
    }
    return value;
}
