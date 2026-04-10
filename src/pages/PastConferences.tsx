import { useEffect, useState } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { supabase } from '@/lib/supabaseClient';

type GalleryItem = {
  label: string;
  title: string;
  image_url?: string;
};

const fallbackGalleryItems: GalleryItem[] = [
  { label: "Quiver's 2024", title: 'Forge — Main Sessions' },
  { label: "Quiver's 2024", title: 'Worship Night' },
  { label: "Quiver's 2023", title: 'Arrows — Opening Night' },
  { label: "Quiver's 2023", title: 'Northern Edition — Awakening' },
  { label: "Quiver's 2025", title: 'Immersion' },
  { label: "Quiver's 2025", title: 'Immersion — Closing Night' },
  { label: "Quiver's 2024", title: 'Forge — Workshop Sessions' },
  { label: "Quiver's 2023", title: 'Arrows — Worship & Prayer' },
];

export default function PastConferencesPage() {
  const ref = useScrollReveal();
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>(fallbackGalleryItems);

  const loadGallery = async () => {
    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data?.length) {
      setGalleryItems(
        data.map((item: any) => ({
          label: item.category || item.caption || 'Gallery',
          title: item.title || 'Photo',
          image_url: item.image_url,
        }))
      );
    }
  };

  useEffect(() => {
    loadGallery();

    const channel = supabase
      .channel('gallery-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => {
        loadGallery();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

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
          <div className="mb-12 reveal">
            <h2 className="font-heading text-[28px] font-normal italic text-foreground mb-6">
              Conference <em className="text-primary">History</em>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { year: '2023', theme: 'Arrows', desc: 'The inaugural edition — a prophetic call to the next generation.' },
                { year: '2023', theme: 'Awakening', desc: 'Northern Edition — expanding the reach across the nation.' },
                { year: '2024', theme: 'Forge', desc: 'A furnace of refining — shaping vessels for honour.' },
                { year: '2025', theme: 'Immersion', desc: 'Diving deep into the presence and purpose of God.' },
              ].map((ed, i) => (
                <div key={i} className="p-6 rounded-lg border border-border bg-card card-lift">
                  <div className="font-heading text-[36px] text-primary leading-none mb-2">{ed.year}</div>
                  <div className="font-heading text-lg italic text-foreground mb-2">"{ed.theme}"</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{ed.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Gallery Grid */}
          <div className="mb-8 reveal">
            <h2 className="font-heading text-[28px] font-normal italic text-foreground mb-6">
              Moments from Past <em className="text-primary">Conferences</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 reveal">
            {galleryItems.map((item, i) => (
              <div
                key={i}
                className={`rounded-lg overflow-hidden relative group cursor-pointer ${
                  i === 0 ? 'sm:col-span-2 lg:col-span-2 min-h-[300px]' : 'min-h-[220px]'
                }`}
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--bg-subtle))] to-[hsl(var(--border))] flex items-center justify-center transition-transform duration-500 group-hover:scale-105 absolute inset-0">
                    <span className="text-[11px] tracking-[3px] uppercase text-muted-foreground">
                      Gallery Photo
                    </span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-[1]">
                  <p className="text-[10.5px] tracking-[2px] uppercase text-white/80">
                    {item.label}
                  </p>
                  <h4 className="font-heading text-[15px] italic text-white">{item.title}</h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
