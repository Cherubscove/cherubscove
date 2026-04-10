import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Calendar, MapPin, Users, Sparkles, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { supabase } from '@/lib/supabaseClient';

type Edition = {
  year: string;
  theme: string;
  type: string;
  upcoming?: boolean;
  description?: string;
  location?: string;
  time?: string;
};

const fallbackEditions: Edition[] = [
  { year: '2023', theme: '"Arrows"', type: 'Main Edition' },
  { year: '2023', theme: '"Awakening"', type: 'Northern Edition' },
  { year: '2024', theme: '"Forge"', type: 'Annual Conference' },
  { year: '2025', theme: '"Immersion"', type: 'Annual Conference' },
  { year: '2026', theme: '"Envoys of Light"', type: 'Upcoming — Register Now', upcoming: true },
];

export default function EventsConferencesPage() {
  const ref = useScrollReveal();
  const [editions, setEditions] = useState<Edition[]>(fallbackEditions);

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });

    if (!error && data?.length) {
      setEditions(
        data.map((item: any) => ({
          year: item.date ? item.date.slice(0, 4) : 'TBA',
          theme: item.title || 'Upcoming event',
          type: item.description || 'Conference',
          upcoming: item.status === 'upcoming',
          description: item.description,
          location: item.location,
          time: item.time,
        }))
      );
    }
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

  return (
    <>
      <Navbar />
      <div className="pt-[70px] min-h-screen bg-background" ref={ref}>
        {/* Hero Banner */}
        <div
          className="py-20 px-8 text-center"
          style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}
        >
          <div className="max-w-[700px] mx-auto">
            <div className="eyebrow justify-center text-primary/80 reveal">Cherubs Cove Ministry</div>
            <h1 className="font-heading text-[clamp(32px,5vw,56px)] font-normal leading-tight mt-4 text-white reveal">
              Events & <em className="italic text-primary">Conferences</em>
            </h1>
            <p className="text-[14px] font-light leading-[1.8] mt-4 text-white/55 reveal">
              Our annual convergence of believers — a sacred space for powerful teaching, prophetic
              worship, and divine encounters that reshape destinies.
            </p>
          </div>
        </div>

        <div className="container py-16">
          {/* Editions Grid */}
          <div className="text-center mb-10 reveal">
            <div className="eyebrow justify-center">International Quivers Conference</div>
            <h2 className="section-title">Conference <em>Editions</em></h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-16 reveal">
            {editions.map((ed, i) => (
              <div
                key={i}
                className={`relative overflow-hidden p-7 rounded-lg transition-all duration-300 group ${
                  ed.upcoming
                    ? 'bg-primary shadow-lg shadow-primary/20'
                    : 'bg-card border border-border card-lift'
                }`}
              >
                {!ed.upcoming && (
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-500" />
                )}
                {ed.upcoming && (
                  <Sparkles size={14} className="absolute top-4 right-4 text-primary-foreground/60" />
                )}
                <span
                  className={`font-heading text-[38px] font-normal leading-none block mb-2 ${
                    ed.upcoming ? 'text-primary-foreground/70' : 'text-primary'
                  }`}
                >
                  {ed.year}
                </span>
                <span
                  className={`font-heading text-xl italic block mb-2 ${
                    ed.upcoming ? 'text-primary-foreground' : 'text-foreground'
                  }`}
                >
                  {ed.theme}
                </span>
                <span
                  className={`text-[10px] font-bold tracking-[2.5px] uppercase ${
                    ed.upcoming ? 'text-primary-foreground/75' : 'text-muted-foreground'
                  }`}
                >
                  {ed.type}
                </span>
              </div>
            ))}
            <div className="bg-card border border-border rounded-lg flex items-center justify-center p-8 card-lift">
              <div className="text-center">
                <div className="text-[10px] tracking-[3px] uppercase text-muted-foreground mb-3">
                  Join us next
                </div>
                <Link to="/register" className="btn-solid-custom text-[10px] px-5 py-2.5">
                  Register Free
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
              { icon: Sparkles, label: `${editions.length} Editions`, desc: 'And counting' },
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

          {/* Upcoming Quiver's 2026 */}
          <div className="reveal mb-16">
            <div className="border-2 border-primary/30 rounded-xl overflow-hidden bg-card">
              <div
                className="p-10 text-center"
                style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}
              >
                <div className="font-display text-[clamp(22px,3vw,34px)] font-semibold text-primary tracking-[4px]">
                  QUIVER'S 2026
                </div>
                <div className="font-heading text-[16px] italic tracking-wider mt-2 text-white/65">
                  "Envoys of Light"
                </div>
              </div>
              <div className="p-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-6">
                  {[
                    { lbl: 'Year', val: '2026' },
                    { lbl: 'Theme', val: 'Envoys of Light' },
                    { lbl: 'Venue', val: 'To Be Announced' },
                    { lbl: 'Attendance', val: 'Free — Open to All' },
                  ].map((d, i) => (
                    <div key={i}>
                      <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground mb-1">
                        {d.lbl}
                      </div>
                      <div className="text-sm font-medium text-foreground">{d.val}</div>
                    </div>
                  ))}
                </div>
                <p className="text-sm leading-[1.85] text-muted-foreground border-t border-border pt-6">
                  International Quivers Conference 2026 continues a legacy of encounters that have shaped
                  lives, ignited faith, and released voices across generations. Under the theme "Envoys of
                  Light," this edition calls every believer to step into their divine mandate as carriers of
                  God's glory into every sphere of influence.
                </p>
                <div className="mt-6">
                  <Link to="/register" className="btn-primary-custom inline-flex items-center gap-2">
                    Register Now <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Other Programs */}
          <div className="reveal">
            <h3 className="font-heading text-[28px] font-normal italic text-foreground mb-6">
              Other <em className="text-primary">Programs</em>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { lbl: 'Monthly Gathering', val: 'First Saturday Service', sub: 'Every first Saturday · 10:00 AM' },
                { lbl: 'Prayer & Fellowship', val: 'Mid-Week Gathering', sub: 'Every Wednesday · Details TBA' },
              ].map((ev, i) => (
                <div key={i} className="p-6 rounded-lg border border-border bg-card card-lift">
                  <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-primary mb-1">{ev.lbl}</div>
                  <div className="font-heading text-[18px] text-foreground">{ev.val}</div>
                  <div className="text-xs text-muted-foreground mt-1">{ev.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Past Conferences teaser */}
          <div className="mt-16 text-center reveal">
            <Link to="/past-conferences" className="btn-outline-custom inline-flex items-center gap-2">
              View Past Conferences Archive <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
