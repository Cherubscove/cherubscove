export interface FormFieldConfig {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required: boolean;
  placeholder: string;
  options?: string[];
}

export interface EventRecord {
  id?: string;
  title: string;
  /** Optional theme / topic (e.g. "Envoys of Light", "The Passion of Christ"). Requires `theme` text column. */
  theme?: string;
  status: string;
  /** Start date (YYYY-MM-DD). Stored in existing `date` column. */
  date: string;
  /** End date (YYYY-MM-DD). Optional — same day if empty. Requires `end_date` column. */
  end_date?: string;
  /** Start time. Stored in existing `time` column. */
  time: string;
  /** End time. Optional. Requires `end_time` column. */
  end_time?: string;
  image_url: string;
  description: string;
  location: string;
  registration_enabled?: boolean;
  form_fields?: string;
}

export interface EventDateTimeValidationResult {
  isValid: boolean;
  message?: string;
}

export interface GalleryCollection {
  id: string;
  name: string;
  description?: string;
}

export interface DownloadRecord {
  id?: string; title: string; url: string; description: string; category: string; type: string;
}
export interface GalleryRecord {
  id?: string; title: string; image_url: string; caption: string; category: string;
}
export interface RegistrationRecord {
  id: string; event_id?: string; event_title?: string; form_data?: string;
  first_name: string; last_name: string; email: string; phone: string;
  program: string; location: string; note: string; created_at: string;
}

export const emptyEvent: EventRecord = {
  title: '', theme: '', status: 'upcoming', date: '', end_date: '', time: '', end_time: '',
  image_url: '', description: '', location: '',
  registration_enabled: false, form_fields: '[]',
};

function parseEventTime(value?: string): number | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/\s+/g, ' ');
  const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] || '0');
  const meridiem = match[3];

  if (hours > 23 || minutes > 59) return null;
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

export function validateEventDateTime(ev: { date?: string; end_date?: string; time?: string; end_time?: string }): EventDateTimeValidationResult {
  if (!ev.date) {
    return { isValid: false, message: 'Please choose a start date for the event.' };
  }

  const startDate = new Date(`${ev.date}T00:00:00`);
  if (Number.isNaN(startDate.getTime())) {
    return { isValid: false, message: 'The start date format is invalid.' };
  }

  if (ev.end_date) {
    const endDate = new Date(`${ev.end_date}T00:00:00`);
    if (Number.isNaN(endDate.getTime())) {
      return { isValid: false, message: 'The end date format is invalid.' };
    }
    if (endDate < startDate) {
      return { isValid: false, message: 'End date cannot be earlier than the start date.' };
    }
  }

  if (ev.time && ev.end_time && (!ev.end_date || ev.end_date === ev.date)) {
    const startMinutes = parseEventTime(ev.time);
    const endMinutes = parseEventTime(ev.end_time);
    if (startMinutes !== null && endMinutes !== null && endMinutes <= startMinutes) {
      return { isValid: false, message: 'End time must be later than the start time for one-day events.' };
    }
  }

  return { isValid: true };
}

export function buildEventRegistrationLink(event: Pick<EventRecord, 'id'>): string {
  return event.id ? `/register/${encodeURIComponent(event.id)}` : '/register';
}
export const emptyDownload: DownloadRecord = { title: '', url: '', description: '', category: '', type: '' };
export const emptyGallery: GalleryRecord = { title: '', image_url: '', caption: '', category: '' };

/** Format event date range for display. */
export function formatEventDateRange(ev: { date?: string; end_date?: string; time?: string; end_time?: string }): string {
  const start = ev.date ? new Date(ev.date) : null;
  const end = ev.end_date ? new Date(ev.end_date) : null;
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  let dateStr = '';
  if (start && end && ev.end_date && ev.end_date !== ev.date) {
    // Multi-day
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    dateStr = sameMonth
      ? `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString(undefined, { day: 'numeric', year: 'numeric' })}`
      : `${fmt(start)} – ${fmt(end)}`;
  } else if (start) {
    dateStr = fmt(start);
  }
  let timeStr = '';
  if (ev.time && ev.end_time) timeStr = `${ev.time} – ${ev.end_time}`;
  else if (ev.time) timeStr = ev.time;
  return [dateStr, timeStr].filter(Boolean).join(' · ');
}
