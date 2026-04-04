import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Edit3,
  LogIn,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { supabase } from '@/lib/supabaseClient';

interface EventRecord {
  id: string;
  title: string;
  theme: string;
  type: string;
  status: string;
  date: string;
  external_link: string;
  image_url: string;
  description: string;
}

interface DownloadRecord {
  id: string;
  label: string;
  type: string;
  url: string;
  description: string;
}

interface GalleryRecord {
  id: string;
  title: string;
  event_label: string;
  image_url: string;
  active: boolean;
}

const inputClass =
  'w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-border bg-card text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--orange)/0.1)] placeholder:text-muted-foreground';

export default function AdminPage() {
  const ref = useScrollReveal();
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authNotice, setAuthNotice] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [galleryItems, setGalleryItems] = useState<GalleryRecord[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});

  const [activeEvent, setActiveEvent] = useState<Partial<EventRecord>>({ status: 'upcoming', type: 'Conference' });
  const [activeDownload, setActiveDownload] = useState<Partial<DownloadRecord>>({ type: 'audio' });
  const [activeGallery, setActiveGallery] = useState<Partial<GalleryRecord>>({ active: true });

  const [showSignUp, setShowSignUp] = useState(false);

  const loadAdminData = async () => {
    try {
      setIsLoading(true);
      const [{ data: eventsData }, { data: downloadsData }, { data: galleryData }, { data: settingsData }] =
        await Promise.all([
          supabase.from<EventRecord>('events').select('*').order('date', { ascending: false }),
          supabase.from<DownloadRecord>('downloads').select('*').order('label'),
          supabase.from<GalleryRecord>('gallery').select('*').order('title'),
          supabase.from('site_settings').select('*'),
        ]);

      setEvents(eventsData ?? []);
      setDownloads(downloadsData ?? []);
      setGalleryItems(galleryData ?? []);
      setSiteSettings(
        (settingsData ?? []).reduce((acc: Record<string, string>, row: any) => {
          if (row.key) acc[row.key] = row.value ?? '';
          return acc;
        }, {})
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      if (data.session) {
        await loadAdminData();
      }
    };

    init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadAdminData();
      }
    });

    return () => listener?.subscription?.unsubscribe();
  }, []);

  const handleAuth = async (mode: 'signIn' | 'signUp') => {
    setAuthNotice('');
    setIsLoading(true);

    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setAuthNotice('Signed in successfully.');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthNotice('Sign-up request sent. Check your email if verification is required.');
      }
    } catch (error: any) {
      setAuthNotice(error.message ?? 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setAuthNotice('Logged out successfully.');
  };

  const persistEvent = async () => {
    if (!activeEvent.title || !activeEvent.theme) {
      setAuthNotice('Event title and theme are required.');
      return;
    }

    const payload = {
      title: activeEvent.title,
      theme: activeEvent.theme,
      type: activeEvent.type,
      status: activeEvent.status,
      date: activeEvent.date,
      external_link: activeEvent.external_link,
      image_url: activeEvent.image_url,
      description: activeEvent.description,
    };

    if (activeEvent.id) {
      await supabase.from('events').update(payload).eq('id', activeEvent.id);
      setAuthNotice('Event updated successfully.');
    } else {
      await supabase.from('events').insert(payload);
      setAuthNotice('Event created successfully.');
    }

    setActiveEvent({ status: 'upcoming', type: 'Conference' });
    await loadAdminData();
  };

  const removeEvent = async (id: string) => {
    await supabase.from('events').delete().eq('id', id);
    setAuthNotice('Event deleted.');
    await loadAdminData();
  };

  const persistDownload = async () => {
    if (!activeDownload.label || !activeDownload.url) {
      setAuthNotice('Download label and URL are required.');
      return;
    }

    const payload = {
      label: activeDownload.label,
      type: activeDownload.type,
      url: activeDownload.url,
      description: activeDownload.description,
    };

    if (activeDownload.id) {
      await supabase.from('downloads').update(payload).eq('id', activeDownload.id);
      setAuthNotice('Download updated successfully.');
    } else {
      await supabase.from('downloads').insert(payload);
      setAuthNotice('Download added successfully.');
    }

    setActiveDownload({ type: 'audio' });
    await loadAdminData();
  };

  const removeDownload = async (id: string) => {
    await supabase.from('downloads').delete().eq('id', id);
    setAuthNotice('Download removed.');
    await loadAdminData();
  };

  const persistGallery = async () => {
    if (!activeGallery.title || !activeGallery.image_url) {
      setAuthNotice('Gallery title and image URL are required.');
      return;
    }

    const payload = {
      title: activeGallery.title,
      event_label: activeGallery.event_label,
      image_url: activeGallery.image_url,
      active: activeGallery.active,
    };

    if (activeGallery.id) {
      await supabase.from('gallery').update(payload).eq('id', activeGallery.id);
      setAuthNotice('Gallery item updated.');
    } else {
      await supabase.from('gallery').insert(payload);
      setAuthNotice('Gallery item added.');
    }

    setActiveGallery({ active: true });
    await loadAdminData();
  };

  const persistSetting = async (key: string, value: string) => {
    const record = await supabase.from('site_settings').select('id').eq('key', key).single();
    if (record.error) {
      await supabase.from('site_settings').insert({ key, value });
    } else {
      await supabase.from('site_settings').update({ value }).eq('id', record.data.id);
    }
    setSiteSettings((prev) => ({ ...prev, [key]: value }));
    setAuthNotice('Site content saved.');
  };

  const hasSession = Boolean(session?.user?.email);

  const quickStats = useMemo(
    () => ({
      events: events.length,
      downloads: downloads.length,
      gallery: galleryItems.length,
    }),
    [events, downloads, galleryItems]
  );

  return (
    <>
      <Navbar />
      <div className="pt-[70px] min-h-screen bg-background" ref={ref}>
        <div className="py-20 px-8 text-center" style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}>
          <div className="max-w-[700px] mx-auto">
            <div className="eyebrow justify-center text-primary/80 reveal">Cherubs Cove Admin</div>
            <h1 className="font-heading text-[clamp(32px,5vw,56px)] font-normal leading-tight mt-4 text-white reveal">
              Admin <em className="italic text-primary">Dashboard</em>
            </h1>
            <p className="text-[14px] font-light leading-[1.8] mt-4 text-white/65 reveal">
              Manage events, uploads, gallery links, and site content from Supabase. No hosted file storage is required — admins update external links directly.
            </p>
          </div>
        </div>

        <div className="container py-16">
          {!hasSession ? (
            <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
              <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
                <h2 className="font-heading text-2xl mb-4 text-foreground">Admin sign in</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Use your Supabase credentials to manage event data, downloads, gallery items, and more.
                </p>
                <div className="grid gap-4">
                  <label className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                    Email
                    <input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      type="email"
                      required
                      className={inputClass}
                    />
                  </label>
                  <label className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                    Password
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      type="password"
                      required
                      className={inputClass}
                    />
                  </label>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-6">
                  <button
                    type="button"
                    onClick={() => handleAuth('signIn')}
                    disabled={isLoading}
                    className="btn-solid-custom inline-flex items-center justify-center gap-2"
                  >
                    <LogIn size={16} /> Sign In
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSignUp((state) => !state)}
                    className="text-[11px] uppercase tracking-[2px] text-primary hover:text-primary-foreground"
                  >
                    {showSignUp ? 'Back to sign in' : 'Need an account?'}
                  </button>
                </div>
                {showSignUp && (
                  <div className="mt-6 rounded-xl border border-border bg-background/80 p-5">
                    <p className="text-sm text-muted-foreground mb-3">Create a new admin user.</p>
                    <button
                      type="button"
                      onClick={() => handleAuth('signUp')}
                      disabled={isLoading}
                      className="btn-outline-custom inline-flex items-center gap-2"
                    >
                      <ShieldCheck size={16} /> Sign Up
                    </button>
                  </div>
                )}
                {authNotice && <div className="mt-4 text-sm text-primary">{authNotice}</div>}
              </div>

              <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
                <h3 className="font-heading text-xl mb-4">Quick Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-xl bg-background/80 p-4">
                    <div className="text-3xl font-semibold text-foreground">{quickStats.events}</div>
                    <div className="text-[11px] uppercase tracking-[2px] text-muted-foreground">Events</div>
                  </div>
                  <div className="rounded-xl bg-background/80 p-4">
                    <div className="text-3xl font-semibold text-foreground">{quickStats.downloads}</div>
                    <div className="text-[11px] uppercase tracking-[2px] text-muted-foreground">Downloads</div>
                  </div>
                  <div className="rounded-xl bg-background/80 p-4">
                    <div className="text-3xl font-semibold text-foreground">{quickStats.gallery}</div>
                    <div className="text-[11px] uppercase tracking-[2px] text-muted-foreground">Gallery</div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
                <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[13px] uppercase tracking-[3px] text-primary">Connected as admin</p>
                      <h2 className="font-heading text-3xl mt-3 text-foreground">Welcome back!</h2>
                      <p className="mt-4 text-sm text-muted-foreground">
                        Manage events, external downloads, gallery links, and site settings from one dashboard.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="btn-outline-custom inline-flex items-center gap-2"
                    >
                      <LogOut size={16} /> Log out
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
                  <div className="text-[11px] uppercase tracking-[3px] text-muted-foreground mb-3">Latest updates</div>
                  <div className="space-y-3 text-sm text-foreground">
                    <p>• Use the forms below to create or edit events and set their current status.</p>
                    <p>• Upload external links, not files directly. External file hosting is expected.</p>
                    <p>• Site content is saved in Supabase site_settings for future editing.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-xl border border-border bg-card p-8 shadow-lg">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-heading text-2xl text-foreground">Events</h3>
                      <p className="text-sm text-muted-foreground">Create and manage event records with status, links, and dates.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveEvent({ status: 'upcoming', type: 'Conference' })}
                      className="btn-outline-custom inline-flex items-center gap-2"
                    >
                      <Plus size={16} /> New event
                    </button>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1fr_440px]">
                    <div className="space-y-3">
                      {events.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-background/80 p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-foreground">{item.title}</div>
                              <div className="text-[11px] uppercase tracking-[2px] text-muted-foreground">{item.theme}</div>
                            </div>
                            <div className="text-[11px] uppercase tracking-[2px] text-primary">{item.status}</div>
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                            <span>{item.type}</span>
                            <span>{item.date || 'No date set'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveEvent(item)}
                              className="btn-outline-custom inline-flex items-center gap-2"
                            >
                              <Edit3 size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeEvent(item.id)}
                              className="btn-ghost-custom inline-flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-border bg-background/80 p-6">
                      <div className="font-semibold text-foreground mb-3">Event editor</div>
                      <div className="space-y-4">
                        {[
                          { label: 'Title', key: 'title', type: 'text' },
                          { label: 'Theme', key: 'theme', type: 'text' },
                          { label: 'Type', key: 'type', type: 'text' },
                          { label: 'Status', key: 'status', type: 'select', options: ['upcoming', 'active', 'done'] },
                          { label: 'Date', key: 'date', type: 'date' },
                          { label: 'External link', key: 'external_link', type: 'text' },
                          { label: 'Image URL', key: 'image_url', type: 'text' },
                        ].map((field) => (
                          <label key={field.key} className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                            {field.label}
                            {field.type === 'select' ? (
                              <select
                                value={activeEvent[field.key as keyof EventRecord] ?? ''}
                                onChange={(e) => setActiveEvent((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                className={inputClass}
                              >
                                {field.options?.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                value={activeEvent[field.key as keyof EventRecord] ?? ''}
                                onChange={(e) => setActiveEvent((prev) => ({ ...prev, [field.key]: e.target.value }))}
                                type={field.type}
                                className={inputClass}
                              />
                            )}
                          </label>
                        ))}

                        <label className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                          Description
                          <textarea
                            value={activeEvent.description ?? ''}
                            onChange={(e) => setActiveEvent((prev) => ({ ...prev, description: e.target.value }))}
                            className={`${inputClass} min-h-[110px] resize-y`}
                          />
                        </label>
                        <button type="button" onClick={persistEvent} className="btn-solid-custom w-full inline-flex items-center justify-center gap-2">
                          <UploadCloud size={16} /> Save event
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-card p-8 shadow-lg">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-heading text-2xl text-foreground">Downloads</h3>
                      <p className="text-sm text-muted-foreground">Update download links and external media URLs for the resources page.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveDownload({ type: 'audio' })}
                      className="btn-outline-custom inline-flex items-center gap-2"
                    >
                      <Plus size={16} /> Add link
                    </button>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                    <div className="space-y-3">
                      {downloads.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-background/80 p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-foreground">{item.label}</div>
                              <div className="text-[11px] uppercase tracking-[2px] text-muted-foreground">{item.type}</div>
                            </div>
                            <div className="text-[11px] text-primary">{item.url ? 'Link set' : 'No URL'}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">{item.description}</div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveDownload(item)}
                              className="btn-outline-custom inline-flex items-center gap-2"
                            >
                              <Edit3 size={14} /> Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => removeDownload(item.id)}
                              className="btn-ghost-custom inline-flex items-center gap-2"
                            >
                              <Trash2 size={14} /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-border bg-background/80 p-6">
                      <div className="font-semibold text-foreground mb-3">Download editor</div>
                      <div className="space-y-4">
                        <label className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                          Label
                          <input
                            value={activeDownload.label ?? ''}
                            onChange={(e) => setActiveDownload((prev) => ({ ...prev, label: e.target.value }))}
                            className={inputClass}
                          />
                        </label>
                        <label className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                          URL
                          <input
                            value={activeDownload.url ?? ''}
                            onChange={(e) => setActiveDownload((prev) => ({ ...prev, url: e.target.value }))}
                            className={inputClass}
                          />
                        </label>
                        <label className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                          Type
                          <select
                            value={activeDownload.type ?? 'audio'}
                            onChange={(e) => setActiveDownload((prev) => ({ ...prev, type: e.target.value }))}
                            className={inputClass}
                          >
                            <option value="audio">Audio</option>
                            <option value="video">Video</option>
                            <option value="pdf">PDF</option>
                          </select>
                        </label>
                        <label className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                          Description
                          <textarea
                            value={activeDownload.description ?? ''}
                            onChange={(e) => setActiveDownload((prev) => ({ ...prev, description: e.target.value }))}
                            className={`${inputClass} min-h-[100px] resize-y`}
                          />
                        </label>
                        <button type="button" onClick={persistDownload} className="btn-solid-custom w-full inline-flex items-center justify-center gap-2">
                          <UploadCloud size={16} /> Save download link
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-card p-8 shadow-lg">
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                      <h3 className="font-heading text-2xl text-foreground">Gallery</h3>
                      <p className="text-sm text-muted-foreground">Manage the gallery item titles and external image URLs used on the archive page.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveGallery({ active: true })}
                      className="btn-outline-custom inline-flex items-center gap-2"
                    >
                      <Plus size={16} /> Add photo
                    </button>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                    <div className="space-y-3">
                      {galleryItems.map((item) => (
                        <div key={item.id} className="rounded-xl border border-border bg-background/80 p-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-semibold text-foreground">{item.title}</div>
                              <div className="text-[11px] uppercase tracking-[2px] text-muted-foreground">{item.event_label}</div>
                            </div>
                            <div className="text-[11px] uppercase tracking-[2px] text-primary">{item.active ? 'Active' : 'Inactive'}</div>
                          </div>
                          <div className="text-sm text-muted-foreground">{item.image_url}</div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setActiveGallery(item)}
                              className="btn-outline-custom inline-flex items-center gap-2"
                            >
                              <Edit3 size={14} /> Edit
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-border bg-background/80 p-6">
                      <div className="font-semibold text-foreground mb-3">Gallery editor</div>
                      <div className="space-y-4">
                        <label className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                          Title
                          <input
                            value={activeGallery.title ?? ''}
                            onChange={(e) => setActiveGallery((prev) => ({ ...prev, title: e.target.value }))}
                            className={inputClass}
                          />
                        </label>
                        <label className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                          Event Label
                          <input
                            value={activeGallery.event_label ?? ''}
                            onChange={(e) => setActiveGallery((prev) => ({ ...prev, event_label: e.target.value }))}
                            className={inputClass}
                          />
                        </label>
                        <label className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                          Image URL
                          <input
                            value={activeGallery.image_url ?? ''}
                            onChange={(e) => setActiveGallery((prev) => ({ ...prev, image_url: e.target.value }))}
                            className={inputClass}
                          />
                        </label>
                        <label className="flex items-center gap-3 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={activeGallery.active ?? false}
                            onChange={(e) => setActiveGallery((prev) => ({ ...prev, active: e.target.checked }))}
                            className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-primary"
                          />
                          Active item
                        </label>
                        <button type="button" onClick={persistGallery} className="btn-solid-custom w-full inline-flex items-center justify-center gap-2">
                          <UploadCloud size={16} /> Save gallery item
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="rounded-xl border border-border bg-card p-8 shadow-lg">
                  <div className="mb-6">
                    <h3 className="font-heading text-2xl text-foreground">Site content</h3>
                    <p className="text-sm text-muted-foreground">Simple site text and headline management for future pages.</p>
                  </div>

                  <div className="grid gap-4">
                    {['homepage_hero', 'event_intro', 'download_description'].map((key) => (
                      <label key={key} className="space-y-2 text-[10px] uppercase tracking-[3px] text-muted-foreground">
                        {key.replace(/_/g, ' ')}
                        <textarea
                          value={siteSettings[key] ?? ''}
                          onChange={(e) => setSiteSettings((prev) => ({ ...prev, [key]: e.target.value }))}
                          className={`${inputClass} min-h-[90px] resize-y`}
                        />
                        <button
                          type="button"
                          onClick={() => persistSetting(key, siteSettings[key] ?? '')}
                          className="btn-outline-custom inline-flex items-center gap-2"
                        >
                          <CheckCircle2 size={16} /> Save
                        </button>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
