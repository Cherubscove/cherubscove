import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock, MapPin } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';
import { supabase } from '@/lib/supabaseClient';
import { formatEventDateRange } from '@/lib/adminTypes';
import { normalizeImageUrl } from '@/pages/Admin';

type EventRow = {
  id: string;
  title: string;
  theme?: string;
  status: string;
  date: string;
  end_date?: string;
  time?: string;
  end_time?: string;
  description?: string;
  location?: string;
  image_url?: string;
  registration_enabled?: boolean;
};

type GalleryCover = {
  image_url?: string;
  category?: string;
  title?: string;
  featured?: boolean;
};

export default function EventsPreview() {
  const ref = useScrollReveal();
  const s = useSiteSettings();
  const [allEvents, setAllEvents] = useState<EventRow[]>([]);
  const [galleryCovers, setGalleryCovers] = useState<GalleryCover[]>([]);

  const loadEvents = async () => {
    const { data } = await supabase.from('events').select('*').order('date', { ascending: false });
    if (data?.length) {
      setAllEvents(data as EventRow[]);
    }
  };

  const loadGalleryCovers = async () => {
    // Direct query: get up to 4 gallery images, preferring featured ones,
    // one per category, so we show a variety of gallery covers
    const { data } = await supabase
      .from('gallery')
      .select('image_url,category,title,featured')
      .not('image_url', 'is', null)
      .order('featured', { ascending: false })
      .order('created_at', { ascending: false });

    if (data?.length) {
      // Deduplicate by category — one cover per category
      const seen = new Set<string>();
      const covers: GalleryCover[] = [];
      for (const g of data) {
        const key = g.category || 'uncategorized';
        if (!seen.has(key) && covers.length < 4) {
          seen.add(key);
          covers.push(g);
        }
      }
      setGalleryCovers(covers);
    }
  };

  useEffect(() => {
    loadEvents();
    loadGalleryCovers();

    const ch1 = supabase.channel('ep-events').on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadEvents()).subscribe();
    const ch2 = supabase.channel('ep-gallery').on('postgres_changes', { event: '*', schema: 'public', table: 'gallery' }, () => loadGalleryCovers()).subscribe();

    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [s]);

  // Separate events
  const upcomingEvents = allEvents.filter(e => e.status === 'upcoming' && e.registration_enabled);
  const recurringEvents = allEvents.filter(e => e.status === 'recurring');
  const featuredUpcoming = upcomingEvents[0];
  const sideEvents = recurringEvents.slice(0, 2);

  return (
    <section className="py-24 bg-background border-t border-border" ref={ref}>
      <div className="container">
        <div className="text-center max-w-[620px] mx-auto">
          <div className="eyebrow justify-center reveal">{getSetting(s, 'events_eyebrow', 'Programs & Events')}</div>
          <h2 className="section-title reveal">
            {getSetting(s, 'events_heading', 'Upcoming')} <em>{getSetting(s, 'events_heading_em', 'Gatherings')}</em>
          </h2>
          <p className="body-text reveal">
            {getSetting(s, 'events_intro', 'Join us at the International Quivers Conference 2026 — "Envoys of Light." Registration is free and open to all believers.')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {/* Featured Upcoming Event Card */}
          <div className="reveal card-lift border border-border rounded-lg overflow-hidden bg-card md:col-span-2">
            {featuredUpcoming ? (
              <>
                <div
                  className="h-[160px] relative overflow-hidden flex items-center justify-center flex-col gap-1.5 px-8"
                  style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}
                >
                  <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 50%, rgba(232,98,10,0.2), transparent 60%)' }} />
                  <div className="font-display text-[clamp(18px,2.5vw,26px)] font-semibold text-primary tracking-[3px] text-center relative z-[1]">
                    {featuredUpcoming.title}
                  </div>
                  {featuredUpcoming.theme && (
                    <div className="font-heading text-[14px] italic tracking-wider relative z-[1] text-white/65">
                      "{featuredUpcoming.theme}"
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-primary" />
                      <div>
                        <div className="text-[9px] font-bold tracking-[2px] uppercase text-muted-foreground mb-0.5">
                          {featuredUpcoming.end_date && featuredUpcoming.end_date !== featuredUpcoming.date ? 'Dates' : 'Date'}
                        </div>
                        <div className="text-sm text-foreground">{formatEventDateRange(featuredUpcoming) || featuredUpcoming.date}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-primary" />
                      <div>
                        <div className="text-[9px] font-bold tracking-[2px] uppercase text-muted-foreground mb-0.5">Location</div>
                        <div className="text-sm text-foreground">{featuredUpcoming.location || 'To Be Announced'}</div>
                      </div>
                    </div>
                  </div>
                  {featuredUpcoming.description && (
                    <p className="text-xs text-muted-foreground mb-4 line-clamp-2 leading-relaxed">{featuredUpcoming.description}</p>
                  )}
                  <Link to={featuredUpcoming.id ? `/register/${featuredUpcoming.id}` : '/register'} className="btn-solid-custom inline-flex items-center gap-2">
                    Register Now <ArrowRight size={14} />
                  </Link>
                </div>
              </>
            ) : (
              <div
                className="h-[160px] relative overflow-hidden flex items-center justify-center flex-col gap-1.5 px-8"
                style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}
              >
                <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 50%, rgba(232,98,10,0.2), transparent 60%)' }} />
                <div className="font-display text-[clamp(18px,2.5vw,26px)] font-semibold text-primary tracking-[3px] text-center relative z-[1]">
                  {getSetting(s, 'conf_title', "QUIVER'S 2026")}
                </div>
                <div className="font-heading text-[14px] italic tracking-wider relative z-[1] text-white/65">
                  "{getSetting(s, 'conf_subtitle', 'Envoys of Light')}"
                </div>
              </div>
            )}
            {!featuredUpcoming && (
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-primary" />
                    <div>
                      <div className="text-[9px] font-bold tracking-[2px] uppercase text-muted-foreground mb-0.5">Venue</div>
                      <div className="text-sm text-foreground">{getSetting(s, 'conf_venue', 'To Be Announced')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-primary" />
                    <div>
                      <div className="text-[9px] font-bold tracking-[2px] uppercase text-muted-foreground mb-0.5">Attendance</div>
                      <div className="text-sm text-foreground">{getSetting(s, 'conf_attendance', 'Free — Open to All')}</div>
                    </div>
                  </div>
                </div>
                <Link to="/register" className="btn-solid-custom inline-flex items-center gap-2">
                  Register Now <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>

          {/* Side events */}
          <div className="flex flex-col gap-4 reveal">
            {sideEvents.length > 0 ? sideEvents.map((ev, i) => (
              <div key={ev.id || i} className="p-5 rounded-lg border border-border bg-card flex-1 flex flex-col justify-center card-lift">
                <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-primary mb-1">{ev.status || 'Event'}</div>
                <div className="font-heading text-base text-foreground">{ev.title}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {[formatEventDateRange(ev), ev.location].filter(Boolean).join(' · ') || 'Details coming soon'}
                </div>
              </div>
            )) : (
              <>
                <div className="p-5 rounded-lg border border-border bg-card flex-1 flex flex-col justify-center card-lift">
                  <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-primary mb-1">Monthly</div>
                  <div className="font-heading text-base text-foreground">First Saturday Service</div>
                  <div className="text-xs text-muted-foreground mt-1">Every 1st Saturday · 10 AM</div>
                </div>
                <div className="p-5 rounded-lg border border-border bg-card flex-1 flex flex-col justify-center card-lift">
                  <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-primary mb-1">Weekly</div>
                  <div className="font-heading text-base text-foreground">Mid-Week Gathering</div>
                  <div className="text-xs text-muted-foreground mt-1">Every Wednesday · TBA</div>
                </div>
              </>
            )}
            <Link to="/events-conferences" className="btn-outline-custom text-center py-3">
              View All Events →
            </Link>
          </div>
        </div>

        {/* Gallery Collections teaser */}
        {galleryCovers.length > 0 && (
          <div className="mt-16 reveal">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-heading text-[22px] font-normal italic text-foreground">
                Past <em className="text-primary">Conferences</em>
              </h3>
              <Link to="/past-conferences" className="text-[11px] font-bold tracking-[1.5px] uppercase text-primary hover:underline inline-flex items-center gap-1">
                View Full Archive <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {galleryCovers.map((g, i) => (
                <Link
                  key={i}
                  to="/past-conferences"
                  className="rounded-lg overflow-hidden relative group cursor-pointer min-h-[140px] block"
                >
                  {g.image_url ? (
                    <img src={normalizeImageUrl(g.image_url!)} alt={g.title || 'Gallery'} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--bg-subtle))] to-[hsl(var(--border))] flex items-center justify-center transition-transform duration-500 group-hover:scale-105 absolute inset-0">
                      <span className="text-[10px] tracking-[3px] uppercase text-muted-foreground">Gallery</span>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-[1]">
                    <span className="text-[10px] tracking-[2px] uppercase text-white/70">{g.category || 'Gallery'}</span>
                    <h4 className="font-heading text-[14px] italic text-white">"{g.title || 'Photo'}"</h4>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
