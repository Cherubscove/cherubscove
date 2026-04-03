import { useState, useRef, type FormEvent } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function RegisterPage() {
  const ref = useScrollReveal();
  const [regStatus, setRegStatus] = useState<'idle' | 'success'>('idle');
  const formRef = useRef<HTMLFormElement>(null);

  const handleRegister = (e: FormEvent) => {
    e.preventDefault();
    setRegStatus('success');
    setTimeout(() => {
      setRegStatus('idle');
      formRef.current?.reset();
    }, 3500);
  };

  return (
    <>
      <Navbar />
      <div className="pt-[70px] min-h-screen bg-background" ref={ref}>
        {/* Hero Banner */}
        <div
          className="py-20 px-8 text-center"
          style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}
        >
          <div className="max-w-[600px] mx-auto">
            <div className="font-display text-[clamp(20px,3vw,30px)] font-semibold text-primary tracking-[3px] mb-2">
              QUIVER'S 2026
            </div>
            <div className="font-heading text-[15px] italic tracking-wider mb-4" style={{ color: 'rgba(255,255,255,0.65)' }}>
              "Envoys of Light"
            </div>
            <div className="inline-block bg-primary px-4 py-1.5 rounded-full text-[9px] font-bold tracking-[2px] uppercase" style={{ color: '#fff' }}>
              Registrations Open
            </div>
          </div>
        </div>

        <div className="container py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-16 items-start">
            {/* Left: Conference Info + Events */}
            <div>
              <div className="eyebrow reveal">Programs &amp; Events</div>
              <h1 className="section-title reveal">
                Upcoming <em>Gatherings</em>
              </h1>

              {/* Conference details */}
              <div className="border border-border rounded overflow-hidden bg-card shadow-[var(--shadow-base)] reveal card-lift mb-8">
                <div className="p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 my-4">
                    {[
                      { lbl: 'Year', val: '2026' },
                      { lbl: 'Theme', val: 'Envoys of Light' },
                      { lbl: 'Venue', val: 'To Be Announced' },
                      { lbl: 'Attendance', val: 'Free — Open to All' },
                    ].map((d, i) => (
                      <div key={i}>
                        <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-text-light mb-1">
                          {d.lbl}
                        </div>
                        <div className="text-sm">{d.val}</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-sm leading-[1.85] text-muted-foreground pt-6 border-t border-border mt-4">
                    International Quivers Conference 2026 continues a legacy of encounters that have shaped
                    lives, ignited faith, and released voices across generations. Under the theme "Envoys of
                    Light," this edition calls every believer to step into their divine mandate as carriers of
                    God's glory into every sphere of influence.
                    <br /><br />
                    Speakers and full schedule will be announced. Register early to secure your place.
                  </div>
                </div>
              </div>

              {/* Mini Events */}
              <div className="flex flex-col gap-3 reveal">
                {[
                  { lbl: 'Monthly Gathering', val: 'First Saturday Service', sub: 'Every first Saturday · 10:00 AM' },
                  { lbl: 'Prayer & Fellowship', val: 'Mid-Week Gathering', sub: 'Every Wednesday · Details TBA' },
                ].map((ev, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-sm border border-border bg-card flex items-center justify-between gap-6 card-lift"
                  >
                    <div>
                      <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-primary mb-1">
                        {ev.lbl}
                      </div>
                      <div className="font-heading text-[17px]">{ev.val}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ev.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Registration Form */}
            <div className="bg-bg-alt border border-border rounded p-8 lg:sticky lg:top-[90px] reveal">
              <div className="font-heading text-2xl font-medium mb-1">Register Now</div>
              <div className="text-[13px] text-muted-foreground mb-7">
                Secure your place at Quiver's 2026 or any upcoming program.
              </div>
              <form onSubmit={handleRegister} ref={formRef}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">
                      First Name
                    </label>
                    <input type="text" placeholder="First name" required className="w-full px-3.5 py-2.5 rounded-sm border-[1.5px] border-border bg-card text-sm outline-none transition-colors focus:border-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">
                      Last Name
                    </label>
                    <input type="text" placeholder="Last name" required className="w-full px-3.5 py-2.5 rounded-sm border-[1.5px] border-border bg-card text-sm outline-none transition-colors focus:border-primary" />
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">Email Address</label>
                  <input type="email" placeholder="your@email.com" required className="w-full px-3.5 py-2.5 rounded-sm border-[1.5px] border-border bg-card text-sm outline-none transition-colors focus:border-primary" />
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">Phone Number</label>
                  <input type="tel" placeholder="+234 000 000 0000" className="w-full px-3.5 py-2.5 rounded-sm border-[1.5px] border-border bg-card text-sm outline-none transition-colors focus:border-primary" />
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">Program</label>
                  <select className="w-full px-3.5 py-2.5 rounded-sm border-[1.5px] border-border bg-card text-sm outline-none transition-colors focus:border-primary appearance-none">
                    <option value="">Select a program...</option>
                    <option>International Quivers Conference 2026 — Envoys of Light</option>
                    <option>First Saturday Service</option>
                    <option>Mid-Week Fellowship</option>
                    <option>Newsletter / General Updates</option>
                  </select>
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">State / City</label>
                  <input type="text" placeholder="Where are you joining from?" className="w-full px-3.5 py-2.5 rounded-sm border-[1.5px] border-border bg-card text-sm outline-none transition-colors focus:border-primary" />
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">Prayer Request or Note (optional)</label>
                  <textarea placeholder="Anything you'd like us to pray about or know..." className="w-full px-3.5 py-2.5 rounded-sm border-[1.5px] border-border bg-card text-sm outline-none transition-colors focus:border-primary resize-y min-h-[75px]" />
                </div>
                <button
                  type="submit"
                  className={`w-full py-3.5 rounded-sm font-body text-[11px] font-bold tracking-[3px] uppercase transition-all duration-250 mt-4 ${
                    regStatus === 'success'
                      ? 'bg-emerald-600 text-primary-foreground'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[0_6px_22px_rgba(232,98,10,0.3)]'
                  }`}
                >
                  {regStatus === 'success' ? 'Registered! ✓' : 'Complete Registration →'}
                </button>
                <p className="text-[11px] text-text-light text-center mt-3">
                  Registration is free. Your information is kept private.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
