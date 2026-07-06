import { describe, expect, it } from 'vitest';
import { aggregateAnalyticsSeries, getAnalyticsDateRange, getGrowthComparison, type AnalyticsEvent } from './analytics';

describe('analytics helpers', () => {
  it('builds a 7-day range with the right start and end bounds', () => {
    const { start, end } = getAnalyticsDateRange('7d');
    expect(start.getTime()).toBeLessThan(end.getTime());
    expect(Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))).toBe(7);
  });

  it('aggregates page views and downloads by day', () => {
    const events: AnalyticsEvent[] = [
      { event_type: 'page_view', created_at: '2026-07-01T10:00:00.000Z' },
      { event_type: 'download_click', created_at: '2026-07-01T11:00:00.000Z' },
      { event_type: 'page_view', created_at: '2026-07-02T12:00:00.000Z' },
    ];

    const result = aggregateAnalyticsSeries(events, 'day');
    expect(result[0].page_views).toBe(1);
    expect(result[0].downloads).toBe(1);
    expect(result[1].page_views).toBe(1);
    expect(result[1].downloads).toBe(0);
  });

  it('calculates percentage growth between periods', () => {
    const current: AnalyticsEvent[] = [
      { event_type: 'page_view', created_at: '2026-07-10T10:00:00.000Z' },
      { event_type: 'download_click', created_at: '2026-07-10T11:00:00.000Z' },
      { event_type: 'gallery_view', created_at: '2026-07-10T12:00:00.000Z' },
    ];
    const previous: AnalyticsEvent[] = [
      { event_type: 'page_view', created_at: '2026-07-01T10:00:00.000Z' },
    ];

    const result = getGrowthComparison(current, previous);
    expect(result.pageViewsGrowth).toBe(100);
    expect(result.downloadsGrowth).toBe(100);
    expect(result.galleryViewsGrowth).toBe(100);
  });
});
