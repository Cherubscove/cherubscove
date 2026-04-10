import { useEffect, useState } from 'react';
import { Headphones, Video, FileText, ArrowRight, Download } from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { supabase } from '@/lib/supabaseClient';

type ResType = 'audio' | 'video' | 'pdf';

interface Resource {
  type: ResType;
  title: string;
  speaker: string;
  action: string;
  href: string;
}

const fallbackResources: Resource[] = [
  { type: 'audio', title: 'Walking in Your Kingdom Identity', speaker: "Jesse Falodun — Quiver's Immersion 2025", action: 'Download', href: '#' },
  { type: 'video', title: 'Arise: Walking Into Your Appointed Season', speaker: "Jesse Falodun — Quiver's Forge 2024", action: 'Watch / Download', href: '#' },
  { type: 'audio', title: 'The Sound That Changes Atmospheres', speaker: "Guest Minister — Quiver's Arrows 2023", action: 'Download', href: '#' },
  { type: 'audio', title: 'Positioned for Overflow', speaker: 'Guest Minister — Awakening 2023', action: 'Download', href: '#' },
  { type: 'pdf', title: 'Forge Conference Notes 2024', speaker: "Quiver's Conference Programme Manual", action: 'Download PDF', href: '#' },
  { type: 'video', title: 'He Who Calls Is Faithful', speaker: 'Jesse Falodun — Weekly Teaching', action: 'Watch / Download', href: '#' },
];

const iconMap = {
  audio: { icon: Headphones, color: 'text-primary' },
  video: { icon: Video, color: 'text-gold' },
  pdf: { icon: FileText, color: 'text-muted-foreground' },
};

const tagLabelMap = { audio: 'Audio Sermon', video: 'Video Message', pdf: 'Study Document' };

export default function ResourcesPage() {
  const [filter, setFilter] = useState<'all' | ResType>('all');
  const [resources, setResources] = useState<Resource[]>(fallbackResources);
  const ref = useScrollReveal();

  const loadDownloads = async () => {
    const { data, error } = await supabase.from('downloads').select('*').order('title');
    if (!error && data?.length) {
      setResources(
        data.map((item: any) => ({
          type: (item.type as ResType) || 'pdf',
          title: item.title || 'Resource',
          speaker: item.description || item.category || '',
          action:
            item.type === 'video'
              ? 'Watch / Download'
              : item.type === 'pdf'
              ? 'Download PDF'
              : 'Download',
          href: item.url || '#',
        }))
      );
    }
  };

  useEffect(() => {
    loadDownloads();

    const channel = supabase
      .channel('downloads-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'downloads' }, () => {
        loadDownloads();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = filter === 'all' ? resources : resources.filter((r) => r.type === filter);

  return (
    <>
      <Navbar />
      <div className="pt-[70px] min-h-screen bg-background" ref={ref}>
        <div className="page-header">
          <div className="container">
            <div className="eyebrow reveal">Ministry Resources</div>
            <h1 className="section-title reveal" style={{ fontSize: 'clamp(26px,3.5vw,40px)', margin: '0.5rem 0 0' }}>
              Sermons & <em>Downloads</em>
            </h1>
          </div>
        </div>

        <div className="container py-16">
          <div className="flex gap-2 flex-wrap mb-10 reveal">
            {(['all', 'audio', 'video', 'pdf'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-full border-[1.5px] text-[10px] font-bold tracking-[2px] uppercase transition-all duration-250 ${
                  filter === f
                    ? 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20'
                    : 'border-border text-muted-foreground hover:bg-primary hover:border-primary hover:text-primary-foreground'
                }`}
              >
                {f === 'all' ? 'All' : f === 'pdf' ? 'Documents' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 reveal">
            {filtered.map((res, i) => {
              const { icon: Icon, color } = iconMap[res.type];
              return (
                <div key={i} className="bg-card border border-border rounded-lg p-6 flex flex-col gap-3 card-lift group">
                  <div className="flex items-center justify-between">
                    <div className={`w-10 h-10 rounded-lg bg-orange-soft flex items-center justify-center ${color}`}>
                      <Icon size={18} />
                    </div>
                    <Download size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <span className={`text-[9.5px] font-bold tracking-[2.5px] uppercase ${color}`}>
                    {tagLabelMap[res.type]}
                  </span>
                  <div className="font-heading text-lg font-medium leading-snug text-foreground">{res.title}</div>
                  <div className="text-xs text-gold">{res.speaker}</div>
                  <a
                    href={res.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-auto pt-4 border-t border-border text-[10.5px] font-bold tracking-[2px] uppercase text-primary inline-flex items-center gap-1.5 hover:gap-3 transition-all duration-200"
                  >
                    {res.action} <ArrowRight size={12} />
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
