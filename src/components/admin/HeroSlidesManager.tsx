import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, MoveUp, MoveDown, Save, Download, Image as ImageIcon, X, GripVertical } from 'lucide-react';
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

// Use public/ URLs that won't be hashed by Vite
const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    imageUrl: '/hero-slide-default.jpg',
    eyebrow: 'Welcome to Cherubs Cove Ministry',
    headingHtml: 'The <em class="text-primary italic">Making</em><br />Place.',
    tagline: 'An interdenominational ministry raising burning youths for the Lord.',
    btn1Text: "Register for Quiver's 2026",
    btn1Link: '/register',
    btn2Text: 'Meet Jesse Falodun',
    btn2Link: '/about-jesse',
  },
  {
    id: 'slide-2',
    imageUrl: '/hero-slide-default.jpg',
    eyebrow: 'Welcome to Cherubs Cove Ministry',
    headingHtml: 'The <em class="text-primary italic">Making</em><br />Place.',
    tagline: 'An interdenominational ministry raising burning youths for the Lord.',
    btn1Text: "Register for Quiver's 2026",
    btn1Link: '/register',
    btn2Text: 'Meet Jesse Falodun',
    btn2Link: '/about-jesse',
  },
  {
    id: 'slide-3',
    imageUrl: '/og-image.jpg',
    eyebrow: 'Welcome to Cherubs Cove Ministry',
    headingHtml: 'The <em class="text-primary italic">Making</em><br />Place.',
    tagline: 'An interdenominational ministry raising burning youths for the Lord.',
    btn1Text: "Register for Quiver's 2026",
    btn1Link: '/register',
    btn2Text: 'Meet Jesse Falodun',
    btn2Link: '/about-jesse',
  },
  {
    id: 'slide-4',
    imageUrl: '/hero-slide-default.jpg',
    eyebrow: 'Welcome to Cherubs Cove Ministry',
    headingHtml: 'The <em class="text-primary italic">Making</em><br />Place.',
    tagline: 'An interdenominational ministry raising burning youths for the Lord.',
    btn1Text: "Register for Quiver's 2026",
    btn1Link: '/register',
    btn2Text: 'Meet Jesse Falodun',
    btn2Link: '/about-jesse',
  },
  {
    id: 'slide-5',
    imageUrl: '/og-image.jpg',
    eyebrow: 'Welcome to Cherubs Cove Ministry',
    headingHtml: 'The <em class="text-primary italic">Making</em><br />Place.',
    tagline: 'An interdenominational ministry raising burning youths for the Lord.',
    btn1Text: "Register for Quiver's 2026",
    btn1Link: '/register',
    btn2Text: 'Meet Jesse Falodun',
    btn2Link: '/about-jesse',
  },
  {
    id: 'slide-6',
    imageUrl: '/hero-slide-default.jpg',
    eyebrow: 'About Us',
    headingHtml: 'Our <em class="text-primary italic">Community</em>',
    tagline: 'A family of faith, purpose, and transformation.',
    btn1Text: 'Events & Conferences',
    btn1Link: '/events-conferences',
    btn2Text: 'Our President',
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
  const [saving, setSaving] = useState(false);
  const dragIndex = useRef<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

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
  };

  const removeSlide = (id: string) => {
    if (slides.length <= 1) { toast.error('Keep at least one slide.'); return; }
    setSlides(prev => prev.filter(s => s.id !== id));
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

  // Drag-and-drop handlers
  const handleDragStart = (index: number) => {
    dragIndex.current = index;
  };

  const handleDragOver = (index: number) => {
    dragOverIndex.current = index;
  };

  const handleDragEnd = () => {
    if (dragIndex.current === null || dragOverIndex.current === null) return;
    if (dragIndex.current === dragOverIndex.current) return;

    const next = [...slides];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(dragOverIndex.current, 0, moved);
    setSlides(next);

    dragIndex.current = null;
    dragOverIndex.current = null;
  };

  return (
    <div className="space-y-4 mt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Hero Carousel Slides</h3>
          <p className="text-sm text-[#6B5E50]">
            Add slides, edit the content, and reorder them by dragging the grip handle (⠿) or using the arrow buttons.
            Changes are saved only when you click <strong>Save All Slides</strong>.
          </p>
        </div>
        <Button onClick={addSlide} className="bg-[#E8620A] hover:bg-[#cf5709] text-white">
          <Plus size={14} className="mr-1" /> Add Slide
        </Button>
      </div>

      {slides.map((slide, index) => (
        <Card
          key={slide.id}
          className="bg-[#1A1814] border-[#2A2520] overflow-hidden"
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }}
          onDragEnd={handleDragEnd}
        >
          <div className="flex items-center gap-2 px-3 py-2 bg-[#22201A] border-b border-[#2A2520]">
            {/* Drag handle */}
            <span className="text-[#6B5E50] cursor-grab active:cursor-grabbing hover:text-white transition-colors" title="Drag to reorder">
              <GripVertical size={14} />
            </span>

            <span className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#6B5E50] min-w-[65px]">
              Slide {index + 1}
            </span>

            {/* Mini preview */}
            {slide.imageUrl ? (
              <img
                src={slide.imageUrl}
                alt=""
                className="h-8 w-12 rounded object-cover border border-[#2A2520] shrink-0"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div className="h-8 w-12 rounded bg-[#2A2520] flex items-center justify-center shrink-0">
                <ImageIcon size={12} className="text-[#6B5E50]" />
              </div>
            )}

            <span className="flex-1 text-xs text-[#B5A898] truncate">
              {slide.headingHtml ? slide.headingHtml.replace(/<[^>]*>/g, '').trim() : '(no heading)'}
            </span>

            {/* Reorder buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => moveSlide(index, -1)}
                disabled={index === 0}
                className="rounded p-1 text-[#6B5E50] hover:text-white hover:bg-[#2A2520] disabled:opacity-30 transition-colors"
                title="Move up"
              >
                <MoveUp size={14} />
              </button>
              <button
                onClick={() => moveSlide(index, 1)}
                disabled={index === slides.length - 1}
                className="rounded p-1 text-[#6B5E50] hover:text-white hover:bg-[#2A2520] disabled:opacity-30 transition-colors"
                title="Move down"
              >
                <MoveDown size={14} />
              </button>
              <button
                onClick={() => removeSlide(slide.id)}
                className="rounded p-1 text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors"
                title="Delete slide"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* ── Editor (always visible) ──────────────────────────────── */}
          <div className="p-4 space-y-3">
            {/* Image */}
            <div>
              <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Background Image URL</label>
              <div className="flex gap-2 items-start">
                {slide.imageUrl ? (
                  <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-[#2A2520] shrink-0">
                    <img
                      src={slide.imageUrl}
                      alt="Slide preview"
                      className="w-full h-full object-cover"
                      onError={e => {
                        const img = e.target as HTMLImageElement;
                        img.style.display = 'none';
                        (img.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1A1814] hidden">
                      <span className="text-[10px] text-rose-400">Broken link</span>
                    </div>
                    <button
                      onClick={() => updateSlide(slide.id, 'imageUrl', '')}
                      className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white hover:bg-black/90"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <div className="w-28 h-20 rounded-lg bg-[#2A2520] flex items-center justify-center shrink-0">
                    <ImageIcon size={24} className="text-[#6B5E50]" />
                  </div>
                )}
                <div className="flex-1 space-y-1.5">
                  <Input
                    value={slide.imageUrl}
                    onChange={e => updateSlide(slide.id, 'imageUrl', e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className={inputCls}
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      id={`hero-img-${slide.id}`}
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) uploadSlideImage(slide.id, f); }}
                    />
                    <label
                      htmlFor={`hero-img-${slide.id}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#E8620A] hover:text-[#cf5709] cursor-pointer"
                    >
                      <Download size={12} /> Upload Image
                    </label>
                    <span className="text-[10px] text-[#6B5E50]">or paste a URL above</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Eyebrow + Tagline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Eyebrow text</label>
                <Input
                  value={slide.eyebrow ?? ''}
                  onChange={e => updateSlide(slide.id, 'eyebrow', e.target.value)}
                  placeholder="Welcome to..."
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Tagline</label>
                <Input
                  value={slide.tagline ?? ''}
                  onChange={e => updateSlide(slide.id, 'tagline', e.target.value)}
                  placeholder="Short description..."
                  className={inputCls}
                />
              </div>
            </div>

            {/* Heading (HTML) */}
            <div>
              <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">
                Heading <span className="text-[#6B5E50] font-normal">(HTML allowed)</span>
              </label>
              <Textarea
                value={slide.headingHtml ?? ''}
                onChange={e => updateSlide(slide.id, 'headingHtml', e.target.value)}
                placeholder='The &lt;em class="text-primary italic"&gt;Making&lt;/em&gt;&lt;br /&gt;Place.'
                className={inputCls}
                rows={2}
              />
            </div>

            {/* Button 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Button 1 Text</label>
                <Input
                  value={slide.btn1Text ?? ''}
                  onChange={e => updateSlide(slide.id, 'btn1Text', e.target.value)}
                  placeholder="Register Now"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Button 1 Link</label>
                <Input
                  value={slide.btn1Link ?? ''}
                  onChange={e => updateSlide(slide.id, 'btn1Link', e.target.value)}
                  placeholder="/register"
                  className={inputCls}
                />
              </div>
            </div>

            {/* Button 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Button 2 Text</label>
                <Input
                  value={slide.btn2Text ?? ''}
                  onChange={e => updateSlide(slide.id, 'btn2Text', e.target.value)}
                  placeholder="Learn More"
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898] block mb-1">Button 2 Link</label>
                <Input
                  value={slide.btn2Link ?? ''}
                  onChange={e => updateSlide(slide.id, 'btn2Link', e.target.value)}
                  placeholder="/about"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
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
