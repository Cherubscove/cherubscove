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
  /** Completion message shown after successful registration (supports HTML). */
  completion_message?: string;
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
  id?: string; title: string; image_url: string; caption: string; category: string; alt_text?: string;
}
export interface RegistrationRecord {
  id: string;
  event_id?: string;
  event_title?: string;
  full_name?: string | null;
  form_data?: Record<string, any> | string | null;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  program?: string | null;
  location?: string | null;
  state_city?: string | null;
  note?: string | null;
  prayer_note?: string | null;
  status?: string;
  attended?: boolean;
  created_at: string;
  updated_at?: string;
}

export const emptyEvent: EventRecord = {
  title: '', theme: '', status: 'upcoming', date: '', end_date: '', time: '', end_time: '',
  image_url: '', description: '', location: '',
  registration_enabled: false, form_fields: '[]', completion_message: '',
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
export const emptyGallery: GalleryRecord = { title: '', image_url: '', caption: '', category: '', alt_text: '' };

/**
 * Generate a short abbreviation from a gallery name, e.g.
 * "Quiver's Arrows 2023" → "QA-2023", "Quiver's Forge 2024" → "QF-2024".
 * The year (4 digits) is extracted and appended after a dash.
 */
export function generateGalleryAbbreviation(name: string): string {
  const yearMatch = name.match(/\b(\d{4})\b/);
  const year = yearMatch ? yearMatch[1] : '';

  // Split on spaces and apostrophes, filter out empty strings
  const words = name
    .replace(/\b\d{4}\b/g, '')
    .split(/['\s]+/)
    .filter(Boolean);

  const prefix = words
    .map((w, i) => {
      // First word: use first letter only.
      // Subsequent words: if more than 6 characters use first two letters,
      // otherwise use first letter. This reduces abbreviation collisions.
      const c = w.charAt(0).toUpperCase();
      if (i === 0) return c;
      return w.length > 6 ? c + w.charAt(1).toLowerCase() : c;
    })
    .join('');

  return year ? `${prefix}-${year}` : prefix;
}

/**
 * Generate a default image title based on gallery context.
 * If the image belongs to a gallery, uses the gallery abbreviation + sequential index.
 * If uncategorized, uses "Uncategorized-XXX".
 */
export function generateDefaultImageTitle(
  galleryName: string | null | undefined,
  index: number,
): string {
  if (galleryName) {
    const abbr = generateGalleryAbbreviation(galleryName);
    return `${abbr}-${String(index + 1).padStart(3, '0')}`;
  }
  return `Uncategorized-${String(index + 1).padStart(3, '0')}`;
}

/**
 * Generate the next auto-title for an image, ensuring stable numbering:
 * finds the highest existing index among images in the same gallery (or
 * uncategorized) and increments it.  Deleting an image never re-numbers
 * the remaining ones.
 *
 * @param existingImages – all images belonging to the same gallery (or
 *   uncategorized).  It is safe to include *all* gallery images; the
 *   function only uses their titles to find the max index.
 * @param galleryName – display name of the gallery, or null for
 *   uncategorized.
 */
export function generateNextImageTitle(
  existingImages: { title?: string | null }[],
  galleryName: string | null | undefined,
): string {
  const abbr = galleryName
    ? generateGalleryAbbreviation(galleryName)
    : 'Uncategorized';

  let maxIndex = 0;
  for (const img of existingImages) {
    const t = img.title || '';
    if (t.startsWith(abbr)) {
      const match = t.match(/-(\d{3})$/);
      if (match) {
        const idx = parseInt(match[1], 10);
        if (idx > maxIndex) maxIndex = idx;
      }
    }
  }
  // maxIndex is the highest 1‑based number; next one is maxIndex + 1.
  return `${abbr}-${String(maxIndex + 1).padStart(3, '0')}`;
}

/** Format event date range for display. Multi-day events show full start + end date/time. */
export function formatEventDateRange(ev: { date?: string; end_date?: string; time?: string; end_time?: string }): string {
  const parseDate = (s?: string) => (s ? new Date(`${s}T00:00:00`) : null);
  const start = parseDate(ev.date);
  const end = parseDate(ev.end_date);
  const fmtFull = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  const multiDay = !!(start && end && ev.end_date && ev.end_date !== ev.date);

  if (multiDay) {
    const startPart = [fmtFull(start!), ev.time].filter(Boolean).join(' · ');
    const endPart = [fmtFull(end!), ev.end_time].filter(Boolean).join(' · ');
    return `${startPart}  –  ${endPart}`;
  }

  if (start) {
    const datePart = fmtFull(start);
    let timePart = '';
    if (ev.time && ev.end_time) timePart = `${ev.time} – ${ev.end_time}`;
    else if (ev.time) timePart = ev.time;
    return [datePart, timePart].filter(Boolean).join(' · ');
  }
  return '';
}
