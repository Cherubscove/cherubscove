import { useEffect, useState, useMemo } from 'react';
import {
  Headphones, Video, FileText, ArrowRight, Download,
  Search, X, ArrowUpDown, ChevronLeft, ChevronRight,
} from 'lucide-react';
import ShareButton from '@/components/ShareButton';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';
import SEO from '@/components/SEO';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const trackDownloadClick = async (resourceId: string, title: string) => {
  try {
    const { buildAnalyticsPayload } = await import('@/lib/analytics');
    await supabase.from('analytics_events').insert(
      buildAnalyticsPayload({
        event_type: 'download_click',
        page_path: '/resources',
        resource_id: resourceId,
        resource_type: 'download',
        metadata: { title },
      })
    );
  } catch {
    // Ignore analytics failures so the download experience stays intact.
  }
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Visitors cannot read analytics_events, so the public "most downloaded" sort
// reads a counter on the row itself, bumped through a definer function.
const bumpDownloadCount = async (resourceId: string) => {
  if (!UUID_RE.test(resourceId)) return;
  try {
    await supabase.rpc('increment_download_count', { download_id: resourceId });
  } catch {
    // A missed count must never block the download.
  }
};

type ResType = 'audio' | 'video' | 'pdf';

interface Resource {
  id: string;
  type: ResType;
  title: string;
  speaker: string;
  category: string;
  action: string;
  href: string;
  createdAt: number;
  downloadCount: number;
}

const fallbackResources: Resource[] = [
  { id: 'fallback-1', type: 'audio', title: 'Walking in Your Kingdom Identity', speaker: "Jesse Falodun — Quiver's Immersion 2025", category: 'Sermon', action: 'Download', href: '#', createdAt: 0, downloadCount: 0 },
  { id: 'fallback-2', type: 'video', title: 'Arise: Walking Into Your Appointed Season', speaker: "Jesse Falodun — Quiver's Forge 2024", category: 'Teaching', action: 'Watch / Download', href: '#', createdAt: 0, downloadCount: 0 },
  { id: 'fallback-3', type: 'audio', title: 'The Sound That Changes Atmospheres', speaker: "Guest Minister — Quiver's Arrows 2023", category: 'Sermon', action: 'Download', href: '#', createdAt: 0, downloadCount: 0 },
  { id: 'fallback-4', type: 'audio', title: 'Positioned for Overflow', speaker: 'Guest Minister — Awakening 2024', category: 'Sermon', action: 'Download', href: '#', createdAt: 0, downloadCount: 0 },
  { id: 'fallback-5', type: 'pdf', title: 'Forge Conference Notes 2024', speaker: "Quiver's Conference Programme Manual", category: 'Manual', action: 'Download PDF', href: '#', createdAt: 0, downloadCount: 0 },
  { id: 'fallback-6', type: 'video', title: 'He Who Calls Is Faithful', speaker: 'Jesse Falodun — Weekly Teaching', category: 'Teaching', action: 'Watch / Download', href: '#', createdAt: 0, downloadCount: 0 },
];

const iconMap = {
  audio: { icon: Headphones, color: 'text-primary' },
  video: { icon: Video, color: 'text-gold' },
  pdf: { icon: FileText, color: 'text-muted-foreground' },
};

const tagLabelMap = { audio: 'Audio Sermon', video: 'Video Message', pdf: 'Study Document' };

type SortKey =
  | 'newest'
  | 'oldest'
  | 'most-downloaded'
  | 'least-downloaded'
  | 'title-asc'
  | 'title-desc'
  | 'type';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'most-downloaded', label: 'Most downloaded' },
  { value: 'least-downloaded', label: 'Least downloaded' },
  { value: 'title-asc', label: 'Title A–Z' },
  { value: 'title-desc', label: 'Title Z–A' },
  { value: 'type', label: 'Type' },
];

const PAGE_SIZE_OPTIONS = [6, 12, 24, 48];

export default function ResourcesPage() {
  const s = useSiteSettings();
  const [filter, setFilter] = useState<'all' | ResType>('all');
  const [resources, setResources] = useState<Resource[]>(fallbackResources);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const ref = useScrollReveal();

  const loadDownloads = async () => {
    const { data, error } = await supabase
      .from('downloads')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data?.length) {
      setResources(
        data.map((item: any) => ({
          id: String(item.id ?? item.title ?? ''),
          type: (item.type as ResType) || 'pdf',
          title: item.title || 'Resource',
          speaker: item.description || item.category || '',
          category: item.category || '',
          action:
            item.type === 'video'
              ? 'Watch / Download'
              : item.type === 'pdf'
              ? 'Download PDF'
              : 'Download',
          href: item.url || '#',
          createdAt: item.created_at ? new Date(item.created_at).getTime() : 0,
          downloadCount: Number(item.download_count) || 0,
        }))
      );
    }
  };

  useEffect(() => {
    loadDownloads();

    const channel = supabase
      .channel('downloads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'downloads' }, () => {
        loadDownloads();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Reset to page 1 when filters change
  useEffect(() => { setCurrentPage(1); }, [filter, searchQuery, categoryFilter, sortBy, pageSize]);

  // ── Derived data ──────────────────────────────────────────────
  const categories = useMemo(() => {
    const cats = new Set(resources.map((r) => r.category).filter(Boolean));
    return ['all', ...Array.from(cats).sort()];
  }, [resources]);

  const filtered = useMemo(() => {
    let result = resources;

    // Type filter
    if (filter !== 'all') result = result.filter((r) => r.type === filter);

    // Category filter
    if (categoryFilter !== 'all') result = result.filter((r) => r.category === categoryFilter);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.speaker.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case 'newest': return b.createdAt - a.createdAt || a.title.localeCompare(b.title);
        case 'oldest': return a.createdAt - b.createdAt || a.title.localeCompare(b.title);
        case 'most-downloaded':
          return b.downloadCount - a.downloadCount || a.title.localeCompare(b.title);
        case 'least-downloaded':
          return a.downloadCount - b.downloadCount || a.title.localeCompare(b.title);
        case 'title-asc': return a.title.localeCompare(b.title);
        case 'title-desc': return b.title.localeCompare(a.title);
        case 'type': return a.type.localeCompare(b.type) || a.title.localeCompare(b.title);
        default: return 0;
      }
    });

    return result;
  }, [resources, filter, categoryFilter, searchQuery, sortBy]);

  // ── Pagination ────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const startItem = filtered.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, filtered.length);

  return (
    <>
      <SEO
        title={getSetting(s, 'seo_resources_title', 'Sermons & Downloads — Cherubs Cove Ministry')}
        description={getSetting(s, 'seo_resources_description', 'Download sermon audio, video teachings, and study documents from Cherubs Cove Ministry and the International Quivers Conference.')}
        image={getSetting(s, 'seo_resources_image', '') || undefined}
        path="/resources"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          name: 'Sermons & Downloads — Cherubs Cove Ministry',
          description: 'Download sermon audio, video teachings, and study documents from Cherubs Cove Ministry and the International Quivers Conference.',
          url: 'https://cherubscove.net/resources',
          isPartOf: { '@type': 'WebSite', name: 'Cherubs Cove Ministry — The Making Place', url: 'https://cherubscove.net' },
        }}
      />
      <Navbar />
      <main className="pt-[70px] min-h-screen bg-background" ref={ref}>
        <div className="page-header">
          <div className="container">
            <div className="eyebrow reveal">{getSetting(s, 'resources_eyebrow', 'Ministry Resources')}</div>
            <h1 className="section-title reveal" style={{ fontSize: 'clamp(26px,3.5vw,40px)', margin: '0.5rem 0 0' }} dangerouslySetInnerHTML={{ __html: getSetting(s, 'resources_heading_html', 'Sermons & <em>Downloads</em>') }} />
          </div>
        </div>

        <div className="container py-16">
          {/* ── Search & Controls Bar ─────────────────────────────── */}
          <div className="flex flex-col md:flex-row gap-4 mb-8 reveal">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by title, speaker, or category…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 h-11 rounded-xl border-border bg-card text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown size={14} className="text-muted-foreground shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-11 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                aria-label="Resources per page"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>{size} per page</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Filter Chips ──────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2 mb-2 reveal">
            {(['all', 'audio', 'video', 'pdf'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full border-[1.5px] text-[10px] font-bold tracking-[2px] uppercase transition-all duration-250 ${
                  filter === f
                    ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'border-border text-muted-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground'
                }`}
              >
                {f === 'all' ? 'All' : f === 'pdf' ? 'Documents' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}

            {/* Divider */}
            <span className="hidden sm:block w-px h-6 bg-border mx-2" />

            {/* Category filter */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-[2px] uppercase text-muted-foreground">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-9 rounded-lg border border-input bg-card px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === 'all' ? 'All' : cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ── Results summary ───────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6 reveal">
            <p className="text-xs text-muted-foreground">
              {filtered.length === 0
                ? 'No resources found'
                : `Showing ${startItem}–${endItem} of ${filtered.length} resource${filtered.length === 1 ? '' : 's'}`}
            </p>
            {filtered.length > 0 && searchQuery && (
              <p className="text-xs text-muted-foreground">
                Search: &ldquo;{searchQuery}&rdquo;
              </p>
            )}
          </div>

          {/* ── Grid ──────────────────────────────────────────────── */}
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 reveal">
              <Search size={40} className="text-muted-foreground/40 mb-4" />
              <p className="text-lg font-heading text-muted-foreground">No matching resources</p>
              <p className="text-sm text-muted-foreground/60 mt-1">Try adjusting your search or filters</p>
              {(searchQuery || categoryFilter !== 'all' || filter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-6 rounded-full"
                  onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setFilter('all'); }}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 reveal">
              {paginated.map((res) => {
                const { icon: Icon, color } = iconMap[res.type];
                return (
                  <div key={res.id} className="bg-card border border-border rounded-lg p-6 flex flex-col gap-3 card-lift group">
                    <div className="flex items-center justify-between">
                      <div className={`w-10 h-10 rounded-lg bg-orange-soft flex items-center justify-center ${color}`}>
                        <Icon size={18} />
                      </div>
                      <Download size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <span className={`text-[9.5px] font-bold tracking-[2.5px] uppercase ${color}`}>
                      {tagLabelMap[res.type]}
                    </span>
                    <div className="font-heading text-lg font-medium leading-snug text-foreground">{res.title}</div>
                    <div className="text-xs text-gold">{res.speaker}</div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      {res.createdAt > 0 && (
                        <span>
                          {new Date(res.createdAt).toLocaleDateString(undefined, {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Download size={11} />
                        {res.downloadCount} download{res.downloadCount === 1 ? '' : 's'}
                      </span>
                    </div>
                    <a
                      href={res.href}
                      target="_blank"
                      rel="noreferrer"
                      onClick={() => {
                        trackDownloadClick(res.id, res.title);
                        bumpDownloadCount(res.id);
                        setResources((prev) =>
                          prev.map((r) =>
                            r.id === res.id ? { ...r, downloadCount: r.downloadCount + 1 } : r,
                          ),
                        );
                      }}
                      className="mt-auto pt-4 border-t border-border text-[10.5px] font-bold tracking-[2px] uppercase text-primary inline-flex items-center gap-1.5 hover:gap-3 transition-all duration-200"
                    >
                      {res.action} <ArrowRight size={12} />
                    </a>
                    <div className="mt-2 flex items-center justify-between">
                      <span />
                      <ShareButton
                        title={`${res.title} — Cherubs Cove Ministry`}
                        text={`Check out "${res.title}" (${tagLabelMap[res.type]}) from Cherubs Cove Ministry`}
                        variant="icon"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Pagination ────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12 reveal">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((page) => {
                  // Show first, last, and pages around current with gaps
                  if (page === 1 || page === totalPages) return true;
                  if (Math.abs(page - safePage) <= 1) return true;
                  return false;
                })
                .map((page, idx, arr) => {
                  const showEllipsis = idx > 0 && page - arr[idx - 1] > 1;
                  return (
                    <span key={page} className="flex items-center gap-1">
                      {showEllipsis && <span className="px-1 text-muted-foreground">…</span>}
                      <button
                        onClick={() => setCurrentPage(page)}
                        className={`flex items-center justify-center min-w-[2.5rem] h-10 rounded-xl border text-sm font-medium transition-all duration-200 ${
                          page === safePage
                            ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary'
                        }`}
                      >
                        {page}
                      </button>
                    </span>
                  );
                })}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="flex items-center justify-center w-10 h-10 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary disabled:opacity-30 disabled:pointer-events-none transition-all duration-200"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <ScrollToTop />
    </>
  );
}
