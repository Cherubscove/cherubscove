export type AnalyticsRange = '7d' | '30d' | '90d' | 'custom';
export type AnalyticsGranularity = 'day' | 'week' | 'month';

export interface AnalyticsEvent {
  id?: string;
  event_type: 'page_view' | 'download_click' | 'gallery_view' | 'visit';
  page_path?: string;
  resource_id?: string;
  resource_type?: string;
  created_at?: string;
  user_agent?: string;
  session_id?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsPoint {
  date: string;
  page_views: number;
  gallery_views: number;
  downloads: number;
  visits: number;
}

export interface AnalyticsSummary {
  totalPageViews: number;
  totalGalleryViews: number;
  totalDownloads: number;
  totalVisits: number;
  topPages: Array<{ path: string; count: number }>;
  topDownloads: Array<{ id: string; count: number }>;
  topGalleries: Array<{ id: string; count: number }>;
  chartSeries: Array<{ label: string; pageViews: number; galleryViews: number; downloads: number }>;
  growth: {
    pageViewsGrowth: number;
    galleryViewsGrowth: number;
    downloadsGrowth: number;
    visitsGrowth: number;
  };
}

export function getAnalyticsDateRange(range: AnalyticsRange, customStart?: string, customEnd?: string) {
  const end = customEnd ? new Date(customEnd) : new Date();
  const start = customStart ? new Date(customStart) : (() => {
    const date = new Date();
    if (range === '7d') date.setDate(date.getDate() - 7);
    if (range === '30d') date.setDate(date.getDate() - 30);
    if (range === '90d') date.setDate(date.getDate() - 90);
    return date;
  })();

  return { start, end };
}

function formatBucket(date: Date, granularity: AnalyticsGranularity) {
  if (granularity === 'month') {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  if (granularity === 'week') {
    const monday = new Date(date);
    monday.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return monday.toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
}

export function aggregateAnalyticsSeries(events: AnalyticsEvent[], granularity: AnalyticsGranularity): AnalyticsPoint[] {
  const buckets = new Map<string, AnalyticsPoint>();

  events.forEach((event) => {
    const createdAt = event.created_at ? new Date(event.created_at) : new Date();
    const bucket = formatBucket(createdAt, granularity);
    const existing = buckets.get(bucket) ?? {
      date: bucket,
      page_views: 0,
      gallery_views: 0,
      downloads: 0,
      visits: 0,
    };

    if (event.event_type === 'page_view' || event.event_type === 'visit') {
      existing.page_views += 1;
    }
    if (event.event_type === 'gallery_view') {
      existing.gallery_views += 1;
    }
    if (event.event_type === 'download_click') {
      existing.downloads += 1;
    }
    if (event.event_type === 'visit') {
      existing.visits += 1;
    }

    buckets.set(bucket, existing);
  });

  return Array.from(buckets.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function getGrowthComparison(currentEvents: AnalyticsEvent[], previousEvents: AnalyticsEvent[]) {
  const current = summarizeAnalytics(currentEvents);
  const previous = summarizeAnalytics(previousEvents);

  const calculateGrowth = (currentValue: number, previousValue: number) => {
    if (!previousValue) return currentValue > 0 ? 100 : 0;
    return Number((currentValue / previousValue * 100).toFixed(1));
  };

  return {
    pageViewsGrowth: calculateGrowth(current.totalPageViews, previous.totalPageViews),
    galleryViewsGrowth: calculateGrowth(current.totalGalleryViews, previous.totalGalleryViews),
    downloadsGrowth: calculateGrowth(current.totalDownloads, previous.totalDownloads),
    visitsGrowth: calculateGrowth(current.totalVisits, previous.totalVisits),
  };
}

export function summarizeAnalytics(events: AnalyticsEvent[]): AnalyticsSummary {
  const topPages = new Map<string, number>();
  const topDownloads = new Map<string, number>();
  const topGalleries = new Map<string, number>();

  let totalPageViews = 0;
  let totalGalleryViews = 0;
  let totalDownloads = 0;
  let totalVisits = 0;

  events.forEach((event) => {
    if (event.event_type === 'page_view') {
      totalPageViews += 1;
    }
    if (event.event_type === 'visit') {
      totalVisits += 1;
      totalPageViews += 1;
    }
    if (event.event_type === 'gallery_view') {
      totalGalleryViews += 1;
    }
    if (event.event_type === 'download_click') {
      totalDownloads += 1;
    }
    if (event.event_type === 'visit') {
      totalVisits += 1;
    }

    if (event.page_path) {
      topPages.set(event.page_path, (topPages.get(event.page_path) || 0) + 1);
    }

    if (event.resource_id) {
      if (event.event_type === 'download_click') {
        topDownloads.set(event.resource_id, (topDownloads.get(event.resource_id) || 0) + 1);
      }
      if (event.event_type === 'gallery_view') {
        topGalleries.set(event.resource_id, (topGalleries.get(event.resource_id) || 0) + 1);
      }
    }
  });

  const chartSeries = Array.from(
    events.reduce((acc, event) => {
      const bucket = event.created_at ? new Date(event.created_at).toISOString().slice(0, 10) : 'unknown';
      const current = acc.get(bucket) ?? { label: bucket, pageViews: 0, galleryViews: 0, downloads: 0 };
      if (event.event_type === 'page_view') current.pageViews += 1;
      if (event.event_type === 'gallery_view') current.galleryViews += 1;
      if (event.event_type === 'download_click') current.downloads += 1;
      acc.set(bucket, current);
      return acc;
    }, new Map<string, { label: string; pageViews: number; galleryViews: number; downloads: number }>())
      .values()
  ).sort((a, b) => a.label.localeCompare(b.label));

  return {
    totalPageViews,
    totalGalleryViews,
    totalDownloads,
    totalVisits,
    topPages: Array.from(topPages.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([path, count]) => ({ path, count })),
    topDownloads: Array.from(topDownloads.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ id, count })),
    topGalleries: Array.from(topGalleries.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, count]) => ({ id, count })),
    chartSeries,
    growth: {
      pageViewsGrowth: 0,
      galleryViewsGrowth: 0,
      downloadsGrowth: 0,
      visitsGrowth: 0,
    },
  };
}
