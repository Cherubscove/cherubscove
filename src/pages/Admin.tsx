import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Session } from '@supabase/supabase-js';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  Calendar, Download, Image, Settings, Users, LogOut, Plus, Trash2, Edit2, Save, X, Eye, EyeOff, FileDown, ArrowUpDown, ClipboardList, FileText, ToggleLeft, ToggleRight, CheckSquare, Square, FolderInput, Star,
} from 'lucide-react';
import FormFieldBuilder from '@/components/admin/FormFieldBuilder';
import { SEED_EVENTS, SEED_DOWNLOADS, SEED_GALLERIES } from '@/lib/seedData';
import type {
  EventRecord, DownloadRecord, GalleryRecord, RegistrationRecord, FormFieldConfig, GalleryCollection,
  emptyEvent as _ee, emptyDownload as _ed, emptyGallery as _eg,
} from '@/lib/adminTypes';
import { emptyEvent, emptyDownload, emptyGallery, formatEventDateRange, validateEventDateTime, buildEventRegistrationLink, generateNextImageTitle, generateGalleryAbbreviation } from '@/lib/adminTypes';

/* ── Content Keys (seed defaults for every editable frontend text) ────── */

const CONTENT_DEFAULTS: { key: string; label: string; value: string; group: string }[] = [
  { key: 'welcome_eyebrow', label: 'Welcome — Eyebrow', value: 'Who We Are', group: 'Welcome Section' },
  { key: 'welcome_paragraph_1', label: 'Welcome — Paragraph 1', value: 'Cherubs Cove is an interdenominational ministry committed to raising a generation on fire for God. We exist to equip, ignite, and release burning youths into every sphere of society, with the Gospel of Jesus Christ as our foundation and compass.', group: 'Welcome Section' },
  { key: 'welcome_paragraph_2', label: 'Welcome — Paragraph 2', value: "We believe the Church must rise to reflect Christ in its fullness, and we are devoted to providing a spiritual environment where every individual finds their place in God's grand narrative. From our gatherings to our flagship International Quivers Conference, everything flows from one conviction: this is the making place.", group: 'Welcome Section' },
  { key: 'info_1_label', label: 'Info Strip 1 — Label', value: 'Ministry Type', group: 'Info Strip' },
  { key: 'info_1_value', label: 'Info Strip 1 — Value', value: 'Interdenominational', group: 'Info Strip' },
  { key: 'info_1_sub', label: 'Info Strip 1 — Subtitle', value: 'Open to all believers', group: 'Info Strip' },
  { key: 'info_2_label', label: 'Info Strip 2 — Label', value: 'Events & Conferences', group: 'Info Strip' },
  { key: 'info_2_value', label: 'Info Strip 2 — Value', value: 'International Quivers Conf.', group: 'Info Strip' },
  { key: 'info_2_sub', label: 'Info Strip 2 — Subtitle', value: 'Annual gathering', group: 'Info Strip' },
  { key: 'info_3_label', label: 'Info Strip 3 — Label', value: 'Based In', group: 'Info Strip' },
  { key: 'info_3_value', label: 'Info Strip 3 — Value', value: 'Nigeria', group: 'Info Strip' },
  { key: 'info_3_sub', label: 'Info Strip 3 — Subtitle', value: 'Reaching the nations', group: 'Info Strip' },
  { key: 'events_eyebrow', label: 'Events — Eyebrow', value: 'Programs & Events', group: 'Events Section' },
  { key: 'events_heading', label: 'Events — Heading (before em)', value: 'Upcoming', group: 'Events Section' },
  { key: 'events_heading_em', label: 'Events — Heading (italic part)', value: 'Gatherings', group: 'Events Section' },
  { key: 'events_intro', label: 'Events — Intro Text', value: 'Join us at the International Quivers Conference 2026 — "Envoys of Light." Registration is free and open to all believers.', group: 'Events Section' },
  { key: 'conf_title', label: 'Conference — Title', value: "QUIVER'S 2026", group: 'Events Section' },
  { key: 'conf_subtitle', label: 'Conference — Subtitle', value: 'Envoys of Light', group: 'Events Section' },
  { key: 'conf_venue', label: 'Conference — Venue', value: 'To Be Announced', group: 'Events Section' },
  { key: 'conf_attendance', label: 'Conference — Attendance', value: 'Free — Open to All', group: 'Events Section' },
  { key: 'about_eyebrow', label: 'About — Eyebrow', value: 'Meet Our President', group: 'About Page' },
  { key: 'about_heading', label: 'About — Heading (HTML)', value: 'A Voice. A <em>Vision.</em><br />A Commission.', group: 'About Page' },
  { key: 'about_name', label: 'About — Name', value: 'Jesse Falodun', group: 'About Page' },
  { key: 'about_title', label: 'About — Title', value: 'President, Cherubs Cove', group: 'About Page' },
  { key: 'about_bio_1', label: 'About — Bio Paragraph 1', value: 'Jesse Falodun was born and bred in Kano...', group: 'About Page' },
  { key: 'about_bio_2', label: 'About — Bio Paragraph 2', value: "One of Jesse's topmost commissions...", group: 'About Page' },
  { key: 'about_bio_3', label: 'About — Bio Paragraph 3', value: 'A graduate of Mass Communication...', group: 'About Page' },
  { key: 'about_bio_4', label: 'About — Bio Paragraph 4', value: 'He strikes a unique balance...', group: 'About Page' },
  { key: 'about_tags', label: 'About — Tags (comma-separated)', value: 'Ministry President,Conference Convener,OAP / Broadcaster,Spoken Word Artist,School of Ministry Graduate,C&S Church Member,Brand Designer,Writer', group: 'About Page' },
  { key: 'about_tags_highlight', label: 'About — Highlighted Tags', value: 'Ministry President,Conference Convener', group: 'About Page' },
  { key: 'about_cta_title', label: 'About — CTA Title', value: 'Connect with Jesse', group: 'About Page' },
  { key: 'about_cta_text', label: 'About — CTA Text', value: 'Want to invite Jesse to speak at your event or learn more about Cherubs Cove Ministry?', group: 'About Page' },
  { key: 'footer_tagline', label: 'Footer — Tagline', value: 'An interdenominational ministry raising burning youths for the Lord.', group: 'Footer' },
  { key: 'hero_verse', label: 'Hero — Scripture Verse', value: 'As arrows are in the hand of a mighty man; so are children of the youth.', group: 'Hero Section' },
  { key: 'hero_verse_ref', label: 'Hero — Scripture Reference', value: 'Psalm 127:4', group: 'Hero Section' },
  { key: 'contact_email', label: 'Contact — Email', value: 'hello@cherubscove.org', group: 'Contact Info' },
  { key: 'contact_phone', label: 'Contact — Phone', value: '+234 000 000 0000', group: 'Contact Info' },
  { key: 'location', label: 'Contact — Location', value: 'Nigeria', group: 'Contact Info' },
  { key: 'facebook_url', label: 'Facebook URL', value: '', group: 'Social Links' },
  { key: 'instagram_url', label: 'Instagram URL', value: '', group: 'Social Links' },
  { key: 'youtube_url', label: 'YouTube URL', value: '', group: 'Social Links' },
  { key: 'twitter_url', label: 'X/Twitter URL', value: '', group: 'Social Links' },
  { key: 'whatsapp_url', label: 'WhatsApp URL', value: '', group: 'Social Links' },
];

/* ── Component ──────────────────────────────────────────────────────────── */

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898]">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-[#6B5E50]">{hint}</p>}
  </div>
);

/** Convert Google Drive share URLs into direct-image URLs that browsers can render. */
export function normalizeImageUrl(url: string): string {
  if (!url) return url;
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^&]*&)*id=)([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
  return url;
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [isLoading, setIsLoading] = useState(false);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [gallery, setGallery] = useState<GalleryRecord[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [settingsMeta, setSettingsMeta] = useState<{ id: string; key: string; label: string; type: string }[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [contentValues, setContentValues] = useState<Record<string, string>>({});
  const [contentGroup, setContentGroup] = useState('all');

  const [editEvent, setEditEvent] = useState<EventRecord | null>(null);
  const [editDownload, setEditDownload] = useState<DownloadRecord | null>(null);
  const [editGallery, setEditGallery] = useState<GalleryRecord | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'super_admin'>('admin');
  const [adminList, setAdminList] = useState<{ email: string; role: 'super_admin' | 'admin' }[]>([]);

  const [regSort, setRegSort] = useState<{ col: keyof RegistrationRecord; asc: boolean }>({ col: 'created_at', asc: false });
  const [regSearch, setRegSearch] = useState('');
  const [regSelectedGroupKey, setRegSelectedGroupKey] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
  const [bulkAddMode, setBulkAddMode] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [importingBulk, setImportingBulk] = useState(false);

  // Bulk image selection (move / delete)
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState<string>('');

  // Gallery collections (stored as JSON in site_settings["galleries_json"])
  const [galleries, setGalleries] = useState<GalleryCollection[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [editCollection, setEditCollection] = useState<GalleryCollection | null>(null);
  const selectedGallery = galleries.find(g => g.id === selectedGalleryId) || null;
  const imagesInSelectedGallery = selectedGallery
    ? gallery.filter(g => {
        const category = (g.category || '').trim();
        return category === selectedGallery.id || category === selectedGallery.name;
      })
    : [];

  // Group registrations by event
  const regGroups = useMemo(() => {
    const map = new Map<string, { key: string; title: string; items: RegistrationRecord[] }>();
    registrations.forEach(r => {
      const key = r.event_id || r.event_title || r.program || 'general';
      const title = r.event_title || r.program || 'General Registrations';
      if (!map.has(key)) map.set(key, { key, title, items: [] });
      map.get(key)!.items.push(r);
    });
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [registrations]);

  /* ── Auth ─────────────────────────────────────────────────────────────── */

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s) loadAllData();
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadAllData();
    });
    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) { toast.error('Please enter both email and password.'); return; }
    setIsLoading(true);
    try {
      if (authMode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Signed in successfully.');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Account created. Check your email for verification if required.');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Authentication failed.');
    } finally { setIsLoading(false); }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setSession(null); toast.info('Signed out.'); };

  /* ── Data Loading + Seeding ─────────────────────────────────────────── */

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [ev, dl, gal, st, reg] = await Promise.all([
        supabase.from('events').select('*').order('date', { ascending: false }),
        supabase.from('downloads').select('*').order('title'),
        supabase.from('gallery').select('*').order('created_at', { ascending: false }),
        supabase.from('site_settings').select('*'),
        supabase.from('registrations').select('*').order('created_at', { ascending: false }),
      ]);

      // Auto-seed events if empty
      if (!ev.data?.length) {
        await supabase.from('events').insert(SEED_EVENTS);
        const { data: seeded } = await supabase.from('events').select('*').order('date', { ascending: false });
        setEvents(seeded ?? []);
      } else {
        setEvents(ev.data ?? []);
      }

      // Auto-seed downloads if empty
      if (!dl.data?.length) {
        await supabase.from('downloads').insert(SEED_DOWNLOADS);
        const { data: seeded } = await supabase.from('downloads').select('*').order('title');
        setDownloads(seeded ?? []);
      } else {
        setDownloads(dl.data ?? []);
      }

      setGallery(gal.data ?? []);
      setRegistrations(reg.data ?? []);

      const settings = st.data ?? [];
      setSettingsMeta(settings.map((r: any) => ({ id: r.id, key: r.key, label: r.label, type: r.type })));
      const settingsMap = settings.reduce((acc: Record<string, string>, r: any) => { acc[r.key] = r.value ?? ''; return acc; }, {});
      setSiteSettings(settingsMap);

      const cv: Record<string, string> = {};
      CONTENT_DEFAULTS.forEach(cd => { cv[cd.key] = settingsMap[cd.key] ?? cd.value; });
      setContentValues(cv);

      const existingKeys = new Set(settings.map((r: any) => r.key));
      const missing = CONTENT_DEFAULTS.filter(cd => !existingKeys.has(cd.key));
      let finalSettings = settings;
      if (missing.length > 0) {
        await supabase.from('site_settings').insert(missing.map(cd => ({ key: cd.key, label: cd.label, value: cd.value, type: 'text' })));
        const { data: refreshed } = await supabase.from('site_settings').select('*');
        if (refreshed) {
          finalSettings = refreshed;
          setSettingsMeta(refreshed.map((r: any) => ({ id: r.id, key: r.key, label: r.label, type: r.type })));
          const refreshedMap = refreshed.reduce((acc: Record<string, string>, r: any) => { acc[r.key] = r.value ?? ''; return acc; }, {});
          setSiteSettings(refreshedMap);
        }
      }
      await loadAdminList(finalSettings);
      await loadGalleries(finalSettings);
    } finally { setIsLoading(false); }
  };

  /* ── Save Content Setting ──────────────────────────────────────────── */

  const saveContentSetting = async (key: string) => {
    const meta = settingsMeta.find(s => s.key === key);
    if (!meta) { toast.error('Setting not found in DB. Try reloading.'); return; }
    const { error } = await supabase.from('site_settings').update({ value: contentValues[key] }).eq('id', meta.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved.');
  };

  /* ── CRUD: Events ────────────────────────────────────────────────────── */

  const saveEvent = async () => {
    if (!editEvent) return;
    if (!editEvent.title) { toast.error('Event title is required.'); return; }

    const validation = validateEventDateTime(editEvent);
    if (!validation.isValid) {
      toast.error(validation.message ?? 'Please check the event dates and times.');
      return;
    }

    const payload: any = {
      title: editEvent.title,
      theme: editEvent.theme || null,
      status: editEvent.status,
      date: editEvent.date || null,
      end_date: editEvent.end_date || null,
      time: editEvent.time || null,
      end_time: editEvent.end_time || null,
      image_url: editEvent.image_url, description: editEvent.description,
      location: editEvent.location,
      registration_enabled: editEvent.registration_enabled ?? false,
      form_fields: editEvent.form_fields ?? '[]',
    };

    try {
      if (editEvent.id) {
        const { error } = await supabase.from('events').update(payload).eq('id', editEvent.id);
        if (error) throw error;
        toast.success('Event updated.');
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
        toast.success('Event created.');
      }
      setEditEvent(null);
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message + (error.message.includes('column') ? ' — Run the migration in the note below.' : ''));
    }
  };

  const uploadEventImage = async (file: File) => {
    if (!editEvent) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `events/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('event-images').upload(path, file, { upsert: false });
      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}. Create a public bucket named "event-images" in Supabase Storage.`);
        return;
      }
      const { data } = supabase.storage.from('event-images').getPublicUrl(path);
      setEditEvent({ ...editEvent, image_url: data.publicUrl });
      toast.success('Image uploaded.');
    } finally { setUploadingImage(false); }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    await supabase.from('events').delete().eq('id', id);
    toast.success('Event deleted.');
    loadAllData();
  };

  const toggleEventRegistration = async (ev: EventRecord) => {
    const newVal = !ev.registration_enabled;
    const { error } = await supabase.from('events').update({ registration_enabled: newVal }).eq('id', ev.id);
    if (error) { toast.error(error.message); return; }
    toast.success(newVal ? 'Registration enabled.' : 'Registration disabled.');
    loadAllData();
  };

  /* ── CRUD: Downloads ─────────────────────────────────────────────────── */

  const saveDownload = async () => {
    if (!editDownload) return;
    if (!editDownload.title || !editDownload.url) { toast.error('Title and URL are required.'); return; }
    const payload = { title: editDownload.title, url: editDownload.url, description: editDownload.description, category: editDownload.category, type: editDownload.type };
    if (editDownload.id) {
      const { error } = await supabase.from('downloads').update(payload).eq('id', editDownload.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Download updated.');
    } else {
      const { error } = await supabase.from('downloads').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Download created.');
    }
    setEditDownload(null);
    loadAllData();
  };

  const deleteDownload = async (id: string) => {
    if (!confirm('Delete this download?')) return;
    await supabase.from('downloads').delete().eq('id', id);
    toast.success('Download deleted.');
    loadAllData();
  };

  /* ── CRUD: Gallery ───────────────────────────────────────────────────── */

  /** Extract a readable title from a URL's filename — returns empty for Google Drive so gallery-based naming is used. */
  function titleFromUrl(url: string): string {
    try {
      if (url.includes('drive.google.com')) {
        return ''; // Gallery-based naming will be applied instead
      }
      const filename = url.split('/').pop()?.split('?')[0]?.split('#')[0] || '';
      const name = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch { return ''; }
  }

  const trySaveGallery = async (data: Record<string, string>) => {
    if (!editGallery) return { data: null, error: { message: 'No gallery item.' } } as any;
    if (editGallery.id) {
      return supabase.from('gallery').update(data).eq('id', editGallery.id);
    }
    return supabase.from('gallery').insert(data);
  };

  const saveGallery = async () => {
    if (!editGallery) return;
    if (!editGallery.image_url) { toast.error('Image URL is required.'); return; }

    // ── Determine effective gallery name for auto-title ─────────────
    const effectiveGalId = editGallery.category || selectedGalleryId || '';
    const effectiveGal = galleries.find(g => g.id === effectiveGalId || g.name === effectiveGalId);

    // ── Auto-generate title if none provided ────────────────────────
    let title = editGallery.title || '';
    if (!title) {
      const fromUrl = titleFromUrl(editGallery.image_url);
      if (fromUrl) {
        title = fromUrl;
      } else if (effectiveGal) {
        // Find max existing index in this gallery for stable numbering
        const imagesInGal = gallery.filter(g => {
          const cat = (g.category || '').trim();
          return (cat === effectiveGal.id || cat === effectiveGal.name) && g.id !== editGallery.id;
        });
        title = generateNextImageTitle(imagesInGal, effectiveGal.name);
      } else {
        // Uncategorized — find max index for stable numbering
        const uncatImages = gallery.filter(g => {
          const cat = (g.category || '').trim();
          return !cat || !galleries.some(gc => gc.id === cat || gc.name === cat);
        });
        title = generateNextImageTitle(uncatImages, null);
      }
    }

    const alt_text = editGallery.alt_text || `Photo: ${title}`;
    const normalizedImageUrl = normalizeImageUrl(editGallery.image_url);
    const payload: Record<string, string> = {
      title,
      image_url: normalizedImageUrl,
      caption: editGallery.caption,
      alt_text,
    };

    const categoryCandidates: string[] = [];
    if (editGallery.category) categoryCandidates.push(editGallery.category);
    const selectedGallery = galleries.find(g => g.id === selectedGalleryId);
    if (selectedGallery && selectedGallery.name && !categoryCandidates.includes(selectedGallery.name)) {
      categoryCandidates.push(selectedGallery.name);
    }

    if (categoryCandidates.length) {
      payload.category = categoryCandidates[0];
    }

    let { error } = await trySaveGallery(payload);
    if (error) {
      if (payload.alt_text && error.code === '42703') {
        delete payload.alt_text;
        const retry = await trySaveGallery(payload);
        error = retry.error;
      }
    }

    if (error && payload.category) {
      for (let i = 0; i < categoryCandidates.length; i += 1) {
        const candidate = categoryCandidates[i];
        payload.category = candidate;
        const retry = await trySaveGallery(payload);
        if (!retry.error) {
          error = null;
          break;
        }
        if (retry.error.code !== '23514') {
          error = retry.error;
          break;
        }
      }
    }

    if (error && payload.category) {
      delete payload.category;
      const retry = await trySaveGallery(payload);
      error = retry.error;
      if (!error) {
        toast.success(editGallery.id ? 'Gallery item updated without category.' : 'Gallery item created without category.');
      }
    }

    if (error) { toast.error(error.message || 'Unable to save gallery item.'); return; }
    if (!payload.category) {
      toast.success(editGallery.id ? 'Gallery item updated without category.' : 'Gallery item created without category.');
    } else {
      toast.success(editGallery.id ? 'Gallery item updated.' : 'Gallery item created.');
    }
    setEditGallery(null);
    loadAllData();
  };

  const uploadGalleryImage = async (file: File) => {
    if (!editGallery) return;
    setUploadingGalleryImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      // Try dedicated gallery bucket, fall back to event-images
      let bucket = 'gallery-images';
      let { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (upErr) {
        bucket = 'event-images';
        ({ error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false }));
      }
      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}. Create a public bucket named "gallery-images" (or "event-images") in Supabase Storage.`);
        return;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setEditGallery({ ...editGallery, image_url: data.publicUrl });
      toast.success('Image uploaded.');
    } finally { setUploadingGalleryImage(false); }
  };


  const deleteGallery = async (id: string) => {
    if (!confirm('Delete this gallery item?')) return;
    await supabase.from('gallery').delete().eq('id', id);
    toast.success('Gallery item deleted.');
    loadAllData();
  };

  /* ── Bulk image selection (move / delete) ────────────────────────────── */

  const toggleSelectImage = (id: string) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllImages = (ids: string[]) => {
    setSelectedImageIds(prev => {
      if (prev.size === ids.length && [...prev].every(id => ids.includes(id))) {
        return new Set();
      }
      return new Set(ids);
    });
  };

  const bulkDeleteImages = async () => {
    if (selectedImageIds.size === 0) return;
    if (!confirm(`Delete ${selectedImageIds.size} image(s)?`)) return;
    const ids = [...selectedImageIds];
    const { error } = await supabase.from('gallery').delete().in('id', ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`${ids.length} image(s) deleted.`);
    setSelectedImageIds(new Set());
    loadAllData();
  };

  const bulkMoveImages = async () => {
    if (selectedImageIds.size === 0 || !bulkCategoryTarget) return;
    const ids = [...selectedImageIds];
    const targetVal = bulkCategoryTarget;
    const { error } = await supabase.from('gallery').update({ category: targetVal }).in('id', ids);
    if (error) {
      if (error.code === '23514') {
        toast.error('The selected category was rejected by the database. Try using the gallery name or ID.');
      } else {
        toast.error(error.message);
      }
      return;
    }
    const catName = galleries.find(g => g.id === targetVal || g.name === targetVal)?.name || targetVal;
    // Update titles of moved images — each gets the next available index
    const { data: movedImgs } = await supabase
      .from('gallery')
      .select('id, title')
      .in('id', ids)
      .order('created_at', { ascending: true });
    if (movedImgs) {
      // First, find all existing images already in the target gallery (excluding the ones being moved)
      const existingTargetIds = new Set(ids);
      const existingTargetImgs = gallery.filter(g => {
        const cat = (g.category || '').trim();
        return (cat === targetVal || cat === catName) && !existingTargetIds.has(g.id!);
      });
      // Track current max index, then assign sequentially
      let nextIdx = 1;
      for (const img of existingTargetImgs) {
        const t = img.title || '';
        if (t.startsWith(catName ? generateGalleryAbbreviation(catName) : 'Uncategorized')) {
          const match = t.match(/-(\d{3})$/);
          if (match) {
            const idx = parseInt(match[1], 10);
            if (idx >= nextIdx) nextIdx = idx + 1;
          }
        }
      }
      for (const img of movedImgs) {
        const newTitle = `${catName ? generateGalleryAbbreviation(catName) : 'Uncategorized'}-${String(nextIdx).padStart(3, '0')}`;
        await supabase.from('gallery').update({ title: newTitle }).eq('id', img.id);
        nextIdx++;
      }
    }
    toast.success(`${ids.length} image(s) moved to "${catName}".`);
    setSelectedImageIds(new Set());
    setBulkCategoryTarget('');
    loadAllData();
  };

  /* ── One-time migration: retitle existing images ─────────────────────── */

  const migrateExistingImageTitles = async () => {
    if (!gallery.length) return;

    const oldTitlePattern = /google drive image|gallery photo/i;
    const needsMigration = gallery.some(g => oldTitlePattern.test(g.title || '') || !(g.title || '').match(/-(\d{3})$/));
    if (!needsMigration) return;

    console.log('[migrate] Retitling existing gallery images…');

    // Group images by effective gallery
    const byGallery = new Map<string, typeof gallery>();
    const uncategorized: typeof gallery = [];

    for (const img of gallery) {
      const cat = (img.category || '').trim();
      const gal = cat ? galleries.find(g => g.id === cat || g.name === cat) : null;
      if (gal) {
        const key = gal.name;
        if (!byGallery.has(key)) byGallery.set(key, []);
        byGallery.get(key)!.push(img);
      } else {
        uncategorized.push(img);
      }
    }

    // Helper: compute next stable index for a set of images given an abbreviation
    const reindexGroup = async (images: typeof gallery, abbr: string) => {
      let nextIdx = 1;
      // First pass: find max existing index from titles that already match the pattern
      for (const img of images) {
        const t = img.title || '';
        if (t.startsWith(abbr)) {
          const match = t.match(/-(\d{3})$/);
          if (match) {
            const idx = parseInt(match[1], 10);
            if (idx >= nextIdx) nextIdx = idx + 1;
          }
        }
      }
      // Second pass: assign new titles to images that don't follow the pattern
      for (const img of images) {
        const t = img.title || '';
        if (oldTitlePattern.test(t) || !t.match(/-(\d{3})$/)) {
          const newTitle = `${abbr}-${String(nextIdx).padStart(3, '0')}`;
          await supabase.from('gallery').update({ title: newTitle }).eq('id', img.id);
          nextIdx++;
        }
      }
    };

    for (const [galName, images] of byGallery.entries()) {
      const abbr = generateGalleryAbbreviation(galName);
      await reindexGroup(images, abbr);
    }
    if (uncategorized.length) {
      await reindexGroup(uncategorized, 'Uncategorized');
    }

    const total = gallery.length;
    const migrated = gallery.filter(g => oldTitlePattern.test(g.title || '') || !(g.title || '').match(/-(\d{3})$/)).length;
    if (migrated > 0) {
      toast.success(`Re-titled ${migrated} existing image(s) to gallery-based naming.`);
      loadAllData();
    }
  };

  // Run migration once when gallery data is ready
  const [migrationDone, setMigrationDone] = useState(false);
  useEffect(() => {
    if (gallery.length > 0 && !migrationDone) {
      migrateExistingImageTitles();
      setMigrationDone(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery.length, galleries.length]);

  /* ── Site Settings ───────────────────────────────────────────────────── */

  const saveSetting = async (key: string) => {
    const meta = settingsMeta.find(s => s.key === key);
    if (!meta) return;
    const { error } = await supabase.from('site_settings').update({ value: siteSettings[key] }).eq('id', meta.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${meta.label} saved.`);
  };

  /* ── Admin Invite & Management ───────────────────────────────────────── */

  const SUPER_ADMIN_EMAIL = 'cherubscove@gmail.com';
  const ADMIN_LIST_KEY = 'admin_users_json';

  const isSuperAdmin = session?.user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const loadAdminList = async (settingsRows: any[]) => {
    const row = settingsRows.find(r => r.key === ADMIN_LIST_KEY);
    let parsed: { email: string; role: 'super_admin' | 'admin' }[] = [];
    if (row?.value) {
      try { parsed = JSON.parse(row.value); } catch { parsed = []; }
    }
    // Ensure super admin is always present
    if (!parsed.some(a => a.email.toLowerCase() === SUPER_ADMIN_EMAIL)) {
      parsed.unshift({ email: SUPER_ADMIN_EMAIL, role: 'super_admin' });
      const payload = JSON.stringify(parsed);
      const res = row
        ? await supabase.from('site_settings').update({ value: payload }).eq('id', row.id)
        : await supabase.from('site_settings').insert({ key: ADMIN_LIST_KEY, label: 'Admin Users (JSON)', value: payload, type: 'text' });
      if (res.error) {
        toast.error(`Could not persist admin list: ${res.error.message}. Check site_settings RLS policies.`);
      }
    }
    setAdminList(parsed);
  };

  const persistAdminList = async (next: { email: string; role: 'super_admin' | 'admin' }[]) => {
    const { data: existing } = await supabase.from('site_settings').select('id').eq('key', ADMIN_LIST_KEY).maybeSingle();
    const payload = JSON.stringify(next);
    if (existing?.id) {
      await supabase.from('site_settings').update({ value: payload }).eq('id', existing.id);
    } else {
      await supabase.from('site_settings').insert({ key: ADMIN_LIST_KEY, label: 'Admin Users (JSON)', value: payload, type: 'text' });
    }
    setAdminList(next);
  };

  const inviteAdmin = async () => {
    if (!inviteEmail.trim() || !invitePassword.trim()) { toast.error('Enter email and password for the new admin.'); return; }
    const email = inviteEmail.trim().toLowerCase();
    const { error } = await supabase.auth.signUp({ email, password: invitePassword });
    if (error && !/already/i.test(error.message)) { toast.error(error.message); return; }
    const next = adminList.some(a => a.email.toLowerCase() === email)
      ? adminList
      : [...adminList, { email, role: inviteRole }];
    await persistAdminList(next);
    toast.success(`${email} added as ${inviteRole === 'super_admin' ? 'super admin' : 'admin'}.`);
    setInviteEmail('');
    setInvitePassword('');
  };

  const removeAdmin = async (email: string) => {
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL) { toast.error('The super admin cannot be removed.'); return; }
    if (!isSuperAdmin) { toast.error('Only the super admin can remove admins.'); return; }
    if (!confirm(`Remove ${email} from admins?`)) return;
    await persistAdminList(adminList.filter(a => a.email.toLowerCase() !== email.toLowerCase()));
    toast.success('Admin removed.');
  };

  const changeAdminRole = async (email: string, role: 'admin' | 'super_admin') => {
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL) { toast.error("The super admin's role is locked."); return; }
    if (!isSuperAdmin) { toast.error('Only the super admin can change roles.'); return; }
    await persistAdminList(adminList.map(a => a.email.toLowerCase() === email.toLowerCase() ? { ...a, role } : a));
    toast.success('Role updated.');
  };

  const GALLERIES_KEY = 'galleries_json';
  const persistGalleries = async (next: GalleryCollection[]) => {
    const { data: existing } = await supabase.from('site_settings').select('id').eq('key', GALLERIES_KEY).maybeSingle();
    const payload = JSON.stringify(next);
    if (existing?.id) {
      await supabase.from('site_settings').update({ value: payload }).eq('id', existing.id);
    } else {
      await supabase.from('site_settings').insert({ key: GALLERIES_KEY, label: 'Galleries (JSON)', value: payload, type: 'text' });
    }
    setGalleries(next);
  };

  const loadGalleries = async (settingsRows: any[]) => {
    const row = settingsRows.find(r => r.key === GALLERIES_KEY);
    let parsed: GalleryCollection[] = [];
    if (row?.value) { try { parsed = JSON.parse(row.value); } catch { parsed = []; } }
    if (!parsed.length) {
      parsed = SEED_GALLERIES;
      const payload = JSON.stringify(parsed);
      if (row) await supabase.from('site_settings').update({ value: payload }).eq('id', row.id);
      else await supabase.from('site_settings').insert({ key: GALLERIES_KEY, label: 'Galleries (JSON)', value: payload, type: 'text' });
    }
    setGalleries(parsed);
  };

  /* ── Registrations: Sort & Filter ────────────────────────────────────── */


  const sortedRegistrations = useMemo(() => {
    let filtered = registrations;
    if (regSelectedGroupKey) {
      const grp = regGroups.find(g => g.key === regSelectedGroupKey);
      filtered = grp ? grp.items : [];
    }
    if (regSearch.trim()) {
      const q = regSearch.toLowerCase();
      filtered = filtered.filter(r =>
        `${r.first_name} ${r.last_name} ${r.email} ${r.program} ${r.location} ${r.event_title || ''}`.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      const av = (a[regSort.col] ?? '') as string;
      const bv = (b[regSort.col] ?? '') as string;
      return regSort.asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [registrations, regSort, regSearch, regSelectedGroupKey, regGroups]);

  const toggleSort = (col: keyof RegistrationRecord) => {
    setRegSort(prev => prev.col === col ? { col, asc: !prev.asc } : { col, asc: true });
  };

  const exportCSV = () => {
    if (!sortedRegistrations.length) { toast.error('No registrations to export.'); return; }
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Event', 'Location', 'Note', 'Date', 'Extra Data'];
    const rows = sortedRegistrations.map(r => [
      r.first_name, r.last_name, r.email, r.phone, r.event_title || r.program || '',
      r.location, `"${(r.note || '').replace(/"/g, '""')}"`,
      new Date(r.created_at).toLocaleDateString(),
      `"${(r.form_data || '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported.');
  };

  const deleteRegistration = async (id: string) => {
    if (!confirm('Delete this registration?')) return;
    await supabase.from('registrations').delete().eq('id', id);
    toast.success('Registration deleted.');
    loadAllData();
  };

  /* ── Helper: parse form fields from event ──────────────────────────── */

  const getFormFields = (ev: EventRecord): FormFieldConfig[] => {
    try { return JSON.parse(ev.form_fields || '[]'); } catch { return []; }
  };

  /* ── Render: Auth Screen ─────────────────────────────────────────────── */

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0F0D0A] flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-[#1A1814] border-[#E8620A]/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-['Playfair_Display'] text-white">Admin Login</CardTitle>
            <p className="text-sm text-[#B5A898] mt-1">Cherubs Cove Ministry</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-[#0F0D0A] border-[#2A2520] text-white placeholder:text-[#6B5E50]" />
            <div className="relative">
              <Input placeholder="Password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="bg-[#0F0D0A] border-[#2A2520] text-white placeholder:text-[#6B5E50] pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5E50] hover:text-white">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button onClick={handleAuth} disabled={isLoading} className="w-full bg-[#E8620A] hover:bg-[#cf5709] text-white font-semibold">
              {isLoading ? 'Please wait…' : authMode === 'signIn' ? 'Sign In' : 'Sign Up'}
            </Button>
            <p className="text-center text-sm text-[#6B5E50]">
              {authMode === 'signIn' ? "Don't have an account? " : 'Already have an account? '}
              <button onClick={() => setAuthMode(authMode === 'signIn' ? 'signUp' : 'signIn')} className="text-[#E8620A] hover:underline">
                {authMode === 'signIn' ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Render: Dashboard ───────────────────────────────────────────────── */

  const inputCls = "bg-[#0F0D0A] border-[#2A2520] text-white placeholder:text-[#6B5E50] focus:border-[#E8620A]";
  const eventValidation = editEvent ? validateEventDateTime(editEvent) : { isValid: true };

  const SortBtn = ({ col, label }: { col: keyof RegistrationRecord; label: string }) => (
    <button onClick={() => toggleSort(col)} className={`text-[10px] font-bold tracking-[1.5px] uppercase inline-flex items-center gap-1 ${regSort.col === col ? 'text-[#E8620A]' : 'text-[#6B5E50]'}`}>
      {label} <ArrowUpDown size={10} />
    </button>
  );

  return (
    <div className="min-h-screen bg-[#0F0D0A] text-white">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-['Playfair_Display'] text-white">Admin Dashboard</h1>
            <p className="text-[#B5A898] text-sm mt-1">{session.user.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814] hover:text-white">
            <LogOut size={16} className="mr-2" /> Sign Out
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          {[
            { icon: Calendar, label: 'Events', count: events.length, color: '#E8620A' },
            { icon: Download, label: 'Downloads', count: downloads.length, color: '#B07D35' },
            { icon: Image, label: 'Gallery', count: gallery.length, color: '#6B8F71' },
            { icon: ClipboardList, label: 'Registrations', count: registrations.length, color: '#5B8DEF' },
            { icon: FileText, label: 'Content', count: CONTENT_DEFAULTS.length, color: '#D97706' },
            { icon: Settings, label: 'Settings', count: settingsMeta.filter(m => !CONTENT_DEFAULTS.some(cd => cd.key === m.key)).length, color: '#7B68AE' },
          ].map(s => (
            <Card key={s.label} className="bg-[#1A1814] border-[#2A2520]">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: s.color + '20' }}>
                  <s.icon size={20} style={{ color: s.color }} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-white">{s.count}</p>
                  <p className="text-xs text-[#6B5E50]">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="bg-[#1A1814] border border-[#2A2520] p-1 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="events" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898]"><Calendar size={14} className="mr-1.5" />Events</TabsTrigger>
            <TabsTrigger value="downloads" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898]"><Download size={14} className="mr-1.5" />Downloads</TabsTrigger>
            <TabsTrigger value="gallery" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898]"><Image size={14} className="mr-1.5" />Gallery</TabsTrigger>
            <TabsTrigger value="registrations" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898]"><ClipboardList size={14} className="mr-1.5" />Registrations</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898]"><FileText size={14} className="mr-1.5" />Content</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898]"><Settings size={14} className="mr-1.5" />Settings</TabsTrigger>
            <TabsTrigger value="admins" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898]"><Users size={14} className="mr-1.5" />Admins</TabsTrigger>
          </TabsList>

          {/* ── Events Tab ───────────────────────────────────────────────── */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Events</h2>
              <Button onClick={() => setEditEvent({ ...emptyEvent })} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Plus size={16} className="mr-1" /> Add Event</Button>
            </div>

            {editEvent && (
              <Card className="bg-[#1A1814] border-[#E8620A]/30">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-[#E8620A]">{editEvent.id ? 'Edit Event' : 'New Event'}</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Event Title *" hint="e.g. Quiver's Conference 2026, Wednesday Weekly Meeting">
                      <Input placeholder="Event title" value={editEvent.title} onChange={e => setEditEvent({ ...editEvent, title: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Theme / Topic" hint="Optional — e.g. Envoys of Light, The Passion of Christ">
                      <Input placeholder="Theme (optional)" value={editEvent.theme || ''} onChange={e => setEditEvent({ ...editEvent, theme: e.target.value })} className={inputCls} />
                    </Field>
                    <select value={editEvent.status} onChange={e => setEditEvent({ ...editEvent, status: e.target.value })} className={`${inputCls} rounded-md px-3 py-2 border text-sm`}>
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                      <option value="recurring">Recurring</option>
                    </select>
                    <div>
                      <label className="text-[10px] text-[#6B5E50] uppercase tracking-wider">Start Date</label>
                      <Input type="date" value={editEvent.date} onChange={e => setEditEvent({ ...editEvent, date: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6B5E50] uppercase tracking-wider">End Date <span className="text-[#6B5E50]/70">(leave empty for single-day)</span></label>
                      <Input type="date" value={editEvent.end_date || ''} onChange={e => setEditEvent({ ...editEvent, end_date: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6B5E50] uppercase tracking-wider">Start Time</label>
                      <Input type="time" value={editEvent.time || ''} onChange={e => setEditEvent({ ...editEvent, time: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6B5E50] uppercase tracking-wider">End Time</label>
                      <Input type="time" value={editEvent.end_time || ''} onChange={e => setEditEvent({ ...editEvent, end_time: e.target.value })} className={inputCls} />
                    </div>
                    <Input placeholder="Location" value={editEvent.location} onChange={e => setEditEvent({ ...editEvent, location: e.target.value })} className={`${inputCls} md:col-span-2`} />
                  </div>

                  <div className={`rounded-md border px-3 py-2 text-sm ${eventValidation.isValid ? 'border-[#2A2520] bg-[#0F0D0A] text-[#B5A898]' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>
                    {eventValidation.isValid
                      ? (editEvent.end_date && editEvent.end_date !== editEvent.date
                        ? 'Multi-day events can use separate start and end dates, while one-day events can leave the end date blank.'
                        : 'Use the start and end time fields for one-day events. Multi-day events can keep the same time range across the full span.')
                      : eventValidation.message}
                  </div>

                  {/* Image: file upload OR URL */}
                  <div className="border border-[#2A2520] rounded-lg p-4 space-y-3">
                    <label className="text-sm font-medium text-[#B5A898]">Event Image</label>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#E8620A] hover:bg-[#cf5709] text-white rounded-md text-sm font-medium">
                        {uploadingImage ? 'Uploading…' : 'Upload File'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                          onChange={e => e.target.files?.[0] && uploadEventImage(e.target.files[0])} />
                      </label>
                      <span className="text-xs text-[#6B5E50]">or paste an image URL</span>
                    </div>
                    <Input placeholder="https://…" value={editEvent.image_url} onChange={e => setEditEvent({ ...editEvent, image_url: e.target.value })} className={inputCls} />
                    {editEvent.image_url && <img src={normalizeImageUrl(editEvent.image_url)} alt="Preview" className="w-40 h-28 object-cover rounded-md border border-[#2A2520]" />}
                  </div>

                  <Textarea placeholder="Description" value={editEvent.description} onChange={e => setEditEvent({ ...editEvent, description: e.target.value })} className={inputCls} rows={3} />


                  {/* Registration Toggle */}
                  <div className="border border-[#2A2520] rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-[#B5A898]">Enable Registration</label>
                        <p className="text-xs text-[#6B5E50]">Allow people to register for this event on the website</p>
                      </div>
                      <button
                        onClick={() => setEditEvent({ ...editEvent, registration_enabled: !editEvent.registration_enabled })}
                        className={`transition-colors ${editEvent.registration_enabled ? 'text-green-400' : 'text-[#6B5E50]'}`}
                      >
                        {editEvent.registration_enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>

                    {editEvent.registration_enabled && (
                      <>
                        <div className="rounded-md border border-[#2A2520] bg-[#0F0D0A] p-3 text-sm text-[#B5A898]">
                          <div className="text-[10px] font-semibold uppercase tracking-[2px] text-[#E8620A]">Public registration page</div>
                          {editEvent.id ? (
                            <a href={buildEventRegistrationLink(editEvent)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center text-[#E8620A] hover:underline">
                              {buildEventRegistrationLink(editEvent)}
                            </a>
                          ) : (
                            <p className="mt-1">Save this event first to generate a dedicated public registration page.</p>
                          )}
                        </div>
                        <FormFieldBuilder
                          fields={getFormFields(editEvent)}
                          onChange={(fields) => setEditEvent({ ...editEvent, form_fields: JSON.stringify(fields) })}
                        />
                      </>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={saveEvent} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} className="mr-1" /> Save</Button>
                    <Button variant="outline" onClick={() => setEditEvent(null)} className="border-[#2A2520] text-[#B5A898]"><X size={14} className="mr-1" /> Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {events.length === 0 && !editEvent && <p className="text-[#6B5E50] text-center py-8">No events yet. Click "Add Event" to create one.</p>}

            <div className="space-y-3">
              {events.map(ev => (
                <Card key={ev.id} className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-white truncate">{ev.title}</h4>
                        {ev.theme && <span className="text-xs italic text-[#B5A898]">"{ev.theme}"</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ev.status === 'upcoming' ? 'bg-green-900/40 text-green-400' : ev.status === 'recurring' ? 'bg-blue-900/40 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>{ev.status}</span>
                        {ev.registration_enabled && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8620A]/20 text-[#E8620A]">Registration Open</span>
                        )}
                      </div>
                      <p className="text-sm text-[#6B5E50] mt-0.5">{formatEventDateRange(ev) || 'No date set'}{ev.location && ` • ${ev.location}`}</p>
                      {ev.registration_enabled && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#B5A898]">
                          <span>{getFormFields(ev).length} form field(s)</span>
                          <a href={buildEventRegistrationLink(ev)} target="_blank" rel="noreferrer" className="text-[#E8620A] hover:underline">
                            Open registration page
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="ghost" onClick={() => toggleEventRegistration(ev)} className={ev.registration_enabled ? 'text-green-400 hover:text-green-300' : 'text-[#6B5E50] hover:text-white'} title={ev.registration_enabled ? 'Disable registration' : 'Enable registration'}>
                        {ev.registration_enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditEvent({ ...ev })} className="text-[#B5A898] hover:text-white"><Edit2 size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteEvent(ev.id!)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Downloads Tab ────────────────────────────────────────────── */}
          <TabsContent value="downloads" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Downloads</h2>
              <Button onClick={() => setEditDownload({ ...emptyDownload })} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Plus size={16} className="mr-1" /> Add Download</Button>
            </div>
            {editDownload && (
              <Card className="bg-[#1A1814] border-[#E8620A]/30">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-[#E8620A]">{editDownload.id ? 'Edit Download' : 'New Download'}</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="File Title *" hint="Displayed as the download's name on the site">
                      <Input placeholder="e.g. Walking in Your Kingdom Identity" value={editDownload.title} onChange={e => setEditDownload({ ...editDownload, title: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Download URL *" hint="Direct link to the file (mp3, mp4, pdf, YouTube, Drive, etc.)">
                      <Input placeholder="https://…" value={editDownload.url} onChange={e => setEditDownload({ ...editDownload, url: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Category" hint="Grouping label, e.g. Sermon, Teaching, Manual">
                      <Input placeholder="Sermon" value={editDownload.category} onChange={e => setEditDownload({ ...editDownload, category: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="File Type" hint="Icon shown on the frontend card">
                      <select value={editDownload.type} onChange={e => setEditDownload({ ...editDownload, type: e.target.value })} className={`${inputCls} rounded-md px-3 py-2 border text-sm w-full`}>
                        <option value="">Select type…</option>
                        <option value="audio">Audio</option>
                        <option value="video">Video</option>
                        <option value="pdf">PDF / Document</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Description" hint="Short line shown under the title (speaker, event, series…)">
                    <Textarea placeholder="Jesse Falodun — Quiver's Immersion 2025" value={editDownload.description} onChange={e => setEditDownload({ ...editDownload, description: e.target.value })} className={inputCls} rows={2} />
                  </Field>
                  <div className="flex gap-2">
                    <Button onClick={saveDownload} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} className="mr-1" /> Save</Button>
                    <Button variant="outline" onClick={() => setEditDownload(null)} className="border-[#2A2520] text-[#B5A898]"><X size={14} className="mr-1" /> Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {downloads.length === 0 && !editDownload && <p className="text-[#6B5E50] text-center py-8">No downloads yet.</p>}
            <div className="space-y-3">
              {downloads.map(dl => (
                <Card key={dl.id} className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-white truncate">{dl.title}</h4>
                      <p className="text-sm text-[#6B5E50]">{dl.category && `${dl.category} • `}{dl.type}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditDownload({ ...dl })} className="text-[#B5A898] hover:text-white"><Edit2 size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteDownload(dl.id!)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Gallery Tab (gallery-first) ─────────────────────────────── */}
          <TabsContent value="gallery" className="space-y-4">
            {!selectedGallery ? (
              <>
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Galleries</h2>
                    <p className="text-sm text-[#6B5E50]">Create a gallery, then click into it to upload images.</p>
                  </div>
                  <Button onClick={() => setEditCollection({ id: '', name: '', description: '' })} className="bg-[#E8620A] hover:bg-[#cf5709] text-white">
                    <Plus size={16} className="mr-1" /> New Gallery
                  </Button>
                </div>

                {editCollection && (
                  <Card className="bg-[#1A1814] border-[#E8620A]/30">
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-semibold text-[#E8620A]">{editCollection.id ? 'Edit Gallery' : 'New Gallery'}</h3>
                      <Field label="Gallery Name *" hint="Shown as the heading on the Past Conferences page.">
                        <Input placeholder="e.g. Quiver's Immersion 2025" value={editCollection.name} onChange={e => setEditCollection({ ...editCollection, name: e.target.value })} className={inputCls} />
                      </Field>
                      <Field label="Description" hint="Optional short description.">
                        <Textarea rows={2} value={editCollection.description || ''} onChange={e => setEditCollection({ ...editCollection, description: e.target.value })} className={inputCls} />
                      </Field>
                      <div className="flex gap-2">
                        <Button onClick={async () => {
                          const name = editCollection.name.trim();
                          if (!name) { toast.error('Name required.'); return; }
                          let next: GalleryCollection[];
                          if (editCollection.id) {
                            const oldName = galleries.find(g => g.id === editCollection.id)?.name;
                            next = galleries.map(g => g.id === editCollection.id ? { ...editCollection, name } : g);
                            // Rename category + image titles if name changed
                            if (oldName && oldName !== name) {
                              await supabase.from('gallery').update({ category: name }).eq('category', oldName);
                              // Update image titles to reflect new gallery abbreviation (preserve existing indices)
                              const { data: imgs } = await supabase
                                .from('gallery')
                                .select('id, title')
                                .eq('category', name)
                                .order('created_at', { ascending: true });
                              if (imgs) {
                                const newAbbr = generateGalleryAbbreviation(name);
                                for (const img of imgs) {
                                  const oldTitle = img.title || '';
                                  const match = oldTitle.match(/-(\d{3})$/);
                                  const num = match ? match[1] : '001';
                                  const newTitle = `${newAbbr}-${num}`;
                                  await supabase.from('gallery').update({ title: newTitle }).eq('id', img.id);
                                }
                              }
                            }
                          } else {
                            const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
                            next = [...galleries, { ...editCollection, id, name }];
                          }
                          await persistGalleries(next);
                          setEditCollection(null);
                          loadAllData();
                          toast.success('Gallery saved.');
                        }} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} className="mr-1" /> Save</Button>
                        <Button variant="outline" onClick={() => setEditCollection(null)} className="border-[#2A2520] text-[#B5A898]"><X size={14} className="mr-1" /> Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {galleries.length === 0 && !editCollection && (
                  <p className="text-[#6B5E50] text-center py-8">No galleries yet. Click "New Gallery" to create one.</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {galleries.map(col => {
                    const imgs = gallery.filter(g => {
                      const category = (g.category || '').trim();
                      return category === col.id || category === col.name;
                    });
                    const cover = imgs.find(i => (i as any).featured) || imgs.find(i => i.image_url);
                    return (
                      <Card key={col.id} className="bg-[#1A1814] border-[#2A2520] overflow-hidden">
                        <button onClick={() => setSelectedGalleryId(col.id)} className="block w-full text-left">
                          <div className="aspect-video bg-[#0F0D0A] relative">
                            {cover?.image_url
                              ? <img src={normalizeImageUrl(cover.image_url!)} alt={col.name} className="w-full h-full object-cover" />
                              : <div className="flex items-center justify-center h-full text-[#2A2520]"><Image size={40} /></div>}
                            <div className="absolute top-2 right-2 bg-[#E8620A] text-white text-xs font-bold px-2 py-0.5 rounded-full">{imgs.length}</div>
                          </div>
                          <CardContent className="p-3">
                            <h4 className="font-semibold text-white truncate">{col.name}</h4>
                            {col.description && <p className="text-xs text-[#6B5E50] truncate">{col.description}</p>}
                          </CardContent>
                        </button>
                        <div className="flex gap-1 px-3 pb-3">
                          <Button size="sm" variant="ghost" onClick={() => setEditCollection({ ...col })} className="text-[#B5A898] hover:text-white h-7 px-2"><Edit2 size={12} /></Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            if (!confirm(`Delete gallery "${col.name}"? Images inside will become uncategorized.`)) return;
                            await persistGalleries(galleries.filter(g => g.id !== col.id));
                            toast.success('Gallery deleted.');
                          }} className="text-red-400 hover:text-red-300 h-7 px-2"><Trash2 size={12} /></Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Standalone / uncategorized images */}
                {gallery.some(g => {
                    const category = (g.category || '').trim();
                    return !category || !galleries.some(gc => gc.id === category || gc.name === category);
                  }) && (
                  <div className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold tracking-[2px] uppercase text-[#6B5E50]">Unassigned Images</h3>
                      <button
                        type="button"
                        onClick={() => {
                          const uncatIds = gallery.filter(g => {
                            const cat = (g.category || '').trim();
                            return !cat || !galleries.some(gc => gc.id === cat || gc.name === cat);
                          }).map(g => g.id).filter(Boolean) as string[];
                          selectAllImages(uncatIds);
                        }}
                        className="text-[10px] tracking-[1px] uppercase text-[#E8620A] hover:text-[#cf5709] font-semibold"
                      >
                        {(() => {
                          const uncatIds = gallery.filter(g => {
                            const cat = (g.category || '').trim();
                            return !cat || !galleries.some(gc => gc.id === cat || gc.name === cat);
                          }).map(g => g.id!).filter(Boolean);
                          const allSelected = uncatIds.length > 0 && uncatIds.every(id => selectedImageIds.has(id));
                          return allSelected ? 'Deselect All' : 'Select All';
                        })()}
                      </button>
                    </div>

                    {/* ── Bulk action toolbar for uncategorized ────────── */}
                    {selectedImageIds.size > 0 && (
                      <Card className="bg-[#1A1814] border-[#E8620A]/50 mb-3">
                        <CardContent className="p-4 flex flex-wrap items-center gap-3">
                          <span className="text-sm text-white font-medium">{selectedImageIds.size} selected</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={bulkCategoryTarget}
                              onChange={e => setBulkCategoryTarget(e.target.value)}
                              className={`${inputCls} rounded-md px-3 py-1.5 border text-sm`}
                            >
                              <option value="">Move to category…</option>
                              {galleries.map(gc => (
                                <option key={gc.id} value={gc.id}>{gc.name}</option>
                              ))}
                            </select>
                            <Button size="sm" onClick={bulkMoveImages} disabled={!bulkCategoryTarget} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><FolderInput size={14} className="mr-1" /> Move</Button>
                            <Button size="sm" variant="outline" onClick={bulkDeleteImages} className="border-red-800 text-red-400 hover:bg-red-900/20"><Trash2 size={14} className="mr-1" /> Delete</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedImageIds(new Set()); setBulkCategoryTarget(''); }} className="text-[#6B5E50]"><X size={14} /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {gallery.filter(g => {
                        const category = (g.category || '').trim();
                        return !category || !galleries.some(gc => gc.id === category || gc.name === category);
                      }).map(g => (
                        <Card key={g.id} className="bg-[#1A1814] border-yellow-800/40 overflow-hidden relative">
                          {/* Selection checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleSelectImage(g.id!)}
                            className="absolute top-2 left-2 z-10 p-1 rounded-md bg-black/60 hover:bg-black/80 transition-colors"
                          >
                            {selectedImageIds.has(g.id!) ? <CheckSquare size={16} className="text-[#E8620A]" /> : <Square size={16} className="text-white/80" />}
                          </button>
                          <div className="aspect-video bg-[#0F0D0A]">
                            {g.image_url ? <img src={normalizeImageUrl(g.image_url)} alt={g.alt_text || g.title || 'Gallery photo'} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-[#2A2520]"><Image size={24} /></div>}
                          </div>
                          <CardContent className="p-2">
                            <h4 className="text-xs font-semibold text-white truncate">{g.title}</h4>
                            <div className="flex gap-1 mt-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditGallery({ ...g })} className="text-[#B5A898] h-6 px-1"><Edit2 size={10} /></Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteGallery(g.id!)} className="text-red-400 h-6 px-1"><Trash2 size={10} /></Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Gallery detail view */}
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedGalleryId(null); setEditGallery(null); setBulkAddMode(false); setBulkUrls(''); setBulkCategoryTarget(''); }} className="border-[#2A2520] text-[#B5A898]">← Back</Button>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedGallery.name}</h2>
                      <p className="text-xs text-[#6B5E50]">{imagesInSelectedGallery.length} image{imagesInSelectedGallery.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => { setBulkAddMode(false); setBulkCategoryTarget(''); setEditGallery({ ...emptyGallery, category: selectedGallery.id }); }}
                      className="bg-[#E8620A] hover:bg-[#cf5709] text-white"
                    >
                      <Plus size={16} className="mr-1" /> Add Image
                    </Button>
                    <Button
                      onClick={() => { setBulkAddMode(true); setEditGallery(null); setBulkUrls(''); }}
                      variant={bulkAddMode ? 'default' : 'outline'}
                      className={bulkAddMode ? 'bg-[#E8620A] hover:bg-[#cf5709] text-white' : 'border-[#2A2520] text-[#B5A898]'}
                    >
                      <Image size={16} className="mr-1" /> Bulk Add
                    </Button>
                  </div>
                </div>

                {/* ── Bulk add mode ──────────────────────────────────────── */}
                {bulkAddMode && (
                  <Card className="bg-[#1A1814] border-[#E8620A]/30">
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-semibold text-[#E8620A]">Bulk Import Images — <span className="text-white/70">{selectedGallery.name}</span></h3>
                      <p className="text-xs text-[#6B5E50]">Paste one URL per line. Titles and alt text will be auto-generated from filenames. You can edit them individually afterward.</p>
                      <Field label="Target Category" hint="All imported images will be assigned to this category.">
                        <select
                          value={bulkCategoryTarget || selectedGallery?.id || ''}
                          onChange={e => setBulkCategoryTarget(e.target.value)}
                          className={`${inputCls} rounded-md px-3 py-2 border text-sm w-full`}
                        >
                          <option value="">— Use current gallery —</option>
                          {galleries.map(gc => (
                            <option key={gc.id} value={gc.id}>{gc.name}</option>
                          ))}
                          <option value="__none__">— Uncategorized —</option>
                        </select>
                      </Field>
                      <Textarea
                        rows={8}
                        placeholder={
                          'https://drive.google.com/file/d/abc123/view\n' +
                          'https://drive.google.com/file/d/def456/view\n' +
                          'https://images.unsplash.com/photo-abc'
                        }
                        value={bulkUrls}
                        onChange={e => setBulkUrls(e.target.value)}
                        className={inputCls}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            const urls = bulkUrls.split('\n').map(s => s.trim()).filter(Boolean);
                            if (!urls.length) { toast.error('Paste at least one URL.'); return; }
                            setImportingBulk(true);
                            let success = 0;
                            let uncategorizedCount = 0;
                            let hasAltColumn = true;
                            // Pre-compute the first available index for stable numbering
                            const catForBulk = bulkCategoryTarget && bulkCategoryTarget !== '__none__'
                              ? bulkCategoryTarget
                              : (selectedGallery?.id || '');
                            const galForBulk = galleries.find(g => g.id === catForBulk || g.name === catForBulk);
                            const bulkAbbr = galForBulk ? generateGalleryAbbreviation(galForBulk.name) : 'Uncategorized';
                            const existingBulkTitles = catForBulk
                              ? gallery.filter(g => {
                                  const c = (g.category || '').trim();
                                  return c === catForBulk || c === (galForBulk?.name || '');
                                })
                              : gallery.filter(g => {
                                  const c = (g.category || '').trim();
                                  return !c || !galleries.some(gc => gc.id === c || gc.name === c);
                                });
                            let bulkNextIdx = 1;
                            for (const img of existingBulkTitles) {
                              const t = img.title || '';
                              if (t.startsWith(bulkAbbr)) {
                                const match = t.match(/-(\d{3})$/);
                                if (match) {
                                  const idx = parseInt(match[1], 10);
                                  if (idx >= bulkNextIdx) bulkNextIdx = idx + 1;
                                }
                              }
                            }
                            for (const url of urls) {
                              // Gallery-based title for bulk imports
                              let title = titleFromUrl(url);
                              if (!title) {
                                title = `${bulkAbbr}-${String(bulkNextIdx).padStart(3, '0')}`;
                                bulkNextIdx++;
                              }
                              const row: Record<string, string> = {
                                title,
                                image_url: normalizeImageUrl(url),
                                caption: '',
                              };
                              let effectiveCategory = bulkCategoryTarget;
                              if (effectiveCategory === '__none__') effectiveCategory = '';
                              if (!effectiveCategory && selectedGallery?.id) effectiveCategory = selectedGallery.id;
                              if (effectiveCategory) row.category = effectiveCategory;
                              if (hasAltColumn) row.alt_text = `Photo: ${title}`;

                              const tryInsert = async (data: Record<string, string>) => await supabase.from('gallery').insert(data);
                              let { error } = await tryInsert(row);
                              if (error && row.alt_text && error.code === '42703') {
                                delete row.alt_text;
                                const retry = await tryInsert(row);
                                error = retry.error;
                              }
                              if (error && row.category && error.code === '23514') {
                                delete row.category;
                                const retry = await tryInsert(row);
                                error = retry.error;
                                if (!error) {
                                  uncategorizedCount += 1;
                                }
                              }
                              if (error) {
                                console.error('Bulk insert failed', error, { url, row });
                              } else {
                                success += 1;
                              }
                            }
                            setImportingBulk(false);
                            if (success) {
                              toast.success(`${success} of ${urls.length} images imported.`);
                              if (uncategorizedCount) {
                                toast('Some images were imported without category because the database rejected the selected gallery category.');
                              }
                            } else {
                              toast.error('Failed to import images. Check console for details.');
                            }
                            setBulkUrls('');
                            loadAllData();
                          }}
                          disabled={importingBulk}
                          className="bg-[#E8620A] hover:bg-[#cf5709] text-white"
                        >
                          {importingBulk ? 'Importing…' : `Import ${bulkUrls.split('\n').map(s => s.trim()).filter(Boolean).length || ''} Images`}
                        </Button>
                        <Button variant="outline" onClick={() => { setBulkAddMode(false); setBulkUrls(''); setBulkCategoryTarget(''); }} className="border-[#2A2520] text-[#B5A898]"><X size={14} className="mr-1" /> Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Single add / edit form ────────────────────────────── */}
                {editGallery && !bulkAddMode && (
                  <Card className="bg-[#1A1814] border-[#E8620A]/30">
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-semibold text-[#E8620A]">{editGallery.id ? 'Edit Image' : 'New Image'} — <span className="text-white/70">{selectedGallery.name}</span></h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        <Field label="Image Title" hint="Optional — auto-generated from filename if blank. Shown as overlay on the frontend.">
                          <Input placeholder="e.g. Opening Night" value={editGallery.title} onChange={e => setEditGallery({ ...editGallery, title: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="Alt Text" hint="Optional — for accessibility. Auto-generated from title if left blank.">
                          <Input placeholder="Auto-generated from title" value={editGallery.alt_text || ''} onChange={e => setEditGallery({ ...editGallery, alt_text: e.target.value })} className={inputCls} />
                        </Field>
                      </div>
                      <Field label="Caption" hint="Optional secondary line">
                        <Input placeholder="Optional" value={editGallery.caption} onChange={e => setEditGallery({ ...editGallery, caption: e.target.value })} className={inputCls} />
                      </Field>
                      <Field label="Category" hint="Which gallery this image belongs to.">
                        <select
                          value={editGallery.category || ''}
                          onChange={e => {
                            const newCat = e.target.value;
                            const newGal = galleries.find(g => g.id === newCat || g.name === newCat);
                            // Auto-update title if it's currently empty or looks auto-generated (e.g. "QA-001", "QA-2023-001", "Uncategorized-001")
                            const autoPattern = /^[A-Z][\w-]*-\d{3}$|^Uncategorized-\d{3}$/;
                            const currentTitle = editGallery.title || '';
                            if (!currentTitle || autoPattern.test(currentTitle)) {
                              if (newGal) {
                                const imagesInGal = gallery.filter(g => {
                                  const cat = (g.category || '').trim();
                                  return (cat === newGal.id || cat === newGal.name) && g.id !== editGallery.id;
                                });
                                setEditGallery({ ...editGallery, category: newCat, title: generateNextImageTitle(imagesInGal, newGal.name) });
                              } else {
                                const uncatImages = gallery.filter(g => {
                                  const cat = (g.category || '').trim();
                                  return !cat || !galleries.some(gc => gc.id === cat || gc.name === cat);
                                });
                                setEditGallery({ ...editGallery, category: newCat, title: generateNextImageTitle(uncatImages, null) });
                              }
                            } else {
                              setEditGallery({ ...editGallery, category: newCat });
                            }
                          }}
                          className={`${inputCls} rounded-md px-3 py-2 border text-sm w-full`}
                        >
                          <option value="">— Uncategorized —</option>
                          {galleries.map(gc => (
                            <option key={gc.id} value={gc.id}>{gc.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Image URL *" hint="Upload a file or paste a URL.">
                        <div className="border border-[#2A2520] rounded-lg p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#E8620A] hover:bg-[#cf5709] text-white rounded-md text-sm font-medium">
                              {uploadingGalleryImage ? 'Uploading…' : 'Upload File'}
                              <input type="file" accept="image/*" className="hidden" disabled={uploadingGalleryImage}
                                onChange={e => e.target.files?.[0] && uploadGalleryImage(e.target.files[0])} />
                            </label>
                            <span className="text-xs text-[#6B5E50]">or paste an image URL</span>
                          </div>
                          <Input placeholder="https://…" value={editGallery.image_url} onChange={e => setEditGallery({ ...editGallery, image_url: e.target.value })} className={inputCls} />
                          {editGallery.image_url && <img src={normalizeImageUrl(editGallery.image_url)} alt="Preview" className="w-40 h-28 object-cover rounded-md border border-[#2A2520]" />}
                        </div>
                      </Field>
                      <div className="flex gap-2">
                        <Button onClick={async () => { await saveGallery(); }} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} className="mr-1" /> Save</Button>
                        <Button variant="outline" onClick={() => setEditGallery(null)} className="border-[#2A2520] text-[#B5A898]"><X size={14} className="mr-1" /> Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {imagesInSelectedGallery.length === 0 && !editGallery && !bulkAddMode && (
                  <p className="text-[#6B5E50] text-center py-8">No images in this gallery yet. Click "Add Image" or "Bulk Add".</p>
                )}

                {/* ── Bulk action toolbar ──────────────────────────────── */}
                {selectedImageIds.size > 0 && (
                  <Card className="bg-[#1A1814] border-[#E8620A]/50">
                    <CardContent className="p-4 flex flex-wrap items-center gap-3">
                      <span className="text-sm text-white font-medium">{selectedImageIds.size} selected</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={bulkCategoryTarget}
                          onChange={e => setBulkCategoryTarget(e.target.value)}
                          className={`${inputCls} rounded-md px-3 py-1.5 border text-sm`}
                        >
                          <option value="">Move to category…</option>
                          {galleries.map(gc => (
                            <option key={gc.id} value={gc.id}>{gc.name}</option>
                          ))}
                        </select>
                        <Button size="sm" onClick={bulkMoveImages} disabled={!bulkCategoryTarget} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><FolderInput size={14} className="mr-1" /> Move</Button>
                        <Button size="sm" variant="outline" onClick={bulkDeleteImages} className="border-red-800 text-red-400 hover:bg-red-900/20"><Trash2 size={14} className="mr-1" /> Delete</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedImageIds(new Set()); setBulkCategoryTarget(''); }} className="text-[#6B5E50]"><X size={14} /></Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {imagesInSelectedGallery.map(g => (
                    <Card key={g.id} className={`bg-[#1A1814] border-[#2A2520] overflow-hidden relative ${(g as any).featured ? 'ring-2 ring-[#E8620A]' : ''}`}>
                      {/* Selection checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleSelectImage(g.id!)}
                        className="absolute top-2 left-2 z-10 p-1 rounded-md bg-black/60 hover:bg-black/80 transition-colors"
                      >
                        {selectedImageIds.has(g.id!) ? <CheckSquare size={16} className="text-[#E8620A]" /> : <Square size={16} className="text-white/80" />}
                      </button>
                      {/* Featured badge */}
                      {(g as any).featured && (
                        <div className="absolute top-2 right-2 z-10 bg-[#E8620A] text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
                          Cover
                        </div>
                      )}
                      <div className="aspect-video bg-[#0F0D0A] relative">
                        {g.image_url ? <img src={normalizeImageUrl(g.image_url)} alt={g.alt_text || g.title || 'Gallery photo'} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-[#2A2520]"><Image size={32} /></div>}
                      </div>
                      <CardContent className="p-3">
                        <h4 className="text-sm font-semibold text-white truncate">{g.title}</h4>
                        {g.caption && <p className="text-xs text-[#6B5E50] truncate">{g.caption}</p>}
                        <div className="flex gap-1 mt-2 flex-wrap">
                          <Button size="sm" variant="ghost" onClick={() => setEditGallery({ ...g })} className="text-[#B5A898] hover:text-white h-7 px-2"><Edit2 size={12} /></Button>
                          {!(g as any).featured && (
                            <Button size="sm" variant="ghost" onClick={async () => {
                              const { error } = await supabase.from('gallery').update({ featured: true }).eq('id', g.id!);
                              if (error) { toast.error(error.message); return; }
                              // Unfeature all others in same gallery
                              const otherIds = imagesInSelectedGallery.filter(x => x.id !== g.id).map(x => x.id!);
                              if (otherIds.length) {
                                await supabase.from('gallery').update({ featured: false }).in('id', otherIds);
                              }
                              toast.success('Cover image updated.');
                              loadAllData();
                            }} className="text-yellow-500 hover:text-yellow-400 h-7 px-2" title="Set as gallery cover">
                              <Star size={12} />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => deleteGallery(g.id!)} className="text-red-400 hover:text-red-300 h-7 px-2"><Trash2 size={12} /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>


          {/* ── Registrations Tab ─────────────────────────────────────────── */}
          <TabsContent value="registrations" className="space-y-4">
            {!regSelectedGroupKey ? (
              <>
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <h2 className="text-xl font-semibold">Registrations by Event</h2>
                  <p className="text-sm text-[#6B5E50]">Click an event to see its registrations.</p>
                </div>
                {regGroups.length === 0 && <p className="text-[#6B5E50] text-center py-8">No registrations yet.</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {regGroups.map(g => (
                    <button key={g.key} onClick={() => setRegSelectedGroupKey(g.key)}
                      className="text-left bg-[#1A1814] border border-[#2A2520] hover:border-[#E8620A]/60 rounded-lg p-5 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{g.title}</h3>
                          <p className="text-xs text-[#6B5E50] mt-1">Click to view registrations</p>
                        </div>
                        <div className="bg-[#E8620A]/20 text-[#E8620A] rounded-full px-3 py-1 text-sm font-bold">
                          {g.items.length}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => { setRegSelectedGroupKey(null); setRegSearch(''); }} className="border-[#2A2520] text-[#B5A898]">← Back</Button>
                    <h2 className="text-xl font-semibold">
                      {regGroups.find(g => g.key === regSelectedGroupKey)?.title} ({sortedRegistrations.length})
                    </h2>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Input placeholder="Search…" value={regSearch} onChange={e => setRegSearch(e.target.value)} className={`${inputCls} w-48`} />
                    <Button onClick={exportCSV} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><FileDown size={14} className="mr-1" /> Export CSV</Button>
                  </div>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <SortBtn col="created_at" label="Date" />
                  <SortBtn col="first_name" label="Name" />
                  <SortBtn col="location" label="Location" />
                </div>
                {sortedRegistrations.length === 0 && <p className="text-[#6B5E50] text-center py-8">No registrations match.</p>}
                <div className="space-y-2">
              {sortedRegistrations.map(r => (
                <Card key={r.id} className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-white">{r.first_name} {r.last_name}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8620A]/20 text-[#E8620A]">{r.event_title || r.program || 'General'}</span>
                        </div>
                        <div className="flex gap-4 flex-wrap mt-1.5 text-sm text-[#6B5E50]">
                          <span>{r.email}</span>
                          {r.phone && <span>{r.phone}</span>}
                          {r.location && <span>{r.location}</span>}
                        </div>
                        {r.note && <p className="text-xs text-[#B5A898] mt-2 italic">"{r.note}"</p>}
                        {r.form_data && r.form_data !== '{}' && (
                          <details className="mt-2">
                            <summary className="text-xs text-[#6B5E50] cursor-pointer hover:text-[#B5A898]">View extra form data</summary>
                            <pre className="text-xs text-[#B5A898] mt-1 bg-[#0F0D0A] p-2 rounded overflow-auto max-h-32">{JSON.stringify(JSON.parse(r.form_data || '{}'), null, 2)}</pre>
                          </details>
                        )}
                        <p className="text-[10px] text-[#6B5E50] mt-1">{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteRegistration(r.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Content Tab ──────────────────────────────────────────────── */}
          <TabsContent value="content" className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-xl font-semibold">Website Content</h2>
                <p className="text-sm text-[#6B5E50]">Edit all text on the website. Changes update in real-time.</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', ...Array.from(new Set(CONTENT_DEFAULTS.map(c => c.group)))].map(g => (
                <button key={g} onClick={() => setContentGroup(g)} className={`text-[10px] font-bold tracking-[1.5px] uppercase px-3 py-1.5 rounded-full border transition-colors ${contentGroup === g ? 'bg-[#E8620A] text-white border-[#E8620A]' : 'border-[#2A2520] text-[#6B5E50] hover:border-[#E8620A]/50'}`}>
                  {g === 'all' ? 'All' : g}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {CONTENT_DEFAULTS.filter(cd => contentGroup === 'all' || cd.group === contentGroup).map(cd => (
                <Card key={cd.key} className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <label className="text-sm font-medium text-[#B5A898]">{cd.label}</label>
                      <span className="text-[9px] tracking-[1px] uppercase text-[#6B5E50] bg-[#0F0D0A] px-2 py-0.5 rounded">{cd.group}</span>
                    </div>
                    <div className="flex gap-2">
                      {(contentValues[cd.key] ?? '').length > 80 ? (
                        <Textarea value={contentValues[cd.key] ?? ''} onChange={e => setContentValues(prev => ({ ...prev, [cd.key]: e.target.value }))} className={`flex-1 ${inputCls}`} rows={3} />
                      ) : (
                        <Input value={contentValues[cd.key] ?? ''} onChange={e => setContentValues(prev => ({ ...prev, [cd.key]: e.target.value }))} className={`flex-1 ${inputCls}`} />
                      )}
                      <Button onClick={() => saveContentSetting(cd.key)} className="bg-[#E8620A] hover:bg-[#cf5709] text-white self-start"><Save size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Settings Tab ─────────────────────────────────────────────── */}
          <TabsContent value="settings" className="space-y-4">
            <h2 className="text-xl font-semibold">Site Settings</h2>
            <p className="text-sm text-[#6B5E50]">Changes here update the website in real-time.</p>
            <div className="space-y-4">
              {settingsMeta.filter(m => !CONTENT_DEFAULTS.some(cd => cd.key === m.key)).map(meta => (
                <Card key={meta.id} className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-4">
                    <label className="text-sm font-medium text-[#B5A898] block mb-1.5">{meta.label}</label>
                    <div className="flex gap-2">
                      {meta.type === 'boolean' ? (
                        <select value={siteSettings[meta.key] ?? ''} onChange={e => setSiteSettings(prev => ({ ...prev, [meta.key]: e.target.value }))} className={`flex-1 rounded-md px-3 py-2 ${inputCls} border`}>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <Input value={siteSettings[meta.key] ?? ''} onChange={e => setSiteSettings(prev => ({ ...prev, [meta.key]: e.target.value }))} className={`flex-1 ${inputCls}`} type={meta.type === 'email' ? 'email' : meta.type === 'url' ? 'url' : 'text'} />
                      )}
                      <Button onClick={() => saveSetting(meta.key)} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Admins Tab ───────────────────────────────────────────────── */}
          <TabsContent value="admins" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-semibold">Admin Users</h2>
                <p className="text-sm text-[#6B5E50]">
                  {isSuperAdmin
                    ? 'You are the super admin. You can add, remove, and change roles.'
                    : `Only the super admin (${SUPER_ADMIN_EMAIL}) can add or remove admins.`}
                </p>
              </div>
              <div className="text-xs text-[#6B5E50]">{adminList.length} admin{adminList.length !== 1 ? 's' : ''}</div>
            </div>

            <div className="space-y-2">
              {adminList.map(a => {
                const isSuper = a.email.toLowerCase() === SUPER_ADMIN_EMAIL;
                return (
                  <Card key={a.email} className="bg-[#1A1814] border-[#2A2520]">
                    <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#E8620A]/20 text-[#E8620A] flex items-center justify-center text-sm font-bold uppercase">
                          {a.email[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium truncate">{a.email}</span>
                            {isSuper && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8620A]/20 text-[#E8620A] font-bold tracking-wider uppercase">Super Admin</span>
                            )}
                            {!isSuper && a.role === 'super_admin' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 font-bold tracking-wider uppercase">Super Admin</span>
                            )}
                            {a.role === 'admin' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 font-bold tracking-wider uppercase">Admin</span>
                            )}
                            {session?.user?.email?.toLowerCase() === a.email.toLowerCase() && (
                              <span className="text-[10px] text-[#6B5E50]">(you)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isSuper && isSuperAdmin && (
                          <select
                            value={a.role}
                            onChange={e => changeAdminRole(a.email, e.target.value as 'admin' | 'super_admin')}
                            className={`${inputCls} rounded-md px-2 py-1 border text-xs`}
                          >
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        )}
                        {!isSuper && isSuperAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => removeAdmin(a.email)} className="text-red-400 hover:text-red-300">
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {isSuperAdmin && (
              <>
                <h3 className="text-lg font-semibold pt-4">Add New Admin</h3>
                <Card className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-5 space-y-3">
                    <p className="text-sm text-[#B5A898]">Creates a login and adds them to the admin list. They'll sign in at /admin with the password you set.</p>
                    <div className="grid md:grid-cols-3 gap-3">
                      <Field label="Email">
                        <Input placeholder="name@example.com" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className={inputCls} />
                      </Field>
                      <Field label="Temporary Password">
                        <Input placeholder="At least 6 characters" type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} className={inputCls} />
                      </Field>
                      <Field label="Role">
                        <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'admin' | 'super_admin')} className={`${inputCls} rounded-md px-3 py-2 border text-sm w-full`}>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </Field>
                    </div>
                    <Button onClick={inviteAdmin} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Users size={14} className="mr-1" /> Create Admin</Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
