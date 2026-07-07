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
  referrer?: string;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsPoint {
  date: string;
  page_views: number;
  gallery_views: number;
  downloads: number;
  visits: number;
}

export interface DeviceBreakdown {
  mobile: number;
  desktop: number;
  tablet: number;
  unknown: number;
}

export interface ExitPage {
  path: string;
  count: number;
}

export interface UserActivity {
  session_id: string;
  pages: string[];
  start_time: string;
  last_time: string;
  event_count: number;
  device_type: string;
}

export interface AnalyticsSummary {
  totalPageViews: number;
  totalGalleryViews: number;
  totalDownloads: number;
  totalVisits: number;
  uniqueVisitors: number;
  deviceBreakdown: DeviceBreakdown;
  exitPages: ExitPage[];
  userActivities: UserActivity[];
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

/**
 * Detect device type from a User-Agent string.
 */
export function detectDevice(userAgent?: string): 'mobile' | 'desktop' | 'tablet' | 'unknown' {
  if (!userAgent) return 'unknown';
  const ua = userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk|android(?!.*mobile)/i.test(ua)) return 'tablet';
  if (/mobile|iphone|ipod|blackberry|opera mini|iemobile|wpdesktop/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Get or create a persistent session ID stored in localStorage.
 */
export function getSessionId(): string {
  try {
    let sid = localStorage.getItem('cc_session_id');
    if (!sid) {
      sid = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem('cc_session_id', sid);
    }
    return sid;
  } catch {
    // Fallback if localStorage is unavailable
    return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

/**
 * Build the metadata payload for any analytics event.
 * Captures user_agent, session_id, and referrer automatically.
 */
export function buildAnalyticsPayload(overrides: Partial<AnalyticsEvent> = {}): Partial<AnalyticsEvent> {
  return {
    user_agent: navigator.userAgent,
    session_id: getSessionId(),
    referrer: document.referrer || undefined,
    metadata: overrides.metadata || {},
    ...overrides,
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
  const sessions = new Map<string, UserActivity>();
  const exitCounter = new Map<string, number>();

  let totalPageViews = 0;
  let totalGalleryViews = 0;
  let totalDownloads = 0;
  let totalVisits = 0;

  // Track the previous page path for each session to determine exit points
  const lastPagePerSession = new Map<string, string>();

  // Sort events by created_at for sequential analysis
  const sorted = [...events].sort((a, b) =>
    (a.created_at || '').localeCompare(b.created_at || '')
  );

  sorted.forEach((event) => {
    // Count totals
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

    // Track pages
    if (event.page_path) {
      topPages.set(event.page_path, (topPages.get(event.page_path) || 0) + 1);
    }

    // Track resources
    if (event.resource_id) {
      if (event.event_type === 'download_click') {
        topDownloads.set(event.resource_id, (topDownloads.get(event.resource_id) || 0) + 1);
      }
      if (event.event_type === 'gallery_view') {
        topGalleries.set(event.resource_id, (topGalleries.get(event.resource_id) || 0) + 1);
      }
    }

    // Track sessions / unique visitors
    const sid = event.session_id;
    if (sid) {
      const existing = sessions.get(sid) || {
        session_id: sid,
        pages: [],
        start_time: event.created_at || '',
        last_time: event.created_at || '',
        event_count: 0,
        device_type: detectDevice(event.user_agent),
      };
      existing.event_count += 1;
      if (event.created_at) {
        if (!existing.start_time || event.created_at < existing.start_time) existing.start_time = event.created_at;
        if (event.created_at > existing.last_time) existing.last_time = event.created_at;
      }
      if (event.page_path && !existing.pages.includes(event.page_path)) {
        existing.pages.push(event.page_path);
      }
      sessions.set(sid, existing);
    }

    // Track exit points: the previous page becomes an exit when a new page is visited
    if (sid && event.page_path) {
      const prevPage = lastPagePerSession.get(sid);
      if (prevPage && prevPage !== event.page_path) {
        // User navigated FROM prevPage TO current page — prevPage is an exit
        exitCounter.set(prevPage, (exitCounter.get(prevPage) || 0) + 1);
      }
      lastPagePerSession.set(sid, event.page_path);
    }
  });

  const uniqueVisitors = sessions.size;
  const userActivities = Array.from(sessions.values())
    .sort((a, b) => b.last_time.localeCompare(a.last_time));

  // Device breakdown
  const deviceBreakdown: DeviceBreakdown = { mobile: 0, desktop: 0, tablet: 0, unknown: 0 };
  sessions.forEach((s) => {
    if (s.device_type in deviceBreakdown) {
      deviceBreakdown[s.device_type as keyof DeviceBreakdown] += 1;
    } else {
      deviceBreakdown.unknown += 1;
    }
  });

  // Exit pages sorted by count
  const exitPages: ExitPage[] = Array.from(exitCounter.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([path, count]) => ({ path, count }));

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
    uniqueVisitors,
    deviceBreakdown,
    exitPages,
    userActivities,
    topPages: Array.from(topPages.entries()).sort((a, b) => b[1] - a[1]).map(([path, count]) => ({ path, count })),
    topDownloads: Array.from(topDownloads.entries()).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count })),
    topGalleries: Array.from(topGalleries.entries()).sort((a, b) => b[1] - a[1]).map(([id, count]) => ({ id, count })),
    chartSeries,
    growth: {
      pageViewsGrowth: 0,
      galleryViewsGrowth: 0,
      downloadsGrowth: 0,
      visitsGrowth: 0,
    },
  };
}
