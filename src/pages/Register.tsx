import { useState, useRef, type FormEvent } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';

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

  const inputClass = "w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-border bg-card text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--orange)/0.1)] placeholder:text-muted-foreground";

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
            <div className="font-heading text-[15px] italic tracking-wider mb-4 text-white/65">
              "Envoys of Light"
            </div>
            <div className="inline-block bg-primary px-4 py-1.5 rounded-full text-[9px] font-bold tracking-[2px] uppercase text-white">
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
              <div className="border border-border rounded-lg overflow-hidden bg-card reveal card-lift mb-8">
                <div className="p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 my-4">
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
                        <div className="text-sm text-foreground">{d.val}</div>
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
                    className="p-5 rounded-lg border border-border bg-card flex items-center justify-between gap-6 card-lift"
                  >
                    <div>
                      <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-primary mb-1">
                        {ev.lbl}
                      </div>
                      <div className="font-heading text-[17px] text-foreground">{ev.val}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ev.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Registration Form */}
            <div className="bg-card border border-border rounded-lg p-8 lg:sticky lg:top-[90px] reveal card-lift">
              <div className="font-heading text-2xl font-medium mb-1 text-foreground">Register Now</div>
              <div className="text-[13px] text-muted-foreground mb-7">
                Secure your place at Quiver's 2026 or any upcoming program.
              </div>
              <form onSubmit={handleRegister} ref={formRef}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">
                      First Name
                    </label>
                    <input type="text" placeholder="First name" required className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">
                      Last Name
                    </label>
                    <input type="text" placeholder="Last name" required className={inputClass} />
                  </div>
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">Email Address</label>
                  <input type="email" placeholder="your@email.com" required className={inputClass} />
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">Phone Number</label>
                  <input type="tel" placeholder="+234 000 000 0000" className={inputClass} />
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">Program</label>
                  <select className={`${inputClass} appearance-none`}>
                    <option value="">Select a program...</option>
                    <option>International Quivers Conference 2026 — Envoys of Light</option>
                    <option>First Saturday Service</option>
                    <option>Mid-Week Fellowship</option>
                    <option>Newsletter / General Updates</option>
                  </select>
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">State / City</label>
                  <input type="text" placeholder="Where are you joining from?" className={inputClass} />
                </div>
                <div className="mt-4 space-y-1.5">
                  <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">Prayer Request or Note (optional)</label>
                  <textarea placeholder="Anything you'd like us to pray about or know..." className={`${inputClass} resize-y min-h-[75px]`} />
                </div>
                <button
                  type="submit"
                  className={`w-full py-3.5 rounded-md font-body text-[11px] font-bold tracking-[3px] uppercase transition-all duration-250 mt-5 ${
                    regStatus === 'success'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-primary text-white hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[0_6px_22px_hsl(var(--orange)/0.3)]'
                  }`}
                >
                  {regStatus === 'success' ? 'Registered! ✓' : 'Complete Registration →'}
                </button>
                <p className="text-[11px] text-muted-foreground text-center mt-3">
                  Registration is free. Your information is kept private.
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
