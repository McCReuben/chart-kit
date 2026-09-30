/**
 * Format a retail-week or retail-quarter category while preserving the year
 * supplied by the section response. Non-week labels are returned unchanged.
 */
export function formatRetailWeek(value, year = null) {
    const text = String(value ?? '').trim();
    const quarter = text.match(/^(\d{4})\s*R?Q\s*0*([1-4])$/i);
    if (quarter) {
        return `${quarter[1]} Q${quarter[2]}`;
    }

    const match = text.match(/^(?:(\d{4})\s*)?(?:RW|W)\s*0*(\d{1,2})$/i);

    if (match) {
        const week = String(Number(match[2])).padStart(2, '0');
        const resolvedYear = match[1] ?? (Number.isFinite(Number(year)) ? String(Number(year)) : null);
        return resolvedYear ? `${resolvedYear} RW${week}` : `RW${week}`;
    }

    if (/^\d{1,2}$/.test(text) && Number.isFinite(Number(year))) {
        return `${Number(year)} RW${String(Number(text)).padStart(2, '0')}`;
    }

    return text;
}
