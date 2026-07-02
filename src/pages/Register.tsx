import { useState, useEffect, useRef, type FormEvent } from 'react';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ScrollToTop from '@/components/ScrollToTop';
import { supabase } from '@/lib/supabaseClient';
import { formatEventDateRange, type FormFieldConfig } from '@/lib/adminTypes';

interface EventWithReg {
  id: string;
  title: string;
  status: string;
  date: string;
  end_date?: string;
  time: string;
  end_time?: string;
  description: string;
  location: string;
  registration_enabled: boolean;
  form_fields: string;
}

export default function RegisterPage() {
  const ref = useScrollReveal();
  const [events, setEvents] = useState<EventWithReg[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [regStatus, setRegStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('*')
      .eq('registration_enabled', true)
      .order('date', { ascending: true });
    if (data?.length) {
      setEvents(data);
      // Auto-select the first upcoming event, or the first event
      const upcoming = data.find((e: any) => e.status === 'upcoming');
      setSelectedEventId(upcoming?.id || data[0].id);
    }
  };

  useEffect(() => {
    loadEvents();
    const channel = supabase
      .channel('register-events-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => loadEvents())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const formFields: FormFieldConfig[] = (() => {
    try { return JSON.parse(selectedEvent?.form_fields || '[]'); } catch { return []; }
  })();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;
    setRegStatus('idle');
    setMessage('');

    // Extract standard fields from formValues
    const { error } = await supabase.from('registrations').insert({
      event_id: selectedEvent.id,
      event_title: selectedEvent.title,
      first_name: formValues['first_name'] || formValues['First Name'] || '',
      last_name: formValues['last_name'] || formValues['Last Name'] || '',
      email: formValues['email'] || formValues['Email Address'] || '',
      phone: formValues['phone'] || formValues['Phone Number'] || '',
      location: formValues['location'] || formValues['State / City'] || '',
      note: formValues['note'] || formValues['Prayer Request or Note'] || '',
      program: selectedEvent.title,
      form_data: JSON.stringify(formValues),
      created_at: new Date().toISOString(),
    });

    if (error) {
      setRegStatus('error');
      setMessage(error.message ?? 'Registration failed.');
      return;
    }

    setRegStatus('success');
    setMessage('Registration submitted successfully. Thank you!');
    setFormValues({});
    formRef.current?.reset();
  };

  const inputClass =
    'w-full px-3.5 py-2.5 rounded-md border-[1.5px] border-border bg-card text-sm text-foreground outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--orange)/0.1)] placeholder:text-muted-foreground';

  // Separate upcoming conference from other events
  const mainEvent = events.find(e => e.status === 'upcoming');
  const otherEvents = events.filter(e => e.id !== mainEvent?.id);

  return (
    <>
      <Navbar />
      <div className="pt-[70px] min-h-screen bg-background" ref={ref}>
        {/* Hero Banner */}
        {mainEvent && (
          <div
            className="py-20 px-8 text-center"
            style={{ background: 'linear-gradient(135deg, #1A1008, #2E1C0A)' }}
          >
            <div className="max-w-[600px] mx-auto">
              <div className="font-display text-[clamp(20px,3vw,30px)] font-semibold text-primary tracking-[3px] mb-2">
                {mainEvent.title}
              </div>
              <div className="font-heading text-[15px] italic tracking-wider mb-4 text-white/65">
                {mainEvent.description?.slice(0, 80)}
              </div>
              <div className="inline-block bg-primary px-4 py-1.5 rounded-full text-[9px] font-bold tracking-[2px] uppercase text-white">
                Registrations Open
              </div>
            </div>
          </div>
        )}

        <div className="container py-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-16 items-start">
            {/* Left: Event Info */}
            <div>
              <div className="eyebrow reveal">Programs &amp; Events</div>
              <h1 className="section-title reveal">
                Upcoming <em>Gatherings</em>
              </h1>

              {/* Selected event details */}
              {selectedEvent && (
                <div className="border border-border rounded-lg overflow-hidden bg-card reveal card-lift mb-8">
                  <div className="p-8">
                    <h2 className="font-heading text-xl font-medium text-foreground mb-4">{selectedEvent.title}</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 my-4">
                      {[
                        { lbl: (selectedEvent.end_date && selectedEvent.end_date !== selectedEvent.date) ? 'Dates' : 'Date', val: formatEventDateRange({ date: selectedEvent.date, end_date: selectedEvent.end_date }) || 'TBA' },
                        { lbl: 'Time', val: (selectedEvent.time && selectedEvent.end_time) ? `${selectedEvent.time} – ${selectedEvent.end_time}` : (selectedEvent.time || 'TBA') },
                        { lbl: 'Venue', val: selectedEvent.location || 'To Be Announced' },
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
                    {selectedEvent.description && (
                      <div className="text-sm leading-[1.85] text-muted-foreground pt-6 border-t border-border mt-4">
                        {selectedEvent.description}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Other events with registration */}
              {otherEvents.length > 0 && (
                <div className="flex flex-col gap-3 reveal">
                  <h3 className="text-xs font-bold tracking-[2px] uppercase text-muted-foreground mb-1">Other Events Open for Registration</h3>
                  {otherEvents.map(ev => (
                    <button
                      key={ev.id}
                      onClick={() => { setSelectedEventId(ev.id); setFormValues({}); setRegStatus('idle'); setMessage(''); }}
                      className={`p-5 rounded-lg border text-left transition-all card-lift ${
                        selectedEventId === ev.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="text-[9.5px] font-bold tracking-[2px] uppercase text-primary mb-1">
                        {ev.status === 'recurring' ? 'Recurring' : ev.status}
                      </div>
                      <div className="font-heading text-[17px] text-foreground">{ev.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{ev.time || ev.date}</div>
                    </button>
                  ))}
                </div>
              )}

              {events.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <p className="text-sm">No events with open registration at the moment.</p>
                  <p className="text-xs mt-2">Check back soon for upcoming gatherings.</p>
                </div>
              )}
            </div>

            {/* Right: Dynamic Registration Form */}
            <div className="bg-card border border-border rounded-lg p-8 lg:sticky lg:top-[90px] reveal card-lift">
              {selectedEvent ? (
                <>
                  <div className="font-heading text-2xl font-medium mb-1 text-foreground">Register Now</div>
                  <div className="text-[13px] text-muted-foreground mb-7">
                    Register for: <span className="text-primary font-medium">{selectedEvent.title}</span>
                  </div>

                  {/* Event selector if multiple events */}
                  {events.length > 1 && (
                    <div className="mb-5 space-y-1.5">
                      <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">
                        Select Event
                      </label>
                      <select
                        value={selectedEventId}
                        onChange={e => { setSelectedEventId(e.target.value); setFormValues({}); setRegStatus('idle'); setMessage(''); }}
                        className={`${inputClass} appearance-none`}
                      >
                        {events.map(ev => (
                          <option key={ev.id} value={ev.id}>{ev.title}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <form onSubmit={handleRegister} ref={formRef}>
                    <div className="space-y-4">
                      {formFields.map((field, i) => (
                        <div key={field.id} className="space-y-1.5">
                          <label className="text-[9.5px] font-bold tracking-[2px] uppercase text-muted-foreground">
                            {field.label} {field.required && '*'}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              placeholder={field.placeholder}
                              required={field.required}
                              value={formValues[field.id] || ''}
                              onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                              className={`${inputClass} resize-y min-h-[75px]`}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              required={field.required}
                              value={formValues[field.id] || ''}
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
                                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                                  <input
                                    type="radio"
                                    name={field.id}
                                    value={opt}
                                    required={field.required}
                                    checked={formValues[field.id] === opt}
                                    onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                                    className="accent-primary"
                                  />
                                  {opt}
                                </label>
                              ))}
                            </div>
                          ) : field.type === 'checkbox' ? (
                            <div className="space-y-2 pt-1">
                              {(field.options || []).map(opt => {
                                const arr: string[] = Array.isArray(formValues[field.id]) ? formValues[field.id] : [];
                                const checked = arr.includes(opt);
                                return (
                                  <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={e => {
                                        const next = e.target.checked ? [...arr, opt] : arr.filter(v => v !== opt);
                                        setFormValues(prev => ({ ...prev, [field.id]: next }));
                                      }}
                                      className="accent-primary"
                                    />
                                    {opt}
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <input
                              type={field.type}
                              placeholder={field.placeholder}
                              required={field.required}
                              value={formValues[field.id] || ''}
                              onChange={e => setFormValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                              className={inputClass}
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {formFields.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Registration form is being set up. Please check back soon.
                      </p>
                    )}

                    {formFields.length > 0 && (
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
                    )}

                    {message && (
                      <p className={`text-[11px] text-center mt-3 ${regStatus === 'error' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {message}
                      </p>
                    )}
                  </form>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="font-heading text-xl text-foreground mb-2">No Registration Available</div>
                  <p className="text-sm text-muted-foreground">There are no events with open registration at this time.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
      <ScrollToTop />
    </>
  );
}
