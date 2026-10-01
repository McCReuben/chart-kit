// Synthetic demo data shared by the stories. All numbers are invented.

export const WEEKS = Array.from({ length: 12 }, (_, i) => `2026 RW${String(i + 1).padStart(2, '0')}`);

export const revenueThisYear = [42.1, 43.8, 41.5, 45.2, 47.9, 46.3, 48.8, 51.2, 50.4, 52.7, 54.1, 55.6];
export const revenueLastYear = [39.4, 40.2, 40.9, 41.3, 42.8, 43.5, 44.1, 45.9, 46.2, 47.0, 48.3, 49.1];
export const revenueForecast = [41.0, 42.5, 43.1, 44.0, 45.6, 46.8, 47.5, 49.0, 50.2, 51.1, 52.4, 53.9];
export const conversionRate = [2.8, 2.9, 2.7, 3.0, 3.2, 3.1, 3.3, 3.4, 3.3, 3.5, 3.6, 3.6];
export const newBuyers = [12.4, 13.1, 11.8, 14.0, 15.2, 14.7, 15.9, 16.4, 16.0, 17.2, 17.8, 18.3];
export const returningBuyers = [28.6, 29.3, 28.9, 30.1, 31.4, 30.8, 31.6, 33.0, 32.7, 33.9, 34.6, 35.1];

export const QUARTERS = ['2025 Q3', '2025 Q4', '2026 Q1', '2026 Q2'];

export const CHANNELS = ['Search', 'Social', 'Email', 'Display', 'Affiliate', 'Direct'];
