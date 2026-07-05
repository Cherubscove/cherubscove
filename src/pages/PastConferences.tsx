import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { supabase } from '@/lib/supabaseClient';
import { normalizeImageUrl } from '@/pages/Admin';
import { Eye, X, ArrowLeft, ArrowRight } from 'lucide-react';
import ShareButton from '@/components/ShareButton';

type GalleryRow = {
  id: string;
  title: string;
  caption?: string;
  category?: string;
  image_url?: string;
  alt_text?: string;
  featured?: boolean;
  created_at?: string;
};

type GalleryCollection = {
  id: string;
  name: string;
  description?: string;
};

type ConfEvent = {
  year: string;
  theme: string;
  desc: string;
};

export default function PastConferencesPage() {
  const ref = useScrollReveal();
  const settings = useSiteSettings();
  const [items, setItems] = useState<GalleryRow[]>([]);
  const [pastEvents, setPastEvents] = useState<ConfEvent[]>([]);
  const [lightbox, setLightbox] = useState<{ images: GalleryRow[]; index: number } | null>(null);

  const galleries: GalleryCollection[] = useMemo(() => {
    const raw = getSetting(settings, 'galleries_json', '[]');
    try { return JSON.parse(raw); } catch { return []; }
  }, [settings]);

  const loadGallery = async () => {
    const { data } = await supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data as GalleryRow[]);
  };

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('status', 'past')
      .order('date', { ascending: false });
    if (data?.length) {
      setPastEvents(data.map((e: any) => ({
        year: e.date ? e.date.slice(0, 4) : 'TBA',
        theme: e.theme || e.title || 'Conference',
        desc: e.description || '',
      })));
    } else {
      setPastEvents([
        { year: '2023', theme: 'Arrows', desc: 'The inaugural edition — a prophetic call to the next generation.' },
        { year: '2024', theme: 'Awakening', desc: 'Northern Edition (February 2024) — expanding the reach across the nation.' },
        { year: '2024', theme: 'Forge', desc: 'A furnace of refining — shaping vessels for honour.' },
        { year: '2025', theme: 'Immersion', desc: 'Diving deep into the presence and purpose of God.' },
      ]);
    }
  };

  const openLightbox = useCallback((images: GalleryRow[], index: number) => {
    setLightbox({ images, index });
  }, []);

  const closeLightbox = useCallback(() => {
    setLightbox(null);
  }, []);

  const goNext = useCallback(() => {
    setLightbox(prev => {
      if (!prev) return null;
      return { ...prev, index: (prev.index + 1) % prev.images.length };
    });
  }, []);

  const goPrev = useCallback(() => {
    setLightbox(prev => {
      if (!prev) return null;
      return { ...prev, index: (prev.index - 1 + prev.images.length) % prev.images.length };
    });
  }, []);

  // Keyboard events for lightbox
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') goNext();
      if (e.key === 'ArrowLeft') goPrev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightbox, closeLightbox, goNext, goPrev]);

  useEffect(() => {
    loadGallery();
    loadEvents();
    const ch1 = supabase
      .channel('gallery-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => loadGallery())
      .subscribe();
    const ch2 = supabase
      .channel('events-realtime-pc')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadEvents())
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, []);

  // Build collections
  const collections = useMemo(() => {
    const result: { id: string; name: string; description?: string; images: GalleryRow[] }[] = [];

    if (galleries.length > 0) {
      const usedCats = new Set<string>();
      galleries.forEach(gc => {
        const images = items.filter(g => {
          const category = (g.category || '').trim();
          return category === gc.id || category === gc.name;
        });
        if (images.length > 0) {
          images.forEach(g => usedCats.add(g.id!));
          result.push({ id: gc.id, name: gc.name, description: gc.description, images });
        }
      });

      const uncategorized = items.filter(g => {
        const cat = (g.category || '').trim();
        return !cat || !galleries.some(gc => gc.id === cat || gc.name === cat);
      });
      if (uncategorized.length > 0) {
        result.push({ id: 'uncategorized', name: 'Gallery', description: 'Additional photos', images: uncategorized });
      }
    } else {
      const map = new Map<string, GalleryRow[]>();
      items.forEach(g => {
        const key = (g.category || '').trim() || 'Gallery';
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(g);
      });
      map.forEach((images, name) => {
        result.push({ id: name, name, images });
      });
    }

    return result;
  }, [items, galleries]);

  return (
    <>
      <Navbar />
      <div className="pt-[70px] min-h-screen bg-background" ref={ref}>
        {/* Hero Banner */}
        <div
          className="py-20 px-8 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}
        >
          <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 30% 50%, #E8620A, transparent 60%), radial-gradient(circle at 70% 50%, #E8620A, transparent 60%)' }} />
          <div className="max-w-[700px] mx-auto relative z-[1]">
            <div className="eyebrow justify-center text-primary/80 reveal">{getSetting(settings, 'pastconferences_eyebrow', 'Cherubs Cove Ministry')}</div>
            <h1 className="font-heading text-[clamp(32px,5vw,56px)] font-normal leading-tight mt-4 text-white reveal" dangerouslySetInnerHTML={{ __html: getSetting(settings, 'pastconferences_heading_html', 'Past Conferences <em class="italic text-primary">Archive</em>') }} />
            <p className="text-[14px] font-light leading-[1.8] mt-4 text-white/55 reveal">
              {getSetting(settings, 'pastconferences_description', 'Moments from past editions of the International Quivers Conference — a visual journey through years of encounter, worship, and transformation.')}
            </p>
          </div>
        </div>

        <div className="container py-16">
          {/* Past Events */}
          {pastEvents.length > 0 && (
            <div className="mb-20">
              <div className="flex items-center gap-3 mb-8">
                <div className="h-px flex-1 bg-border" />
                <h2 className="font-heading text-[28px] font-normal italic text-foreground whitespace-nowrap" dangerouslySetInnerHTML={{ __html: getSetting(settings, 'pastconferences_section_heading_html', 'Past <em class="text-primary">Events</em>') }} />
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pastEvents.map((ed, i) => (
                  <div key={i} className="group p-6 rounded-lg border border-border bg-card card-lift relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary scale-y-0 group-hover:scale-y-100 transition-transform duration-300 origin-top" />
                    <div className="font-heading text-[36px] text-primary leading-none mb-2">{ed.year}</div>
                    <div className="font-heading text-lg italic text-foreground mb-2">"{ed.theme}"</div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ed.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Gallery Collections */}
          {collections.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-20">📸</div>
              <p className="text-muted-foreground">Galleries will appear here once images are added in the admin dashboard.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {collections.map(col => (
                <Link
                  key={col.id}
                  to={`/past-conferences/${encodeURIComponent(col.id)}`}
                  className="group relative rounded-xl overflow-hidden min-h-[320px] sm:min-h-[360px] block no-underline card-lift"
                >
                  {/* Cover image */}
                  {col.images[0]?.image_url ? (
                    <img
                      src={normalizeImageUrl(col.images[0].image_url)}
                      alt={col.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--bg-subtle))] to-[hsl(var(--border))]" />
                  )}

                  {/* Dark overlay — always visible for readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 transition-colors duration-300 group-hover:from-black/95" />

                  {/* Image count badge */}
                  <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-white text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 z-[3]">
                    <Eye size={12} />
                    {col.images.length}
                  </div>

                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6 z-[2]">
                    <h3 className="font-heading text-[22px] md:text-[26px] italic text-white mb-1 transition-colors group-hover:text-primary">
                      {col.name}
                    </h3>
                    {col.description && (
                      <p className="text-[12px] text-white/55 leading-relaxed line-clamp-2 mb-3">
                        {col.description}
                      </p>
                    )}
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[2px] uppercase text-primary/80 group-hover:text-primary transition-colors">
                      View Gallery <ArrowRight size={12} />
                    </div>
                  </div>

                  {/* Hover accent line */}
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500 z-[3]" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={20} className="text-white" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/60 text-[11px] font-bold tracking-[2px] uppercase">
            {lightbox.index + 1} / {lightbox.images.length}
          </div>

          {/* Previous */}
          {lightbox.images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
          )}

          {/* Image */}
          {lightbox.images[lightbox.index]?.image_url && (
            <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
              <img
                src={normalizeImageUrl(lightbox.images[lightbox.index].image_url!)}
                alt={lightbox.images[lightbox.index].alt_text || lightbox.images[lightbox.index].title || 'Gallery photo'}
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
            </div>
          )}

          {/* Image info */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
            {lightbox.images[lightbox.index]?.title && (
              <p className="text-white/80 text-sm font-heading italic">
                {lightbox.images[lightbox.index].title}
              </p>
            )}
            {lightbox.images[lightbox.index]?.caption && (
              <p className="text-white/50 text-xs mt-1">
                {lightbox.images[lightbox.index].caption}
              </p>
            )}
          </div>

          {/* Share button in lightbox */}
          <div className="absolute bottom-4 right-4">
            <ShareButton
              title={lightbox.images[lightbox.index]?.title || 'Gallery Photo'}
              text={`Check out "${lightbox.images[lightbox.index]?.title || 'Gallery Photo'}" from Cherubs Cove Ministry`}
              url={lightbox.images[lightbox.index]?.image_url || undefined}
              variant="icon"
              className="[&_button]:!text-white/60 [&_button:hover]:!text-white"
            />
          </div>

          {/* Next */}
          {lightbox.images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            >
              <ArrowRight size={20} className="text-white" />
            </button>
          )}
        </div>
      )}

      <Footer />
      <ScrollToTop />
    </>
  );
}

