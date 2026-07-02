import { useEffect, useMemo, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { supabase } from '@/lib/supabaseClient';
import { normalizeImageUrl } from '@/pages/Admin';

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
      // Fallback history
      setPastEvents([
        { year: '2023', theme: 'Arrows', desc: 'The inaugural edition — a prophetic call to the next generation.' },
        { year: '2023', theme: 'Awakening', desc: 'Northern Edition — expanding the reach across the nation.' },
        { year: '2024', theme: 'Forge', desc: 'A furnace of refining — shaping vessels for honour.' },
        { year: '2025', theme: 'Immersion', desc: 'Diving deep into the presence and purpose of God.' },
      ]);
    }
  };

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

  // Build collections: match images to gallery collections by ID or name
  // Falls back to raw category grouping when settings aren't loaded yet
  const collections = useMemo(() => {
    const result: { id: string; name: string; description?: string; images: GalleryRow[] }[] = [];

    if (galleries.length > 0) {
      // Use gallery collections from site_settings
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

      // Uncategorized
      const uncategorized = items.filter(g => {
        const cat = (g.category || '').trim();
        return !cat || !galleries.some(gc => gc.id === cat || gc.name === cat);
      });
      if (uncategorized.length > 0) {
        result.push({ id: 'uncategorized', name: 'Gallery', description: 'Additional photos', images: uncategorized });
      }
    } else {
      // Fallback: group by raw category
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
        <div
          className="py-20 px-8 text-center"
          style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}
        >
          <div className="max-w-[700px] mx-auto">
            <div className="eyebrow justify-center text-primary/80 reveal">Cherubs Cove Ministry</div>
            <h1 className="font-heading text-[clamp(32px,5vw,56px)] font-normal leading-tight mt-4 text-white reveal">
              Past Conferences <em className="italic text-primary">Archive</em>
            </h1>
            <p className="text-[14px] font-light leading-[1.8] mt-4 text-white/55 reveal">
              Moments from past editions of the International Quivers Conference — a visual journey through years of encounter, worship, and transformation.
            </p>
          </div>
        </div>

        <div className="container py-16">
          {/* Conference history */}
          {pastEvents.length > 0 && (
            <div className="mb-16 reveal">
              <h2 className="font-heading text-[28px] font-normal italic text-foreground mb-6">
                Conference <em className="text-primary">History</em>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {pastEvents.map((ed, i) => (
                  <div key={i} className="p-6 rounded-lg border border-border bg-card card-lift">
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
            <p className="text-center text-muted-foreground py-8">Galleries will appear here once images are added in the admin dashboard.</p>
          ) : (
            <div className="space-y-16">
              {collections.map(col => {
                const coverImg = col.images.find(g => g.featured) || col.images[0];
                return (
                  <div key={col.id} className="reveal">
                    <div className="flex items-end justify-between mb-3 border-b border-border pb-3">
                      <div>
                        <h2 className="font-heading text-[24px] md:text-[28px] font-normal italic text-foreground">
                          <em className="text-primary">{col.name}</em>
                        </h2>
                        {col.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{col.description}</p>
                        )}
                      </div>
                      <span className="text-[11px] tracking-[2px] uppercase text-muted-foreground whitespace-nowrap">{col.images.length} photo{col.images.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {col.images.map((g, i) => {
                        const isCover = g.featured || (i === 0 && col.images.length > 1);
                        return (
                          <div
                            key={g.id}
                            className={`rounded-lg overflow-hidden relative group cursor-pointer ${isCover ? 'sm:col-span-2 lg:col-span-2 min-h-[300px]' : 'min-h-[220px]'}`}
                          >
                            {g.image_url ? (
                              <img
                                src={normalizeImageUrl(g.image_url)}
                                alt={g.alt_text || g.title || 'Gallery photo'}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--bg-subtle))] to-[hsl(var(--border))] flex items-center justify-center transition-transform duration-500 group-hover:scale-105 absolute inset-0">
                                <span className="text-[11px] tracking-[3px] uppercase text-muted-foreground">Gallery Photo</span>
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-[1]">
                              <p className="text-[10.5px] tracking-[2px] uppercase text-white/80">{col.name}</p>
                              <h4 className="font-heading text-[15px] italic text-white">{g.title}</h4>
                              {g.caption && <p className="text-[11px] text-white/70 mt-0.5">{g.caption}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}

