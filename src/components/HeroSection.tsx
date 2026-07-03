import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import hero1 from '@/assets/hero/hero1.jpg';
import hero2 from '@/assets/hero/hero2.jpg';
import hero3 from '@/assets/hero/hero3.jpg';
import hero4 from '@/assets/hero/hero4.jpg';
import hero5 from '@/assets/hero/hero5.jpg';
import welcomeImg from '@/assets/welcome.jpg';
import logo from '@/assets/logo/logo.png';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';
import { supabase } from '@/lib/supabaseClient';

const slides = [hero2, hero3, hero4, hero5, hero1, welcomeImg];

export default function HeroSection() {
  const s = useSiteSettings();
  const [current, setCurrent] = useState(0);
  const [verse, setVerse] = useState('');
  const [verseRef, setVerseRef] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('site_settings')
        .select('key,value')
        .in('key', ['hero_verse', 'hero_verse_ref']);
      if (data) {
        data.forEach((r: any) => {
          if (r.key === 'hero_verse' && r.value) setVerse(`"${r.value}"`);
          if (r.key === 'hero_verse_ref' && r.value) setVerseRef(`— ${r.value}`);
        });
      }
    };
    if (!s['hero_verse']) load(); // Load from DB if not yet in cache

    const channel = supabase
      .channel('hero-settings')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'site_settings' }, () => { load(); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <section id="hero" className="min-h-screen flex flex-col relative overflow-hidden pt-[70px]">
      <div className="flex-1 relative min-h-[calc(100vh-70px)] flex items-end">
        {slides.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`Ministry gathering ${i + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              i === current ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transition: 'opacity 1s ease-in-out, transform 6s ease-out',
              transform: i === current ? 'scale(1.03)' : 'scale(1)',
            }}
            loading={i === 0 ? 'eager' : 'lazy'}
          />
        ))}

        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              'linear-gradient(to top, rgba(8,5,2,0.9) 0%, rgba(8,5,2,0.6) 40%, rgba(8,5,2,0.25) 100%)',
          }}
        />

        <div className="relative z-[2] px-6 md:px-16 pb-16 md:pb-20 pt-16 max-w-[820px]">
          <div className="inline-flex items-center gap-2.5 text-[10px] font-bold tracking-[5px] uppercase text-white/55 mb-5">
            <span className="w-[18px] h-px bg-primary inline-block" />
            {getSetting(s, 'hero_eyebrow', 'Welcome to Cherubs Cove Ministry')}
          </div>
          <h1 className="font-heading text-[clamp(48px,7.5vw,96px)] font-normal leading-[0.95] mb-2.5 text-white" dangerouslySetInnerHTML={{ __html: getSetting(s, 'hero_heading_html', 'The <em class="text-primary italic">Making</em><br />Place.') }} />
          <p className="font-heading text-[clamp(16px,2vw,21px)] font-normal italic mb-8 text-white/65">
            {getSetting(s, 'hero_tagline', 'An interdenominational ministry raising burning youths for the Lord.')}
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link to={getSetting(s, 'hero_btn_1_link', '/register')} className="btn-primary-custom">
              {getSetting(s, 'hero_btn_1_text', "Register for Quiver's 2026")}
            </Link>
            <Link to={getSetting(s, 'hero_btn_2_link', '/about-jesse')} className="btn-ghost-custom">
              {getSetting(s, 'hero_btn_2_text', 'Meet Jesse Falodun')}
            </Link>
          </div>
        </div>

        <div className="absolute bottom-6 right-8 z-[3] flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? 'bg-primary w-6' : 'bg-white/40 hover:bg-white/60 w-2'
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Scripture strip — dynamic from site_settings */}
      <div className="bg-[#1A1008] py-6 px-8">
        <div className="max-w-[800px] mx-auto flex items-center gap-5 justify-center">
          <img src={logo} alt="Cherubs Cove" className="h-12 w-12 rounded-full object-contain hidden sm:block flex-shrink-0" />
          <div className="text-center sm:text-left">
            <p className="font-heading text-[clamp(16px,2.2vw,22px)] italic leading-snug text-white/90 font-medium">
              {verse || `"${getSetting(s, 'hero_verse', 'As arrows are in the hand of a mighty man; so are children of the youth.')}"`}
            </p>
            <p className="font-display text-[11px] tracking-[3px] uppercase mt-2 text-primary font-semibold">
              {verseRef || `— ${getSetting(s, 'hero_verse_ref', 'Psalm 127:4')}`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
