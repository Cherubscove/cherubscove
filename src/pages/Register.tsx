import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { supabase } from '@/lib/supabaseClient';
import { buildEventRegistrationLink, formatEventDateRange, type FormFieldConfig } from '@/lib/adminTypes';
import { CalendarDays, MapPin, Clock, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';

/* ── Types ────────────────────────────────────────────────────────────── */

interface EventWithReg {
  id: string;
  title: string;
  theme?: string;
  status: string;
  date: string;
  end_date?: string;
  time: string;
  end_time?: string;
  description: string;
  location: string;
  image_url: string;
  registration_enabled: boolean;
  form_fields: string;
  completion_message?: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

function normalizeImageUrl(url: string): string {
  if (!url) return '';
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^&]*&)*id=)([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
  return url;
}

/* ── Gallery Card ────────────────────────────────────────────────────── */

function EventCard({ event }: { event: EventWithReg }) {
  const imgSrc = normalizeImageUrl(event.image_url);
  const dateStr = formatEventDateRange(event);

  return (
    <Link
      to={buildEventRegistrationLink(event)}
      className="group block rounded-xl overflow-hidden border border-border bg-card hover:border-primary/50 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_40px_hsl(var(--orange)/0.12)]"
    >
      {/* Image */}
      <div className="relative h-44 sm:h-52 overflow-hidden">
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={event.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#2A2520] to-[#1A1814] flex items-center justify-center">
            <span className="text-4xl font-display text-[#B5A898]/30">{event.title.charAt(0)}</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0D0A]/90 via-[#0F0D0A]/30 to-transparent" />

        {/* Status badge */}
        <div className="absolute top-3 left-3">
          <span className={`text-[9px] font-bold tracking-[2px] uppercase px-2.5 py-1 rounded-full ${
            event.status === 'upcoming'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : event.status === 'recurring'
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            {event.status}
          </span>
        </div>

        {/* Date at bottom of image */}
        {dateStr && (
          <div className="absolute bottom-3 left-3 right-3">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-medium text-white/80 bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">
              <CalendarDays size={11} />
              {dateStr}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 space-y-2">
        <h3 className="font-heading text-lg font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
          {event.title}
        </h3>
        {event.theme && (
          <p className="text-xs italic text-muted-foreground/80">"{event.theme}"</p>
        )}
        {event.location && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin size={11} />
            {event.location}
          </div>
        )}
        {event.description && (
          <p className="text-xs text-muted-foreground/70 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}
        <div className="pt-2">
          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[2px] uppercase text-primary group-hover:gap-2.5 transition-all">
            Register <ArrowRight size={12} />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── Registration Form ────────────────────────────────────────────────── */

function RegistrationForm({
  event,
  onSuccess,
  completionMessage,
  submitText = 'Submit',
  successText = 'Registered!',
}: {
  event: EventWithReg;
  onSuccess?: () => void;
  completionMessage?: string;
  submitText?: string;
  successText?: string;
}) {
  const [formValues, setFormValues] = useState<Record<string, string | string[]>>({});
  const [regStatus, setRegStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const formFields: FormFieldConfig[] = (() => {
    try { return JSON.parse(event.form_fields || '[]'); } catch { return []; }
  })();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setRegStatus('idle');
    setMessage('');
    setIsSubmitting(true);

    const normalizeLabel = (value: string) => value.trim().toLowerCase();
    const formatValue = (value: string | string[] | undefined): string | null => {
      if (value === undefined || value === null) return null;
      if (Array.isArray(value)) return value.length ? value.join(', ') : null;
      return value.trim() ? value : null;
    };

    const matchesLabel = (field: FormFieldConfig, keywords: string[]) => {
      const label = normalizeLabel(field.label || '');
      return keywords.some(keyword => label.includes(keyword));
    };

    const findField = (test: (field: FormFieldConfig) => boolean) =>
      formFields.find(field => test(field));

    const getFieldValue = (field: FormFieldConfig | undefined) =>
      field ? formatValue(formValues[field.id]) : null;

    const findByTypeOrLabel = (type: FormFieldConfig['type'], labels: string[]) =>
      findField(field => field.type === type && getFieldValue(field) !== null)
      || findField(field => matchesLabel(field, labels) && getFieldValue(field) !== null);

    const fullNameField = findField(field =>
      field.type === 'text' && matchesLabel(field, ['name']) && !matchesLabel(field, ['first', 'last']) && getFieldValue(field) !== null
    );
    const firstNameField = findField(field =>
      field.type === 'text' && matchesLabel(field, ['first']) && matchesLabel(field, ['name']) && getFieldValue(field) !== null
    );
    const lastNameField = findField(field =>
      field.type === 'text' && matchesLabel(field, ['last']) && matchesLabel(field, ['name']) && getFieldValue(field) !== null
    );

    const fullName = fullNameField ? getFieldValue(fullNameField) : [getFieldValue(firstNameField), getFieldValue(lastNameField)]
      .filter(Boolean).join(' ').trim() || null;

    const payload = {
      event_id: event.id,
      full_name: fullName,
      email: getFieldValue(findByTypeOrLabel('email', ['email', 'e-mail'])),
      phone: getFieldValue(findByTypeOrLabel('tel', ['phone', 'tel', 'mobile', 'contact'])),
      state_city: getFieldValue(findByTypeOrLabel('text', ['state', 'city', 'location', 'address'])),
      prayer_note: getFieldValue(findByTypeOrLabel('textarea', ['prayer', 'note', 'request', 'comment', 'message', 'reason'])),
      program: event.title,
      form_data: formValues,
    };

    const { error } = await supabase.from('registrations').insert(payload);

    if (error) {
      const err = error as any;
      // User-friendly messages for common errors
      if (err.code === '42703') {
        setMessage('The registration form has an extra field the server doesn\'t recognise. Please contact the ministry team.');
      } else if (err.code === '42501' || err.message?.toLowerCase().includes('row-level security')) {
        setMessage('Registration is temporarily unavailable. Please try again later or contact us directly.');
      } else if (err.code === '23505') {
        setMessage('You have already registered for this event.');
      } else if (err.message?.toLowerCase().includes('network') || err.message?.toLowerCase().includes('fetch')) {
        setMessage('Network error. Please check your connection and try again.');
      } else {
        setMessage(err.message ?? 'Registration failed. Please try again.');
      }
      setRegStatus('error');
      setIsSubmitting(false);
      return;
    }

    setRegStatus('success');
    setMessage(completionMessage || 'Registration submitted successfully. Thank you!');
    setFormValues({});
    formRef.current?.reset();
    onSuccess?.();
    setIsSubmitting(false);
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-border bg-card text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--orange)/0.1)] placeholder:text-muted-foreground';

  return (
    <form onSubmit={handleRegister} ref={formRef} className="space-y-4">
      {formFields.map((field) => (
        <div key={field.id} className="space-y-1.5">
          <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">
            {field.label} {field.required && <span className="text-rose-400">*</span>}
          </label>
          {field.type === 'textarea' ? (
            <textarea
              placeholder={field.placeholder}
              required={field.required}
              value={(formValues[field.id] as string) || ''}
              onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
              className={`${inputClass} resize-y min-h-[80px]`}
            />
          ) : field.type === 'select' ? (
            <select
              required={field.required}
              value={(formValues[field.id] as string) || ''}
              onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
              className={`${inputClass} appearance-none`}
            >
              <option value="">{field.placeholder || 'Select...'}</option>
              {(field.options || []).map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : field.type === 'radio' ? (
            <div className="space-y-2 pt-1">
              {(field.options || []).map(opt => (
                <label key={opt} className="flex items-center gap-2.5 text-sm cursor-pointer group">
                  <input
                    type="radio"
                    name={field.id}
                    value={opt}
                    required={field.required}
                    checked={(formValues[field.id] as string) === opt}
                    onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="accent-primary w-3.5 h-3.5"
                  />
                  <span className="group-hover:text-foreground transition-colors">{opt}</span>
                </label>
              ))}
            </div>
          ) : field.type === 'checkbox' ? (
            <div className="space-y-2 pt-1">
              {(field.options || []).map(opt => {
                const raw = formValues[field.id];
                const arr: string[] = Array.isArray(raw) ? raw : [];
                const checked = arr.includes(opt);
                return (
                  <label key={opt} className="flex items-center gap-2.5 text-sm cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={e => {
                        const next = e.target.checked ? [...arr, opt] : arr.filter(v => v !== opt);
                        setFormValues(prev => ({ ...prev, [field.id]: next }));
                      }}
                      className="accent-primary w-3.5 h-3.5"
                    />
                    <span className="group-hover:text-foreground transition-colors">{opt}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <input
              type={field.type}
              placeholder={field.placeholder}
              required={field.required}
              value={(formValues[field.id] as string) || ''}
              onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
              className={inputClass}
            />
          )}
        </div>
      ))}

      {formFields.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Registration form is being set up. Please check back soon.
        </p>
      )}

      {formFields.length > 0 && (
        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-3.5 rounded-md font-body text-[11px] font-bold tracking-[3px] uppercase transition-all duration-250 ${
            regStatus === 'success'
              ? 'bg-emerald-600 text-white cursor-default'
              : isSubmitting
              ? 'bg-primary/80 text-white cursor-wait'
              : 'bg-primary text-white hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-[0_6px_22px_hsl(var(--orange)/0.3)] active:translate-y-0'
          }`}
        >
          {regStatus === 'success' ? (
            <span className="inline-flex items-center gap-2"><CheckCircle size={14} /> {successText}</span>
          ) : isSubmitting ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Submitting…
            </span>
          ) : (
            submitText
          )}
        </button>
      )}

      {message && (
        regStatus === 'success' ? (
          <div className="text-[13px] text-center mt-3 leading-relaxed text-emerald-400" dangerouslySetInnerHTML={{ __html: message }} />
        ) : (
          <p className={`text-[11px] text-center mt-3 ${regStatus === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
            {message}
          </p>
        )
      )}
    </form>
  );
}

/* ── Main Page Component ──────────────────────────────────────────────── */

export default function RegisterPage() {
  const ref = useScrollReveal();
  const s = useSiteSettings();
  const { eventId } = useParams();
  const [events, setEvents] = useState<EventWithReg[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    setLoading(true);
    try {
      if (eventId) {
        // Standalone mode — load the specific event
        const { data } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();
        setEvents(data ? [data] : []);
      } else {
        // Gallery mode — load all events with registration enabled
        const { data } = await supabase
          .from('events')
          .select('*')
          .eq('registration_enabled', true)
          .order('date', { ascending: true });
        setEvents(data ?? []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
    const channel = supabase
      .channel('register-events-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId]);

  const singleEvent = eventId ? events[0] ?? null : null;

  /* ── Loading State ──────────────────────────────────────────────────── */
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="pt-[70px] min-h-screen bg-background flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading events…</p>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     STANDALONE EVENT VIEW  (/register/:eventId)
     ═══════════════════════════════════════════════════════════════════ */
  if (singleEvent) {
    const ev = singleEvent;
    const imgSrc = normalizeImageUrl(ev.image_url);
    const dateStr = formatEventDateRange(ev);

    return (
      <>
        <Navbar />
        <div className="pt-[70px] min-h-screen bg-background" ref={ref}>
          {/* ── Hero ──────────────────────────────────────────────────── */}
          <section className="relative overflow-hidden">
            <div className="relative h-[320px] sm:h-[420px]">
              {imgSrc ? (
                <img src={imgSrc} alt={ev.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#2E1C0A] via-[#1A1008] to-[#0F0D0A]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0F0D0A] via-[#0F0D0A]/60 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0F0D0A]/40 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                <div className="max-w-4xl mx-auto">
                  {ev.status && (
                    <span className={`inline-block text-[9px] font-bold tracking-[2px] uppercase px-3 py-1 rounded-full mb-3 ${
                      ev.status === 'upcoming'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : ev.status === 'recurring'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                    }`}>
                      {ev.status}
                    </span>
                  )}
                  <h1 className="font-heading text-[clamp(28px,4vw,48px)] font-bold text-white leading-tight">
                    {ev.title}
                  </h1>
                  {ev.theme && (
                    <p className="mt-2 text-lg sm:text-xl italic text-white/70 font-heading">
                      “{ev.theme}”
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* ── Body ──────────────────────────────────────────────────── */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10 items-start">
              {/* Event details */}
              <div className="space-y-6">
                {/* Info chips */}
                <div className="flex flex-wrap gap-4">
                  {dateStr && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-full px-4 py-2">
                      <CalendarDays size={14} className="text-primary" />
                      {dateStr}
                    </div>
                  )}
                  {ev.time && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-full px-4 py-2">
                      <Clock size={14} className="text-primary" />
                      {ev.time}{ev.end_time ? ` – ${ev.end_time}` : ''}
                    </div>
                  )}
                  {ev.location && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-card border border-border rounded-full px-4 py-2">
                      <MapPin size={14} className="text-primary" />
                      {ev.location}
                    </div>
                  )}
                </div>

                {/* Description */}
                {ev.description && (
                  <div className="text-sm leading-[1.85] text-muted-foreground bg-card border border-border rounded-xl p-6">
                    {ev.description}
                  </div>
                )}

                {/* Back link */}
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  ← {getSetting(s, 'register_back_link', 'View all events')}
                </Link>
              </div>

              {/* Registration form */}
              <div className="bg-card border border-border rounded-xl p-6 lg:sticky lg:top-[90px]">
                {!ev.registration_enabled ? (
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-center">
                    <AlertTriangle size={24} className="mx-auto mb-2 text-amber-400" />
                    <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">{getSetting(s, 'register_closed_heading', 'Registration Closed')}</p>
                    <p className="text-xs text-amber-200/70 mt-1">
                      {getSetting(s, 'register_closed_text', 'Registration for this event is currently disabled.')}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="text-center mb-6">
                      <div className="font-heading text-xl font-semibold text-foreground">{getSetting(s, 'register_form_heading', 'Register Now')}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getSetting(s, 'register_form_heading', 'Register Now') === 'Register Now' ? 'Secure your spot for' : ''} <span className="text-primary font-medium">{ev.title}</span>
                      </p>
                    </div>
                    <RegistrationForm
                      event={ev}
                      completionMessage={ev.completion_message || getSetting(s, 'registration_completion_default', 'Registration submitted successfully. Thank you!')}
                      submitText={getSetting(s, 'register_form_submit_text', 'Submit')}
                      successText={getSetting(s, 'register_form_success_text', 'Registered!')}
                    />
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
        <Footer />
        <ScrollToTop />
      </>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════
     GALLERY VIEW  (/register)
     ═══════════════════════════════════════════════════════════════════ */
  return (
    <>
      <Navbar />
      <div className="pt-[70px] min-h-screen bg-background" ref={ref}>
        {/* Hero Banner */}
        <section className="relative py-20 sm:py-28 px-6 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-[#2E1C0A] via-[#1A1008] to-[#0F0D0A]" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
          <div className="relative z-10 max-w-2xl mx-auto">
            <div className="inline-block bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full text-[9px] font-bold tracking-[2px] uppercase text-primary mb-5">
              {getSetting(s, 'register_eyebrow', 'Programs &amp; Events')}
            </div>
            <h1 className="font-heading text-[clamp(32px,5vw,56px)] font-bold text-white leading-[1.1]" dangerouslySetInnerHTML={{ __html: getSetting(s, 'register_heading_html', 'Upcoming <em class="italic text-primary not-italic">Gatherings</em>') }} />
            <p className="mt-4 text-sm sm:text-base text-white/60 max-w-lg mx-auto leading-relaxed">
              {getSetting(s, 'register_intro', 'Browse our upcoming events and register to join us. Each event has its own registration page — pick one below to get started.')}
            </p>
          </div>
        </section>

        {/* Events Grid */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pb-20 -mt-6 relative z-10">
          {events.length === 0 ? (
            <div className="text-center py-20 bg-card border border-border rounded-2xl">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <CalendarDays size={24} className="text-muted-foreground" />
              </div>
              <h2 className="font-heading text-xl text-foreground mb-2">{getSetting(s, 'register_no_events_heading', 'No Events Right Now')}</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                {getSetting(s, 'register_no_events_text', 'There are no events with open registration at the moment. Check back soon for upcoming gatherings.')}
              </p>
            </div>
          ) : (
            <>
              {events.length > 1 && (
                <p className="text-sm text-muted-foreground mb-6">
                  <span className="text-foreground font-semibold">{events.length}</span> event{events.length !== 1 ? 's' : ''} open for registration
                </p>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(ev => (
                  <EventCard key={ev.id} event={ev} />
                ))}
              </div>
            </>
          )}
        </section>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
