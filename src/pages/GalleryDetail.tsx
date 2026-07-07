import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';
import SEO from '@/components/SEO';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { supabase } from '@/lib/supabaseClient';
import { normalizeImageUrl } from '@/pages/Admin';
import { ArrowLeft, X, ArrowRight, Eye } from 'lucide-react';
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

export default function GalleryDetailPage() {
  const { galleryId } = useParams<{ galleryId: string }>();
  const ref = useScrollReveal();
  const settings = useSiteSettings();
  const [items, setItems] = useState<GalleryRow[]>([]);
  const [lightbox, setLightbox] = useState<{ images: GalleryRow[]; index: number } | null>(null);

  const decodedId = decodeURIComponent(galleryId || '');

  const galleries: GalleryCollection[] = useMemo(() => {
    const raw = getSetting(settings, 'galleries_json', '[]');
    try { return JSON.parse(raw); } catch { return []; }
  }, [settings]);

  const currentGallery = useMemo(() => {
    return galleries.find(g => g.id === decodedId || g.name === decodedId) || null;
  }, [galleries, decodedId]);

  const loadGallery = async () => {
    const { data } = await supabase
      .from('gallery')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setItems(data as GalleryRow[]);
  };

  useEffect(() => {
    loadGallery();
    const ch = supabase
      .channel('gallery-detail')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => loadGallery())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Filter images belonging to this gallery
  const images = useMemo(() => {
    return items.filter(g => {
      const cat = (g.category || '').trim();
      return cat === decodedId || (currentGallery && (cat === currentGallery.id || cat === currentGallery.name));
    });
  }, [items, decodedId, currentGallery]);

  const openLightbox = useCallback(async (index: number) => {
    setLightbox({ images, index });

    try {
      const { buildAnalyticsPayload } = await import('@/lib/analytics');
      await supabase.from('analytics_events').insert(
        buildAnalyticsPayload({
          event_type: 'gallery_view',
          page_path: `/past-conferences/${encodeURIComponent(decodedId)}`,
          resource_id: currentGallery?.id || decodedId,
          resource_type: 'gallery',
          metadata: { gallery_name: currentGallery?.name || decodedId, image_count: images.length },
        })
      );
    } catch {
      // Ignore analytics failures so the gallery stays usable.
    }
  }, [currentGallery?.id, currentGallery?.name, decodedId, images, images.length]);

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

  return (
    <>
      <SEO
        title={currentGallery ? `${currentGallery.name} — Past Conferences Archive` : 'Gallery — Cherubs Cove Ministry'}
        description={currentGallery?.description || 'Photo gallery from past conferences at Cherubs Cove Ministry.'}
        path={`/past-conferences/${encodeURIComponent(decodedId)}`}
      />
      <Navbar />
      <main className="pt-[70px] min-h-screen bg-background" ref={ref}>
        {/* Header */}
        <div
          className="py-16 px-8 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}
        >
          <div className="absolute inset-0 opacity-10" style={{ background: 'radial-gradient(circle at 30% 50%, #E8620A, transparent 60%), radial-gradient(circle at 70% 50%, #E8620A, transparent 60%)' }} />
          <div className="max-w-[700px] mx-auto relative z-[1]">
            <Link
              to="/past-conferences"
              className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[2px] uppercase text-white/50 hover:text-primary transition-colors mb-4"
            >
              <ArrowLeft size={12} /> {getSetting(settings, 'gallery_back_link', 'Back to Archive')}
            </Link>
            <h1 className="font-heading text-[clamp(28px,5vw,48px)] font-normal leading-tight text-white">
              <em className="italic text-primary">{currentGallery?.name || decodedId}</em>
            </h1>
            {currentGallery?.description && (
              <p className="text-[13px] font-light leading-[1.8] mt-3 text-white/55">
                {currentGallery.description}
              </p>
            )}
            <p className="text-[11px] tracking-[2px] uppercase text-white/40 mt-3">
              {images.length} photo{images.length !== 1 ? 's' : ''}
            </p>
            <div className="mt-3">
              <ShareButton
                title={`${currentGallery?.name || decodedId} Gallery — Cherubs Cove Ministry`}
                text={`Check out the "${currentGallery?.name || decodedId}" gallery from Cherubs Cove Ministry`}
                variant="button"
                className="[&_button]:!text-white/50 [&_button:hover]:!text-primary"
              />
            </div>
          </div>
        </div>

        <div className="container py-12">
          {images.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4 opacity-20">📸</div>
              <p className="text-muted-foreground">{getSetting(settings, 'gallery_no_images', 'No images found in this gallery.')}</p>
              <Link to="/past-conferences" className="text-primary hover:underline text-sm mt-2 inline-block">
                ← {getSetting(settings, 'gallery_back_link', 'Back to Archive')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {images.map((g, i) => (
                <div
                  key={g.id}
                  onClick={() => openLightbox(i)}
                  className="group rounded-xl overflow-hidden relative cursor-pointer min-h-[220px] sm:min-h-[260px]"
                >
                  {g.image_url ? (
                    <>
                      <img
                        src={normalizeImageUrl(g.image_url)}
                        alt={g.alt_text || g.title || 'Conference gallery image from Cherubs Cove Ministry'}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300" />
                      <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white/80 text-[9px] px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-[3] flex items-center gap-1">
                        <Eye size={10} /> View
                      </div>
                      {g.featured && (
                        <div className="absolute top-3 left-3 bg-primary/90 text-primary-foreground text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase z-[2]">
                          Featured
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--bg-subtle))] to-[hsl(var(--border))] flex items-center justify-center absolute inset-0">
                      <span className="text-[11px] tracking-[3px] uppercase text-muted-foreground">No Image</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-[1]" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 z-[2]">
                    <h4 className="font-heading text-[14px] italic text-white">{g.title || 'Untitled'}</h4>
                    {g.caption && <p className="text-[10px] text-white/60 mt-0.5">{g.caption}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            aria-label="Close lightbox"
          >
            <X size={20} className="text-white" />
          </button>

          <div className="absolute top-4 left-4 text-white/60 text-[11px] font-bold tracking-[2px] uppercase">
            {lightbox.index + 1} / {lightbox.images.length}
          </div>

          {lightbox.images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
              aria-label="Previous image"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>
          )}

          <div className="max-w-[90vw] max-h-[90vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={normalizeImageUrl(lightbox.images[lightbox.index].image_url!)}
              alt={lightbox.images[lightbox.index].alt_text || lightbox.images[lightbox.index].title || 'Conference gallery photo from Cherubs Cove Ministry'}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>

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

          {lightbox.images.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"              aria-label="Next image"            >
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
