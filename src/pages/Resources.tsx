import { useState } from 'react';
import { Headphones, Video, FileText, ArrowRight } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type ResType = 'audio' | 'video' | 'pdf';

interface Resource {
  type: ResType;
  title: string;
  speaker: string;
  action: string;
}

const resources: Resource[] = [
  { type: 'audio', title: 'Walking in Your Kingdom Identity', speaker: "Jesse Falodun — Quiver's Immersion 2025", action: 'Download' },
  { type: 'video', title: 'Arise: Walking Into Your Appointed Season', speaker: "Jesse Falodun — Quiver's Forge 2024", action: 'Watch / Download' },
  { type: 'audio', title: 'The Sound That Changes Atmospheres', speaker: "Guest Minister — Quiver's Arrows 2023", action: 'Download' },
  { type: 'audio', title: 'Positioned for Overflow', speaker: 'Guest Minister — Awakening 2023', action: 'Download' },
  { type: 'pdf', title: 'Forge Conference Notes 2024', speaker: "Quiver's Conference Programme Manual", action: 'Download PDF' },
  { type: 'video', title: 'He Who Calls Is Faithful', speaker: 'Jesse Falodun — Weekly Teaching', action: 'Watch / Download' },
];

const iconMap = {
  audio: { icon: Headphones, bg: 'bg-orange-soft' },
  video: { icon: Video, bg: 'bg-gold/10' },
  pdf: { icon: FileText, bg: 'bg-bg-subtle' },
};

const tagColorMap = { audio: 'text-primary', video: 'text-gold', pdf: 'text-muted-foreground' };
const tagLabelMap = { audio: 'Audio Sermon', video: 'Video Message', pdf: 'Study Document' };

export default function ResourcesPage() {
  const [filter, setFilter] = useState<'all' | ResType>('all');
  const ref = useScrollReveal();
  const filtered = filter === 'all' ? resources : resources.filter((r) => r.type === filter);

  return (
    <>
      <Navbar />
      <div className="pt-[70px] min-h-screen bg-bg-alt" ref={ref}>
        <div className="py-16 px-8 bg-background border-b border-border">
          <div className="container">
            <div className="eyebrow reveal">Ministry Resources</div>
            <h1 className="section-title reveal" style={{ fontSize: 'clamp(26px,3.5vw,40px)', margin: '0.5rem 0 0' }}>
              Sermons & <em>Downloads</em>
            </h1>
          </div>
        </div>

        <div className="container py-16">
          <div className="flex gap-1.5 flex-wrap mb-10 reveal">
            {(['all', 'audio', 'video', 'pdf'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-full border-[1.5px] text-[10px] font-bold tracking-[2px] uppercase transition-all duration-250 ${
                  filter === f
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-border-mid text-muted-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground'
                }`}
              >
                {f === 'all' ? 'All' : f === 'pdf' ? 'Documents' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border rounded overflow-hidden reveal">
            {filtered.map((res, i) => {
              const { icon: Icon, bg } = iconMap[res.type];
              return (
                <div key={i} className="bg-card p-8 flex flex-col gap-3.5 transition-colors duration-250 hover:bg-bg-subtle cursor-pointer card-lift">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>
                    <Icon size={17} />
                  </div>
                  <span className={`text-[9.5px] font-bold tracking-[2.5px] uppercase ${tagColorMap[res.type]}`}>
                    {tagLabelMap[res.type]}
                  </span>
                  <div className="font-heading text-lg font-medium leading-snug">{res.title}</div>
                  <div className="text-xs text-gold">{res.speaker}</div>
                  <a href="#" className="mt-auto pt-4 border-t border-border text-[10.5px] font-bold tracking-[2px] uppercase text-primary inline-flex items-center gap-1.5 hover:gap-3 transition-all duration-200">
                    {res.action} <ArrowRight size={12} />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
