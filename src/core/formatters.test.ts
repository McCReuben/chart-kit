import { describe, expect, it } from 'vitest';

import {
    EMPTY_VALUE,
    currencyFormatter,
    defaultCategoryFormatter,
    defaultValueFormatter,
    formatCurrency,
    formatNumber,
    formatPercent,
    formatRetailWeek,
    numberFormatter,
    percentFormatter,
    retailWeekFormatter,
} from './formatters';

describe('formatRetailWeek', () => {
    it('formats quarters', () => {
        expect(formatRetailWeek('2026 RQ2')).toBe('2026 Q2');
        expect(formatRetailWeek('2026Q02')).toBe('2026 Q2');
        expect(formatRetailWeek('2025 q4')).toBe('2025 Q4');
    });
    it('keeps an embedded year and pads the week', () => {
        expect(formatRetailWeek('2026 RW01')).toBe('2026 RW01');
        expect(formatRetailWeek('2025 W5')).toBe('2025 RW05');
        expect(formatRetailWeek('2025W12', 2030)).toBe('2025 RW12');
    });
    it('uses the fallback year for bare weeks', () => {
        expect(formatRetailWeek('W5', 2026)).toBe('2026 RW05');
        expect(formatRetailWeek('rw 7', '2026')).toBe('2026 RW07');
        expect(formatRetailWeek(5, 2026)).toBe('2026 RW05');
        expect(formatRetailWeek('05', 2026)).toBe('2026 RW05');
    });
    it('omits the year when none is known', () => {
        expect(formatRetailWeek('W5')).toBe('RW05');
        expect(formatRetailWeek('W5', null)).toBe('RW05');
        expect(formatRetailWeek('5')).toBe('5');
    });
    it('returns other labels unchanged (trimmed)', () => {
        expect(formatRetailWeek('  Jan ')).toBe('Jan');
        expect(formatRetailWeek(null)).toBe('');
        expect(formatRetailWeek('123', 2026)).toBe('123');
    });
    it('retailWeekFormatter binds the year', () => {
        const f = retailWeekFormatter(2026);
        expect(f('W3')).toBe('2026 RW03');
        expect(f('Feb')).toBe('Feb');
    });
});

describe('number formatters', () => {
    it('returns the placeholder for missing values', () => {
        for (const v of [null, undefined, NaN, Infinity]) {
            expect(formatNumber(v as number)).toBe(EMPTY_VALUE);
            expect(formatCurrency(v as number)).toBe(EMPTY_VALUE);
            expect(formatPercent(v as number)).toBe(EMPTY_VALUE);
            expect(defaultValueFormatter(v as number)).toBe(EMPTY_VALUE);
        }
        expect(EMPTY_VALUE).toBe('—');
    });
    it('formatNumber', () => {
        expect(formatNumber(1234.567)).toBe('1,234.57');
        expect(formatNumber(1234.5, { decimals: 0 })).toBe('1,235');
        expect(formatNumber(1234567, { compact: true })).toBe('1.2M');
        expect(formatNumber(2.5, { signDisplay: 'exceptZero', suffix: ' pts' })).toBe('+2.5 pts');
        expect(formatNumber(0)).toBe('0');
    });
    it('formatCurrency', () => {
        expect(formatCurrency(1234.5)).toBe('$1,234.50');
        expect(formatCurrency(1_200_000, { compact: true })).toBe('$1.2M');
        expect(formatCurrency(42, { decimals: 0 })).toBe('$42');
        expect(formatCurrency(10, { currency: 'EUR' })).toBe('€10.00');
        expect(formatCurrency(-5)).toBe('-$5.00');
    });
    it('formatPercent', () => {
        expect(formatPercent(12.34)).toBe('12.3%');
        expect(formatPercent(0.1234, { fromRatio: true })).toBe('12.3%');
        expect(formatPercent(3, { decimals: 2 })).toBe('3.00%');
    });
    it('factories', () => {
        expect(numberFormatter({ decimals: 1 })(3)).toBe('3.0');
        expect(currencyFormatter({ compact: true })(4_500)).toBe('$4.5K');
        expect(percentFormatter()(null)).toBe('—');
    });
    it('defaults', () => {
        expect(defaultValueFormatter(3.5)).toBe('3.5');
        expect(defaultCategoryFormatter(7)).toBe('7');
        expect(defaultCategoryFormatter(null)).toBe('');
    });
});
