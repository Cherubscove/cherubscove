import { Link } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { Calendar, MapPin, Users, Sparkles } from 'lucide-react';

const editions = [
  { year: '2023', theme: '"Arrows"', type: 'Main Edition' },
  { year: '2023', theme: '"Awakening"', type: 'Northern Edition' },
  { year: '2024', theme: '"Forge"', type: 'Annual Conference' },
  { year: '2025', theme: '"Immersion"', type: 'Annual Conference' },
  { year: '2026', theme: '"Envoys of Light"', type: 'Upcoming — Register Now', upcoming: true },
];

const galleryItems = [
  { label: "Quiver's 2024", title: 'Forge — Main Sessions', span: true },
  { label: "Quiver's 2024", title: 'Worship Night' },
  { label: "Quiver's 2023", title: 'Arrows — Opening Night' },
  { label: "Quiver's 2023", title: 'Northern Edition — Awakening' },
  { label: "Quiver's 2025", title: 'Immersion' },
];

export default function ConferenceSection() {
  const ref = useScrollReveal();

  return (
    <section id="conference" className="py-24 bg-bg-alt border-t border-border" ref={ref}>
      <div className="container">
        {/* Header */}
        <div className="text-center max-w-[620px] mx-auto mb-14 reveal">
          <div className="eyebrow justify-center">Events & Conferences</div>
          <h2 className="section-title">
            International Quivers <em>Conference</em>
          </h2>
          <p className="body-text">
            Our annual convergence of believers — a sacred space for powerful teaching, prophetic
            worship, and divine encounters that reshape destinies.
          </p>
        </div>

        {/* Editions Grid */}
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
            { icon: Sparkles, label: '5 Editions', desc: 'Since 2023' },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-4 rounded-lg bg-card border border-border">
              <div className="w-9 h-9 rounded-lg bg-orange-soft flex items-center justify-center text-primary flex-shrink-0">
                <item.icon size={16} />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">{item.label}</div>
                <div className="text-[11px] text-muted-foreground">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Gallery */}
        <div className="text-center mb-8 reveal">
          <h3 className="font-heading text-[28px] font-normal italic text-foreground">
            Moments from Past Conferences
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] grid-rows-[220px_220px] gap-2.5 reveal">
          {galleryItems.map((item, i) => (
            <div
              key={i}
              className={`rounded-lg overflow-hidden bg-bg-subtle relative group cursor-pointer ${
                i === 0 ? 'sm:row-span-2 min-h-[200px]' : ''
              }`}
            >
              <div className="w-full h-full bg-gradient-to-br from-bg-subtle to-border flex items-center justify-center transition-transform duration-500 group-hover:scale-105">
                <span className="text-[11px] tracking-[3px] uppercase text-muted-foreground">
                  Gallery Photo
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-[10.5px] tracking-[2px] uppercase text-white/80">
                  {item.label}
                </p>
                <h4 className="font-heading text-[15px] italic text-white">
                  {item.title}
                </h4>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
