import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, MoveUp, MoveDown, Save, Download, Image as ImageIcon, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

/* ── Types ────────────────────────────────────────────────────────────── */

export interface HeroSlide {
  id: string;
  imageUrl: string;
  eyebrow?: string;
  headingHtml?: string;
  tagline?: string;
  btn1Text?: string;
  btn1Link?: string;
  btn2Text?: string;
  btn2Link?: string;
}

/* ── Defaults ─────────────────────────────────────────────────────────── */

const SLIDE_KEY = 'hero_slides_json';

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    imageUrl: '/assets/hero4.jpg',
    eyebrow: 'Welcome to Cherubs Cove Ministry',
    headingHtml: 'The <em class="text-primary italic">Making</em><br />Place.',
    tagline: 'An interdenominational ministry raising burning youths for the Lord.',
    btn1Text: "Register for Quiver's 2026",
    btn1Link: '/register',
    btn2Text: 'Meet Jesse Falodun',
    btn2Link: '/about-jesse',
  },
];

function createEmptySlide(): HeroSlide {
  return {
    id: `slide-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    imageUrl: '',
    eyebrow: '',
    headingHtml: '',
    tagline: '',
    btn1Text: '',
    btn1Link: '',
    btn2Text: '',
    btn2Link: '',
  };
}

/* ── Component ────────────────────────────────────────────────────────── */

interface Props {
  settingsMap: Record<string, string>;
  settingsMeta: { id: string; key: string; label: string; type: string }[];
  onSave: () => void;
  supabase: any;
  inputCls: string;
  toast: any;
}

export default function HeroSlidesManager({ settingsMap, settingsMeta, onSave, supabase, inputCls, toast }: Props) {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load slides from site_settings
  useEffect(() => {
    const raw = settingsMap[SLIDE_KEY];
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlides(parsed);
          return;
        }
      } catch { /* fall through to defaults */ }
    }
    // Use defaults if nothing persisted yet
    setSlides(DEFAULT_SLIDES);
  }, [settingsMap]);

  const persistSlides = useCallback(async (next: HeroSlide[]) => {
    setSaving(true);
    try {
      const meta = settingsMeta.find(s => s.key === SLIDE_KEY);
      const payload = JSON.stringify(next);
      if (meta?.id) {
        await supabase.from('site_settings').update({ value: payload }).eq('id', meta.id);
      } else {
        await supabase.from('site_settings').insert({ key: SLIDE_KEY, label: 'Hero Slides (JSON)', value: payload, type: 'text' });
      }
      toast.success('Hero slides saved.');
      onSave();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save slides');
    } finally {
      setSaving(false);
    }
  }, [settingsMeta, supabase, toast, onSave]);

  const addSlide = () => {
    const next = [...slides, createEmptySlide()];
    setSlides(next);
    setExpandedId(next[next.length - 1].id);
  };

  const removeSlide = (id: string) => {
    if (slides.length <= 1) { toast.error('Keep at least one slide.'); return; }
    setSlides(prev => prev.filter(s => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const moveSlide = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    setSlides(next);
  };

  const updateSlide = (id: string, field: keyof HeroSlide, value: string) => {
    setSlides(prev => prev.map(s => (s.id === id ? { ...s, [field]: value } : s)));
  };

  // Upload image for a slide
  const uploadSlideImage = async (id: string, file: File) => {
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `hero-slides/${id}-${Date.now()}.${ext}`;
    let bucket = 'gallery-images';
    let { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
    if (upErr) {
      bucket = 'event-images';
      ({ error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false }));
    }
    if (upErr) { toast.error(`Upload failed: ${upErr.message}`); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (data) {
      updateSlide(id, 'imageUrl', data.publicUrl);
      toast.success('Image uploaded.');
    }
  };

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Hero Carousel Slides</h3>
          <p className="text-sm text-[#6B5E50]">Add, edit, and reorder the slides shown in the hero section.</p>
        </div>
        <Button onClick={addSlide} className="bg-[#E8620A] hover:bg-[#cf5709] text-white">
          <Plus size={14} className="mr-1" /> Add Slide
        </Button>
      </div>

      {slides.map((slide, index) => (
        <Card key={slide.id} className="bg-[#1A1814] border-[#2A2520] overflow-hidden">
          {/* Collapsed header */}
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#22201A] transition-colors"
            onClick={() => setExpandedId(expandedId === slide.id ? null : slide.id)}
          >
            <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6B5E50] min-w-[60px]">
              Slide {index + 1}
            </span>
            {slide.imageUrl ? (
              <img src={slide.imageUrl} alt="" className="h-10 w-16 rounded object-cover border border-[#2A2520]" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="h-10 w-16 rounded bg-[#2A2520] flex items-center justify-center">
                <ImageIcon size={16} className="text-[#6B5E50]" />
              </div>
            )}
            <span className="flex-1 text-sm text-[#B5A898] truncate">
              {slide.headingHtml ? slide.headingHtml.replace(/<[^>]*>/g, '').trim() : '(no heading)'}
            </span>
            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
              <button onClick={() => moveSlide(index, -1)} disabled={index === 0} className="rounded p-1 text-[#6B5E50] hover:text-white hover:bg-[#2A2520] disabled:opacity-30 transition-colors">
                <MoveUp size={14} />
              </button>
              <button onClick={() => moveSlide(index, 1)} disabled={index === slides.length - 1} className="rounded p-1 text-[#6B5E50] hover:text-white hover:bg-[#2A2520] disabled:opacity-30 transition-colors">
                <MoveDown size={14} />
              </button>
              <button onClick={() => removeSlide(slide.id)} className="rounded p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Expanded editor */}
          {expandedId === slide.id && (
            <div className="border-t border-[#2A2520] p-4 space-y-3">
              {/* Image */}
              <div>
                <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Background Image</label>
                <div className="flex gap-2 items-start">
                  {slide.imageUrl ? (
                    <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-[#2A2520] shrink-0">
                      <img src={slide.imageUrl} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <button onClick={() => updateSlide(slide.id, 'imageUrl', '')} className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-16 rounded-lg bg-[#2A2520] flex items-center justify-center shrink-0">
                      <ImageIcon size={20} className="text-[#6B5E50]" />
                    </div>
                  )}
                  <div className="relative flex-1">
                    <Input
                      value={slide.imageUrl}
                      onChange={e => updateSlide(slide.id, 'imageUrl', e.target.value)}
                      placeholder="https://... or /path/to/image.jpg"
                      className={inputCls}
                    />
                    <div className="mt-1.5">
                      <input
                        type="file"
                        accept="image/*"
                        id={`hero-img-${slide.id}`}
                        className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) uploadSlideImage(slide.id, f); }}
                      />
                      <label htmlFor={`hero-img-${slide.id}`} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#E8620A] hover:text-[#cf5709] cursor-pointer">
                        <Download size={12} /> Upload Image
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Text fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Eyebrow</label>
                  <Input value={slide.eyebrow ?? ''} onChange={e => updateSlide(slide.id, 'eyebrow', e.target.value)} placeholder="Welcome to..." className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Tagline</label>
                  <Input value={slide.tagline ?? ''} onChange={e => updateSlide(slide.id, 'tagline', e.target.value)} placeholder="Short description..." className={inputCls} />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Heading (HTML)</label>
                <Textarea value={slide.headingHtml ?? ''} onChange={e => updateSlide(slide.id, 'headingHtml', e.target.value)} placeholder='The &lt;em class="text-primary italic"&gt;Making&lt;/em&gt;&lt;br /&gt;Place.' className={inputCls} rows={2} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Button 1 Text</label>
                  <Input value={slide.btn1Text ?? ''} onChange={e => updateSlide(slide.id, 'btn1Text', e.target.value)} placeholder="Register Now" className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Button 1 Link</label>
                  <Input value={slide.btn1Link ?? ''} onChange={e => updateSlide(slide.id, 'btn1Link', e.target.value)} placeholder="/register" className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Button 2 Text</label>
                  <Input value={slide.btn2Text ?? ''} onChange={e => updateSlide(slide.id, 'btn2Text', e.target.value)} placeholder="Learn More" className={inputCls} />
                </div>
                <div>
                  <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Button 2 Link</label>
                  <Input value={slide.btn2Link ?? ''} onChange={e => updateSlide(slide.id, 'btn2Link', e.target.value)} placeholder="/about" className={inputCls} />
                </div>
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* Save All */}
      <div className="flex justify-end">
        <Button onClick={() => persistSlides(slides)} disabled={saving} className="bg-[#E8620A] hover:bg-[#cf5709] text-white">
          <Save size={14} className="mr-1.5" />
          {saving ? 'Saving...' : 'Save All Slides'}
        </Button>
      </div>
    </div>
  );
}
