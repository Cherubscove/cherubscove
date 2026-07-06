## What we're building

1. **Newsletter tab in Admin** — list every subscriber (email, phone if any, source, date), search, delete, export CSV. Same look/feel as the Registrations tab.
2. **Bulk email + individual email** from the admin dashboard — compose subject + message and send to all subscribers or a single one.
3. **Auto opt-in on every form** — every event registration form (and the existing Connect newsletter form) shows a checkbox "I'd like to receive updates from Cherubs Cove Ministry" (checked by default). If ticked, the submitter's email — and phone, if the form collected one — is added to the `newsletter` table.
4. **No breakage on re-subscribe** — if the email is already in the newsletter table, we still succeed, update the phone if a new one was provided, and show a friendly "You're already subscribed — we've updated your details" message. Registration itself never fails because of a newsletter conflict.
5. **Per-form toggle** — in the Admin event editor, a new switch "Ask registrants to join newsletter" (default ON). When off, the opt-in checkbox is hidden on that event's registration page.

## Database changes (you'll run this SQL once)

```sql
-- Newsletter: allow phone, source, and event linkage; enforce unique email
ALTER TABLE public.newsletter
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'connect',
  ADD COLUMN IF NOT EXISTS event_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_email_unique
  ON public.newsletter (lower(email));

-- Public insert allowed (existing form). Admin read/delete via authenticated.
ALTER TABLE public.newsletter ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS newsletter_insert_anon ON public.newsletter;
CREATE POLICY newsletter_insert_anon ON public.newsletter FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS newsletter_select_auth ON public.newsletter;
CREATE POLICY newsletter_select_auth ON public.newsletter FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS newsletter_update_auth ON public.newsletter;
CREATE POLICY newsletter_update_auth ON public.newsletter FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS newsletter_delete_auth ON public.newsletter;
CREATE POLICY newsletter_delete_auth ON public.newsletter FOR DELETE TO authenticated USING (true);

-- Events: per-form newsletter opt-in switch
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS newsletter_opt_in_enabled boolean DEFAULT true;
```

## Files touched

```text
src/lib/adminTypes.ts               → add newsletter_opt_in_enabled to EventRecord
src/pages/Register.tsx              → opt-in checkbox + phone capture, upsert into newsletter, non-blocking
src/pages/Connect.tsx               → upsert (won't fail on duplicate), friendly "already subscribed" toast
src/pages/Admin.tsx                 → new Newsletter tab, event editor toggle, bulk/individual email UI
supabase/functions/send-newsletter-email/index.ts  → new edge function: sends one email to N recipients via Resend BCC
```

## Newsletter tab (Admin)

- Header cards + Search + CSV export
- Row: email · phone · source (connect / event title) · date · [Send email] [Delete]
- "Compose bulk email" button opens a dialog: subject + HTML/plain textarea + recipient count + Send. Recipients = all rows (or filtered search results).
- Individual "Send email" opens the same dialog pre-scoped to one recipient.
- Sending calls the new edge function which pushes to Resend using BCC (max 50 per call, batched).

## Opt-in flow on registration

- Below the form fields, a card: `[ ✓ ] Yes, keep me updated on future events and resources.`
- Hidden when the event has `newsletter_opt_in_enabled = false`.
- On submit, after the registration insert succeeds, we `upsert` `{ email, phone, source: event.title, event_id }` onto `newsletter` with `onConflict: 'email'`. Any error here is logged and ignored — registration success message is unchanged.

## Notes

- Emails go through the existing Resend integration already used by `send-form-email`, so no new secrets are needed.
- The bulk-send function BCCs so recipient addresses stay hidden from each other.
- No changes to public UI colours or fonts — reusing the existing admin dark theme.

I'll implement all of this after you approve.