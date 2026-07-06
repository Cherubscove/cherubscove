# Cherubs Cove Website — Complete Admin Overview

*Last updated: July 2026*

---

## 1. What This Website Is

This website is the official online home of **Cherubs Cove Ministry**. It serves as a digital office — welcoming visitors, sharing information, promoting events, collecting registrations, distributing resources, and keeping supporters connected. The ministry team manages everything from a secure admin panel without needing to write code.

---

## 2. Visitor-Facing Features (What the Public Sees)

### Homepage
| Section | What It Shows |
|---------|--------------|
| **Navigation bar** | Links to all main pages; stays at the top of every page |
| **Hero section** | Large welcome banner with a scripture verse (Psalm 127:4), the ministry tagline, and two action buttons (Register for Quiver's 2026 / Meet Jesse Falodun). The background slides through multiple images automatically. |
| **Welcome section** | Ministry logo, name, and a short introduction about who Cherubs Cove is and what they believe. Includes two buttons (Events & Conferences / Our President). |
| **Info strip** | Three key facts displayed side by side: Ministry Type (Interdenominational), Events & Conferences (International Quivers Conf.), and Based In (Nigeria). |
| **Events preview** | A glimpse of upcoming events with a "Register Now" button for each. |
| **Footer** | Ministry name, tagline, social media links (Facebook, Instagram, YouTube, X/Twitter, WhatsApp), and quick navigation links. |

### Events & Conferences Page (`/events-conferences`)
- Lists all upcoming events with cards showing title, theme, date(s), location, description, and status (upcoming, ongoing, recurring).
- Each event card has a "Register Free" button that takes visitors to the registration form.
- A link at the bottom leads to the Past Conferences archive.

### Registration Page (`/register`)
- Shows all events that have registration open.
- Visitors pick an event and fill out a form (name, email, phone, etc., plus any custom fields the admin added).
- After submitting, a success message appears.
- If registration is closed for an event, a friendly notice is shown instead.
- Supports different events on the same page — each event has its own registration form.

### About Jesse Falodun (`/about-jesse`)
- A full page introducing the ministry president, his biography, titles, photo, and a call-to-action section (connect with Jesse).

### Resources / Downloads (`/resources` or `/downloads`)
- Visitors can browse and download ministry resources: sermons (audio/video), PDF documents, teaching materials, and manuals.
- Each resource is shown as a card with title, type icon, and download button.
- Downloads are tracked anonymously for analytics.

### Past Conferences Archive (`/past-conferences`)
- A gallery of past conference editions with thumbnail images.
- Clicking a conference opens a detailed photo gallery with a lightbox viewer (click to enlarge, swipe through images).
- Gallery views are tracked for analytics.

### Connect Page (`/connect`)
- Contact form for messages, prayer requests, partnership inquiries.
- Newsletter subscription form — visitors can enter their email to receive updates.
- Ministry contact details (email, phone, location) and social media links are displayed.

### 404 Page (Not Found)
- A friendly page shown when someone visits a URL that does not exist.

### Mobile App (PWA)
- The website is a **Progressive Web App (PWA)**.
- Visitors can install it on their phone or computer like a regular app.
- Once installed, it works offline and loads faster.
- The admin can control the app name, icon, theme colour, and the install pop-up message.

---

## 3. Admin Panel Features (What the Ministry Team Can Do)

The admin panel is accessed at `/quiveradminconsole007`. Only authorised staff with an email and password can log in.

### Login & Security
- Secure login with email and password.
- Two levels of access: **Admin** (standard) and **Super Admin** (full control, can add/remove other admins).
- Admins are added manually through the panel — there is no public sign-up.

### Dashboard Tabs

Once logged in, the admin panel is organised into **10 tabs**:

---

#### Tab 1: Events
**What you can do:**
- **View** all events in a list with their details (title, date, status).
- **Add** a new event — give it a title, theme, date range, time, venue, description, image, and more.
- **Edit** any existing event.
- **Delete** an event.
- **Toggle registration** on/off for each event individually.
- **Customise the registration form** — add, remove, or rearrange form fields (text fields, email, phone, dropdown choices, checkboxes, text areas, etc.). Each field can be required or optional.
- **Set a completion message** — the thank-you text people see after registering.
- **Turn newsletter opt-in** on/off for each event's registration form.

**Event statuses you can set:**
- `upcoming` — shows a green badge
- `ongoing` or `recurring` — shows a blue badge  
- `closed` — shows a gray badge and hides registration

---

#### Tab 2: Registrations
**What you can do:**
- **View** every person who registered for any event.
- **Search** registrations by name, email, or any other field.
- **Sort** by any column (date, name, event, etc.).
- **Filter** by event group — registrations are automatically grouped by event so you can see who signed up for what.
- **See all form answers** — every field the registrant filled out is displayed in a clear key-value list.
- **Export** registration data (you can copy it out for external use).

**Data collected per registration:**
- Full name
- Email address
- Phone number
- State / City
- Prayer note or message
- All custom form fields the admin created
- Date and time of registration
- Which event they registered for

---

#### Tab 3: Downloads
**What you can do:**
- **Add** a new downloadable resource — provide a title, file URL (direct link to audio/video/PDF or a YouTube/Drive link), category (e.g. Sermon, Teaching, Manual), and file type (audio, video, PDF).
- **Edit** any existing download.
- **Delete** a download.
- **Reorder** downloads (drag to rearrange).
- Resources appear on the public Resources page for visitors to access.

---

#### Tab 4: Gallery
**What you can do:**
- **Upload images** one at a time or in bulk (paste multiple Google Drive URLs).
- **Organise images** into named collections (galleries/albums).
- **Move images** between galleries.
- **Delete** individual images or multiple selected images at once.
- **Edit image details** (title, category).
- Images are displayed on the Past Conferences archive page and in the detail gallery view.
- Supports Google Drive image URLs — the system automatically converts them into displayable images.

---

#### Tab 5: Newsletter
**What you can do:**
- **View all subscribers** — see who has signed up for email updates, with their email, name, and subscription date.
- **Search subscribers** by email or name.
- **Send a broadcast email** to all subscribers or selected individuals.
- **Send a test email** to yourself to preview before sending to everyone.
- **Compose emails** with a subject line and body text.
- **View send logs** — see a history of all sent emails, including delivery status and timestamps.
- **Edit or remove** individual subscribers.
- Emails are sent via a Supabase Edge Function (`send-newsletter-email`).

---

#### Tab 6: Site Content
**What you can do:**
- Edit almost **every word** on the website without touching code.
- Content is organised into groups for easy navigation:

| Group | What You Can Edit |
|-------|------------------|
| **Hero Section** | Eyebrow text, main heading (HTML), tagline, scripture verse & reference, button labels and links, hero slides (background images) |
| **Welcome Section** | Logo title & subtitle, heading (HTML), paragraph text, button labels and links |
| **Info Strip** | Three info boxes — label, value, and subtitle for each |
| **Events Section** | Eyebrow, heading, intro text, conference title/subtitle/venue/attendance, register button label |
| **Events Page** | Eyebrow, heading, description, editions section heading, register button, archive link |
| **Past Conferences** | Eyebrow, heading, description, section heading |
| **About Page** | Eyebrow, heading, name, title, biography paragraphs, tags, CTA section |
| **Connect Page** | Eyebrow, heading, body text, newsletter heading & text |
| **Resources Page** | Eyebrow, heading |
| **Register Page** | Eyebrow, heading, intro text, form heading, submit button text, success text, no-events message, closed message, back link |
| **Gallery** | Back link text, no-images text |
| **Footer** | Brand title & subtitle, tagline |
| **Contact Info** | Email, phone, location |
| **Social Links** | Facebook, Instagram, YouTube, X/Twitter, WhatsApp URLs |
| **Registration** | Default completion message |
| **PWA** | App install popup settings, theme colour, app name, icon URLs |

- Changes take effect immediately after saving.

---

#### Tab 7: Analytics
**What you can track — no extra setup needed. The system automatically records:**

| Metric | What It Counts |
|--------|---------------|
| **Page Views** | Every time someone visits any page on the site |
| **Gallery Views** | Each time someone opens a photo gallery to view images |
| **Downloads** | Each time someone clicks to download a resource |
| **Visits** | A visit (may include multiple page views in one session) |

**How you can view the data:**

| Feature | What It Does |
|---------|-------------|
| **Time range picker** | Choose to view data from the last 7 days, 30 days, 90 days, or a custom date range |
| **Granularity selector** | View trends by day, week, or month |
| **Summary cards** | Four big-number cards showing total page views, gallery views, downloads, and visits — each with a % growth indicator comparing to the previous period |
| **Trend chart** | A scrollable daily/weekly/monthly list showing how many views and downloads happened each period |
| **Top pages** | The 5 most visited pages on the site, ranked |
| **Top downloads** | The 5 most downloaded resources, ranked |
| **Top galleries** | The 5 most-viewed photo galleries, ranked |
| **Refresh button** | Manually reload the analytics data |

**How tracking works (transparent):**
- When a visitor loads any page, a `page_view` event is stored.
- When they open a photo gallery, a `gallery_view` event is stored with the gallery name and image count.
- When they download a resource, a `download_click` event is stored with the resource title.
- All events are stored in a Supabase table (`analytics_events`) with a timestamp, page path, and metadata.
- Tracking failures are silently ignored so they never break the visitor experience.

---

#### Tab 8: Settings
**What you can control:**
- **Developer mode** — toggle on/off. When on, additional technical options become available (console logging for debugging).
- **Console logging** — toggle on/off to enable or disable browser console logs for troubleshooting.
- These are advanced settings only needed when diagnosing issues.

---

#### Tab 9: Hero Slides
**What you can do:**
- **Add** background slide images for the hero banner on the homepage.
- **Reorder** slides (drag to set the sequence).
- **Delete** slides.
- Each slide is a full-screen background image that rotates automatically.

---

#### Tab 10: Admins
**What you can do:**
- **View** all current admin accounts and their roles.
- **Add** a new admin — provide their email and assign a role (Admin or Super Admin).
- **Set an initial password** for new admins.
- **Remove** an admin account.
- Only Super Admins can manage other admins.

---

## 4. How Data Flows (Simple Explanation)

| Action | What Happens Behind the Scenes |
|--------|-------------------------------|
| Admin adds an event | Saved to a database table called `events`. Immediately visible on the public site. |
| Admin edits site content | Updated in the `site_settings` table. The next page load shows the new text. |
| Visitor registers for an event | Their form data is saved to the `registrations` table. An email notification is sent to the ministry (fire-and-forget). |
| Visitor subscribes to newsletter | Their email is saved to the `newsletter` table. |
| Admin sends a newsletter | The email content is saved to `newsletter_send_log` with delivery status. |
| Visitor views a page/ gallery / downloads | A row is inserted into `analytics_events` with the event type and details. |
| Visitor downloads a resource | The file link is opened; a `download_click` event is logged. |

The website uses **Supabase**, a cloud database and backend service, to store all data and handle user authentication.

---

## 5. Key Admin URLs

| Page | URL |
|------|-----|
| Admin login / dashboard | `/quiveradminconsole007` |
| Homepage | `/` |
| Register for events | `/register` or `/register/{eventId}` |
| Events & Conferences | `/events-conferences` |
| Past Conferences | `/past-conferences` |
| Gallery detail | `/past-conferences/{galleryId}` |
| About Jesse | `/about-jesse` |
| Resources / Downloads | `/resources` or `/downloads` |
| Connect / Contact | `/connect` |
| 404 page | Any unrecognised URL |

---

## 6. Quick Tips for Admins

1. **Content changes are instant** — edit any text in the Site Content tab and it updates live on the website. No need to reload or publish.
2. **Turn registration on/off per event** — you can keep an event visible on the site but close registration with one toggle.
3. **Custom registration forms** — you control what fields people fill out when registering. Add dropdowns, checkboxes, text fields, etc.
4. **Bulk gallery uploads** — paste multiple Google Drive image URLs at once to add them all to a gallery in one go.
5. **Analytics are automatic** — you do not need to install any tracking code. The system records page views, gallery views, and downloads from day one.
6. **Newsletter broadcasting** — you can send email updates to all subscribers directly from the admin panel. Send a test first to check how it looks.
7. **Add other admins** — if you are a Super Admin, you can give other team members access by adding their email.
8. **Events with no registration** — set registration to "off" for events that are informational only (no sign-up needed).

---

*End of document.*
