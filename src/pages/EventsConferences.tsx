import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';
import { Calendar, MapPin, Users, Sparkles, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ShareButton from '@/components/ShareButton';
import ScrollToTop from '@/components/ScrollToTop';
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

export default function EventsConferencesPage() {
  const ref = useScrollReveal();
  const s = useSiteSettings();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });
    if (!error && data?.length) {
      setEvents(data as EventRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEvents();

    const channel = supabase
      .channel('events-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        loadEvents();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const upcomingEvents = events.filter(e => e.status === 'upcoming');
  const pastEvents = events.filter(e => e.status === 'past');
  const recurringEvents = events.filter(e => e.status === 'recurring');
  const featuredUpcoming = upcomingEvents[0];
  const hasAny = upcomingEvents.length > 0 || pastEvents.length > 0 || recurringEvents.length > 0;

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
            <div className="eyebrow justify-center text-primary/80 reveal">{getSetting(s, 'events_page_eyebrow', 'Cherubs Cove Ministry')}</div>
            <h1 className="font-heading text-[clamp(32px,5vw,56px)] font-normal leading-tight mt-4 text-white reveal" dangerouslySetInnerHTML={{ __html: getSetting(s, 'events_page_heading_html', 'Events & <em class="italic text-primary">Conferences</em>') }} />
            <p className="text-[14px] font-light leading-[1.8] mt-4 text-white/55 reveal">
              {getSetting(s, 'events_page_description', 'Our annual convergence of believers — a sacred space for powerful teaching, prophetic worship, and divine encounters that reshape destinies.')}
            </p>
          </div>
        </div>

        <div className="container py-16">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : !hasAny ? (
            <p className="text-center text-muted-foreground py-8">Events will appear here once added in the admin dashboard.</p>
          ) : (
            <>
              {/* Editions Grid */}
              <div className="text-center mb-10 reveal">
                <div className="eyebrow justify-center">{getSetting(s, 'events_page_editions_eyebrow', 'International Quivers Conference')}</div>
                <h2 className="section-title" dangerouslySetInnerHTML={{ __html: getSetting(s, 'events_page_editions_heading_html', 'Conference <em>Editions</em>') }} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-16 reveal">
                {pastEvents.map((ev, i) => (
                  <div
                    key={ev.id}
                    className="relative overflow-hidden rounded-lg transition-all duration-300 group bg-card border border-border card-lift"
                  >
                    {/* Image background if available */}
                    {ev.image_url && (
                      <div className="h-[120px] overflow-hidden">
                        <img
                          src={normalizeImageUrl(ev.image_url)}
                          alt={ev.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/50 to-transparent z-[1]" />
                      </div>
                    )}
                    <div className="p-7 relative z-[2]">
                      {/* Accent bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
                      <span className="font-heading text-[38px] font-normal leading-none block mb-2 text-primary">
                        {ev.date ? ev.date.slice(0, 4) : 'TBA'}
                      </span>
                      <span className="font-heading text-xl italic block mb-2 text-foreground">
                        {ev.theme ? `"${ev.theme}"` : ev.title}
                      </span>
                      {ev.location && (
                        <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-muted-foreground block mb-1">
                          <MapPin size={10} className="inline -mt-0.5 mr-1" />
                          {ev.location}
                        </span>
                      )}
                      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-muted-foreground">
                        {ev.description || 'Conference'}
                      </span>
                      <div className="mt-3 flex items-center justify-between">
                        <ShareButton
                          title={`${ev.theme || ev.title} — Cherubs Cove Ministry`}
                          text={`Check out ${ev.theme || ev.title} (${ev.date ? ev.date.slice(0, 4) : 'TBA'}) from Cherubs Cove Ministry`}
                          variant="icon"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {upcomingEvents.map(ev => (
                  <div
                    key={ev.id}
                    className="relative overflow-hidden rounded-lg transition-all duration-300 group bg-primary shadow-lg shadow-primary/20"
                  >
                    {/* Image background if available */}
                    {ev.image_url && (
                      <div className="h-[120px] overflow-hidden">
                        <img
                          src={normalizeImageUrl(ev.image_url)}
                          alt={ev.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-primary via-primary/50 to-transparent z-[1]" />
                      </div>
                    )}
                    <div className="p-7 relative z-[2]">
                      <Sparkles size={14} className="absolute top-4 right-4 text-primary-foreground/60" />
                      <span className="font-heading text-[38px] font-normal leading-none block mb-2 text-primary-foreground/70">
                        {ev.date ? ev.date.slice(0, 4) : 'TBA'}
                      </span>
                      <span className="font-heading text-xl italic block mb-2 text-primary-foreground">
                        {ev.theme ? `"${ev.theme}"` : ev.title}
                      </span>
                      <span className="text-[10px] font-bold tracking-[2.5px] uppercase text-primary-foreground/75">
                        {ev.registration_enabled ? 'Upcoming — Register Now' : 'Upcoming'}
                      </span>
                      <div className="mt-3 flex items-center justify-between">
                        <ShareButton
                          title={`${ev.theme || ev.title} — Cherubs Cove Ministry`}
                          text={`Join ${ev.theme || ev.title} from Cherubs Cove Ministry`}
                          variant="icon"
                          className="[&_button]:!text-primary-foreground/60 [&_button:hover]:!text-primary-foreground"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                {/* CTA card */}
                <div className="bg-card border border-border rounded-lg flex items-center justify-center p-8 card-lift">
                  <div className="text-center">
                    <div className="text-[10px] tracking-[3px] uppercase text-muted-foreground mb-3">
                      Join us next
                    </div>
                    <Link to={featuredUpcoming?.id ? `/register/${featuredUpcoming.id}` : '/register'} className="btn-solid-custom text-[10px] px-5 py-2.5">
                      {getSetting(s, 'events_page_register_btn', 'Register Free')}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Quick info strip */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-16 reveal">
                {[
                  { icon: Calendar, label: 'Annual', desc: 'Every year' },
                  { icon: MapPin, label: 'Nigeria', desc: 'Multiple cities' },
                  { icon: Users, label: 'Open to All', desc: 'Free attendance' },
                  { icon: Sparkles, label: `${events.length} Events`, desc: 'And counting' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
                    <div className="w-9 h-9 rounded-lg bg-[hsl(var(--orange-soft))] flex items-center justify-center text-primary flex-shrink-0">
                      <item.icon size={16} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">{item.label}</div>
                      <div className="text-[11px] text-muted-foreground">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Featured Upcoming Event Detail */}
              {featuredUpcoming && (
                <div className="reveal mb-16">
                  <div className="border-2 border-primary/30 rounded-xl overflow-hidden bg-card">
                    {featuredUpcoming.image_url ? (
                      <div className="h-[240px] md:h-[300px] relative overflow-hidden">
                        <img
                          src={normalizeImageUrl(featuredUpcoming.image_url)}
                          alt={featuredUpcoming.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-8 text-center">
                          <div className="font-display text-[clamp(22px,3vw,34px)] font-semibold text-primary tracking-[4px]">
                            {featuredUpcoming.title}
                          </div>
                          {featuredUpcoming.theme && (
                            <div className="font-heading text-[16px] italic tracking-wider mt-2 text-white/65">
                              "{featuredUpcoming.theme}"
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div
                        className="p-10 text-center"
                        style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}
                      >
                        <div className="font-display text-[clamp(22px,3vw,34px)] font-semibold text-primary tracking-[4px]">
                          {featuredUpcoming.title}
                        </div>
                        {featuredUpcoming.theme && (
                          <div className="font-heading text-[16px] italic tracking-wider mt-2 text-white/65">
                            "{featuredUpcoming.theme}"
                          </div>
                        )}
                      </div>
                    )}
                    <div className="p-8">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
                        <div>
                          <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground mb-1">Date</div>
                          <div className="text-sm font-medium text-foreground">{formatEventDateRange(featuredUpcoming) || featuredUpcoming.date}</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground mb-1">Theme</div>
                          <div className="text-sm font-medium text-foreground">{featuredUpcoming.theme || featuredUpcoming.title}</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground mb-1">Venue</div>
                          <div className="text-sm font-medium text-foreground">{featuredUpcoming.location || 'To Be Announced'}</div>
                        </div>
                        <div>
                          <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground mb-1">Attendance</div>
                          <div className="text-sm font-medium text-foreground">Free — Open to All</div>
                        </div>
                      </div>
                      {featuredUpcoming.description && (
                        <p className="text-sm leading-[1.85] text-muted-foreground border-t border-border pt-6">
                          {featuredUpcoming.description}
                        </p>
                      )}
                      <div className="mt-6 flex items-center gap-3">
                        <Link to={featuredUpcoming.id ? `/register/${featuredUpcoming.id}` : '/register'} className="btn-primary-custom inline-flex items-center gap-2">
                          Register Now <ArrowRight size={14} />
                        </Link>
                        <ShareButton
                          title={`${featuredUpcoming.theme || featuredUpcoming.title} — Cherubs Cove Ministry`}
                          text={`Join ${featuredUpcoming.theme || featuredUpcoming.title} from Cherubs Cove Ministry — ${featuredUpcoming.location || 'Free Event'}`}
                          variant="button"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Programs (recurring events) */}
              {recurringEvents.length > 0 && (
                <div className="reveal">
                  <h3 className="font-heading text-[28px] font-normal italic text-foreground mb-6">
                    Other <em className="text-primary">Programs</em>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recurringEvents.map(ev => (
                      <div key={ev.id} className="p-6 rounded-lg border border-border bg-card card-lift relative overflow-hidden">
                        {ev.image_url && (
                          <div className="absolute inset-0 opacity-10">
                            <img
                              src={normalizeImageUrl(ev.image_url)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="relative z-[1]">
                          <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-primary mb-1">{ev.status || 'Event'}</div>
                          <div className="font-heading text-[18px] text-foreground">{ev.title}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {[formatEventDateRange(ev), ev.location].filter(Boolean).join(' · ') || 'Details coming soon'}
                          </div>
                          {ev.registration_enabled && ev.id && (
                            <Link to={`/register/${ev.id}`} className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold tracking-[2px] uppercase text-primary hover:underline">
                              Register <ArrowRight size={12} />
                            </Link>
                          )}
                          <div className="mt-2">
                            <ShareButton
                              title={`${ev.title} — Cherubs Cove Ministry`}
                              text={`${ev.title} from Cherubs Cove Ministry — ${[formatEventDateRange(ev), ev.location].filter(Boolean).join(' · ') || 'Details coming soon'}`}
                              variant="icon"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Past Conferences teaser */}
          <div className="mt-16 text-center reveal">
            <Link to="/past-conferences" className="btn-outline-custom inline-flex items-center gap-2">
              {getSetting(s, 'events_page_archive_link', 'View Past Conferences Archive')} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
