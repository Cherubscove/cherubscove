import { supabase } from './supabaseClient';

/**
 * Core audit action types to keep naming consistent across the admin panel.
 */
export const AUDIT_ACTIONS = {
  // Events
  EVENT_CREATED: 'event.created',
  EVENT_UPDATED: 'event.updated',
  EVENT_DELETED: 'event.deleted',
  EVENT_REGISTRATION_TOGGLED: 'event.registration_toggled',

  // Downloads
  DOWNLOAD_CREATED: 'download.created',
  DOWNLOAD_UPDATED: 'download.updated',
  DOWNLOAD_DELETED: 'download.deleted',

  // Gallery
  GALLERY_CREATED: 'gallery.created',
  GALLERY_UPDATED: 'gallery.updated',
  GALLERY_DELETED: 'gallery.deleted',
  GALLERY_IMAGE_CREATED: 'gallery.image_created',
  GALLERY_IMAGE_UPDATED: 'gallery.image_updated',
  GALLERY_IMAGE_DELETED: 'gallery.image_deleted',
  GALLERY_IMAGE_MOVED: 'gallery.image_moved',
  GALLERY_COVER_SET: 'gallery.cover_set',

  // Site Settings / Content
  SETTING_UPDATED: 'setting.updated',
  CONTENT_UPDATED: 'content.updated',
  HERO_SLIDES_UPDATED: 'hero_slides.updated',

  // Admin Management
  ADMIN_INVITED: 'admin.invited',
  ADMIN_REMOVED: 'admin.removed',
  ADMIN_ROLE_CHANGED: 'admin.role_changed',
  ADMIN_PASSWORD_CHANGED: 'admin.password_changed_self',
  ADMIN_PASSWORD_CHANGED_BY_SUPER: 'admin.password_changed_by_super',

  // Newsletter
  NEWSLETTER_SENT: 'newsletter.sent',
  NEWSLETTER_SUBSCRIBER_DELETED: 'newsletter.subscriber_deleted',
  NEWSLETTER_SUBSCRIBER_UPDATED: 'newsletter.subscriber_updated',
  NEWSLETTER_SUBSCRIBER_TOGGLED: 'newsletter.subscriber_toggled',

  // Registration
  REGISTRATION_DELETED: 'registration.deleted',

  // Developer / Console
  DEVELOPER_MODE_TOGGLED: 'developer_mode.toggled',
  CONSOLE_LOGGING_TOGGLED: 'console_logging.toggled',

  // Seed
  SEED_DATA_ADDED: 'seed.data_added',
  IMAGE_MIGRATION_RUN: 'image_migration.run',
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * Log an admin action to the audit_logs table.
 *
 * @param adminEmail - The email of the admin performing the action.
 * @param action     - A dot-notation action string (e.g. 'event.created').
 * @param entityType - The kind of entity affected (e.g. 'events', 'downloads', 'gallery').
 * @param entityId   - The primary-key ID of the affected row (optional).
 * @param details    - Arbitrary JSON payload with extra context (optional).
 */
export async function logAuditAction(
  adminEmail: string,
  action: AuditAction | string,
  entityType: string,
  entityId?: string | null,
  details?: Record<string, unknown> | null,
): Promise<void> {
  if (!supabase) return;

  // Best-effort: failures are silently ignored so audit logging never
  // disrupts the admin's workflow.
  try {
    await supabase.from('audit_logs').insert({
      admin_email: adminEmail,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      details: details ?? {},
      // ip_address is intentionally omitted here — the server could add it
      // via a trigger or edge function, but from the client it's unreliable.
    });
  } catch {
    // swallow
  }
}
