import { useState, useEffect } from 'react';
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
  Calendar, Download, Image, Settings, Users, LogOut, Plus, Trash2, Edit2, Save, X, Eye, EyeOff,
} from 'lucide-react';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface EventRecord {
  id?: string;
  title: string;
  status: string;
  date: string;
  image_url: string;
  description: string;
  location: string;
  time: string;
}

interface DownloadRecord {
  id?: string;
  title: string;
  url: string;
  description: string;
  category: string;
  type: string;
}

interface GalleryRecord {
  id?: string;
  title: string;
  image_url: string;
  caption: string;
  category: string;
}

const emptyEvent: EventRecord = { title: '', status: 'upcoming', date: '', image_url: '', description: '', location: '', time: '' };
const emptyDownload: DownloadRecord = { title: '', url: '', description: '', category: '', type: '' };
const emptyGallery: GalleryRecord = { title: '', image_url: '', caption: '', category: '' };

/* ── Component ──────────────────────────────────────────────────────────── */

export default function AdminPage() {
  // Auth
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [authMode, setAuthMode] = useState<'signIn' | 'signUp'>('signIn');
  const [isLoading, setIsLoading] = useState(false);

  // Data
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [gallery, setGallery] = useState<GalleryRecord[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [settingsMeta, setSettingsMeta] = useState<{ id: string; key: string; label: string; type: string }[]>([]);

  // Editing state
  const [editEvent, setEditEvent] = useState<EventRecord | null>(null);
  const [editDownload, setEditDownload] = useState<DownloadRecord | null>(null);
  const [editGallery, setEditGallery] = useState<GalleryRecord | null>(null);

  // Admin invite
  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');

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
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both email and password.');
      return;
    }
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    toast.info('Signed out.');
  };

  /* ── Data Loading ────────────────────────────────────────────────────── */

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [ev, dl, gal, st] = await Promise.all([
        supabase.from('events').select('*').order('date', { ascending: false }),
        supabase.from('downloads').select('*').order('title'),
        supabase.from('gallery').select('*').order('created_at', { ascending: false }),
        supabase.from('site_settings').select('*'),
      ]);
      setEvents(ev.data ?? []);
      setDownloads(dl.data ?? []);
      setGallery(gal.data ?? []);
      const settings = st.data ?? [];
      setSettingsMeta(settings.map((r: any) => ({ id: r.id, key: r.key, label: r.label, type: r.type })));
      setSiteSettings(settings.reduce((acc: Record<string, string>, r: any) => { acc[r.key] = r.value ?? ''; return acc; }, {}));
    } finally {
      setIsLoading(false);
    }
  };

  /* ── CRUD: Events ────────────────────────────────────────────────────── */

  const saveEvent = async () => {
    if (!editEvent) return;
    if (!editEvent.title) { toast.error('Event title is required.'); return; }
    const payload = { title: editEvent.title, status: editEvent.status, date: editEvent.date, image_url: editEvent.image_url, description: editEvent.description, location: editEvent.location, time: editEvent.time };
    if (editEvent.id) {
      const { error } = await supabase.from('events').update(payload).eq('id', editEvent.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Event updated.');
    } else {
      const { error } = await supabase.from('events').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Event created.');
    }
    setEditEvent(null);
    loadAllData();
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    await supabase.from('events').delete().eq('id', id);
    toast.success('Event deleted.');
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

  const saveGallery = async () => {
    if (!editGallery) return;
    if (!editGallery.title || !editGallery.image_url) { toast.error('Title and image URL are required.'); return; }
    const payload = { title: editGallery.title, image_url: editGallery.image_url, caption: editGallery.caption, category: editGallery.category };
    if (editGallery.id) {
      const { error } = await supabase.from('gallery').update(payload).eq('id', editGallery.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Gallery item updated.');
    } else {
      const { error } = await supabase.from('gallery').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Gallery item created.');
    }
    setEditGallery(null);
    loadAllData();
  };

  const deleteGallery = async (id: string) => {
    if (!confirm('Delete this gallery item?')) return;
    await supabase.from('gallery').delete().eq('id', id);
    toast.success('Gallery item deleted.');
    loadAllData();
  };

  /* ── Site Settings ───────────────────────────────────────────────────── */

  const saveSetting = async (key: string) => {
    const meta = settingsMeta.find(s => s.key === key);
    if (!meta) return;
    const { error } = await supabase.from('site_settings').update({ value: siteSettings[key] }).eq('id', meta.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${meta.label} saved.`);
  };

  /* ── Admin Invite ────────────────────────────────────────────────────── */

  const inviteAdmin = async () => {
    if (!inviteEmail.trim() || !invitePassword.trim()) { toast.error('Enter email and password for the new admin.'); return; }
    const { error } = await supabase.auth.signUp({ email: inviteEmail, password: invitePassword });
    if (error) { toast.error(error.message); return; }
    toast.success(`Invite sent to ${inviteEmail}. They should check their email for verification.`);
    setInviteEmail('');
    setInvitePassword('');
  };

  /* ── Render: Auth Screen ─────────────────────────────────────────────── */

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0F0D0A] flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-[#1A1814] border-[#E8620A]/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-['Playfair_Display'] text-white">
              Admin Login
            </CardTitle>
            <p className="text-sm text-[#B5A898] mt-1">Cherubs Cove Ministry</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-[#0F0D0A] border-[#2A2520] text-white placeholder:text-[#6B5E50]"
            />
            <div className="relative">
              <Input
                placeholder="Password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAuth()}
                className="bg-[#0F0D0A] border-[#2A2520] text-white placeholder:text-[#6B5E50] pr-10"
              />
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

  return (
    <div className="min-h-screen bg-[#0F0D0A] text-white">
      <Navbar />
      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-['Playfair_Display'] text-white">Admin Dashboard</h1>
            <p className="text-[#B5A898] text-sm mt-1">{session.user.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814] hover:text-white">
            <LogOut size={16} className="mr-2" /> Sign Out
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: Calendar, label: 'Events', count: events.length, color: '#E8620A' },
            { icon: Download, label: 'Downloads', count: downloads.length, color: '#B07D35' },
            { icon: Image, label: 'Gallery', count: gallery.length, color: '#6B8F71' },
            { icon: Settings, label: 'Settings', count: settingsMeta.length, color: '#7B68AE' },
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

        {/* Tabs */}
        <Tabs defaultValue="events" className="space-y-6">
          <TabsList className="bg-[#1A1814] border border-[#2A2520] p-1 flex flex-wrap h-auto gap-1">
            <TabsTrigger value="events" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898]"><Calendar size={14} className="mr-1.5" />Events</TabsTrigger>
            <TabsTrigger value="downloads" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898]"><Download size={14} className="mr-1.5" />Downloads</TabsTrigger>
            <TabsTrigger value="gallery" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898]"><Image size={14} className="mr-1.5" />Gallery</TabsTrigger>
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
                    <Input placeholder="Title *" value={editEvent.title} onChange={e => setEditEvent({ ...editEvent, title: e.target.value })} className={inputCls} />
                    <Input placeholder="Status (upcoming/past)" value={editEvent.status} onChange={e => setEditEvent({ ...editEvent, status: e.target.value })} className={inputCls} />
                    <Input placeholder="Date (YYYY-MM-DD)" type="date" value={editEvent.date} onChange={e => setEditEvent({ ...editEvent, date: e.target.value })} className={inputCls} />
                    <Input placeholder="Time" value={editEvent.time} onChange={e => setEditEvent({ ...editEvent, time: e.target.value })} className={inputCls} />
                    <Input placeholder="Location" value={editEvent.location} onChange={e => setEditEvent({ ...editEvent, location: e.target.value })} className={inputCls} />
                    <Input placeholder="Image URL" value={editEvent.image_url} onChange={e => setEditEvent({ ...editEvent, image_url: e.target.value })} className={inputCls} />
                  </div>
                  <Textarea placeholder="Description" value={editEvent.description} onChange={e => setEditEvent({ ...editEvent, description: e.target.value })} className={inputCls} rows={3} />
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
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ev.status === 'upcoming' ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-400'}`}>{ev.status}</span>
                      </div>
                      <p className="text-sm text-[#6B5E50] mt-0.5">{ev.date} {ev.time && `• ${ev.time}`} {ev.location && `• ${ev.location}`}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
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
                    <Input placeholder="Title *" value={editDownload.title} onChange={e => setEditDownload({ ...editDownload, title: e.target.value })} className={inputCls} />
                    <Input placeholder="URL *" value={editDownload.url} onChange={e => setEditDownload({ ...editDownload, url: e.target.value })} className={inputCls} />
                    <Input placeholder="Category" value={editDownload.category} onChange={e => setEditDownload({ ...editDownload, category: e.target.value })} className={inputCls} />
                    <Input placeholder="Type (pdf, audio, etc.)" value={editDownload.type} onChange={e => setEditDownload({ ...editDownload, type: e.target.value })} className={inputCls} />
                  </div>
                  <Textarea placeholder="Description" value={editDownload.description} onChange={e => setEditDownload({ ...editDownload, description: e.target.value })} className={inputCls} rows={2} />
                  <div className="flex gap-2">
                    <Button onClick={saveDownload} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} className="mr-1" /> Save</Button>
                    <Button variant="outline" onClick={() => setEditDownload(null)} className="border-[#2A2520] text-[#B5A898]"><X size={14} className="mr-1" /> Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {downloads.length === 0 && !editDownload && <p className="text-[#6B5E50] text-center py-8">No downloads yet. Click "Add Download" to create one.</p>}

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

          {/* ── Gallery Tab ──────────────────────────────────────────────── */}
          <TabsContent value="gallery" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Gallery</h2>
              <Button onClick={() => setEditGallery({ ...emptyGallery })} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Plus size={16} className="mr-1" /> Add Image</Button>
            </div>

            {editGallery && (
              <Card className="bg-[#1A1814] border-[#E8620A]/30">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-[#E8620A]">{editGallery.id ? 'Edit Image' : 'New Image'}</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Input placeholder="Title *" value={editGallery.title} onChange={e => setEditGallery({ ...editGallery, title: e.target.value })} className={inputCls} />
                    <Input placeholder="Image URL *" value={editGallery.image_url} onChange={e => setEditGallery({ ...editGallery, image_url: e.target.value })} className={inputCls} />
                    <Input placeholder="Category" value={editGallery.category} onChange={e => setEditGallery({ ...editGallery, category: e.target.value })} className={inputCls} />
                    <Input placeholder="Caption" value={editGallery.caption} onChange={e => setEditGallery({ ...editGallery, caption: e.target.value })} className={inputCls} />
                  </div>
                  {editGallery.image_url && (
                    <img src={editGallery.image_url} alt="Preview" className="w-32 h-24 object-cover rounded-lg border border-[#2A2520]" />
                  )}
                  <div className="flex gap-2">
                    <Button onClick={saveGallery} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} className="mr-1" /> Save</Button>
                    <Button variant="outline" onClick={() => setEditGallery(null)} className="border-[#2A2520] text-[#B5A898]"><X size={14} className="mr-1" /> Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {gallery.length === 0 && !editGallery && <p className="text-[#6B5E50] text-center py-8">No gallery items yet. Click "Add Image" to create one.</p>}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {gallery.map(g => (
                <Card key={g.id} className="bg-[#1A1814] border-[#2A2520] overflow-hidden">
                  <div className="aspect-video bg-[#0F0D0A] relative">
                    {g.image_url ? <img src={g.image_url} alt={g.title} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-[#2A2520]"><Image size={32} /></div>}
                  </div>
                  <CardContent className="p-3">
                    <h4 className="text-sm font-semibold text-white truncate">{g.title}</h4>
                    {g.category && <p className="text-xs text-[#6B5E50]">{g.category}</p>}
                    <div className="flex gap-1 mt-2">
                      <Button size="sm" variant="ghost" onClick={() => setEditGallery({ ...g })} className="text-[#B5A898] hover:text-white h-7 px-2"><Edit2 size={12} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteGallery(g.id!)} className="text-red-400 hover:text-red-300 h-7 px-2"><Trash2 size={12} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Settings Tab ─────────────────────────────────────────────── */}
          <TabsContent value="settings" className="space-y-4">
            <h2 className="text-xl font-semibold">Site Settings</h2>
            <div className="space-y-4">
              {settingsMeta.map(meta => (
                <Card key={meta.id} className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-4">
                    <label className="text-sm font-medium text-[#B5A898] block mb-1.5">{meta.label}</label>
                    <div className="flex gap-2">
                      {meta.type === 'boolean' ? (
                        <select
                          value={siteSettings[meta.key] ?? ''}
                          onChange={e => setSiteSettings(prev => ({ ...prev, [meta.key]: e.target.value }))}
                          className={`flex-1 rounded-md px-3 py-2 ${inputCls} border`}
                        >
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <Input
                          value={siteSettings[meta.key] ?? ''}
                          onChange={e => setSiteSettings(prev => ({ ...prev, [meta.key]: e.target.value }))}
                          className={`flex-1 ${inputCls}`}
                          type={meta.type === 'email' ? 'email' : meta.type === 'url' ? 'url' : 'text'}
                        />
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
            <h2 className="text-xl font-semibold">Invite New Admin</h2>
            <Card className="bg-[#1A1814] border-[#2A2520]">
              <CardContent className="p-5 space-y-3">
                <p className="text-sm text-[#B5A898]">Create a new admin account. The new admin will receive a verification email.</p>
                <div className="grid md:grid-cols-2 gap-3">
                  <Input placeholder="Email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className={inputCls} />
                  <Input placeholder="Password" type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} className={inputCls} />
                </div>
                <Button onClick={inviteAdmin} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Users size={14} className="mr-1" /> Create Admin</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
