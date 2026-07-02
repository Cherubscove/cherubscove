import { useEffect, useMemo, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
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
  created_at?: string;
};

export default function PastConferencesPage() {
  const ref = useScrollReveal();
  const [items, setItems] = useState<GalleryRow[]>([]);

  const loadGallery = async () => {
    const { data } = await supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data as GalleryRow[]);
  };

  useEffect(() => {
    loadGallery();
    const channel = supabase
      .channel('gallery-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => loadGallery())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Group images by collection (category). Uncategorized falls under "Gallery".
  const collections = useMemo(() => {
    const map = new Map<string, GalleryRow[]>();
    items.forEach(g => {
      const key = (g.category || '').trim() || 'Gallery';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(g);
    });
    return Array.from(map.entries()).map(([name, images]) => ({ name, images }));
  }, [items]);

  const fallbackHistory = [
    { year: '2023', theme: 'Arrows', desc: 'The inaugural edition — a prophetic call to the next generation.' },
    { year: '2023', theme: 'Awakening', desc: 'Northern Edition — expanding the reach across the nation.' },
    { year: '2024', theme: 'Forge', desc: 'A furnace of refining — shaping vessels for honour.' },
    { year: '2025', theme: 'Immersion', desc: 'Diving deep into the presence and purpose of God.' },
  ];

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
          <div className="mb-16 reveal">
            <h2 className="font-heading text-[28px] font-normal italic text-foreground mb-6">
              Conference <em className="text-primary">History</em>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {fallbackHistory.map((ed, i) => (
                <div key={i} className="p-6 rounded-lg border border-border bg-card card-lift">
                  <div className="font-heading text-[36px] text-primary leading-none mb-2">{ed.year}</div>
                  <div className="font-heading text-lg italic text-foreground mb-2">"{ed.theme}"</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ed.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Galleries — one section per collection */}
          {collections.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Galleries will appear here once images are added in the admin dashboard.</p>
          ) : (
            <div className="space-y-16">
              {collections.map(col => (
                <div key={col.name} className="reveal">
                  <div className="flex items-end justify-between mb-6 border-b border-border pb-3">
                    <h2 className="font-heading text-[24px] md:text-[28px] font-normal italic text-foreground">
                      <em className="text-primary">{col.name}</em>
                    </h2>
                    <span className="text-[11px] tracking-[2px] uppercase text-muted-foreground">{col.images.length} photo{col.images.length !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {col.images.map((g, i) => (
                      <div
                        key={g.id}
                        className={`rounded-lg overflow-hidden relative group cursor-pointer ${i === 0 ? 'sm:col-span-2 lg:col-span-2 min-h-[300px]' : 'min-h-[220px]'}`}
                      >
                        {g.image_url ? (
                          <img
                            src={g.image_url}
                            alt={g.title}
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
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}

