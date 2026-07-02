import { describe, expect, it } from 'vitest';
import { buildEventRegistrationLink, validateEventDateTime } from './adminTypes';

describe('validateEventDateTime', () => {
  it('allows a single-day event with a blank end date', () => {
    const result = validateEventDateTime({
      date: '2026-07-10',
      time: '10:00 AM',
      end_time: '4:00 PM',
    });

    expect(result.isValid).toBe(true);
  });

  it('rejects an end date that is earlier than the start date', () => {
    const result = validateEventDateTime({
      date: '2026-07-10',
      end_date: '2026-07-09',
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain('End date');
  });

  it('rejects an end time that is earlier than the start time on the same day', () => {
    const result = validateEventDateTime({
      date: '2026-07-10',
      end_date: '2026-07-10',
      time: '10:00 AM',
      end_time: '9:00 AM',
    });

    expect(result.isValid).toBe(false);
    expect(result.message).toContain('End time');
  });

  it('allows a multi-day event when the end date comes after the start date', () => {
    const result = validateEventDateTime({
      date: '2026-07-10',
      end_date: '2026-07-12',
      time: '10:00 AM',
      end_time: '4:00 PM',
    });

    expect(result.isValid).toBe(true);
  });
});

describe('buildEventRegistrationLink', () => {
  it('builds a dedicated public registration route for an event', () => {
    expect(buildEventRegistrationLink({ id: 'event-123' })).toBe('/register/event-123');
  });
});
