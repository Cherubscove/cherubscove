import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Clock } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';

export default function EventsPreview() {
  const ref = useScrollReveal();

  return (
    <section className="py-24 bg-background border-t border-border" ref={ref}>
      <div className="container">
        <div className="text-center max-w-[620px] mx-auto">
          <div className="eyebrow justify-center reveal">Programs & Events</div>
          <h2 className="section-title reveal">
            Upcoming <em>Gatherings</em>
          </h2>
          <p className="body-text reveal">
            Join us at the International Quivers Conference 2026 — "Envoys of Light." Registration is free and open to all believers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-12">
          {/* Conference Card */}
          <div className="reveal card-lift border border-border rounded-lg overflow-hidden bg-card md:col-span-2">
            <div
              className="h-[160px] relative overflow-hidden flex items-center justify-center flex-col gap-1.5 px-8"
              style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}
            >
              <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 70% 50%, rgba(232,98,10,0.2), transparent 60%)' }} />
              <div className="font-display text-[clamp(18px,2.5vw,26px)] font-semibold text-primary tracking-[3px] text-center relative z-[1]">
                QUIVER'S 2026
              </div>
              <div className="font-heading text-[14px] italic tracking-wider relative z-[1] text-white/65">
                "Envoys of Light"
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-primary" />
                  <div>
                    <div className="text-[9px] font-bold tracking-[2px] uppercase text-muted-foreground mb-0.5">Venue</div>
                    <div className="text-sm text-foreground">To Be Announced</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-primary" />
                  <div>
                    <div className="text-[9px] font-bold tracking-[2px] uppercase text-muted-foreground mb-0.5">Attendance</div>
                    <div className="text-sm text-foreground">Free — Open to All</div>
                  </div>
                </div>
              </div>
              <Link to="/register" className="btn-solid-custom inline-flex items-center gap-2">
                Register Now <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Side mini events */}
          <div className="flex flex-col gap-4 reveal">
            {[
              { lbl: 'Monthly', val: 'First Saturday Service', sub: 'Every 1st Saturday · 10 AM' },
              { lbl: 'Weekly', val: 'Mid-Week Gathering', sub: 'Every Wednesday · TBA' },
            ].map((ev, i) => (
              <div key={i} className="p-5 rounded-lg border border-border bg-card flex-1 flex flex-col justify-center card-lift">
                <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-primary mb-1">{ev.lbl}</div>
                <div className="font-heading text-base text-foreground">{ev.val}</div>
                <div className="text-xs text-muted-foreground mt-1">{ev.sub}</div>
              </div>
            ))}
            <Link to="/events-conferences" className="btn-outline-custom text-center py-3">
              View All Events →
            </Link>
          </div>
        </div>

        {/* Past Conferences carousel teaser */}
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
            {[
              { year: '2023', theme: 'Arrows' },
              { year: '2023', theme: 'Awakening' },
              { year: '2024', theme: 'Forge' },
              { year: '2025', theme: 'Immersion' },
            ].map((ed, i) => (
              <Link
                key={i}
                to="/past-conferences"
                className="rounded-lg overflow-hidden relative group cursor-pointer min-h-[140px] block"
              >
                <div className="w-full h-full bg-gradient-to-br from-[hsl(var(--bg-subtle))] to-[hsl(var(--border))] flex items-center justify-center transition-transform duration-500 group-hover:scale-105 absolute inset-0">
                  <span className="text-[10px] tracking-[3px] uppercase text-muted-foreground">
                    Gallery
                  </span>
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent z-[1]">
                  <p className="text-[10px] tracking-[2px] uppercase text-white/70">{ed.year}</p>
                  <h4 className="font-heading text-[14px] italic text-white">"{ed.theme}"</h4>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
