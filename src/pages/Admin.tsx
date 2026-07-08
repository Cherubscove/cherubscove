import { Component, useState, useEffect, useMemo, type ErrorInfo, type ReactNode } from 'react';
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
  Calendar, Download, Image, Settings, Users, LogOut, Plus, Trash2, Edit2, Save, X, Eye, EyeOff, FileDown, ArrowUpDown, ClipboardList, FileText, ToggleLeft, ToggleRight, CheckSquare, Square, FolderInput, Star, RefreshCw, Mail, Send, History, BarChart3, Search,
} from 'lucide-react';
import FormFieldBuilder from '@/components/admin/FormFieldBuilder';
import HeroSlidesManager from '@/components/admin/HeroSlidesManager';
import { SEED_EVENTS, SEED_DOWNLOADS, SEED_GALLERIES } from '@/lib/seedData';
import type {
  EventRecord, DownloadRecord, GalleryRecord, RegistrationRecord, FormFieldConfig, GalleryCollection,
  NewsletterSubscriber, NewsletterSendLog, AuditLogEntry,
  emptyEvent as _ee, emptyDownload as _ed, emptyGallery as _eg,
} from '@/lib/adminTypes';
import { emptyEvent, emptyDownload, emptyGallery, formatEventDateRange, validateEventDateTime, buildEventRegistrationLink, generateNextImageTitle, generateGalleryAbbreviation } from '@/lib/adminTypes';
import { getConsoleLoggingEnabled, getDeveloperModeEnabled, persistConsoleLoggingPreference, persistDeveloperModePreference, setConsoleLoggingEnabled as applyConsoleLoggingPreference } from '@/lib/console';
import { aggregateAnalyticsSeries, getAnalyticsDateRange, getGrowthComparison, summarizeAnalytics, detectDevice, type AnalyticsEvent, type AnalyticsGranularity, type AnalyticsRange, type DeviceBreakdown, type UserActivity, type ExitPage } from '@/lib/analytics';
import { logAuditAction, AUDIT_ACTIONS } from '@/lib/auditLogger';

/* ── Content Keys (seed defaults for every editable frontend text) ────── */

const CONTENT_DEFAULTS: { key: string; label: string; value: string; group: string }[] = [
  { key: 'welcome_eyebrow', label: 'Welcome — Eyebrow', value: 'Who We Are', group: 'Welcome Section' },
  { key: 'welcome_paragraph_1', label: 'Welcome — Paragraph 1', value: 'Cherubs Cove is an interdenominational ministry committed to raising a generation on fire for God. We exist to equip, ignite, and release burning youths into every sphere of society, with the Gospel of Jesus Christ as our foundation and compass.', group: 'Welcome Section' },
  { key: 'welcome_paragraph_2', label: 'Welcome — Paragraph 2', value: "We believe the Church must rise to reflect Christ in its fullness, and we are devoted to providing a spiritual environment where every individual finds their place in God's grand narrative. From our gatherings to our flagship International Quivers Conference, everything flows from one conviction: this is the making place.", group: 'Welcome Section' },
  { key: 'info_1_label', label: 'Info Strip 1 — Label', value: 'Ministry Type', group: 'Info Strip' },
  { key: 'info_1_value', label: 'Info Strip 1 — Value', value: 'Interdenominational', group: 'Info Strip' },
  { key: 'info_1_sub', label: 'Info Strip 1 — Subtitle', value: 'Open to all believers', group: 'Info Strip' },
  { key: 'info_2_label', label: 'Info Strip 2 — Label', value: 'Events & Conferences', group: 'Info Strip' },
  { key: 'info_2_value', label: 'Info Strip 2 — Value', value: 'International Quivers Conf.', group: 'Info Strip' },
  { key: 'info_2_sub', label: 'Info Strip 2 — Subtitle', value: 'Annual gathering', group: 'Info Strip' },
  { key: 'info_3_label', label: 'Info Strip 3 — Label', value: 'Based In', group: 'Info Strip' },
  { key: 'info_3_value', label: 'Info Strip 3 — Value', value: 'Nigeria', group: 'Info Strip' },
  { key: 'info_3_sub', label: 'Info Strip 3 — Subtitle', value: 'Reaching the nations', group: 'Info Strip' },
  { key: 'events_eyebrow', label: 'Events — Eyebrow', value: 'Programs & Events', group: 'Events Section' },
  { key: 'events_heading', label: 'Events — Heading (before em)', value: 'Upcoming', group: 'Events Section' },
  { key: 'events_heading_em', label: 'Events — Heading (italic part)', value: 'Gatherings', group: 'Events Section' },
  { key: 'events_intro', label: 'Events — Intro Text', value: 'Join us at the International Quivers Conference 2026 — "Envoys of Light." Registration is free and open to all believers.', group: 'Events Section' },
  { key: 'conf_title', label: 'Conference — Title', value: "QUIVER'S 2026", group: 'Events Section' },
  { key: 'conf_subtitle', label: 'Conference — Subtitle', value: 'Envoys of Light', group: 'Events Section' },
  { key: 'conf_venue', label: 'Conference — Venue', value: 'To Be Announced', group: 'Events Section' },
  { key: 'conf_attendance', label: 'Conference — Attendance', value: 'Free — Open to All', group: 'Events Section' },
  { key: 'about_eyebrow', label: 'About — Eyebrow', value: 'Meet Our President', group: 'About Page' },
  { key: 'about_heading', label: 'About — Heading (HTML)', value: 'A Voice. A <em>Vision.</em><br />A Commission.', group: 'About Page' },
  { key: 'about_name', label: 'About — Name', value: 'Jesse Falodun', group: 'About Page' },
  { key: 'about_title', label: 'About — Title', value: 'President, Cherubs Cove', group: 'About Page' },
  { key: 'about_bio_1', label: 'About — Bio Paragraph 1', value: 'Jesse Falodun was born and bred in Kano...', group: 'About Page' },
  { key: 'about_bio_2', label: 'About — Bio Paragraph 2', value: "One of Jesse's topmost commissions...", group: 'About Page' },
  { key: 'about_bio_3', label: 'About — Bio Paragraph 3', value: 'A graduate of Mass Communication...', group: 'About Page' },
  { key: 'about_bio_4', label: 'About — Bio Paragraph 4', value: 'He strikes a unique balance...', group: 'About Page' },
  { key: 'about_tags', label: 'About — Tags (comma-separated)', value: 'Ministry President,Conference Convener,OAP / Broadcaster,Spoken Word Artist,School of Ministry Graduate,C&S Church Member,Brand Designer,Writer', group: 'About Page' },
  { key: 'about_tags_highlight', label: 'About — Highlighted Tags', value: 'Ministry President,Conference Convener', group: 'About Page' },
  { key: 'about_cta_title', label: 'About — CTA Title', value: 'Connect with Jesse', group: 'About Page' },
  { key: 'about_cta_text', label: 'About — CTA Text', value: 'Want to invite Jesse to speak at your event or learn more about Cherubs Cove Ministry?', group: 'About Page' },
  { key: 'footer_tagline', label: 'Footer — Tagline', value: 'An interdenominational ministry raising burning youths for the Lord.', group: 'Footer' },
  { key: 'hero_verse', label: 'Hero — Scripture Verse', value: 'As arrows are in the hand of a mighty man; so are children of the youth.', group: 'Hero Section' },
  { key: 'hero_verse_ref', label: 'Hero — Scripture Reference', value: 'Psalm 127:4', group: 'Hero Section' },
  { key: 'contact_email', label: 'Contact — Email', value: 'cherubscove@gmail.com', group: 'Contact Info' },
  { key: 'contact_phone', label: 'Contact — Phone', value: '+234 817 930 3228', group: 'Contact Info' },
  { key: 'location', label: 'Contact — Location', value: 'Nigeria', group: 'Contact Info' },
  { key: 'facebook_url', label: 'Facebook URL', value: 'https://www.facebook.com/share/182S9YeQMr/?mibextid=wwXIfr', group: 'Social Links' },
  { key: 'instagram_url', label: 'Instagram URL', value: '', group: 'Social Links' },
  { key: 'youtube_url', label: 'YouTube URL', value: 'https://www.youtube.com/@jefaldera', group: 'Social Links' },
  { key: 'twitter_url', label: 'X/Twitter URL', value: '', group: 'Social Links' },
  { key: 'whatsapp_url', label: 'WhatsApp URL', value: 'https://wa.me/2348179303228', group: 'Social Links' },

  // Registration completion
  { key: 'registration_completion_default', label: 'Registration — Default Completion Msg (HTML)', value: 'Registration submitted successfully. Thank you!', group: 'Registration' },

  // Hero Section
  { key: 'hero_eyebrow', label: 'Hero — Eyebrow', value: 'Welcome to Cherubs Cove Ministry', group: 'Hero Section' },
  { key: 'hero_heading_html', label: 'Hero — Heading (HTML)', value: 'The <em class="text-primary italic">Making</em><br />Place.', group: 'Hero Section' },
  { key: 'hero_tagline', label: 'Hero — Tagline', value: 'An interdenominational ministry raising burning youths for the Lord.', group: 'Hero Section' },
  { key: 'hero_btn_1_text', label: 'Hero — Button 1 Text', value: 'Register for Quiver\'s 2026', group: 'Hero Section' },
  { key: 'hero_btn_1_link', label: 'Hero — Button 1 Link', value: '/register', group: 'Hero Section' },
  { key: 'hero_btn_2_text', label: 'Hero — Button 2 Text', value: 'Meet Jesse Falodun', group: 'Hero Section' },
  { key: 'hero_btn_2_link', label: 'Hero — Button 2 Link', value: '/about-jesse', group: 'Hero Section' },
  { key: 'hero_slides_json', label: 'Hero Slides (JSON — managed below)', value: '[]', group: 'Hero Section' },

  // Welcome Section
  { key: 'welcome_logo_title', label: 'Welcome — Logo Title', value: 'Cherubs Cove', group: 'Welcome Section' },
  { key: 'welcome_logo_subtitle', label: 'Welcome — Logo Subtitle', value: 'The Making Place', group: 'Welcome Section' },
  { key: 'welcome_heading_html', label: 'Welcome — Heading (HTML)', value: 'The <em class="not-italic text-primary">Making</em> Place', group: 'Welcome Section' },
  { key: 'welcome_btn_1_text', label: 'Welcome — Button 1 Text', value: 'Events & Conferences', group: 'Welcome Section' },
  { key: 'welcome_btn_1_link', label: 'Welcome — Button 1 Link', value: '/events-conferences', group: 'Welcome Section' },
  { key: 'welcome_btn_2_text', label: 'Welcome — Button 2 Text', value: 'Our President', group: 'Welcome Section' },
  { key: 'welcome_btn_2_link', label: 'Welcome — Button 2 Link', value: '/about-jesse', group: 'Welcome Section' },

  // Events & Conferences Page
  { key: 'events_page_eyebrow', label: 'Events Page — Eyebrow', value: 'Cherubs Cove Ministry', group: 'Events Page' },
  { key: 'events_page_heading_html', label: 'Events Page — Heading (HTML)', value: 'Events & <em class="italic text-primary">Conferences</em>', group: 'Events Page' },
  { key: 'events_page_description', label: 'Events Page — Description', value: 'Our annual convergence of believers — a sacred space for powerful teaching, prophetic worship, and divine encounters that reshape destinies.', group: 'Events Page' },
  { key: 'events_page_editions_eyebrow', label: 'Events Page — Editions Eyebrow', value: 'International Quivers Conference', group: 'Events Page' },
  { key: 'events_page_editions_heading_html', label: 'Events Page — Editions Heading (HTML)', value: 'Conference <em>Editions</em>', group: 'Events Page' },
  { key: 'events_page_register_btn', label: 'Events Page — Register Button', value: 'Register Free', group: 'Events Page' },
  { key: 'events_page_archive_link', label: 'Events Page — Archive Link Text', value: 'View Past Conferences Archive', group: 'Events Page' },

  // Past Conferences Page
  { key: 'pastconferences_eyebrow', label: 'Past Conferences — Eyebrow', value: 'Cherubs Cove Ministry', group: 'Past Conferences' },
  { key: 'pastconferences_heading_html', label: 'Past Conferences — Heading (HTML)', value: 'Past Conferences <em class="italic text-primary">Archive</em>', group: 'Past Conferences' },
  { key: 'pastconferences_description', label: 'Past Conferences — Description', value: 'Moments from past editions of the International Quivers Conference — a visual journey through years of encounter, worship, and transformation.', group: 'Past Conferences' },
  { key: 'pastconferences_section_heading_html', label: 'Past Conferences — Section Heading (HTML)', value: 'Past <em class="text-primary">Events</em>', group: 'Past Conferences' },

  // Connect Page
  { key: 'connect_eyebrow', label: 'Connect — Eyebrow', value: 'Get in Touch', group: 'Connect Page' },
  { key: 'connect_heading_html', label: 'Connect — Heading (HTML)', value: 'We\'d Love to<br /><em>Hear from You</em>', group: 'Connect Page' },
  { key: 'connect_body', label: 'Connect — Body Text', value: 'Whether you want to partner with us, volunteer, share a testimony, or simply find out more, the doors of Cherubs Cove are always open.', group: 'Connect Page' },
  { key: 'connect_newsletter_heading', label: 'Connect — Newsletter Heading', value: 'Stay in the Loop', group: 'Connect Page' },
  { key: 'connect_newsletter_text', label: 'Connect — Newsletter Text', value: 'Subscribe for conference updates, ministry resources, and devotional content delivered straight to your inbox.', group: 'Connect Page' },

  // Resources Page
  { key: 'resources_eyebrow', label: 'Resources — Eyebrow', value: 'Ministry Resources', group: 'Resources Page' },
  { key: 'resources_heading_html', label: 'Resources — Heading (HTML)', value: 'Sermons & <em>Downloads</em>', group: 'Resources Page' },

  // Register Page
  { key: 'register_eyebrow', label: 'Register — Eyebrow', value: 'Programs &amp; Events', group: 'Register Page' },
  { key: 'register_heading_html', label: 'Register — Heading (HTML)', value: 'Upcoming <em class="italic text-primary not-italic">Gatherings</em>', group: 'Register Page' },
  { key: 'register_intro', label: 'Register — Intro Text', value: 'Browse our upcoming events and register to join us. Each event has its own registration page — pick one below to get started.', group: 'Register Page' },
  { key: 'register_form_heading', label: 'Register — Form Heading', value: 'Register Now', group: 'Register Page' },
  { key: 'register_form_submit_text', label: 'Register — Submit Button Text', value: 'Complete Registration →', group: 'Register Page' },
  { key: 'register_form_success_text', label: 'Register — Success Button Text', value: 'Registered!', group: 'Register Page' },
  { key: 'register_no_events_heading', label: 'Register — No Events Heading', value: 'No Events Right Now', group: 'Register Page' },
  { key: 'register_no_events_text', label: 'Register — No Events Text', value: 'There are no events with open registration at the moment. Check back soon for upcoming gatherings.', group: 'Register Page' },
  { key: 'register_closed_heading', label: 'Register — Closed Heading', value: 'Registration Closed', group: 'Register Page' },
  { key: 'register_closed_text', label: 'Register — Closed Text', value: 'Registration for this event is currently disabled.', group: 'Register Page' },
  { key: 'register_back_link', label: 'Register — Back Link Text', value: 'View all events', group: 'Register Page' },

  // Events Preview (homepage)
  { key: 'events_preview_register_btn', label: 'Events Preview — Register Button', value: 'Register Now', group: 'Events Section' },
  { key: 'events_preview_location_label', label: 'Events Preview — Location Label', value: 'Location', group: 'Events Section' },
  { key: 'events_preview_venue_fallback', label: 'Events Preview — Venue Fallback', value: 'To Be Announced', group: 'Events Section' },
  { key: 'events_preview_attendance_label', label: 'Events Preview — Attendance Label', value: 'Attendance', group: 'Events Section' },
  { key: 'events_preview_details_fallback', label: 'Events Preview — Details Fallback', value: 'Details coming soon', group: 'Events Section' },
  { key: 'events_preview_date_label', label: 'Events Preview — Date Label', value: 'Date', group: 'Events Section' },
  { key: 'events_preview_dates_label', label: 'Events Preview — Dates Label (multi-day)', value: 'Dates', group: 'Events Section' },

  // Gallery Detail
  { key: 'gallery_back_link', label: 'Gallery — Back Link Text', value: 'Back to Archive', group: 'Gallery' },
  { key: 'gallery_no_images', label: 'Gallery — No Images Text', value: 'No images found in this gallery.', group: 'Gallery' },

  // Footer
  { key: 'footer_brand_title', label: 'Footer — Brand Title', value: 'Cherubs Cove', group: 'Footer' },
  { key: 'footer_brand_subtitle', label: 'Footer — Brand Subtitle', value: 'The Making Place', group: 'Footer' },

  // PWA / Install Prompt
  { key: 'pwa_popup_enabled', label: 'PWA — Show Install Popup', value: 'true', group: 'PWA' },
  { key: 'pwa_theme_color', label: 'PWA — Theme Color', value: '#0f172a', group: 'PWA' },
  { key: 'pwa_short_name', label: 'PWA — Short App Name', value: 'Cherubs Cove', group: 'PWA' },
  { key: 'pwa_popup_title', label: 'PWA — Popup Title', value: 'Install Cherubs Cove', group: 'PWA' },
  { key: 'pwa_popup_description', label: 'PWA — Popup Description', value: 'Install our app for a faster, offline-ready experience.', group: 'PWA' },
  { key: 'pwa_popup_mobile_message', label: 'PWA — Mobile Message', value: 'Get the best experience on your phone — install our app and access content even offline.', group: 'PWA' },
  { key: 'pwa_popup_desktop_message', label: 'PWA — Desktop Message', value: 'Install our app on your computer for quick access and offline browsing.', group: 'PWA' },
  { key: 'pwa_icon_192_url', label: 'PWA — Icon 192×192 URL', value: '/pwa-192x192.png', group: 'PWA' },
  { key: 'pwa_icon_512_url', label: 'PWA — Icon 512×512 URL', value: '/pwa-512x512.png', group: 'PWA' },
  { key: 'pwa_icon_apple_url', label: 'PWA — Apple Touch Icon URL', value: '/apple-touch-icon.png', group: 'PWA' },

  // ── SEO / Meta ──────────────────────────────────────────────────────────
  { key: 'seo_default_title', label: 'SEO — Default Site Title', value: 'Cherubs Cove Ministry — The Making Place', group: 'SEO' },
  { key: 'seo_default_description', label: 'SEO — Default Description', value: 'An interdenominational ministry raising burning youths for the Lord. Home of the International Quivers Conference.', group: 'SEO' },
  { key: 'seo_default_image', label: 'SEO — Default OG Image URL', value: 'https://cherubscove.net/Cherubscove-ogimage.png', group: 'SEO' },
  { key: 'seo_favicon_url', label: 'SEO — Favicon URL', value: '/favicon.png', group: 'SEO' },
  { key: 'seo_favicon_apple_url', label: 'SEO — Apple Touch Icon URL', value: '/apple-touch-icon.png', group: 'SEO' },
  { key: 'seo_favicon_mask_url', label: 'SEO — Mask Icon URL', value: '/favicon.png', group: 'SEO' },

  // Per-page meta
  { key: 'seo_home_title', label: 'SEO — Home Page Title', value: 'Cherubs Cove Ministry — The Making Place', group: 'SEO Per-Page' },
  { key: 'seo_home_description', label: 'SEO — Home Page Description', value: 'An interdenominational ministry raising burning youths for the Lord. Home of the International Quivers Conference.', group: 'SEO Per-Page' },
  { key: 'seo_home_image', label: 'SEO — Home Page OG Image', value: 'https://cherubscove.net/Cherubscove-ogimage.png', group: 'SEO Per-Page' },

  { key: 'seo_about_title', label: 'SEO — About Page Title', value: 'About Jesse Falodun — President, Cherubs Cove Ministry', group: 'SEO Per-Page' },
  { key: 'seo_about_description', label: 'SEO — About Page Description', value: 'Meet Jesse Falodun, President of Cherubs Cove Ministry. OAP, Spoken Word Artist, and convener of the International Quivers Conference.', group: 'SEO Per-Page' },
  { key: 'seo_about_image', label: 'SEO — About Page OG Image', value: 'https://cherubscove.net/Cherubscove-ogimage.png', group: 'SEO Per-Page' },

  { key: 'seo_events_title', label: 'SEO — Events Page Title', value: 'Events & Conferences — Cherubs Cove Ministry', group: 'SEO Per-Page' },
  { key: 'seo_events_description', label: 'SEO — Events Page Description', value: 'Join us at the International Quivers Conference and other gatherings. Annual conferences, monthly services, and mid-week fellowships.', group: 'SEO Per-Page' },
  { key: 'seo_events_image', label: 'SEO — Events Page OG Image', value: 'https://cherubscove.net/Cherubscove-ogimage.png', group: 'SEO Per-Page' },

  { key: 'seo_pastconferences_title', label: 'SEO — Past Conferences Title', value: 'Past Conferences Archive — Cherubs Cove Ministry', group: 'SEO Per-Page' },
  { key: 'seo_pastconferences_description', label: 'SEO — Past Conferences Description', value: 'Photo galleries from past editions of the International Quivers Conference — a visual journey through years of encounter.', group: 'SEO Per-Page' },
  { key: 'seo_pastconferences_image', label: 'SEO — Past Conferences OG Image', value: 'https://cherubscove.net/Cherubscove-ogimage.png', group: 'SEO Per-Page' },

  { key: 'seo_resources_title', label: 'SEO — Resources Page Title', value: 'Sermons & Downloads — Cherubs Cove Ministry', group: 'SEO Per-Page' },
  { key: 'seo_resources_description', label: 'SEO — Resources Page Description', value: 'Download sermon audio, video teachings, and study documents from Cherubs Cove Ministry and the International Quivers Conference.', group: 'SEO Per-Page' },
  { key: 'seo_resources_image', label: 'SEO — Resources Page OG Image', value: 'https://cherubscove.net/Cherubscove-ogimage.png', group: 'SEO Per-Page' },

  { key: 'seo_connect_title', label: 'SEO — Connect Page Title', value: 'Connect — Cherubs Cove Ministry', group: 'SEO Per-Page' },
  { key: 'seo_connect_description', label: 'SEO — Connect Page Description', value: 'Get in touch with Cherubs Cove Ministry. Subscribe to our newsletter, follow us on social media, or send us a message.', group: 'SEO Per-Page' },
  { key: 'seo_connect_image', label: 'SEO — Connect Page OG Image', value: 'https://cherubscove.net/Cherubscove-ogimage.png', group: 'SEO Per-Page' },

  { key: 'seo_register_title', label: 'SEO — Register Page Title', value: 'Register for Events — Cherubs Cove Ministry', group: 'SEO Per-Page' },
  { key: 'seo_register_description', label: 'SEO — Register Page Description', value: 'Register for upcoming events at Cherubs Cove Ministry. Free registration for the International Quivers Conference and other gatherings.', group: 'SEO Per-Page' },
  { key: 'seo_register_image', label: 'SEO — Register Page OG Image', value: 'https://cherubscove.net/Cherubscove-ogimage.png', group: 'SEO Per-Page' },

  { key: 'seo_support_title', label: 'SEO — Support Page Title', value: 'Support Our Ministry — Cherubs Cove', group: 'SEO Per-Page' },
  { key: 'seo_support_description', label: 'SEO — Support Page Description', value: 'Partner with Cherubs Cove Ministry through your financial support. Your generous giving helps us continue raising burning youths for the Lord.', group: 'SEO Per-Page' },
  { key: 'seo_support_image', label: 'SEO — Support Page OG Image', value: 'https://cherubscove.net/Cherubscove-ogimage.png', group: 'SEO Per-Page' },
];

/* ── Component ──────────────────────────────────────────────────────────── */

const Field = ({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1">
    <label className="text-[11px] font-semibold tracking-wide uppercase text-[#B5A898]">{label}</label>
    {children}
    {hint && <p className="text-[10px] text-[#6B5E50]">{hint}</p>}
  </div>
);

/** Convert Google Drive share URLs into direct-image URLs that browsers can render. */
export function normalizeImageUrl(url: string): string {
  if (!url) return url;
  const m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:[^&]*&)*id=)([a-zA-Z0-9_-]+)/);
  if (m) return `https://lh3.googleusercontent.com/d/${m[1]}=w1600`;
  return url;
}

class AdminErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
  state = { hasError: false, error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Admin page crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0F0D0A] flex items-center justify-center px-4">
          <Card className="w-full max-w-lg bg-[#1A1814] border-[#E8620A]/20">
            <CardHeader>
              <CardTitle className="text-2xl font-['Playfair_Display'] text-white">Admin panel hit an unexpected error</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-[#B5A898]">
              <p>The admin dashboard could not finish loading. Refresh the page to try again.</p>
              <p className="text-xs text-[#6B5E50]">{this.state.error?.message || 'Unknown error'}</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNew, setShowPwNew] = useState(false);
  const [showPwConfirm, setShowPwConfirm] = useState(false);
  const [showAdminPwNew, setShowAdminPwNew] = useState(false);
  const [showInvitePw, setShowInvitePw] = useState(false);
  // Sign-up is disabled — admins are provisioned via the DB / super admin only.
  const [isLoading, setIsLoading] = useState(false);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [gallery, setGallery] = useState<GalleryRecord[]>([]);
  const [siteSettings, setSiteSettings] = useState<Record<string, string>>({});
  const [settingsMeta, setSettingsMeta] = useState<{ id: string; key: string; label: string; type: string }[]>([]);
  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [contentValues, setContentValues] = useState<Record<string, string>>({});
  const [contentGroup, setContentGroup] = useState('all');
  const [developerModeEnabled, setDeveloperModeEnabledState] = useState<boolean>(getDeveloperModeEnabled());
  const [consoleLoggingEnabled, setConsoleLoggingEnabledState] = useState<boolean>(getConsoleLoggingEnabled());
  const [consoleToggleSaving, setConsoleToggleSaving] = useState(false);
  const [developerModeSaving, setDeveloperModeSaving] = useState(false);
  const [analyticsEvents, setAnalyticsEvents] = useState<AnalyticsEvent[]>([]);
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>('30d');
  const [analyticsGranularity, setAnalyticsGranularity] = useState<AnalyticsGranularity>('day');
  const [analyticsCustomStart, setAnalyticsCustomStart] = useState('');
  const [analyticsCustomEnd, setAnalyticsCustomEnd] = useState('');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showAllTrend, setShowAllTrend] = useState(false);
  const [showAllTopPages, setShowAllTopPages] = useState(false);
  const [showAllExitPages, setShowAllExitPages] = useState(false);
  const [showAllActivities, setShowAllActivities] = useState(false);
  const [showAllDownloads, setShowAllDownloads] = useState(false);
  const [showAllGalleries, setShowAllGalleries] = useState(false);

  // ── Audit Log ─────────────────────────────────────────────────────────
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditLogsLoading, setAuditLogsLoading] = useState(false);
  const [auditSort, setAuditSort] = useState<{ col: keyof AuditLogEntry; asc: boolean }>({ col: 'created_at', asc: false });
  const [auditSearch, setAuditSearch] = useState('');
  const [auditFilterAction, setAuditFilterAction] = useState<string>('all');
  const [auditFilterEntity, setAuditFilterEntity] = useState<string>('all');

  // ── Password Change ───────────────────────────────────────────────────
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changePwCurrent, setChangePwCurrent] = useState('');
  const [changePwNew, setChangePwNew] = useState('');
  const [changePwConfirm, setChangePwConfirm] = useState('');
  const [changePwSaving, setChangePwSaving] = useState(false);

  // ── Super Admin: Change another admin's password ─────────────────────
  const [adminPwTargetEmail, setAdminPwTargetEmail] = useState('');
  const [adminPwNewPassword, setAdminPwNewPassword] = useState('');
  const [adminPwSaving, setAdminPwSaving] = useState(false);
  const [adminPwDialogOpen, setAdminPwDialogOpen] = useState(false);

  const parseRegistrationFormData = (raw: RegistrationRecord['form_data']) => {
    if (!raw) return null;
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return null; }
    }
    return raw;
  };

  const getRegistrationFormDataPairs = (registration: RegistrationRecord) => {
    const raw = parseRegistrationFormData(registration.form_data);
    if (!raw || typeof raw !== 'object') return [];

    const event = events.find(ev => ev.id === registration.event_id);
    let formFields: FormFieldConfig[] = [];
    if (event?.form_fields) {
      try { formFields = JSON.parse(event.form_fields); } catch { formFields = []; }
    }

    const rawMap = raw as Record<string, any>;
    const result: { key: string; label: string; value: string }[] = [];
    const seen = new Set<string>();

    if (formFields.length) {
      for (const field of formFields) {
        if (Object.prototype.hasOwnProperty.call(rawMap, field.id)) {
          const value = rawMap[field.id];
          result.push({
            key: field.id,
            label: field.label,
            value: Array.isArray(value) ? value.join(', ') : String(value ?? ''),
          });
          seen.add(field.id);
        }
      }
    }

    for (const [key, value] of Object.entries(rawMap)) {
      if (seen.has(key)) continue;
      result.push({
        key,
        label: key,
        value: Array.isArray(value) ? value.join(', ') : String(value ?? ''),
      });
    }

    return result;
  };

  const [editEvent, setEditEvent] = useState<EventRecord | null>(null);
  const [editDownload, setEditDownload] = useState<DownloadRecord | null>(null);
  const [editGallery, setEditGallery] = useState<GalleryRecord | null>(null);

  const [inviteEmail, setInviteEmail] = useState('');
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'super_admin'>('admin');
  const [adminList, setAdminList] = useState<{ email: string; role: 'super_admin' | 'admin' }[]>([]);

  const [regSort, setRegSort] = useState<{ col: keyof RegistrationRecord; asc: boolean }>({ col: 'created_at', asc: false });
  const [regSearch, setRegSearch] = useState('');
  const [regSelectedGroupKey, setRegSelectedGroupKey] = useState<string | null>(null);

  // Newsletter
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [subSearch, setSubSearch] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMode, setComposeMode] = useState<'bulk' | 'individual'>('bulk');
  const [composeTargets, setComposeTargets] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeSending, setComposeSending] = useState(false);
  const [sendLogs, setSendLogs] = useState<NewsletterSendLog[]>([]);
  const [sendLogOpen, setSendLogOpen] = useState(false);
  const [subscriberEdit, setSubscriberEdit] = useState<NewsletterSubscriber | null>(null);
  const [testEmailSending, setTestEmailSending] = useState(false);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingGalleryImage, setUploadingGalleryImage] = useState(false);
  const [bulkAddMode, setBulkAddMode] = useState(false);
  const [bulkUrls, setBulkUrls] = useState('');
  const [importingBulk, setImportingBulk] = useState(false);

  // Bulk image selection (move / delete)
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
  const [bulkCategoryTarget, setBulkCategoryTarget] = useState<string>('');

  // Gallery collections (stored as JSON in site_settings["galleries_json"])
  const [galleries, setGalleries] = useState<GalleryCollection[]>([]);
  const [selectedGalleryId, setSelectedGalleryId] = useState<string | null>(null);
  const [editCollection, setEditCollection] = useState<GalleryCollection | null>(null);
  const selectedGallery = galleries.find(g => g.id === selectedGalleryId) || null;
  const imagesInSelectedGallery = selectedGallery
    ? gallery.filter(g => {
        const category = (g.category || '').trim();
        return category === selectedGallery.id || category === selectedGallery.name;
      })
    : [];

  // Group registrations by event
  const regGroups = useMemo(() => {
    const map = new Map<string, { key: string; title: string; items: RegistrationRecord[] }>();
    registrations.forEach(r => {
      const key = r.event_id || r.event_title || r.program || 'general';
      const title = r.event_title || r.program || 'General Registrations';
      if (!map.has(key)) map.set(key, { key, title, items: [] });
      map.get(key)!.items.push(r);
    });
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [registrations]);

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

  const handleDeveloperModeToggle = async (enabled?: boolean) => {
    const nextValue = enabled ?? !developerModeEnabled;
    setDeveloperModeSaving(true);
    try {
      await persistDeveloperModePreference(nextValue);
      setDeveloperModeEnabledState(nextValue);
      if (!nextValue) {
        setConsoleLoggingEnabledState(false);
        applyConsoleLoggingPreference(false);
      }
      toast.success(nextValue ? 'Developer mode enabled.' : 'Developer mode disabled.');
      void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.DEVELOPER_MODE_TOGGLED, 'preferences', undefined, {
        enabled: nextValue,
      });
    } catch (err: any) {
      toast.error(err.message ?? 'Unable to update developer mode.');
    } finally {
      setDeveloperModeSaving(false);
    }
  };

  const handleConsoleLoggingToggle = async (enabled?: boolean) => {
    if (!developerModeEnabled) return;
    const nextValue = enabled ?? !consoleLoggingEnabled;
    setConsoleToggleSaving(true);
    try {
      await persistConsoleLoggingPreference(nextValue);
      setConsoleLoggingEnabledState(nextValue);
      applyConsoleLoggingPreference(nextValue);
      toast.success(nextValue ? 'Console logs enabled.' : 'Console logs silenced.');
      void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.CONSOLE_LOGGING_TOGGLED, 'preferences', undefined, {
        enabled: nextValue,
      });
    } catch (err: any) {
      toast.error(err.message ?? 'Unable to update console logging preference.');
    } finally {
      setConsoleToggleSaving(false);
    }
  };

  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) { toast.error('Please enter both email and password.'); return; }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success('Signed in successfully.');
    } catch (err: any) {
      toast.error(err.message ?? 'Authentication failed.');
    } finally { setIsLoading(false); }
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setSession(null); toast.info('Signed out.'); };

  /* ── Data Loading + Seeding ─────────────────────────────────────────── */

  const safeSelect = async <T,>(query: PromiseLike<{ data: T | null; error: any }>) => {
    try {
      const result = await query;
      return { data: result.data ?? null, error: result.error ?? null };
    } catch (error) {
      return { data: null, error };
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const { start, end } = getAnalyticsDateRange(
        analyticsRange === 'custom' ? '30d' : analyticsRange,
        analyticsRange === 'custom' ? analyticsCustomStart : undefined,
        analyticsRange === 'custom' ? analyticsCustomEnd : undefined,
      );

      const { data, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Analytics load failed:', error);
        setAnalyticsEvents([]);
        return;
      }

      setAnalyticsEvents((data as AnalyticsEvent[]) ?? []);
    } catch (error) {
      console.error('Analytics load crashed:', error);
      setAnalyticsEvents([]);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    void loadAnalytics();
  }, [analyticsRange, analyticsCustomStart, analyticsCustomEnd]);

  const loadAuditLogs = async () => {
    setAuditLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (!error) {
        setAuditLogs((data as AuditLogEntry[]) ?? []);
      }
    } catch {
      // swallow
    } finally {
      setAuditLogsLoading(false);
    }
  };

  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const [ev, dl, gal, st, reg, nl, sl] = await Promise.all([
        safeSelect(supabase.from('events').select('*').order('date', { ascending: false })),
        safeSelect(supabase.from('downloads').select('*').order('title')),
        safeSelect(supabase.from('gallery').select('*').order('created_at', { ascending: false })),
        safeSelect(supabase.from('site_settings').select('*')),
        safeSelect(supabase.from('registrations').select('*').order('created_at', { ascending: false })),
        safeSelect(supabase.from('newsletter').select('*').order('created_at', { ascending: false })),
        safeSelect(supabase.from('newsletter_send_log').select('*').order('sent_at', { ascending: false })),
      ]);

      if (!ev.error && !ev.data?.length) {
        try {
          await supabase.from('events').insert(SEED_EVENTS);
          const { data: seeded } = await supabase.from('events').select('*').order('date', { ascending: false });
          setEvents(seeded ?? []);
        } catch (seedError) {
          console.error('Failed to seed events:', seedError);
          setEvents([]);
        }
      } else {
        setEvents(ev.data ?? []);
      }

      if (!dl.error && !dl.data?.length) {
        try {
          await supabase.from('downloads').insert(SEED_DOWNLOADS);
          const { data: seeded } = await supabase.from('downloads').select('*').order('title');
          setDownloads(seeded ?? []);
        } catch (seedError) {
          console.error('Failed to seed downloads:', seedError);
          setDownloads([]);
        }
      } else {
        setDownloads(dl.data ?? []);
      }

      setGallery(gal.data ?? []);
      setRegistrations(reg.data ?? []);
      setSubscribers((nl.data as NewsletterSubscriber[]) ?? []);
      setSendLogs((sl.data as NewsletterSendLog[]) ?? []);

      const settings = st.data ?? [];
      setSettingsMeta(settings.map((r: any) => ({ id: r.id, key: r.key, label: r.label, type: r.type })));
      const settingsMap = settings.reduce((acc: Record<string, string>, r: any) => { acc[r.key] = r.value ?? ''; return acc; }, {});
      setSiteSettings(settingsMap);

      const developerPrefValue = settingsMap.developer_mode;
      const consolePrefValue = settingsMap.console_logging_enabled;
      const developerEnabled = developerPrefValue !== undefined ? String(developerPrefValue) === 'true' : false;
      setDeveloperModeEnabledState(developerEnabled);
      if (!developerEnabled) {
        setConsoleLoggingEnabledState(false);
        applyConsoleLoggingPreference(false);
      } else if (consolePrefValue !== undefined) {
        const enabled = String(consolePrefValue) === 'true';
        setConsoleLoggingEnabledState(enabled);
        applyConsoleLoggingPreference(enabled);
      }

      const cv: Record<string, string> = {};
      CONTENT_DEFAULTS.forEach(cd => { cv[cd.key] = settingsMap[cd.key] ?? cd.value; });
      setContentValues(cv);

      const existingKeys = new Set(settings.map((r: any) => r.key));
      const missing = CONTENT_DEFAULTS.filter(cd => !existingKeys.has(cd.key));
      let finalSettings = settings;
      if (missing.length > 0) {
        try {
          await supabase.from('site_settings').insert(missing.map(cd => ({ key: cd.key, label: cd.label, value: cd.value, type: 'text' })));
          const { data: refreshed } = await supabase.from('site_settings').select('*');
          if (refreshed) {
            finalSettings = refreshed;
            setSettingsMeta(refreshed.map((r: any) => ({ id: r.id, key: r.key, label: r.label, type: r.type })));
            const refreshedMap = refreshed.reduce((acc: Record<string, string>, r: any) => { acc[r.key] = r.value ?? ''; return acc; }, {});
            setSiteSettings(refreshedMap);
          }
        } catch (seedError) {
          console.error('Failed to seed missing settings:', seedError);
        }
      }

      await loadAdminList(finalSettings);
      await loadGalleries(finalSettings);
      void loadAuditLogs();
    } catch (error) {
      console.error('Admin data load failed:', error);
      toast.error('The admin dashboard could not load all data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  /* ── Save Content Setting ──────────────────────────────────────────── */

  const saveContentSetting = async (key: string) => {
    const meta = settingsMeta.find(s => s.key === key);
    if (!meta) { toast.error('Setting not found in DB. Try reloading.'); return; }
    const { error } = await supabase.from('site_settings').update({ value: contentValues[key] }).eq('id', meta.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Saved.');
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.CONTENT_UPDATED, 'site_settings', meta.id, {
      key: meta.key,
      label: meta.label,
    });
  };

  /* ── CRUD: Events ────────────────────────────────────────────────────── */

  const saveEvent = async () => {
    if (!editEvent) return;
    if (!editEvent.title) { toast.error('Event title is required.'); return; }

    const validation = validateEventDateTime(editEvent);
    if (!validation.isValid) {
      toast.error(validation.message ?? 'Please check the event dates and times.');
      return;
    }

    const payload: any = {
      title: editEvent.title,
      theme: editEvent.theme || null,
      status: editEvent.status,
      date: editEvent.date || null,
      end_date: editEvent.end_date || null,
      time: editEvent.time || null,
      end_time: editEvent.end_time || null,
      image_url: editEvent.image_url, description: editEvent.description,
      location: editEvent.location,
      registration_enabled: editEvent.registration_enabled ?? false,
      form_fields: editEvent.form_fields ?? '[]',
      completion_message: editEvent.completion_message || null,
      newsletter_opt_in_enabled: editEvent.newsletter_opt_in_enabled ?? true,
    };


    try {
      const adminEmail = session?.user?.email ?? '';
      if (editEvent.id) {
        const { error } = await supabase.from('events').update(payload).eq('id', editEvent.id);
        if (error) throw error;
        toast.success('Event updated.');
        void logAuditAction(adminEmail, AUDIT_ACTIONS.EVENT_UPDATED, 'events', editEvent.id, {
          title: editEvent.title,
          status: editEvent.status,
          date: editEvent.date,
        });
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
        toast.success('Event created.');
        void logAuditAction(adminEmail, AUDIT_ACTIONS.EVENT_CREATED, 'events', undefined, {
          title: editEvent.title,
          status: editEvent.status,
        });
      }
      setEditEvent(null);
      await loadAllData();
    } catch (error: any) {
      toast.error(error.message + (error.message.includes('column') ? ' — Run the migration in the note below.' : ''));
    }
  };

  const uploadEventImage = async (file: File) => {
    if (!editEvent) return;
    setUploadingImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `events/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('event-images').upload(path, file, { upsert: false });
      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}. Create a public bucket named "event-images" in Supabase Storage.`);
        return;
      }
      const { data } = supabase.storage.from('event-images').getPublicUrl(path);
      setEditEvent({ ...editEvent, image_url: data.publicUrl });
      toast.success('Image uploaded.');
    } finally { setUploadingImage(false); }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Delete this event?')) return;
    const ev = events.find(e => e.id === id);
    await supabase.from('events').delete().eq('id', id);
    toast.success('Event deleted.');
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.EVENT_DELETED, 'events', id, {
      title: ev?.title,
    });
    loadAllData();
  };

  const toggleEventRegistration = async (ev: EventRecord) => {
    const newVal = !ev.registration_enabled;
    const { error } = await supabase.from('events').update({ registration_enabled: newVal }).eq('id', ev.id);
    if (error) { toast.error(error.message); return; }
    toast.success(newVal ? 'Registration enabled.' : 'Registration disabled.');
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.EVENT_REGISTRATION_TOGGLED, 'events', ev.id, {
      registration_enabled: newVal,
      title: ev.title,
    });
    loadAllData();
  };

  /* ── CRUD: Downloads ─────────────────────────────────────────────────── */

  const saveDownload = async () => {
    if (!editDownload) return;
    if (!editDownload.title || !editDownload.url) { toast.error('Title and URL are required.'); return; }
    const payload = { title: editDownload.title, url: editDownload.url, description: editDownload.description, category: editDownload.category, type: editDownload.type };
    const adminEmail = session?.user?.email ?? '';
    if (editDownload.id) {
      const { error } = await supabase.from('downloads').update(payload).eq('id', editDownload.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Download updated.');
      void logAuditAction(adminEmail, AUDIT_ACTIONS.DOWNLOAD_UPDATED, 'downloads', editDownload.id, {
        title: editDownload.title,
        category: editDownload.category,
      });
    } else {
      const { error } = await supabase.from('downloads').insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success('Download created.');
      void logAuditAction(adminEmail, AUDIT_ACTIONS.DOWNLOAD_CREATED, 'downloads', undefined, {
        title: editDownload.title,
        category: editDownload.category,
      });
    }
    setEditDownload(null);
    loadAllData();
  };

  const deleteDownload = async (id: string) => {
    if (!confirm('Delete this download?')) return;
    const dl = downloads.find(d => d.id === id);
    await supabase.from('downloads').delete().eq('id', id);
    toast.success('Download deleted.');
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.DOWNLOAD_DELETED, 'downloads', id, {
      title: dl?.title,
    });
    loadAllData();
  };

  /* ── CRUD: Gallery ───────────────────────────────────────────────────── */

  /** Extract a readable title from a URL's filename — returns empty for Google Drive so gallery-based naming is used. */
  function titleFromUrl(url: string): string {
    try {
      if (url.includes('drive.google.com')) {
        return ''; // Gallery-based naming will be applied instead
      }
      const filename = url.split('/').pop()?.split('?')[0]?.split('#')[0] || '';
      const name = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      return name.charAt(0).toUpperCase() + name.slice(1);
    } catch { return ''; }
  }

  const trySaveGallery = async (data: Record<string, string>) => {
    if (!editGallery) return { data: null, error: { message: 'No gallery item.' } } as any;
    if (editGallery.id) {
      return supabase.from('gallery').update(data).eq('id', editGallery.id);
    }
    return supabase.from('gallery').insert(data as any);
  };

  const saveGallery = async () => {
    if (!editGallery) return;
    if (!editGallery.image_url) { toast.error('Image URL is required.'); return; }

    // ── Determine effective gallery name for auto-title ─────────────
    const effectiveGalId = editGallery.category || selectedGalleryId || '';
    const effectiveGal = galleries.find(g => g.id === effectiveGalId || g.name === effectiveGalId);

    // ── Auto-generate title if none provided ────────────────────────
    let title = editGallery.title || '';
    if (!title) {
      const fromUrl = titleFromUrl(editGallery.image_url);
      if (fromUrl) {
        title = fromUrl;
      } else if (effectiveGal) {
        // Find max existing index in this gallery for stable numbering
        const imagesInGal = gallery.filter(g => {
          const cat = (g.category || '').trim();
          return (cat === effectiveGal.id || cat === effectiveGal.name) && g.id !== editGallery.id;
        });
        title = generateNextImageTitle(imagesInGal, effectiveGal.name);
      } else {
        // Uncategorized — find max index for stable numbering
        const uncatImages = gallery.filter(g => {
          const cat = (g.category || '').trim();
          return !cat || !galleries.some(gc => gc.id === cat || gc.name === cat);
        });
        title = generateNextImageTitle(uncatImages, null);
      }
    }

    const alt_text = editGallery.alt_text || `Photo: ${title}`;
    const normalizedImageUrl = normalizeImageUrl(editGallery.image_url);
    const payload: Record<string, string> = {
      title,
      image_url: normalizedImageUrl,
      caption: editGallery.caption,
      alt_text,
    };

    const categoryCandidates: string[] = [];
    if (editGallery.category) categoryCandidates.push(editGallery.category);
    const selectedGallery = galleries.find(g => g.id === selectedGalleryId);
    if (selectedGallery && selectedGallery.name && !categoryCandidates.includes(selectedGallery.name)) {
      categoryCandidates.push(selectedGallery.name);
    }

    if (categoryCandidates.length) {
      payload.category = categoryCandidates[0];
    }

    let { error } = await trySaveGallery(payload);
    if (error) {
      if (payload.alt_text && error.code === '42703') {
        delete payload.alt_text;
        const retry = await trySaveGallery(payload);
        error = retry.error;
      }
    }

    if (error && payload.category) {
      for (let i = 0; i < categoryCandidates.length; i += 1) {
        const candidate = categoryCandidates[i];
        payload.category = candidate;
        const retry = await trySaveGallery(payload);
        if (!retry.error) {
          error = null;
          break;
        }
        if (retry.error.code !== '23514') {
          error = retry.error;
          break;
        }
      }
    }

    if (error && payload.category) {
      delete payload.category;
      const retry = await trySaveGallery(payload);
      error = retry.error;
      if (!error) {
        toast.success(editGallery.id ? 'Gallery item updated without category.' : 'Gallery item created without category.');
      }
    }

    if (error) { toast.error(error.message || 'Unable to save gallery item.'); return; }
    const adminEmail = session?.user?.email ?? '';
    if (!payload.category) {
      toast.success(editGallery.id ? 'Gallery item updated without category.' : 'Gallery item created without category.');
    } else {
      toast.success(editGallery.id ? 'Gallery item updated.' : 'Gallery item created.');
    }
    if (editGallery.id) {
      void logAuditAction(adminEmail, AUDIT_ACTIONS.GALLERY_IMAGE_UPDATED, 'gallery', editGallery.id, {
        title: payload.title,
        category: payload.category,
      });
    } else {
      void logAuditAction(adminEmail, AUDIT_ACTIONS.GALLERY_IMAGE_CREATED, 'gallery', undefined, {
        title: payload.title,
        category: payload.category,
      });
    }
    setEditGallery(null);
    loadAllData();
  };

  const uploadGalleryImage = async (file: File) => {
    if (!editGallery) return;
    setUploadingGalleryImage(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `gallery/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      // Try dedicated gallery bucket, fall back to event-images
      let bucket = 'gallery-images';
      let { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
      if (upErr) {
        bucket = 'event-images';
        ({ error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false }));
      }
      if (upErr) {
        toast.error(`Upload failed: ${upErr.message}. Create a public bucket named "gallery-images" (or "event-images") in Supabase Storage.`);
        return;
      }
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      setEditGallery({ ...editGallery, image_url: data.publicUrl });
      toast.success('Image uploaded.');
    } finally { setUploadingGalleryImage(false); }
  };


  const deleteGallery = async (id: string) => {
    if (!confirm('Delete this gallery item?')) return;
    const img = gallery.find(g => g.id === id);
    await supabase.from('gallery').delete().eq('id', id);
    toast.success('Gallery item deleted.');
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.GALLERY_IMAGE_DELETED, 'gallery', id, {
      title: img?.title,
    });
    loadAllData();
  };

  /* ── Bulk image selection (move / delete) ────────────────────────────── */

  const toggleSelectImage = (id: string) => {
    setSelectedImageIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllImages = (ids: string[]) => {
    setSelectedImageIds(prev => {
      if (prev.size === ids.length && [...prev].every(id => ids.includes(id))) {
        return new Set();
      }
      return new Set(ids);
    });
  };

  const bulkDeleteImages = async () => {
    if (selectedImageIds.size === 0) return;
    if (!confirm(`Delete ${selectedImageIds.size} image(s)?`)) return;
    const ids = [...selectedImageIds];
    const { error } = await supabase.from('gallery').delete().in('id', ids);
    if (error) { toast.error(error.message); return; }
    toast.success(`${ids.length} image(s) deleted.`);
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.GALLERY_IMAGE_DELETED, 'gallery', undefined, {
      count: ids.length,
      image_ids: ids,
    });
    setSelectedImageIds(new Set());
    loadAllData();
  };

  const bulkMoveImages = async () => {
    if (selectedImageIds.size === 0 || !bulkCategoryTarget) return;
    const ids = [...selectedImageIds];
    const targetVal = bulkCategoryTarget;
    const { error } = await supabase.from('gallery').update({ category: targetVal }).in('id', ids);
    if (error) {
      if (error.code === '23514') {
        toast.error('The selected category was rejected by the database. Try using the gallery name or ID.');
      } else {
        toast.error(error.message);
      }
      return;
    }
    const catName = galleries.find(g => g.id === targetVal || g.name === targetVal)?.name || targetVal;
    // Update titles of moved images — each gets the next available index
    const { data: movedImgs } = await supabase
      .from('gallery')
      .select('id, title')
      .in('id', ids)
      .order('created_at', { ascending: true });
    if (movedImgs) {
      // First, find all existing images already in the target gallery (excluding the ones being moved)
      const existingTargetIds = new Set(ids);
      const existingTargetImgs = gallery.filter(g => {
        const cat = (g.category || '').trim();
        return (cat === targetVal || cat === catName) && !existingTargetIds.has(g.id!);
      });
      // Track current max index, then assign sequentially
      let nextIdx = 1;
      for (const img of existingTargetImgs) {
        const t = img.title || '';
        if (t.startsWith(catName ? generateGalleryAbbreviation(catName) : 'Uncategorized')) {
          const match = t.match(/-(\d{3})$/);
          if (match) {
            const idx = parseInt(match[1], 10);
            if (idx >= nextIdx) nextIdx = idx + 1;
          }
        }
      }
      for (const img of movedImgs) {
        const newTitle = `${catName ? generateGalleryAbbreviation(catName) : 'Uncategorized'}-${String(nextIdx).padStart(3, '0')}`;
        await supabase.from('gallery').update({ title: newTitle }).eq('id', img.id);
        nextIdx++;
      }
    }
    toast.success(`${ids.length} image(s) moved to "${catName}".`);
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.GALLERY_IMAGE_MOVED, 'gallery', undefined, {
      count: ids.length,
      target_category: catName,
      image_ids: ids,
    });
    setSelectedImageIds(new Set());
    setBulkCategoryTarget('');
    loadAllData();
  };

  /* ── One-time migration: retitle existing images ─────────────────────── */

  const migrateExistingImageTitles = async () => {
    if (!gallery.length) return;

    const oldTitlePattern = /google drive image|gallery photo/i;
    const needsMigration = gallery.some(g => oldTitlePattern.test(g.title || '') || !(g.title || '').match(/-(\d{3})$/));
    if (!needsMigration) return;

    console.log('[migrate] Retitling existing gallery images…');

    // Group images by effective gallery
    const byGallery = new Map<string, typeof gallery>();
    const uncategorized: typeof gallery = [];

    for (const img of gallery) {
      const cat = (img.category || '').trim();
      const gal = cat ? galleries.find(g => g.id === cat || g.name === cat) : null;
      if (gal) {
        const key = gal.name;
        if (!byGallery.has(key)) byGallery.set(key, []);
        byGallery.get(key)!.push(img);
      } else {
        uncategorized.push(img);
      }
    }

    // Helper: compute next stable index for a set of images given an abbreviation
    const reindexGroup = async (images: typeof gallery, abbr: string) => {
      let nextIdx = 1;
      // First pass: find max existing index from titles that already match the pattern
      for (const img of images) {
        const t = img.title || '';
        if (t.startsWith(abbr)) {
          const match = t.match(/-(\d{3})$/);
          if (match) {
            const idx = parseInt(match[1], 10);
            if (idx >= nextIdx) nextIdx = idx + 1;
          }
        }
      }
      // Second pass: assign new titles to images that don't follow the pattern
      for (const img of images) {
        const t = img.title || '';
        if (oldTitlePattern.test(t) || !t.match(/-(\d{3})$/)) {
          const newTitle = `${abbr}-${String(nextIdx).padStart(3, '0')}`;
          await supabase.from('gallery').update({ title: newTitle }).eq('id', img.id);
          nextIdx++;
        }
      }
    };

    for (const [galName, images] of byGallery.entries()) {
      const abbr = generateGalleryAbbreviation(galName);
      await reindexGroup(images, abbr);
    }
    if (uncategorized.length) {
      await reindexGroup(uncategorized, 'Uncategorized');
    }

    const total = gallery.length;
    const migrated = gallery.filter(g => oldTitlePattern.test(g.title || '') || !(g.title || '').match(/-(\d{3})$/)).length;
    if (migrated > 0) {
      toast.success(`Re-titled ${migrated} existing image(s) to gallery-based naming.`);
      void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.IMAGE_MIGRATION_RUN, 'gallery', undefined, {
        migrated_count: migrated,
        total_images: gallery.length,
      });
      loadAllData();
    }
  };

  // Run migration once when gallery data is ready
  const [migrationDone, setMigrationDone] = useState(false);
  useEffect(() => {
    if (gallery.length > 0 && !migrationDone) {
      migrateExistingImageTitles().catch((err) =>
        console.error('Image migration failed:', err)
      );
      setMigrationDone(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gallery.length, galleries.length]);

  /* ── Site Settings ───────────────────────────────────────────────────── */

  const saveSetting = async (key: string) => {
    const meta = settingsMeta.find(s => s.key === key);
    if (!meta) return;
    const { error } = await supabase.from('site_settings').update({ value: siteSettings[key] }).eq('id', meta.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${meta.label} saved.`);
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.SETTING_UPDATED, 'site_settings', meta.id, {
      key: meta.key,
      label: meta.label,
    });
  };

  /* ── Admin Invite & Management ───────────────────────────────────────── */

  const SUPER_ADMIN_EMAIL = 'cherubscove@gmail.com';
  const ADMIN_LIST_KEY = 'admin_users_json';

  /** Check whether the current session user is a super admin — either the hardcoded root super admin, or listed with super_admin role in the admin list. */
  const isSuperAdmin =
    session?.user?.email?.toLowerCase() === SUPER_ADMIN_EMAIL ||
    adminList.some(
      a =>
        a.email.toLowerCase() === session?.user?.email?.toLowerCase() &&
        a.role === 'super_admin',
    );

  const loadAdminList = async (settingsRows: any[]) => {
    const row = settingsRows.find(r => r.key === ADMIN_LIST_KEY);
    let parsed: { email: string; role: 'super_admin' | 'admin' }[] = [];
    if (row?.value) {
      try { parsed = JSON.parse(row.value); } catch { parsed = []; }
    }

    const byEmail = new Map<string, { email: string; role: 'super_admin' | 'admin' }>();
    for (const a of parsed) byEmail.set(a.email.toLowerCase(), a);

    // Super admin always present + always super
    byEmail.set(SUPER_ADMIN_EMAIL, { email: SUPER_ADMIN_EMAIL, role: 'super_admin' });

    const merged = Array.from(byEmail.values()).sort((a, b) => {
      if (a.email === SUPER_ADMIN_EMAIL) return -1;
      if (b.email === SUPER_ADMIN_EMAIL) return 1;
      return a.email.localeCompare(b.email);
    });

    // Persist merged list back so it stays in sync
    const payload = JSON.stringify(merged);
    if (row?.value !== payload) {
      const res = row
        ? await supabase.from('site_settings').update({ value: payload }).eq('id', row.id)
        : await supabase.from('site_settings').insert({ key: ADMIN_LIST_KEY, label: 'Admin Users (JSON)', value: payload, type: 'text' });
      if (res.error) toast.error(`Could not persist admin list: ${res.error.message}`);
    }
    setAdminList(merged);
  };

  const persistAdminList = async (next: { email: string; role: 'super_admin' | 'admin' }[]) => {
    const { data: existing } = await supabase.from('site_settings').select('id').eq('key', ADMIN_LIST_KEY).maybeSingle();
    const payload = JSON.stringify(next);
    if (existing?.id) {
      await supabase.from('site_settings').update({ value: payload }).eq('id', existing.id);
    } else {
      await supabase.from('site_settings').insert({ key: ADMIN_LIST_KEY, label: 'Admin Users (JSON)', value: payload, type: 'text' });
    }
    setAdminList(next);
  };

  const inviteAdmin = async () => {
    if (!inviteEmail.trim() || !invitePassword.trim()) { toast.error('Enter email and password for the new admin.'); return; }
    const email = inviteEmail.trim().toLowerCase();
    // Use the Vercel API route with service_role key so the caller's session is NOT replaced.
    // (supabase.auth.signUp() would auto-sign-in as the new user when email confirmations are disabled.)
    const {
      data: { session: currentSession },
    } = await supabase.auth.getSession();
    const token = currentSession?.access_token;
    if (!token) {
      toast.error('Your session could not be verified. Please sign out and sign in again.');
      return;
    }
    let response: Response;
    try {
      response = await fetch('/api/admin-create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ target_email: email, password: invitePassword }),
      });
    } catch (fetchErr: any) {
      toast.error('Network error contacting the server. Make sure the API route is deployed.');
      return;
    }
    const data = await response.json();
    if (!response.ok || data?.error) {
      toast.error(data?.error ?? 'Failed to create admin user.');
      return;
    }
    const next = adminList.some(a => a.email.toLowerCase() === email)
      ? adminList
      : [...adminList, { email, role: inviteRole }];
    await persistAdminList(next);
    toast.success(`${email} added as ${inviteRole === 'super_admin' ? 'super admin' : 'admin'}.`);
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.ADMIN_INVITED, 'admin_users', undefined, {
      target_email: email,
      role: inviteRole,
    });
    setInviteEmail('');
    setInvitePassword('');
    // Refresh all data to ensure the dashboard is completely in sync
    await loadAllData();
  };

  const removeAdmin = async (email: string) => {
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL) { toast.error('The super admin cannot be removed.'); return; }
    if (!isSuperAdmin) { toast.error('Only the super admin can remove admins.'); return; }
    if (!confirm(`Remove ${email} from admins? Their auth login will remain — remove them from the admin list only.`)) return;
    await persistAdminList(adminList.filter(a => a.email.toLowerCase() !== email.toLowerCase()));
    toast.success(`${email} removed from admin list.`);
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.ADMIN_REMOVED, 'admin_users', undefined, {
      target_email: email,
    });
  };

  const changeAdminRole = async (email: string, role: 'admin' | 'super_admin') => {
    if (email.toLowerCase() === SUPER_ADMIN_EMAIL) { toast.error("The super admin's role is locked."); return; }
    if (!isSuperAdmin) { toast.error('Only the super admin can change roles.'); return; }
    await persistAdminList(adminList.map(a => a.email.toLowerCase() === email.toLowerCase() ? { ...a, role } : a));
    toast.success('Role updated.');
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.ADMIN_ROLE_CHANGED, 'admin_users', undefined, {
      target_email: email,
      new_role: role,
    });
  };

  /* ── Password Change ───────────────────────────────────────────────── */

  /** Change the current user's own password (works for any authenticated admin). */
  const handleChangeOwnPassword = async () => {
    if (!changePwNew) { toast.error('Enter a new password.'); return; }
    if (changePwNew.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (changePwNew !== changePwConfirm) { toast.error('Passwords do not match.'); return; }
    setChangePwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: changePwNew });
      if (error) throw error;
      toast.success('Your password has been changed successfully.');
      void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.ADMIN_PASSWORD_CHANGED, 'auth', session?.user?.id);
      setShowChangePassword(false);
      setChangePwCurrent('');
      setChangePwNew('');
      setChangePwConfirm('');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to change password.');
    } finally {
      setChangePwSaving(false);
    }
  };

  /** Super admin: change any admin's password via the edge function. */
  const handleAdminChangePassword = async () => {
    if (!adminPwTargetEmail) { toast.error('Select an admin to update.'); return; }
    if (!adminPwNewPassword) { toast.error('Enter a new password.'); return; }
    if (adminPwNewPassword.length < 6) { toast.error('Password must be at least 6 characters.'); return; }
    if (!isSuperAdmin) { toast.error('Only the super admin can change other users\' passwords.'); return; }
    setAdminPwSaving(true);
    try {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      const token = currentSession?.access_token;
      if (!token) {
        toast.error('Your session could not be verified. Please sign out and sign in again.');
        return;
      }
      const response = await fetch('/api/admin-update-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          target_email: adminPwTargetEmail,
          new_password: adminPwNewPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? 'Request failed');
      if (data?.error) throw new Error(data.error);
      toast.success(`Password updated for ${adminPwTargetEmail}`);
      void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.ADMIN_PASSWORD_CHANGED_BY_SUPER, 'auth', undefined, {
        target_email: adminPwTargetEmail,
      });
      setAdminPwDialogOpen(false);
      setAdminPwTargetEmail('');
      setAdminPwNewPassword('');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to update password.');
    } finally {
      setAdminPwSaving(false);
    }
  };

  const GALLERIES_KEY = 'galleries_json';
  const persistGalleries = async (next: GalleryCollection[]) => {
    const { data: existing } = await supabase.from('site_settings').select('id').eq('key', GALLERIES_KEY).maybeSingle();
    const payload = JSON.stringify(next);
    if (existing?.id) {
      await supabase.from('site_settings').update({ value: payload }).eq('id', existing.id);
    } else {
      await supabase.from('site_settings').insert({ key: GALLERIES_KEY, label: 'Galleries (JSON)', value: payload, type: 'text' });
    }
    setGalleries(next);
  };

  const loadGalleries = async (settingsRows: any[]) => {
    try {
      const row = settingsRows.find(r => r.key === GALLERIES_KEY);
      let parsed: GalleryCollection[] = [];
      if (row?.value) { try { parsed = JSON.parse(row.value); } catch { parsed = []; } }
      if (!parsed.length) {
        parsed = SEED_GALLERIES;
        const payload = JSON.stringify(parsed);
        if (row) await supabase.from('site_settings').update({ value: payload }).eq('id', row.id);
        else await supabase.from('site_settings').insert({ key: GALLERIES_KEY, label: 'Galleries (JSON)', value: payload, type: 'text' });
      }
      setGalleries(parsed);
    } catch (error) {
      console.error('Unable to load galleries:', error);
      setGalleries([]);
    }
  };

  /* ── Registrations: Sort & Filter ────────────────────────────────────── */


  const sortedRegistrations = useMemo(() => {
    let filtered = registrations;
    if (regSelectedGroupKey) {
      const grp = regGroups.find(g => g.key === regSelectedGroupKey);
      filtered = grp ? grp.items : [];
    }
    if (regSearch.trim()) {
      const q = regSearch.toLowerCase();
      filtered = filtered.filter(r =>
        `${r.full_name || `${r.first_name || ''} ${r.last_name || ''}`.trim()} ${r.email || ''} ${r.program || ''} ${r.state_city || r.location || ''} ${r.prayer_note || r.note || ''} ${r.event_title || ''}`.toLowerCase().includes(q)
      );
    }
    return [...filtered].sort((a, b) => {
      const av = (a[regSort.col] ?? '') as string;
      const bv = (b[regSort.col] ?? '') as string;
      return regSort.asc ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [registrations, regSort, regSearch, regSelectedGroupKey, regGroups]);

  const toggleSort = (col: keyof RegistrationRecord) => {
    setRegSort(prev => prev.col === col ? { col, asc: !prev.asc } : { col, asc: true });
  };

  const exportRows = () => {
    const headers = ['Name', 'Email', 'Phone', 'Event', 'State / City', 'Prayer Note', 'Date', 'Extra Data'];
    const rows = sortedRegistrations.map(r => [
      r.full_name || `${(r.first_name || '').trim()} ${(r.last_name || '').trim()}`.trim(),
      r.email || '', r.phone || '',
      r.event_title || r.program || '', r.state_city || r.location || '', r.prayer_note || r.note || '',
      new Date(r.created_at).toLocaleString(), typeof r.form_data === 'string' ? r.form_data : JSON.stringify(r.form_data || {}, null, 2),
    ]);
    return { headers, rows };
  };

  const exportCSV = () => {
    if (!sortedRegistrations.length) { toast.error('No registrations to export.'); return; }
    const { headers, rows } = exportRows();
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `registrations-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported.');
  };

  const exportXLSX = async () => {
    if (!sortedRegistrations.length) { toast.error('No registrations to export.'); return; }
    const XLSX = await import('xlsx');
    const { headers, rows } = exportRows();
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    const sheetName = (regGroups.find(g => g.key === regSelectedGroupKey)?.title || 'Registrations').slice(0, 28);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `registrations-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel exported.');
  };

  const exportPDF = async () => {
    if (!sortedRegistrations.length) { toast.error('No registrations to export.'); return; }
    const [{ default: jsPDF }, autoTableMod] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const autoTable = (autoTableMod as any).default || (autoTableMod as any).autoTable;
    const doc = new jsPDF({ orientation: 'landscape' });
    const title = regGroups.find(g => g.key === regSelectedGroupKey)?.title || 'Registrations';
    doc.setFontSize(14);
    doc.text(title, 14, 14);
    doc.setFontSize(9);
    doc.text(`Exported ${new Date().toLocaleString()} · ${sortedRegistrations.length} registrations`, 14, 20);
    const headers = ['Name', 'Email', 'Phone', 'Location', 'Note', 'Date'];
    const rows = sortedRegistrations.map(r => [
      `${r.first_name || ''} ${r.last_name || ''}`.trim(),
      r.email || '', r.phone || '', r.location || '',
      (r.note || '').slice(0, 80),
      new Date(r.created_at).toLocaleDateString(),
    ]);
    autoTable(doc, { head: [headers], body: rows, startY: 26, styles: { fontSize: 8 }, headStyles: { fillColor: [232, 98, 10] } });
    doc.save(`registrations-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success('PDF exported.');
  };

  const seedArbitraryTestEvent = async () => {
    if (!supabase) { toast.error('Supabase not configured.'); return; }
    try {
      // First, delete any old test events (title contains "(Test)")
      const { data: oldTests } = await supabase
        .from('events')
        .select('id')
        .ilike('title', '%(Test)%');
      if (oldTests && oldTests.length > 0) {
        await supabase.from('events').delete().in('id', oldTests.map(e => e.id));
        toast(`${oldTests.length} old test event(s) deleted.`);
      }

      // Create new proper test events with diverse arbitrary form fields
      const testEvents = [
        {
          title: 'Music & Arts Workshop 2026',
          theme: 'Creative Worship',
          status: 'upcoming',
          date: '2026-09-12',
          end_date: '2026-09-13',
          time: '10:00 AM',
          end_time: '5:00 PM',
          location: 'Cherubs Cove Auditorium, Lagos',
          description: 'A two-day intensive workshop exploring creative arts in worship — music, dance, drama, and spoken word. Open to all youths passionate about using their gifts for God\'s glory.',
          image_url: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200',
          registration_enabled: true,
          completion_message: '<p>Thanks for registering for the Music & Arts Workshop! We\'ll send you the full schedule and materials list via email within 48 hours.</p>',
          form_fields: JSON.stringify([
            { id: 'f_full_name', label: 'Full Name', type: 'text', required: true, placeholder: 'Your full name' },
            { id: 'f_email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' },
            { id: 'f_phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '+234 800 000 0000' },
            { id: 'f_age_group', label: 'Age Group', type: 'select', required: true, placeholder: '', options: ['13-17', '18-25', '26-35', '36+'] },
            { id: 'f_workshop', label: 'Which workshop interests you most?', type: 'radio', required: true, placeholder: '', options: ['Music (Voice/Instrument)', 'Dance', 'Drama', 'Spoken Word', 'Technical (Sound/Lights)'] },
            { id: 'f_experience', label: 'Years of experience in this area', type: 'text', required: false, placeholder: 'e.g. 2 years, beginner' },
            { id: 'f_tshirt', label: 'T-Shirt Size', type: 'select', required: true, placeholder: '', options: ['S', 'M', 'L', 'XL', '2XL'] },
            { id: 'f_allergies', label: 'Medical / Allergy Info', type: 'textarea', required: false, placeholder: 'Any allergies or medical conditions we should know about' },
            { id: 'f_emergency_contact', label: 'Emergency Contact Name & Phone', type: 'text', required: true, placeholder: 'Name — Phone number' },
          ]),
        },
        {
          title: 'Young Leaders Summit 2026',
          theme: 'Raising Influencers',
          status: 'upcoming',
          date: '2026-10-03',
          end_date: '',
          time: '9:00 AM',
          end_time: '4:00 PM',
          location: 'Civic Centre, Victoria Island, Lagos',
          description: 'A one-day leadership summit for young professionals and students. Topics include purpose discovery, public speaking, financial intelligence, and kingdom impact in the marketplace.',
          image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200',
          registration_enabled: true,
          completion_message: '<p>You\'re registered for the Young Leaders Summit 2026! Check your email for event details. Follow us on Instagram for live updates.</p>',
          form_fields: JSON.stringify([
            { id: 'f_first_name', label: 'First Name', type: 'text', required: true, placeholder: 'First name' },
            { id: 'f_last_name', label: 'Last Name', type: 'text', required: true, placeholder: 'Last name' },
            { id: 'f_email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
            { id: 'f_phone', label: 'WhatsApp Number', type: 'tel', required: true, placeholder: '+234 800 000 0000' },
            { id: 'f_occupation', label: 'Occupation / Field of Study', type: 'text', required: true, placeholder: 'e.g. Student, Engineer, Entrepreneur' },
            { id: 'f_hear_about', label: 'How did you hear about this event?', type: 'select', required: true, placeholder: '', options: ['Church Announcement', 'Social Media', 'Friend/Family', 'School', 'Other'] },
            { id: 'f_topics', label: 'Which topics interest you? (select all that apply)', type: 'checkbox', required: false, placeholder: '', options: ['Purpose & Vision', 'Public Speaking', 'Financial Intelligence', 'Marketplace Ministry', 'Mental Health & Faith'] },
            { id: 'f_prayer_req', label: 'Prayer Request', type: 'textarea', required: false, placeholder: 'How can we pray for you?' },
          ]),
        },
        {
          title: 'Community Outreach — Medical Mission',
          theme: 'Love in Action',
          status: 'upcoming',
          date: '2026-11-21',
          end_date: '2026-11-22',
          time: '8:00 AM',
          end_time: '3:00 PM',
          location: 'Ikorodu Community Centre, Lagos',
          description: 'A two-day medical outreach providing free health screenings, basic medications, and health education to under-served communities. Volunteers needed — medical and non-medical.',
          image_url: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=1200',
          registration_enabled: true,
          completion_message: '<p>Thank you for signing up for the Medical Mission! We\'ll contact you with your assignment and meeting point. God bless you!</p>',
          form_fields: JSON.stringify([
            { id: 'f_name', label: 'Full Name', type: 'text', required: true, placeholder: 'Your full name' },
            { id: 'f_email', label: 'Email Address', type: 'email', required: true, placeholder: 'you@example.com' },
            { id: 'f_phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '+234 800 000 0000' },
            { id: 'f_role', label: 'Role', type: 'radio', required: true, placeholder: '', options: ['Medical Professional (Doctor/Nurse/Lab Tech)', 'Non-Medical Volunteer', 'Prayer Team', 'Logistics / Support'] },
            { id: 'f_availability', label: 'Which days can you serve?', type: 'checkbox', required: true, placeholder: '', options: ['Saturday 21st (Full Day)', 'Sunday 22nd (Full Day)', 'Both Days'] },
            { id: 'f_transport', label: 'Do you need transport to the venue?', type: 'radio', required: true, placeholder: '', options: ['Yes', 'No'] },
            { id: 'f_tshirt_size', label: 'T-Shirt Size', type: 'select', required: false, placeholder: '', options: ['S', 'M', 'L', 'XL', '2XL'] },
          ]),
        },
      ];

      for (const payload of testEvents) {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
      }

      toast.success(`Created ${testEvents.length} new test events with diverse arbitrary form fields.`);
      void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.SEED_DATA_ADDED, 'events', undefined, {
        type: 'test_events',
        titles: testEvents.map(e => e.title),
      });
      await loadAllData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to seed test events.');
    }
  };


  const seedTestRegistrations = async () => {
    const grp = regGroups.find(g => g.key === regSelectedGroupKey);
    let eventId: string | undefined;
    let eventTitle = 'Test Event';
    if (grp && grp.items.length && grp.items[0].event_id) {
      eventId = grp.items[0].event_id;
      eventTitle = grp.title;
    } else {
      // find any registration-enabled event
      const target = events.find(e => e.registration_enabled) || events[0];
      if (!target?.id) { toast.error('Create an event first.'); return; }
      eventId = target.id;
      eventTitle = target.title;
    }
    const samples = [
      { first_name: 'Grace', last_name: 'Adekunle', email: 'grace.a@example.com', phone: '+2348012345671', location: 'Lagos', note: 'Excited to attend!' },
      { first_name: 'Daniel', last_name: 'Okafor', email: 'daniel.o@example.com', phone: '+2348012345672', location: 'Abuja', note: 'Bringing 3 friends.' },
      { first_name: 'Blessing', last_name: 'Uche', email: 'blessing.u@example.com', phone: '+2348012345673', location: 'Port Harcourt', note: '' },
      { first_name: 'Samuel', last_name: 'Ibrahim', email: 'samuel.i@example.com', phone: '+2348012345674', location: 'Kano', note: 'Please pray for my family.' },
      { first_name: 'Faith', last_name: 'Adeyemi', email: 'faith.a@example.com', phone: '+2348012345675', location: 'Ibadan', note: 'First time joining.' },
    ];
    const payload = samples.map(s => ({
      ...s, event_id: eventId, event_title: eventTitle, program: eventTitle,
      form_data: JSON.stringify(s),
    }));
    const { error } = await supabase.from('registrations').insert(payload);
    if (error) { toast.error(`Seed failed: ${error.message}`); return; }
    toast.success('5 test registrations added.');
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.SEED_DATA_ADDED, 'registrations', undefined, {
      type: 'test_registrations',
      event_id: eventId,
      event_title: eventTitle,
      count: 5,
    });
    loadAllData();
  };

  const deleteRegistration = async (id: string) => {
    if (!confirm('Delete this registration?')) return;
    const reg = registrations.find(r => r.id === id);
    await supabase.from('registrations').delete().eq('id', id);
    toast.success('Registration deleted.');
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.REGISTRATION_DELETED, 'registrations', id, {
      event_title: reg?.event_title,
      email: reg?.email,
    });
    loadAllData();
  };

  /* ── Newsletter subscribers ──────────────────────────────────────────── */

  const filteredSubscribers = useMemo(() => {
    if (!subSearch.trim()) return subscribers;
    const q = subSearch.toLowerCase();
    return subscribers.filter(s =>
      `${s.email || ''} ${s.phone || ''} ${s.source || ''}`.toLowerCase().includes(q)
    );
  }, [subscribers, subSearch]);

  const deleteSubscriber = async (id: string) => {
    if (!confirm('Remove this subscriber from the newsletter list?')) return;
    const sub = subscribers.find(s => s.id === id);
    const { error } = await supabase.from('newsletter').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Subscriber removed.');
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.NEWSLETTER_SUBSCRIBER_DELETED, 'newsletter', id, {
      email: sub?.email,
    });
    loadAllData();
  };

  const exportSubscribersCSV = () => {
    if (!filteredSubscribers.length) { toast.error('No subscribers to export.'); return; }
    const headers = ['Email', 'Phone', 'Source', 'Subscribed At'];
    const rows = filteredSubscribers.map(s => [
      s.email || '', s.phone || '', s.source || '',
      new Date(s.created_at).toLocaleString(),
    ]);
    const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `newsletter-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported.');
  };

  const openBulkCompose = () => {
    const targets = filteredSubscribers
      .filter(s => !s.unsubscribed)
      .map(s => s.email)
      .filter(Boolean);
    if (!targets.length) { toast.error('No active (non-unsubscribed) subscribers to email.'); return; }
    setComposeMode('bulk');
    setComposeTargets(targets);
    setComposeSubject('');
    setComposeBody('');
    setComposeOpen(true);
  };

  const openIndividualCompose = (email: string) => {
    setComposeMode('individual');
    setComposeTargets([email]);
    setComposeSubject('');
    setComposeBody('');
    setComposeOpen(true);
  };

  const sendComposedEmail = async () => {
    if (!composeSubject.trim()) { toast.error('Subject is required.'); return; }
    if (!composeBody.trim()) { toast.error('Message body is required.'); return; }
    if (!composeTargets.length) { toast.error('No recipients.'); return; }
    setComposeSending(true);
    try {
      const html = composeBody.includes('<') && composeBody.includes('>')
        ? composeBody
        : `<p>${composeBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>`;
      const { data, error } = await supabase.functions.invoke('send-newsletter-email', {
        body: { subject: composeSubject.trim(), html, recipients: composeTargets, campaign_id: `bulk-${Date.now()}` },
      });
      if (error) throw error;
      if (data?.success === false) {
        toast.error(`Sent ${data.sent}/${data.total}. Errors: ${(data.errors || []).join('; ').slice(0, 200)}`);
      } else {
        toast.success(`Email sent to ${data?.sent ?? composeTargets.length} recipient(s).`);
        setComposeOpen(false);
      }
      void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.NEWSLETTER_SENT, 'newsletter', undefined, {
        mode: composeMode,
        recipient_count: composeTargets.length,
        subject: composeSubject.trim(),
        campaign_id: `bulk-${Date.now()}`,
      });
      loadAllData(); // refresh send logs
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email.');
    } finally {
      setComposeSending(false);
    }
  };

  /* ── Send test email (to admin only) ─────────────────────────────┘ */

  const sendTestEmail = async () => {
    if (!composeSubject.trim()) { toast.error('Subject is required.'); return; }
    if (!composeBody.trim()) { toast.error('Message body is required.'); return; }
    const adminEmail = session?.user?.email;
    if (!adminEmail) { toast.error('Cannot determine your email.'); return; }
    setTestEmailSending(true);
    try {
      const html = composeBody.includes('<') && composeBody.includes('>')
        ? composeBody
        : `<p>${composeBody.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>`;
      const { data, error } = await supabase.functions.invoke('send-newsletter-email', {
        body: { subject: composeSubject.trim(), html, recipients: [adminEmail], campaign_id: `test-${Date.now()}` },
      });
      if (error) throw error;
      if (data?.success === false) {
        toast.error(`Test send failed: ${(data.errors || []).join('; ').slice(0, 200)}`);
      } else {
        toast.success(`Test email sent to ${adminEmail}.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test email.');
    } finally {
      setTestEmailSending(false);
      loadAllData(); // refresh send logs
    }
  };

  /* ── Toggle subscriber unsubscribed status ─────────────────────── */

  const toggleUnsubscribe = async (sub: NewsletterSubscriber) => {
    const newVal = !sub.unsubscribed;
    const { error } = await supabase
      .from('newsletter')
      .update({
        unsubscribed: newVal,
        unsubscribed_at: newVal ? new Date().toISOString() : null,
      })
      .eq('id', sub.id);
    if (error) { toast.error(error.message); return; }
    toast.success(newVal ? 'Subscriber unsubscribed.' : 'Subscriber re-activated.');
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.NEWSLETTER_SUBSCRIBER_TOGGLED, 'newsletter', sub.id, {
      email: sub.email,
      now_unsubscribed: newVal,
    });
    loadAllData();
  };

  /* ── Update subscriber email/phone ─────────────────────────────── */

  const updateSubscriber = async () => {
    if (!subscriberEdit) return;
    if (!subscriberEdit.email.trim()) { toast.error('Email is required.'); return; }
    const { error } = await supabase
      .from('newsletter')
      .update({
        email: subscriberEdit.email.trim().toLowerCase(),
        phone: subscriberEdit.phone || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriberEdit.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Subscriber updated.');
    void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.NEWSLETTER_SUBSCRIBER_UPDATED, 'newsletter', subscriberEdit.id, {
      email: subscriberEdit.email,
    });
    setSubscriberEdit(null);
    loadAllData();
  };

  const getFormFields = (ev: EventRecord): FormFieldConfig[] => {
    try { return JSON.parse(ev.form_fields || '[]'); } catch { return []; }
  };

  /* ── Render preparation (moved before early return to comply with Rules of Hooks) ── */

  const inputCls = "bg-[#0F0D0A] border-[#2A2520] text-white placeholder:text-[#6B5E50] focus:border-[#E8620A]";
  const eventValidation = editEvent ? validateEventDateTime(editEvent) : { isValid: true };
  const summary = useMemo(() => summarizeAnalytics(analyticsEvents), [analyticsEvents]);
  const series = useMemo(() => aggregateAnalyticsSeries(analyticsEvents, analyticsGranularity), [analyticsEvents, analyticsGranularity]);
  const growth = useMemo(() => {
    const previousWindow = analyticsEvents.filter((event) => {
      if (!event.created_at) return false;
      const createdAt = new Date(event.created_at);
      const now = new Date();
      const rangeDays = analyticsRange === '7d' ? 7 : analyticsRange === '30d' ? 30 : analyticsRange === '90d' ? 90 : 30;
      const start = new Date(now);
      start.setDate(now.getDate() - rangeDays * 2);
      return createdAt >= start && createdAt < new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    });

    return getGrowthComparison(analyticsEvents, previousWindow);
  }, [analyticsEvents, analyticsRange]);

  const SortBtn = ({ col, label }: { col: keyof RegistrationRecord; label: string }) => (
    <button onClick={() => toggleSort(col)} className={`text-[10px] font-bold tracking-[1.5px] uppercase inline-flex items-center gap-1 ${regSort.col === col ? 'text-[#E8620A]' : 'text-[#6B5E50]'}`}>
      {label} <ArrowUpDown size={10} />
    </button>
  );

  /* ── Render: Auth Screen ─────────────────────────────────────────────── */

  if (!session) {
    return (
      <main className="min-h-screen bg-[#0F0D0A] flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-[#1A1814] border-[#E8620A]/20">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-['Playfair_Display'] text-white">Admin Login</CardTitle>
            <p className="text-sm text-[#B5A898] mt-1">Cherubs Cove Ministry</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-[#0F0D0A] border-[#2A2520] text-white placeholder:text-[#6B5E50]" />
            <div className="relative">
              <Input placeholder="Password" type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAuth()} className="bg-[#0F0D0A] border-[#2A2520] text-white placeholder:text-[#6B5E50] pr-10" />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5E50] hover:text-white">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button onClick={handleAuth} disabled={isLoading} className="w-full bg-[#E8620A] hover:bg-[#cf5709] text-white font-semibold">
              {isLoading ? 'Please wait…' : 'Sign In'}
            </Button>
            <p className="text-center text-xs text-[#6B5E50]">
              Admin access is invitation-only. Contact the super admin to be added.
            </p>
          </CardContent>
        </Card>
      </main>
    );
  }

  /* ── Render: Dashboard ───────────────────────────────────────────────── */

  return (
    <AdminErrorBoundary>
      <div className="min-h-screen bg-[#0F0D0A] text-white">
      <Navbar />
      <main className="pt-20 md:pt-24 pb-16 px-3 sm:px-4 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-['Playfair_Display'] text-white">Admin Dashboard</h1>
            <p className="text-[#B5A898] text-xs md:text-sm mt-0.5">{session.user.email}</p>
          </div>
          <Button variant="outline" onClick={handleSignOut} className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814] hover:text-white text-xs md:text-sm">
            <LogOut size={14} className="mr-1.5" /> Sign Out
          </Button>
        </div>

        <Card className="bg-[#1A1814] border-[#2A2520] mb-6 md:mb-8">
          <CardContent className="p-4 space-y-4">
            {/* ── Row 1: Developer Mode ─────────────────────────────── */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold text-white">Developer mode</h2>
                  <span className={`text-[10px] md:text-[11px] px-2 py-0.5 rounded-full font-semibold ${developerModeEnabled ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
                    {developerModeEnabled ? 'ON' : 'OFF'}
                  </span>
                </div>
                <p className="text-xs text-[#B5A898] mt-1">
                  {developerModeEnabled
                    ? 'Developer tools are unlocked. The console logging switch below is now usable.'
                    : 'Developer tools are locked. Turn this on only when you need to debug.'}
                </p>
              </div>
              <Button
                onClick={() => handleDeveloperModeToggle()}
                disabled={developerModeSaving}
                className={`w-full lg:w-auto lg:min-w-[200px] text-xs md:text-sm ${developerModeEnabled ? 'bg-red-700 hover:bg-red-800 text-white' : 'bg-emerald-700 hover:bg-emerald-800 text-white'}`}
              >
                {developerModeSaving ? 'Saving…' : developerModeEnabled ? <><EyeOff size={14} className="mr-1.5" /> Turn OFF developer mode</> : <><Eye size={14} className="mr-1.5" /> Turn ON developer mode</>}
              </Button>
            </div>

            <div className="border-t border-[#2A2520]" />

            {/* ── Row 2: Console Logging ────────────────────────────── */}
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold text-white">Browser console logs</h2>
                  <span className={`text-[10px] md:text-[11px] px-2 py-0.5 rounded-full font-semibold ${consoleLoggingEnabled ? 'bg-amber-900/40 text-amber-300' : 'bg-emerald-900/40 text-emerald-300'}`}>
                    {consoleLoggingEnabled ? 'VISIBLE' : 'SILENCED (secure)'}
                  </span>
                </div>
                <p className="text-xs text-[#B5A898] mt-1">
                  {consoleLoggingEnabled
                    ? 'Errors, warnings and debug messages are being printed to the browser console. Anyone opening DevTools can read them.'
                    : 'Nothing is printed to the browser console. Errors, warnings and code details are hidden from visitors — recommended for production.'}
                  {!developerModeEnabled && ' Enable developer mode above to change this.'}
                </p>
              </div>
              <Button
                onClick={() => handleConsoleLoggingToggle()}
                disabled={consoleToggleSaving || !developerModeEnabled}
                className={`w-full lg:w-auto lg:min-w-[200px] text-xs md:text-sm ${consoleLoggingEnabled ? 'bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50' : 'bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50'}`}
              >
                {consoleToggleSaving
                  ? 'Saving…'
                  : consoleLoggingEnabled
                    ? <><EyeOff size={14} className="mr-1.5" /> Silence console (secure)</>
                    : <><Eye size={14} className="mr-1.5" /> Show console logs</>}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3 md:gap-4 mb-6 md:mb-8">
          {[
            { icon: Calendar, label: 'Events', count: events.length, color: '#E8620A' },
            { icon: Download, label: 'Downloads', count: downloads.length, color: '#B07D35' },
            { icon: Image, label: 'Gallery', count: gallery.length, color: '#6B8F71' },
            { icon: ClipboardList, label: 'Registrations', count: registrations.length, color: '#5B8DEF' },
            { icon: Mail, label: 'Subscribers', count: subscribers.length, color: '#22C55E' },
            { icon: History, label: 'Audit Logs', count: auditLogs.length, color: '#7B68AE' },
            { icon: FileText, label: 'Content', count: CONTENT_DEFAULTS.length, color: '#D97706' },
            { icon: Settings, label: 'Settings', count: settingsMeta.filter(m => !CONTENT_DEFAULTS.some(cd => cd.key === m.key)).length, color: '#7B68AE' },
          ].map(s => (
            <Card key={s.label} className="bg-[#1A1814] border-[#2A2520]">
              <CardContent className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
                <div className="p-1.5 md:p-2 rounded-lg shrink-0" style={{ backgroundColor: s.color + '20' }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-lg md:text-2xl font-bold text-white leading-tight">{s.count}</p>
                  <p className="text-[10px] md:text-xs text-[#6B5E50] truncate">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="events" className="space-y-4 md:space-y-6">
          <TabsList className="bg-[#1A1814] border border-[#2A2520] p-1 flex flex-wrap h-auto gap-1 overflow-x-auto scrollbar-none">
            <TabsTrigger value="events" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898] text-xs md:text-sm whitespace-nowrap"><Calendar size={12} className="mr-1 md:mr-1.5 shrink-0" />Events</TabsTrigger>
            <TabsTrigger value="downloads" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898] text-xs md:text-sm whitespace-nowrap"><Download size={12} className="mr-1 md:mr-1.5 shrink-0" />Downloads</TabsTrigger>
            <TabsTrigger value="gallery" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898] text-xs md:text-sm whitespace-nowrap"><Image size={12} className="mr-1 md:mr-1.5 shrink-0" />Gallery</TabsTrigger>
            <TabsTrigger value="registrations" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898] text-xs md:text-sm whitespace-nowrap"><ClipboardList size={12} className="mr-1 md:mr-1.5 shrink-0" />Registrations</TabsTrigger>
            <TabsTrigger value="newsletter" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898] text-xs md:text-sm whitespace-nowrap"><Mail size={12} className="mr-1 md:mr-1.5 shrink-0" />Newsletter</TabsTrigger>
            <TabsTrigger value="content" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898] text-xs md:text-sm whitespace-nowrap"><FileText size={12} className="mr-1 md:mr-1.5 shrink-0" />Content</TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898] text-xs md:text-sm whitespace-nowrap"><BarChart3 size={12} className="mr-1 md:mr-1.5 shrink-0" />Analytics</TabsTrigger>
            <TabsTrigger value="audit" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898] text-xs md:text-sm whitespace-nowrap"><History size={12} className="mr-1 md:mr-1.5 shrink-0" />Audit Log</TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898] text-xs md:text-sm whitespace-nowrap"><Settings size={12} className="mr-1 md:mr-1.5 shrink-0" />Settings</TabsTrigger>
            <TabsTrigger value="seo" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898] text-xs md:text-sm whitespace-nowrap"><Search size={12} className="mr-1 md:mr-1.5 shrink-0" />SEO</TabsTrigger>
            <TabsTrigger value="admins" className="data-[state=active]:bg-[#E8620A] data-[state=active]:text-white text-[#B5A898] text-xs md:text-sm whitespace-nowrap"><Users size={12} className="mr-1 md:mr-1.5 shrink-0" />Admins</TabsTrigger>
          </TabsList>


          {/* ── Events Tab ───────────────────────────────────────────────── */}
          <TabsContent value="events" className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <h2 className="text-xl font-semibold">Events</h2>
              <div className="flex gap-2">
                <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
                <Button onClick={seedArbitraryTestEvent} variant="outline" className="border-[#E8620A]/60 text-[#E8620A] hover:bg-[#E8620A]/10"><Plus size={14} className="mr-1" /> Seed Arbitrary Test Event</Button>
                <Button onClick={() => setEditEvent({ ...emptyEvent })} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Plus size={16} className="mr-1" /> Add Event</Button>
              </div>
            </div>

            {editEvent && (
              <Card className="bg-[#1A1814] border-[#E8620A]/30">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-[#E8620A]">{editEvent.id ? 'Edit Event' : 'New Event'}</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="Event Title *" hint="e.g. Quiver's Conference 2026, Wednesday Weekly Meeting">
                      <Input placeholder="Event title" value={editEvent.title} onChange={e => setEditEvent({ ...editEvent, title: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Theme / Topic" hint="Optional — e.g. Envoys of Light, The Passion of Christ">
                      <Input placeholder="Theme (optional)" value={editEvent.theme || ''} onChange={e => setEditEvent({ ...editEvent, theme: e.target.value })} className={inputCls} />
                    </Field>
                    <select value={editEvent.status} onChange={e => setEditEvent({ ...editEvent, status: e.target.value })} className={`${inputCls} rounded-md px-3 py-2 border text-sm`}>
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                      <option value="recurring">Recurring</option>
                    </select>
                    <div>
                      <label className="text-[10px] text-[#6B5E50] uppercase tracking-wider">Start Date</label>
                      <Input type="date" value={editEvent.date} onChange={e => setEditEvent({ ...editEvent, date: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6B5E50] uppercase tracking-wider">End Date <span className="text-[#6B5E50]/70">(leave empty for single-day)</span></label>
                      <Input type="date" value={editEvent.end_date || ''} onChange={e => setEditEvent({ ...editEvent, end_date: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6B5E50] uppercase tracking-wider">Start Time</label>
                      <Input type="time" value={editEvent.time || ''} onChange={e => setEditEvent({ ...editEvent, time: e.target.value })} className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-[#6B5E50] uppercase tracking-wider">End Time</label>
                      <Input type="time" value={editEvent.end_time || ''} onChange={e => setEditEvent({ ...editEvent, end_time: e.target.value })} className={inputCls} />
                    </div>
                    <Input placeholder="Location" value={editEvent.location} onChange={e => setEditEvent({ ...editEvent, location: e.target.value })} className={`${inputCls} md:col-span-2`} />
                  </div>

                  <div className={`rounded-md border px-3 py-2 text-sm ${eventValidation.isValid ? 'border-[#2A2520] bg-[#0F0D0A] text-[#B5A898]' : 'border-red-500/40 bg-red-500/10 text-red-300'}`}>
                    {eventValidation.isValid
                      ? (editEvent.end_date && editEvent.end_date !== editEvent.date
                        ? 'Multi-day events can use separate start and end dates, while one-day events can leave the end date blank.'
                        : 'Use the start and end time fields for one-day events. Multi-day events can keep the same time range across the full span.')
                      : eventValidation.message}
                  </div>

                  {/* Image: file upload OR URL */}
                  <div className="border border-[#2A2520] rounded-lg p-4 space-y-3">
                    <label className="text-sm font-medium text-[#B5A898]">Event Image</label>
                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                      <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#E8620A] hover:bg-[#cf5709] text-white rounded-md text-sm font-medium">
                        {uploadingImage ? 'Uploading…' : 'Upload File'}
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingImage}
                          onChange={e => e.target.files?.[0] && uploadEventImage(e.target.files[0])} />
                      </label>
                      <span className="text-xs text-[#6B5E50]">or paste an image URL</span>
                    </div>
                    <Input placeholder="https://…" value={editEvent.image_url} onChange={e => setEditEvent({ ...editEvent, image_url: e.target.value })} className={inputCls} />
                    {editEvent.image_url && <img src={normalizeImageUrl(editEvent.image_url)} alt="Preview" className="w-40 h-28 object-cover rounded-md border border-[#2A2520]" />}
                  </div>

                  <Textarea placeholder="Description" value={editEvent.description} onChange={e => setEditEvent({ ...editEvent, description: e.target.value })} className={inputCls} rows={3} />


                  {/* Registration Toggle */}
                  <div className="border border-[#2A2520] rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-[#B5A898]">Enable Registration</label>
                        <p className="text-xs text-[#6B5E50]">Allow people to register for this event on the website</p>
                      </div>
                      <button
                        onClick={() => setEditEvent({ ...editEvent, registration_enabled: !editEvent.registration_enabled })}
                        className={`transition-colors ${editEvent.registration_enabled ? 'text-green-400' : 'text-[#6B5E50]'}`}
                      >
                        {editEvent.registration_enabled ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                      </button>
                    </div>

                    {editEvent.registration_enabled && (
                      <>
                        <div className="rounded-md border border-[#2A2520] bg-[#0F0D0A] p-3 text-sm text-[#B5A898]">
                          <div className="text-[10px] font-semibold uppercase tracking-[2px] text-[#E8620A]">Public registration page</div>
                          {editEvent.id ? (
                            <a href={buildEventRegistrationLink(editEvent)} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center text-[#E8620A] hover:underline">
                              {buildEventRegistrationLink(editEvent)}
                            </a>
                          ) : (
                            <p className="mt-1">Save this event first to generate a dedicated public registration page.</p>
                          )}
                        </div>
                        <FormFieldBuilder
                          fields={getFormFields(editEvent)}
                          onChange={(fields) => setEditEvent({ ...editEvent, form_fields: JSON.stringify(fields) })}
                        />
                        {/* ── Completion Message ──────────────────────────── */}
                        <div className="border border-[#2A2520] rounded-lg p-4">
                          <label className="text-sm font-medium text-[#B5A898] block mb-1">Completion Message</label>
                          <p className="text-xs text-[#6B5E50] mb-2">
                            What visitors see after registering successfully. Leave blank to use the global default. Supports HTML — e.g. add a link to join your WhatsApp group.
                          </p>
                          <Textarea
                            placeholder={contentValues['registration_completion_default'] || 'Registration submitted successfully. Thank you!'}
                            value={editEvent.completion_message || ''}
                            onChange={e => setEditEvent({ ...editEvent, completion_message: e.target.value })}
                            className={inputCls}
                            rows={3}
                          />
                          {editEvent.completion_message && (
                            <div className="mt-2 rounded-md bg-[#2A2520]/50 p-3 text-xs text-[#B5A898]">
                              <div className="text-[9px] font-bold uppercase tracking-[1.5px] text-[#6B5E50] mb-1">Preview:</div>
                              <div dangerouslySetInnerHTML={{ __html: editEvent.completion_message }} />
                            </div>
                          )}
                        </div>

                        {/* ── Newsletter opt-in toggle ─────────────────── */}
                        <div className="border border-[#2A2520] rounded-lg p-4 flex items-center justify-between gap-3">
                          <div>
                            <label className="text-sm font-medium text-[#B5A898]">Ask registrants to join newsletter</label>
                            <p className="text-xs text-[#6B5E50]">Shows an opt-in checkbox on this event's form. Opted-in emails (and phone if provided) are saved to the Newsletter list.</p>
                          </div>
                          <button
                            onClick={() => setEditEvent({ ...editEvent, newsletter_opt_in_enabled: !(editEvent.newsletter_opt_in_enabled ?? true) })}
                            className={`transition-colors ${(editEvent.newsletter_opt_in_enabled ?? true) ? 'text-green-400' : 'text-[#6B5E50]'}`}
                          >
                            {(editEvent.newsletter_opt_in_enabled ?? true) ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                          </button>
                        </div>
                      </>
                    )}
                  </div>


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
                        {ev.theme && <span className="text-xs italic text-[#B5A898]">"{ev.theme}"</span>}
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ev.status === 'upcoming' ? 'bg-green-900/40 text-green-400' : ev.status === 'recurring' ? 'bg-blue-900/40 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>{ev.status}</span>
                        {ev.registration_enabled && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8620A]/20 text-[#E8620A]">Registration Open</span>
                        )}
                      </div>
                      <p className="text-sm text-[#6B5E50] mt-0.5">{formatEventDateRange(ev) || 'No date set'}{ev.location && ` • ${ev.location}`}</p>
                      {ev.registration_enabled && (
                        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-[#B5A898]">
                          <span>{getFormFields(ev).length} form field(s)</span>
                          <a href={buildEventRegistrationLink(ev)} target="_blank" rel="noreferrer" className="text-[#E8620A] hover:underline">
                            Open registration page
                          </a>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button size="sm" variant="ghost" onClick={() => toggleEventRegistration(ev)} className={ev.registration_enabled ? 'text-green-400 hover:text-green-300' : 'text-[#6B5E50] hover:text-white'} title={ev.registration_enabled ? 'Disable registration' : 'Enable registration'}>
                        {ev.registration_enabled ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditEvent({ ...ev })} className="text-[#B5A898] hover:text-white"><Edit2 size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteEvent(ev.id!)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Analytics Tab ────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Analytics</h2>
                <p className="text-sm text-[#B5A898]">Track unique visitors, page views, device types, exit pages, and user activity with flexible time ranges.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <select value={analyticsRange} onChange={(e) => setAnalyticsRange(e.target.value as AnalyticsRange)} className={`${inputCls} rounded-md px-3 py-2 border text-sm`}>
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="custom">Custom range</option>
                </select>
                <select value={analyticsGranularity} onChange={(e) => setAnalyticsGranularity(e.target.value as AnalyticsGranularity)} className={`${inputCls} rounded-md px-3 py-2 border text-sm`}>
                  <option value="day">By day</option>
                  <option value="week">By week</option>
                  <option value="month">By month</option>
                </select>
                <Button onClick={() => void loadAnalytics()} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh analytics"><RefreshCw size={14} /></Button>
              </div>
            </div>

            {analyticsRange === 'custom' && (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#6B5E50]">Start date</label>
                  <Input type="date" value={analyticsCustomStart} onChange={(e) => setAnalyticsCustomStart(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#6B5E50]">End date</label>
                  <Input type="date" value={analyticsCustomEnd} onChange={(e) => setAnalyticsCustomEnd(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
              {[
                { label: 'Page views', value: summary.totalPageViews, change: growth.pageViewsGrowth, accent: '#E8620A' },
                { label: 'Unique visitors', value: summary.uniqueVisitors, change: growth.visitsGrowth, accent: '#5B8DEF' },
                { label: 'Downloads', value: summary.totalDownloads, change: growth.downloadsGrowth, accent: '#B07D35' },
                { label: 'Gallery views', value: summary.totalGalleryViews, change: growth.galleryViewsGrowth, accent: '#6B8F71' },
              ].map((item) => (
                <Card key={item.label} className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-3 md:p-4">
                    <p className="text-[9px] md:text-[10px] uppercase tracking-[2px] text-[#6B5E50]">{item.label}</p>
                    <p className="text-xl md:text-2xl font-semibold text-white mt-1 md:mt-2">{item.value}</p>
                    <p className={`text-[11px] md:text-xs mt-1 md:mt-2 ${item.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {item.change >= 0 ? '+' : ''}{item.change}% vs previous
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Device breakdown ──────────────────────────────────── */}
            <Card className="bg-[#1A1814] border-[#2A2520]">
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold text-white mb-3">Devices</h3>
                {summary.uniqueVisitors > 0 ? (
                  <div className="flex flex-wrap gap-4">
                    {[
                      { label: 'Mobile', count: summary.deviceBreakdown.mobile, color: 'bg-emerald-500' },
                      { label: 'Desktop', count: summary.deviceBreakdown.desktop, color: 'bg-blue-500' },
                      { label: 'Tablet', count: summary.deviceBreakdown.tablet, color: 'bg-purple-500' },
                      { label: 'Unknown', count: summary.deviceBreakdown.unknown, color: 'bg-gray-500' },
                    ].filter(d => d.count > 0).map(d => {
                      const total = summary.deviceBreakdown.mobile + summary.deviceBreakdown.desktop + summary.deviceBreakdown.tablet + summary.deviceBreakdown.unknown;
                      const pct = total > 0 ? Math.round((d.count / total) * 100) : 0;
                      return (
                        <div key={d.label} className="flex items-center gap-2.5 rounded-lg border border-[#2A2520] bg-[#0F0D0A] px-4 py-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${d.color}`} />
                          <span className="text-sm text-[#B5A898]">{d.label}</span>
                          <span className="text-sm font-semibold text-white">{d.count}</span>
                          <span className="text-[11px] text-[#6B5E50]">({pct}%)</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-[#6B5E50]">No device data yet.</p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-[#1A1814] border-[#2A2520]">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Trend</h3>
                  <span className="text-xs text-[#6B5E50]">{analyticsGranularity === 'day' ? 'Daily' : analyticsGranularity === 'week' ? 'Weekly' : 'Monthly'} view</span>
                </div>
                <div className="space-y-2">
                  {(showAllTrend ? series : series.slice(0, 10)).map((point) => (
                    <div key={point.date} className="rounded-lg border border-[#2A2520] bg-[#0F0D0A] p-3">
                      <div className="flex items-center justify-between text-sm text-[#B5A898] gap-3">
                        <span>{point.date}</span>
                        <span className="text-right">{point.page_views} views • {point.gallery_views} galleries • {point.downloads} downloads</span>
                      </div>
                    </div>
                  ))}
                </div>
                {series.length > 10 && (
                  <button
                    onClick={() => setShowAllTrend(!showAllTrend)}
                    className="w-full text-center text-xs text-[#E8620A] hover:text-[#ff7a22] transition-colors pt-1"
                  >
                    {showAllTrend ? 'Show less' : `View all (${series.length})`}
                  </button>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="bg-[#1A1814] border-[#2A2520]">
                <CardHeader>
                  <CardTitle className="text-white">Top pages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {summary.topPages.length ? (
                    <>
                      {(showAllTopPages ? summary.topPages : summary.topPages.slice(0, 5)).map((item) => (
                        <div key={item.path} className="flex items-center justify-between rounded-lg border border-[#2A2520] bg-[#0F0D0A] px-3 py-2 text-sm text-[#B5A898]">
                          <span>{item.path}</span>
                          <span className="text-white">{item.count}</span>
                        </div>
                      ))}
                      {summary.topPages.length > 5 && (
                        <button
                          onClick={() => setShowAllTopPages(!showAllTopPages)}
                          className="w-full text-center text-xs text-[#E8620A] hover:text-[#ff7a22] transition-colors pt-1"
                        >
                          {showAllTopPages ? 'Show less' : `View all (${summary.topPages.length})`}
                        </button>
                      )}
                    </>
                  ) : <p className="text-sm text-[#6B5E50]">No page data yet.</p>}
                </CardContent>
              </Card>
              <Card className="bg-[#1A1814] border-[#2A2520]">
                <CardHeader>
                  <CardTitle className="text-white">Exit pages</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {summary.exitPages.length ? (
                    <>
                      {(showAllExitPages ? summary.exitPages : summary.exitPages.slice(0, 10)).map((item) => (
                        <div key={item.path} className="flex items-center justify-between rounded-lg border border-[#2A2520] bg-[#0F0D0A] px-3 py-2 text-sm text-[#B5A898]">
                          <span>{item.path}</span>
                          <span className="text-white">{item.count} exits</span>
                        </div>
                      ))}
                      {summary.exitPages.length > 10 && (
                        <button
                          onClick={() => setShowAllExitPages(!showAllExitPages)}
                          className="w-full text-center text-xs text-[#E8620A] hover:text-[#ff7a22] transition-colors pt-1"
                        >
                          {showAllExitPages ? 'Show less' : `View all (${summary.exitPages.length})`}
                        </button>
                      )}
                    </>
                  ) : <p className="text-sm text-[#6B5E50]">Not enough data yet (requires session tracking).</p>}
                </CardContent>
              </Card>
            </div>

            {/* ── User Activities ────────────────────────────────────── */}
            <Card className="bg-[#1A1814] border-[#2A2520]">
              <CardHeader>
                <CardTitle className="text-white">User activities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {summary.userActivities.length ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-[2px] text-[#6B5E50] border-b border-[#2A2520]">
                          <th className="text-left py-2 pr-3">Session</th>
                          <th className="text-left py-2 pr-3">Pages visited</th>
                          <th className="text-left py-2 pr-3">Events</th>
                          <th className="text-left py-2 pr-3">Device</th>
                          <th className="text-left py-2">First seen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(showAllActivities ? summary.userActivities : summary.userActivities.slice(0, 20)).map((act) => (
                          <tr key={act.session_id} className="border-b border-[#2A2520]/50 text-[#B5A898]">
                            <td className="py-2 pr-3 font-mono text-[10px]">{act.session_id.slice(0, 16)}…</td>
                            <td className="py-2 pr-3">{act.pages.slice(0, 3).join(', ')}{act.pages.length > 3 ? ` +${act.pages.length - 3} more` : ''}</td>
                            <td className="py-2 pr-3 text-white">{act.event_count}</td>
                            <td className="py-2 pr-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${
                                act.device_type === 'mobile' ? 'bg-emerald-500/20 text-emerald-400' :
                                act.device_type === 'desktop' ? 'bg-blue-500/20 text-blue-400' :
                                act.device_type === 'tablet' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {act.device_type}
                              </span>
                            </td>
                            <td className="py-2 text-[11px]">{act.start_time ? new Date(act.start_time).toLocaleString() : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {summary.userActivities.length > 20 && (
                      <button
                        onClick={() => setShowAllActivities(!showAllActivities)}
                        className="w-full text-center text-xs text-[#E8620A] hover:text-[#ff7a22] transition-colors pt-2"
                      >
                        {showAllActivities ? 'Show less' : `View all (${summary.userActivities.length})`}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#6B5E50]">No session data yet. Session IDs will be tracked from now on.</p>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="bg-[#1A1814] border-[#2A2520]">
                <CardHeader>
                  <CardTitle className="text-white">Top downloads & galleries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[2px] text-[#6B5E50] mb-2">Popular downloads</p>
                    {summary.topDownloads.length ? (
                      <>
                        {(showAllDownloads ? summary.topDownloads : summary.topDownloads.slice(0, 5)).map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border border-[#2A2520] bg-[#0F0D0A] px-3 py-2 text-sm text-[#B5A898]">
                            <span>{item.id}</span>
                            <span className="text-white">{item.count}</span>
                          </div>
                        ))}
                        {summary.topDownloads.length > 5 && (
                          <button
                            onClick={() => setShowAllDownloads(!showAllDownloads)}
                            className="w-full text-center text-xs text-[#E8620A] hover:text-[#ff7a22] transition-colors pt-1"
                          >
                            {showAllDownloads ? 'Show less' : `View all (${summary.topDownloads.length})`}
                          </button>
                        )}
                      </>
                    ) : <p className="text-sm text-[#6B5E50]">No downloads yet.</p>}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[2px] text-[#6B5E50] mb-2">Popular galleries</p>
                    {summary.topGalleries.length ? (
                      <>
                        {(showAllGalleries ? summary.topGalleries : summary.topGalleries.slice(0, 5)).map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded-lg border border-[#2A2520] bg-[#0F0D0A] px-3 py-2 text-sm text-[#B5A898]">
                            <span>{item.id}</span>
                            <span className="text-white">{item.count}</span>
                          </div>
                        ))}
                        {summary.topGalleries.length > 5 && (
                          <button
                            onClick={() => setShowAllGalleries(!showAllGalleries)}
                            className="w-full text-center text-xs text-[#E8620A] hover:text-[#ff7a22] transition-colors pt-1"
                          >
                            {showAllGalleries ? 'Show less' : `View all (${summary.topGalleries.length})`}
                          </button>
                        )}
                      </>
                    ) : <p className="text-sm text-[#6B5E50]">No gallery data yet.</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Downloads Tab ────────────────────────────────────────────── */}
          <TabsContent value="downloads" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Downloads</h2>
              <div className="flex gap-2">
                <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
                <Button onClick={() => setEditDownload({ ...emptyDownload })} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Plus size={16} className="mr-1" /> Add Download</Button>
              </div>
            </div>
            {editDownload && (
              <Card className="bg-[#1A1814] border-[#E8620A]/30">
                <CardContent className="p-5 space-y-3">
                  <h3 className="font-semibold text-[#E8620A]">{editDownload.id ? 'Edit Download' : 'New Download'}</h3>
                  <div className="grid md:grid-cols-2 gap-3">
                    <Field label="File Title *" hint="Displayed as the download's name on the site">
                      <Input placeholder="e.g. Walking in Your Kingdom Identity" value={editDownload.title} onChange={e => setEditDownload({ ...editDownload, title: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Download URL *" hint="Direct link to the file (mp3, mp4, pdf, YouTube, Drive, etc.)">
                      <Input placeholder="https://…" value={editDownload.url} onChange={e => setEditDownload({ ...editDownload, url: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Category" hint="Grouping label, e.g. Sermon, Teaching, Manual">
                      <Input placeholder="Sermon" value={editDownload.category} onChange={e => setEditDownload({ ...editDownload, category: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="File Type" hint="Icon shown on the frontend card">
                      <select value={editDownload.type} onChange={e => setEditDownload({ ...editDownload, type: e.target.value })} className={`${inputCls} rounded-md px-3 py-2 border text-sm w-full`}>
                        <option value="">Select type…</option>
                        <option value="audio">Audio</option>
                        <option value="video">Video</option>
                        <option value="pdf">PDF / Document</option>
                      </select>
                    </Field>
                  </div>
                  <Field label="Description" hint="Short line shown under the title (speaker, event, series…)">
                    <Textarea placeholder="Jesse Falodun — Quiver's Immersion 2025" value={editDownload.description} onChange={e => setEditDownload({ ...editDownload, description: e.target.value })} className={inputCls} rows={2} />
                  </Field>
                  <div className="flex gap-2">
                    <Button onClick={saveDownload} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} className="mr-1" /> Save</Button>
                    <Button variant="outline" onClick={() => setEditDownload(null)} className="border-[#2A2520] text-[#B5A898]"><X size={14} className="mr-1" /> Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {downloads.length === 0 && !editDownload && <p className="text-[#6B5E50] text-center py-8">No downloads yet.</p>}
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

          {/* ── Gallery Tab (gallery-first) ─────────────────────────────── */}
          <TabsContent value="gallery" className="space-y-4">
            {!selectedGallery ? (
              <>
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Galleries</h2>
                    <p className="text-sm text-[#6B5E50]">Create a gallery, then click into it to upload images.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
                    <Button onClick={() => setEditCollection({ id: '', name: '', description: '' })} className="bg-[#E8620A] hover:bg-[#cf5709] text-white">
                      <Plus size={16} className="mr-1" /> New Gallery
                    </Button>
                  </div>
                </div>

                {editCollection && (
                  <Card className="bg-[#1A1814] border-[#E8620A]/30">
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-semibold text-[#E8620A]">{editCollection.id ? 'Edit Gallery' : 'New Gallery'}</h3>
                      <Field label="Gallery Name *" hint="Shown as the heading on the Past Conferences page.">
                        <Input placeholder="e.g. Quiver's Immersion 2025" value={editCollection.name} onChange={e => setEditCollection({ ...editCollection, name: e.target.value })} className={inputCls} />
                      </Field>
                      <Field label="Description" hint="Optional short description.">
                        <Textarea rows={2} value={editCollection.description || ''} onChange={e => setEditCollection({ ...editCollection, description: e.target.value })} className={inputCls} />
                      </Field>
                      <div className="flex gap-2">
                        <Button onClick={async () => {
                          const name = editCollection.name.trim();
                          if (!name) { toast.error('Name required.'); return; }
                          let next: GalleryCollection[];
                          if (editCollection.id) {
                            const oldName = galleries.find(g => g.id === editCollection.id)?.name;
                            next = galleries.map(g => g.id === editCollection.id ? { ...editCollection, name } : g);
                            // Rename category + image titles if name changed
                            if (oldName && oldName !== name) {
                              await supabase.from('gallery').update({ category: name }).eq('category', oldName);
                              // Update image titles to reflect new gallery abbreviation (preserve existing indices)
                              const { data: imgs } = await supabase
                                .from('gallery')
                                .select('id, title')
                                .eq('category', name)
                                .order('created_at', { ascending: true });
                              if (imgs) {
                                const newAbbr = generateGalleryAbbreviation(name);
                                for (const img of imgs) {
                                  const oldTitle = img.title || '';
                                  const match = oldTitle.match(/-(\d{3})$/);
                                  const num = match ? match[1] : '001';
                                  const newTitle = `${newAbbr}-${num}`;
                                  await supabase.from('gallery').update({ title: newTitle }).eq('id', img.id);
                                }
                              }
                            }
                          } else {
                            const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6);
                            next = [...galleries, { ...editCollection, id, name }];
                          }
                          await persistGalleries(next);
                          setEditCollection(null);
                          loadAllData();
                          toast.success('Gallery saved.');
                          void logAuditAction(session?.user?.email ?? '', editCollection.id ? AUDIT_ACTIONS.GALLERY_UPDATED : AUDIT_ACTIONS.GALLERY_CREATED, 'galleries', editCollection.id || undefined, {
                            name: editCollection.name,
                            description: editCollection.description,
                          });
                        }} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} className="mr-1" /> Save</Button>
                        <Button variant="outline" onClick={() => setEditCollection(null)} className="border-[#2A2520] text-[#B5A898]"><X size={14} className="mr-1" /> Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {galleries.length === 0 && !editCollection && (
                  <p className="text-[#6B5E50] text-center py-8">No galleries yet. Click "New Gallery" to create one.</p>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {galleries.map(col => {
                    const imgs = gallery.filter(g => {
                      const category = (g.category || '').trim();
                      return category === col.id || category === col.name;
                    });
                    const cover = imgs.find(i => (i as any).featured) || imgs.find(i => i.image_url);
                    return (
                      <Card key={col.id} className="bg-[#1A1814] border-[#2A2520] overflow-hidden">
                        <button onClick={() => setSelectedGalleryId(col.id)} className="block w-full text-left">
                          <div className="aspect-video bg-[#0F0D0A] relative">
                            {cover?.image_url
                              ? <img src={normalizeImageUrl(cover.image_url!)} alt={col.name} className="w-full h-full object-cover" />
                              : <div className="flex items-center justify-center h-full text-[#2A2520]"><Image size={40} /></div>}
                            <div className="absolute top-2 right-2 bg-[#E8620A] text-white text-xs font-bold px-2 py-0.5 rounded-full">{imgs.length}</div>
                          </div>
                          <CardContent className="p-3">
                            <h4 className="font-semibold text-white truncate">{col.name}</h4>
                            {col.description && <p className="text-xs text-[#6B5E50] truncate">{col.description}</p>}
                          </CardContent>
                        </button>
                        <div className="flex gap-1 px-3 pb-3">
                          <Button size="sm" variant="ghost" onClick={() => setEditCollection({ ...col })} className="text-[#B5A898] hover:text-white h-7 px-2"><Edit2 size={12} /></Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            if (!confirm(`Delete gallery "${col.name}"? Images inside will become uncategorized.`)) return;
                            await persistGalleries(galleries.filter(g => g.id !== col.id));
                            toast.success('Gallery deleted.');
                            void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.GALLERY_DELETED, 'galleries', col.id, {
                              name: col.name,
                            });
                          }} className="text-red-400 hover:text-red-300 h-7 px-2"><Trash2 size={12} /></Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>

                {/* Standalone / uncategorized images */}
                {gallery.some(g => {
                    const category = (g.category || '').trim();
                    return !category || !galleries.some(gc => gc.id === category || gc.name === category);
                  }) && (
                  <div className="pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold tracking-[2px] uppercase text-[#6B5E50]">Unassigned Images</h3>
                      <button
                        type="button"
                        onClick={() => {
                          const uncatIds = gallery.filter(g => {
                            const cat = (g.category || '').trim();
                            return !cat || !galleries.some(gc => gc.id === cat || gc.name === cat);
                          }).map(g => g.id).filter(Boolean) as string[];
                          selectAllImages(uncatIds);
                        }}
                        className="text-[10px] tracking-[1px] uppercase text-[#E8620A] hover:text-[#cf5709] font-semibold"
                      >
                        {(() => {
                          const uncatIds = gallery.filter(g => {
                            const cat = (g.category || '').trim();
                            return !cat || !galleries.some(gc => gc.id === cat || gc.name === cat);
                          }).map(g => g.id!).filter(Boolean);
                          const allSelected = uncatIds.length > 0 && uncatIds.every(id => selectedImageIds.has(id));
                          return allSelected ? 'Deselect All' : 'Select All';
                        })()}
                      </button>
                    </div>

                    {/* ── Bulk action toolbar for uncategorized ────────── */}
                    {selectedImageIds.size > 0 && (
                      <Card className="bg-[#1A1814] border-[#E8620A]/50 mb-3">
                        <CardContent className="p-4 flex flex-wrap items-center gap-3">
                          <span className="text-sm text-white font-medium">{selectedImageIds.size} selected</span>
                          <div className="flex items-center gap-2 flex-wrap">
                            <select
                              value={bulkCategoryTarget}
                              onChange={e => setBulkCategoryTarget(e.target.value)}
                              className={`${inputCls} rounded-md px-3 py-1.5 border text-sm`}
                            >
                              <option value="">Move to category…</option>
                              {galleries.map(gc => (
                                <option key={gc.id} value={gc.id}>{gc.name}</option>
                              ))}
                            </select>
                            <Button size="sm" onClick={bulkMoveImages} disabled={!bulkCategoryTarget} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><FolderInput size={14} className="mr-1" /> Move</Button>
                            <Button size="sm" variant="outline" onClick={bulkDeleteImages} className="border-red-800 text-red-400 hover:bg-red-900/20"><Trash2 size={14} className="mr-1" /> Delete</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedImageIds(new Set()); setBulkCategoryTarget(''); }} className="text-[#6B5E50]"><X size={14} /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {gallery.filter(g => {
                        const category = (g.category || '').trim();
                        return !category || !galleries.some(gc => gc.id === category || gc.name === category);
                      }).map(g => (
                        <Card key={g.id} className="bg-[#1A1814] border-yellow-800/40 overflow-hidden relative">
                          {/* Selection checkbox */}
                          <button
                            type="button"
                            onClick={() => toggleSelectImage(g.id!)}
                            className="absolute top-2 left-2 z-10 p-1 rounded-md bg-black/60 hover:bg-black/80 transition-colors"
                          >
                            {selectedImageIds.has(g.id!) ? <CheckSquare size={16} className="text-[#E8620A]" /> : <Square size={16} className="text-white/80" />}
                          </button>
                          <div className="aspect-video bg-[#0F0D0A]">
                            {g.image_url ? <img src={normalizeImageUrl(g.image_url)} alt={g.alt_text || g.title || 'Gallery photo'} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-[#2A2520]"><Image size={24} /></div>}
                          </div>
                          <CardContent className="p-2">
                            <h4 className="text-xs font-semibold text-white truncate">{g.title}</h4>
                            <div className="flex gap-1 mt-1">
                              <Button size="sm" variant="ghost" onClick={() => setEditGallery({ ...g })} className="text-[#B5A898] h-6 px-1"><Edit2 size={10} /></Button>
                              <Button size="sm" variant="ghost" onClick={() => deleteGallery(g.id!)} className="text-red-400 h-6 px-1"><Trash2 size={10} /></Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {/* Gallery detail view */}
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedGalleryId(null); setEditGallery(null); setBulkAddMode(false); setBulkUrls(''); setBulkCategoryTarget(''); }} className="border-[#2A2520] text-[#B5A898]">← Back</Button>
                    <div>
                      <h2 className="text-xl font-semibold">{selectedGallery.name}</h2>
                      <p className="text-xs text-[#6B5E50]">{imagesInSelectedGallery.length} image{imagesInSelectedGallery.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
                    <Button
                      onClick={() => { setBulkAddMode(false); setBulkCategoryTarget(''); setEditGallery({ ...emptyGallery, category: selectedGallery.id }); }}
                      className="bg-[#E8620A] hover:bg-[#cf5709] text-white"
                    >
                      <Plus size={16} className="mr-1" /> Add Image
                    </Button>
                    <Button
                      onClick={() => { setBulkAddMode(true); setEditGallery(null); setBulkUrls(''); }}
                      variant={bulkAddMode ? 'default' : 'outline'}
                      className={bulkAddMode ? 'bg-[#E8620A] hover:bg-[#cf5709] text-white' : 'border-[#2A2520] text-[#B5A898]'}
                    >
                      <Image size={16} className="mr-1" /> Bulk Add
                    </Button>
                  </div>
                </div>

                {/* ── Bulk add mode ──────────────────────────────────────── */}
                {bulkAddMode && (
                  <Card className="bg-[#1A1814] border-[#E8620A]/30">
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-semibold text-[#E8620A]">Bulk Import Images — <span className="text-white/70">{selectedGallery.name}</span></h3>
                      <p className="text-xs text-[#6B5E50]">Paste one URL per line. Titles and alt text will be auto-generated from filenames. You can edit them individually afterward.</p>
                      <Field label="Target Category" hint="All imported images will be assigned to this category.">
                        <select
                          value={bulkCategoryTarget || selectedGallery?.id || ''}
                          onChange={e => setBulkCategoryTarget(e.target.value)}
                          className={`${inputCls} rounded-md px-3 py-2 border text-sm w-full`}
                        >
                          <option value="">— Use current gallery —</option>
                          {galleries.map(gc => (
                            <option key={gc.id} value={gc.id}>{gc.name}</option>
                          ))}
                          <option value="__none__">— Uncategorized —</option>
                        </select>
                      </Field>
                      <Textarea
                        rows={8}
                        placeholder={
                          'https://drive.google.com/file/d/abc123/view\n' +
                          'https://drive.google.com/file/d/def456/view\n' +
                          'https://images.unsplash.com/photo-abc'
                        }
                        value={bulkUrls}
                        onChange={e => setBulkUrls(e.target.value)}
                        className={inputCls}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={async () => {
                            const urls = bulkUrls.split('\n').map(s => s.trim()).filter(Boolean);
                            if (!urls.length) { toast.error('Paste at least one URL.'); return; }
                            setImportingBulk(true);
                            let success = 0;
                            let uncategorizedCount = 0;
                            let hasAltColumn = true;
                            // Pre-compute the first available index for stable numbering
                            const catForBulk = bulkCategoryTarget && bulkCategoryTarget !== '__none__'
                              ? bulkCategoryTarget
                              : (selectedGallery?.id || '');
                            const galForBulk = galleries.find(g => g.id === catForBulk || g.name === catForBulk);
                            const bulkAbbr = galForBulk ? generateGalleryAbbreviation(galForBulk.name) : 'Uncategorized';
                            const existingBulkTitles = catForBulk
                              ? gallery.filter(g => {
                                  const c = (g.category || '').trim();
                                  return c === catForBulk || c === (galForBulk?.name || '');
                                })
                              : gallery.filter(g => {
                                  const c = (g.category || '').trim();
                                  return !c || !galleries.some(gc => gc.id === c || gc.name === c);
                                });
                            let bulkNextIdx = 1;
                            for (const img of existingBulkTitles) {
                              const t = img.title || '';
                              if (t.startsWith(bulkAbbr)) {
                                const match = t.match(/-(\d{3})$/);
                                if (match) {
                                  const idx = parseInt(match[1], 10);
                                  if (idx >= bulkNextIdx) bulkNextIdx = idx + 1;
                                }
                              }
                            }
                            for (const url of urls) {
                              // Gallery-based title for bulk imports
                              let title = titleFromUrl(url);
                              if (!title) {
                                title = `${bulkAbbr}-${String(bulkNextIdx).padStart(3, '0')}`;
                                bulkNextIdx++;
                              }
                              const row: Record<string, string> = {
                                title,
                                image_url: normalizeImageUrl(url),
                                caption: '',
                              };
                              let effectiveCategory = bulkCategoryTarget;
                              if (effectiveCategory === '__none__') effectiveCategory = '';
                              if (!effectiveCategory && selectedGallery?.id) effectiveCategory = selectedGallery.id;
                              if (effectiveCategory) row.category = effectiveCategory;
                              if (hasAltColumn) row.alt_text = `Photo: ${title}`;

                              const tryInsert = async (data: Record<string, string>) => await supabase.from('gallery').insert(data as any);
                              let { error } = await tryInsert(row);
                              if (error && row.alt_text && error.code === '42703') {
                                delete row.alt_text;
                                const retry = await tryInsert(row);
                                error = retry.error;
                              }
                              if (error && row.category && error.code === '23514') {
                                delete row.category;
                                const retry = await tryInsert(row);
                                error = retry.error;
                                if (!error) {
                                  uncategorizedCount += 1;
                                }
                              }
                              if (error) {
                                console.error('Bulk insert failed', error, { url, row });
                              } else {
                                success += 1;
                              }
                            }
                            setImportingBulk(false);
                            if (success) {
                              toast.success(`${success} of ${urls.length} images imported.`);
                              if (uncategorizedCount) {
                                toast('Some images were imported without category because the database rejected the selected gallery category.');
                              }
                            } else {
                              toast.error('Failed to import images. Check console for details.');
                            }
                            setBulkUrls('');
                            loadAllData();
                          }}
                          disabled={importingBulk}
                          className="bg-[#E8620A] hover:bg-[#cf5709] text-white"
                        >
                          {importingBulk ? 'Importing…' : `Import ${bulkUrls.split('\n').map(s => s.trim()).filter(Boolean).length || ''} Images`}
                        </Button>
                        <Button variant="outline" onClick={() => { setBulkAddMode(false); setBulkUrls(''); setBulkCategoryTarget(''); }} className="border-[#2A2520] text-[#B5A898]"><X size={14} className="mr-1" /> Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* ── Single add / edit form ────────────────────────────── */}
                {editGallery && !bulkAddMode && (
                  <Card className="bg-[#1A1814] border-[#E8620A]/30">
                    <CardContent className="p-5 space-y-3">
                      <h3 className="font-semibold text-[#E8620A]">{editGallery.id ? 'Edit Image' : 'New Image'} — <span className="text-white/70">{selectedGallery.name}</span></h3>
                      <div className="grid md:grid-cols-2 gap-3">
                        <Field label="Image Title" hint="Optional — auto-generated from filename if blank. Shown as overlay on the frontend.">
                          <Input placeholder="e.g. Opening Night" value={editGallery.title} onChange={e => setEditGallery({ ...editGallery, title: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="Alt Text" hint="Optional — for accessibility. Auto-generated from title if left blank.">
                          <Input placeholder="Auto-generated from title" value={editGallery.alt_text || ''} onChange={e => setEditGallery({ ...editGallery, alt_text: e.target.value })} className={inputCls} />
                        </Field>
                      </div>
                      <Field label="Caption" hint="Optional secondary line">
                        <Input placeholder="Optional" value={editGallery.caption} onChange={e => setEditGallery({ ...editGallery, caption: e.target.value })} className={inputCls} />
                      </Field>
                      <Field label="Category" hint="Which gallery this image belongs to.">
                        <select
                          value={editGallery.category || ''}
                          onChange={e => {
                            const newCat = e.target.value;
                            const newGal = galleries.find(g => g.id === newCat || g.name === newCat);
                            // Auto-update title if it's currently empty or looks auto-generated (e.g. "QA-001", "QA-2023-001", "Uncategorized-001")
                            const autoPattern = /^[A-Z][\w-]*-\d{3}$|^Uncategorized-\d{3}$/;
                            const currentTitle = editGallery.title || '';
                            if (!currentTitle || autoPattern.test(currentTitle)) {
                              if (newGal) {
                                const imagesInGal = gallery.filter(g => {
                                  const cat = (g.category || '').trim();
                                  return (cat === newGal.id || cat === newGal.name) && g.id !== editGallery.id;
                                });
                                setEditGallery({ ...editGallery, category: newCat, title: generateNextImageTitle(imagesInGal, newGal.name) });
                              } else {
                                const uncatImages = gallery.filter(g => {
                                  const cat = (g.category || '').trim();
                                  return !cat || !galleries.some(gc => gc.id === cat || gc.name === cat);
                                });
                                setEditGallery({ ...editGallery, category: newCat, title: generateNextImageTitle(uncatImages, null) });
                              }
                            } else {
                              setEditGallery({ ...editGallery, category: newCat });
                            }
                          }}
                          className={`${inputCls} rounded-md px-3 py-2 border text-sm w-full`}
                        >
                          <option value="">— Uncategorized —</option>
                          {galleries.map(gc => (
                            <option key={gc.id} value={gc.id}>{gc.name}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Image URL *" hint="Upload a file or paste a URL.">
                        <div className="border border-[#2A2520] rounded-lg p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                            <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-[#E8620A] hover:bg-[#cf5709] text-white rounded-md text-sm font-medium">
                              {uploadingGalleryImage ? 'Uploading…' : 'Upload File'}
                              <input type="file" accept="image/*" className="hidden" disabled={uploadingGalleryImage}
                                onChange={e => e.target.files?.[0] && uploadGalleryImage(e.target.files[0])} />
                            </label>
                            <span className="text-xs text-[#6B5E50]">or paste an image URL</span>
                          </div>
                          <Input placeholder="https://…" value={editGallery.image_url} onChange={e => setEditGallery({ ...editGallery, image_url: e.target.value })} className={inputCls} />
                          {editGallery.image_url && <img src={normalizeImageUrl(editGallery.image_url)} alt="Preview" className="w-40 h-28 object-cover rounded-md border border-[#2A2520]" />}
                        </div>
                      </Field>
                      <div className="flex gap-2">
                        <Button onClick={async () => { await saveGallery(); }} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} className="mr-1" /> Save</Button>
                        <Button variant="outline" onClick={() => setEditGallery(null)} className="border-[#2A2520] text-[#B5A898]"><X size={14} className="mr-1" /> Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {imagesInSelectedGallery.length === 0 && !editGallery && !bulkAddMode && (
                  <p className="text-[#6B5E50] text-center py-8">No images in this gallery yet. Click "Add Image" or "Bulk Add".</p>
                )}

                {/* ── Bulk action toolbar ──────────────────────────────── */}
                {selectedImageIds.size > 0 && (
                  <Card className="bg-[#1A1814] border-[#E8620A]/50">
                    <CardContent className="p-4 flex flex-wrap items-center gap-3">
                      <span className="text-sm text-white font-medium">{selectedImageIds.size} selected</span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <select
                          value={bulkCategoryTarget}
                          onChange={e => setBulkCategoryTarget(e.target.value)}
                          className={`${inputCls} rounded-md px-3 py-1.5 border text-sm`}
                        >
                          <option value="">Move to category…</option>
                          {galleries.map(gc => (
                            <option key={gc.id} value={gc.id}>{gc.name}</option>
                          ))}
                        </select>
                        <Button size="sm" onClick={bulkMoveImages} disabled={!bulkCategoryTarget} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><FolderInput size={14} className="mr-1" /> Move</Button>
                        <Button size="sm" variant="outline" onClick={bulkDeleteImages} className="border-red-800 text-red-400 hover:bg-red-900/20"><Trash2 size={14} className="mr-1" /> Delete</Button>
                        <Button size="sm" variant="ghost" onClick={() => { setSelectedImageIds(new Set()); setBulkCategoryTarget(''); }} className="text-[#6B5E50]"><X size={14} /></Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {imagesInSelectedGallery.map(g => (
                    <Card key={g.id} className={`bg-[#1A1814] border-[#2A2520] overflow-hidden relative ${(g as any).featured ? 'ring-2 ring-[#E8620A]' : ''}`}>
                      {/* Selection checkbox */}
                      <button
                        type="button"
                        onClick={() => toggleSelectImage(g.id!)}
                        className="absolute top-2 left-2 z-10 p-1 rounded-md bg-black/60 hover:bg-black/80 transition-colors"
                      >
                        {selectedImageIds.has(g.id!) ? <CheckSquare size={16} className="text-[#E8620A]" /> : <Square size={16} className="text-white/80" />}
                      </button>
                      {/* Featured badge */}
                      {(g as any).featured && (
                        <div className="absolute top-2 right-2 z-10 bg-[#E8620A] text-white text-[9px] font-bold px-2 py-0.5 rounded-full tracking-wider uppercase">
                          Cover
                        </div>
                      )}
                      <div className="aspect-video bg-[#0F0D0A] relative">
                        {g.image_url ? <img src={normalizeImageUrl(g.image_url)} alt={g.alt_text || g.title || 'Gallery photo'} className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-[#2A2520]"><Image size={32} /></div>}
                      </div>
                      <CardContent className="p-3">
                        <h4 className="text-sm font-semibold text-white truncate">{g.title}</h4>
                        {g.caption && <p className="text-xs text-[#6B5E50] truncate">{g.caption}</p>}
                        <div className="flex gap-1 mt-2 flex-wrap">
                          <Button size="sm" variant="ghost" onClick={() => setEditGallery({ ...g })} className="text-[#B5A898] hover:text-white h-7 px-2"><Edit2 size={12} /></Button>
                          {!(g as any).featured && (
                            <Button size="sm" variant="ghost" onClick={async () => {
                              const { error } = await supabase.from('gallery').update({ featured: true }).eq('id', g.id!);
                              if (error) { toast.error(error.message); return; }
                              // Unfeature all others in same gallery
                              const otherIds = imagesInSelectedGallery.filter(x => x.id !== g.id).map(x => x.id!);
                              if (otherIds.length) {
                                await supabase.from('gallery').update({ featured: false }).in('id', otherIds);
                              }
                              toast.success('Cover image updated.');
                              void logAuditAction(session?.user?.email ?? '', AUDIT_ACTIONS.GALLERY_COVER_SET, 'gallery', g.id, {
                                gallery_name: selectedGallery?.name,
                                title: g.title,
                              });
                              loadAllData();
                            }} className="text-yellow-500 hover:text-yellow-400 h-7 px-2" title="Set as gallery cover">
                              <Star size={12} />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => deleteGallery(g.id!)} className="text-red-400 hover:text-red-300 h-7 px-2"><Trash2 size={12} /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </TabsContent>


          {/* ── Registrations Tab ─────────────────────────────────────────── */}
          <TabsContent value="registrations" className="space-y-4">
            {!regSelectedGroupKey ? (
              <>
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">Registrations by Event</h2>
                    <p className="text-sm text-[#6B5E50]">Click an event to see its registrations.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
                    <Button onClick={seedTestRegistrations} variant="outline" className="border-[#E8620A]/60 text-[#E8620A] hover:bg-[#E8620A]/10">
                      <Plus size={14} className="mr-1" /> Seed 5 Test Registrations
                    </Button>
                  </div>
                </div>
                {regGroups.length === 0 && <p className="text-[#6B5E50] text-center py-8">No registrations yet.</p>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {regGroups.map(g => (
                    <button key={g.key} onClick={() => setRegSelectedGroupKey(g.key)}
                      className="text-left bg-[#1A1814] border border-[#2A2520] hover:border-[#E8620A]/60 rounded-lg p-5 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white truncate">{g.title}</h3>
                          <p className="text-xs text-[#6B5E50] mt-1">Click to view registrations</p>
                        </div>
                        <div className="bg-[#E8620A]/20 text-[#E8620A] rounded-full px-3 py-1 text-sm font-bold">
                          {g.items.length}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-wrap justify-between items-center gap-3">
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={() => { setRegSelectedGroupKey(null); setRegSearch(''); }} className="border-[#2A2520] text-[#B5A898]">← Back</Button>
                    <h2 className="text-xl font-semibold">
                      {regGroups.find(g => g.key === regSelectedGroupKey)?.title} ({sortedRegistrations.length})
                    </h2>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
                    <Input placeholder="Search…" value={regSearch} onChange={e => setRegSearch(e.target.value)} className={`${inputCls} w-48`} />
                    <Button onClick={exportCSV} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><FileDown size={14} className="mr-1" /> CSV</Button>
                    <Button onClick={exportXLSX} className="bg-emerald-700 hover:bg-emerald-800 text-white"><FileDown size={14} className="mr-1" /> Excel</Button>
                    <Button onClick={exportPDF} className="bg-rose-700 hover:bg-rose-800 text-white"><FileDown size={14} className="mr-1" /> PDF</Button>
                  </div>
                </div>
                <div className="flex gap-4 flex-wrap">
                  <SortBtn col="created_at" label="Date" />
                  <SortBtn col="first_name" label="Name" />
                  <SortBtn col="location" label="Location" />
                </div>
                {sortedRegistrations.length === 0 && <p className="text-[#6B5E50] text-center py-8">No registrations match.</p>}
                <div className="space-y-2">
              {sortedRegistrations.map(r => (
                <Card key={r.id} className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-white">{r.full_name || `${(r.first_name || '').trim()} ${(r.last_name || '').trim()}`.trim() || 'Registrant'}</h4>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-[#E8620A]/20 text-[#E8620A]">{r.event_title || r.program || 'General'}</span>
                        </div>
                        <div className="flex gap-4 flex-wrap mt-1.5 text-sm text-[#6B5E50]">
                          <span>{r.email}</span>
                          {r.phone && <span>{r.phone}</span>}
                          {(r.state_city || r.location) && <span>{r.state_city || r.location}</span>}
                        </div>
                        {(r.prayer_note || r.note) && <p className="text-xs text-[#B5A898] mt-2 italic">"{r.prayer_note || r.note}"</p>}
                        {(() => {
                          const formDataPairs = getRegistrationFormDataPairs(r);
                          if (formDataPairs.length > 0) {
                            return (
                              <details className="mt-2">
                                <summary className="text-xs text-[#6B5E50] cursor-pointer hover:text-[#B5A898]">View extra form data</summary>
                                <div className="text-xs text-[#B5A898] mt-2 bg-[#0F0D0A] p-3 rounded overflow-auto max-h-40 space-y-2">
                                  {formDataPairs.map(item => (
                                    <div key={item.key} className="flex flex-col gap-1">
                                      <span className="font-medium text-white">{item.label}:</span>
                                      <span className="break-words">{item.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            );
                          }
                          if (r.form_data && r.form_data !== '{}') {
                            return (
                              <details className="mt-2">
                                <summary className="text-xs text-[#6B5E50] cursor-pointer hover:text-[#B5A898]">View extra form data</summary>
                                <pre className="text-xs text-[#B5A898] mt-1 bg-[#0F0D0A] p-2 rounded overflow-auto max-h-32">{typeof r.form_data === 'string' ? r.form_data : JSON.stringify(r.form_data, null, 2)}</pre>
                              </details>
                            );
                          }
                          return null;
                        })()}
                        <p className="text-[10px] text-[#6B5E50] mt-1">{new Date(r.created_at).toLocaleString()}</p>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteRegistration(r.id)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
                </div>
              </>
            )}
          </TabsContent>

          {/* ── Newsletter Tab ───────────────────────────────────────────── */}
          <TabsContent value="newsletter" className="space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-semibold">Newsletter Subscribers</h2>
                <p className="text-sm text-[#6B5E50]">Email captured from the Connect page and every event form with opt-in enabled.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
                <Button
                  onClick={() => setSendLogOpen(!sendLogOpen)}
                  variant={sendLogOpen ? 'default' : 'outline'}
                  className={sendLogOpen ? 'bg-purple-700 hover:bg-purple-800 text-white' : 'border-[#2A2520] text-[#B5A898]'}
                >
                  <History size={14} className="mr-1" /> Audit Log ({sendLogs.length})
                </Button>
                <Input placeholder="Search email, phone, source…" value={subSearch} onChange={e => setSubSearch(e.target.value)} className={`${inputCls} w-64`} />
                <Button onClick={exportSubscribersCSV} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><FileDown size={14} className="mr-1" /> CSV</Button>
                <Button onClick={openBulkCompose} className="bg-emerald-700 hover:bg-emerald-800 text-white"><Send size={14} className="mr-1" /> Send Bulk Email ({filteredSubscribers.filter(s => !s.unsubscribed).length} active / {filteredSubscribers.length} total)</Button>
              </div>
            </div>

            {/* ── Audit Log Panel ────────────────────────────────────────── */}
            {sendLogOpen && (
              <Card className="bg-[#1A1814] border-purple-800/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-base flex items-center gap-2">
                    <History size={16} /> Newsletter Send Audit Log
                  </CardTitle>
                  <p className="text-xs text-[#6B5E50]">Per-email delivery status for all newsletter sends (bulk and individual). The edge function records each attempt in the database.</p>
                </CardHeader>
                <CardContent>
                  {sendLogs.length === 0 ? (
                    <p className="text-[#6B5E50] text-sm py-4 text-center">No sends recorded yet. Send a newsletter to see logs here.</p>
                  ) : (
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="text-[9px] font-bold tracking-[1.5px] uppercase text-[#6B5E50] border-b border-[#2A2520]">
                          <tr>
                            <th className="text-left py-2 pr-2">Sent At</th>
                            <th className="text-left py-2 pr-2">Recipient</th>
                            <th className="text-left py-2 pr-2">Subject</th>
                            <th className="text-left py-2 pr-2">Status</th>
                            <th className="text-left py-2 pr-2">Campaign</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sendLogs.map(log => (
                            <tr key={log.id} className="border-b border-[#2A2520]/50 hover:bg-[#0F0D0A]">
                              <td className="py-1.5 pr-2 text-[#B5A898] whitespace-nowrap">{new Date(log.sent_at).toLocaleString()}</td>
                              <td className="py-1.5 pr-2 text-white">{log.recipient_email}</td>
                              <td className="py-1.5 pr-2 text-[#B5A898] max-w-[200px] truncate" title={log.subject}>{log.subject}</td>
                              <td className="py-1.5 pr-2">
                                <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                                  log.status === 'sent' ? 'bg-emerald-900/40 text-emerald-400' :
                                  log.status === 'failed' ? 'bg-red-900/40 text-red-400' :
                                  'bg-yellow-900/40 text-yellow-400'
                                }`}>
                                  {log.status}
                                </span>
                                {log.error_message && (
                                  <span className="block text-red-400 mt-0.5 max-w-[200px] truncate" title={log.error_message}>{log.error_message}</span>
                                )}
                              </td>
                              <td className="py-1.5 pr-2 text-[#6B5E50] font-mono text-[8px]">{log.campaign_id ? log.campaign_id.slice(0, 16) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {filteredSubscribers.length === 0 && (
              <p className="text-[#6B5E50] text-center py-8">No subscribers{subSearch ? ' match your search.' : ' yet.'}</p>
            )}

            <div className="space-y-2">
              {filteredSubscribers.map(s => (
                <Card key={s.id} className={`bg-[#1A1814] border-[#2A2520] ${s.unsubscribed ? 'opacity-60' : ''}`}>
                  <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium truncate">{s.email}</span>
                        {s.source && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8620A]/20 text-[#E8620A] font-bold tracking-wider uppercase">{s.source}</span>
                        )}
                        {s.unsubscribed && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-900/40 text-rose-300 font-bold tracking-wider uppercase">Unsubscribed</span>
                        )}
                      </div>
                      <div className="text-xs text-[#6B5E50] mt-1 flex flex-wrap gap-3">
                        {s.phone && <span>📞 {s.phone}</span>}
                        <span>{new Date(s.created_at).toLocaleString()}</span>
                        {s.unsubscribed_at && <span>Unsubscribed: {new Date(s.unsubscribed_at).toLocaleString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => toggleUnsubscribe(s)} className={s.unsubscribed ? 'text-emerald-400 hover:text-emerald-300' : 'text-rose-400 hover:text-rose-300'} title={s.unsubscribed ? 'Re-activate subscriber' : 'Unsubscribe'}>
                        {s.unsubscribed ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setSubscriberEdit({ ...s })} className="text-[#B5A898] hover:text-white" title="Edit email/phone"><Edit2 size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => openIndividualCompose(s.email)} className="text-emerald-400 hover:text-emerald-300" title="Send email"><Send size={14} /></Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteSubscriber(s.id)} className="text-red-400 hover:text-red-300" title="Remove"><Trash2 size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* ── Subscriber Edit Dialog ─────────────────────────────────── */}
            {subscriberEdit && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSubscriberEdit(null)}>
                <Card className="w-full max-w-md bg-[#1A1814] border-[#E8620A]/40" onClick={e => e.stopPropagation()}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-white text-lg">Edit Subscriber</CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => setSubscriberEdit(null)} className="text-[#B5A898]"><X size={16} /></Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Field label="Email Address">
                      <Input value={subscriberEdit.email} onChange={e => setSubscriberEdit({ ...subscriberEdit, email: e.target.value })} className={inputCls} />
                    </Field>
                    <Field label="Phone Number" hint="Leave empty if not available.">
                      <Input value={subscriberEdit.phone || ''} onChange={e => setSubscriberEdit({ ...subscriberEdit, phone: e.target.value })} className={inputCls} placeholder="+234 800 000 0000" />
                    </Field>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setSubscriberEdit(null)} className="border-[#2A2520] text-[#B5A898]">Cancel</Button>
                      <Button onClick={updateSubscriber} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} className="mr-1" /> Save</Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Compose dialog */}
            {composeOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => !composeSending && setComposeOpen(false)}>
                <Card className="w-full max-w-2xl bg-[#1A1814] border-[#E8620A]/40" onClick={e => e.stopPropagation()}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div>
                      <CardTitle className="text-white text-lg">
                        {composeMode === 'bulk' ? `Bulk Email — ${composeTargets.length} recipient(s)` : `Email — ${composeTargets[0]}`}
                      </CardTitle>
                      <p className="text-xs text-[#6B5E50] mt-1">Sent from <code className="text-[#E8620A]">noreply@cherubscove.net</code>{composeMode === 'bulk' ? ' via BCC — recipients won\'t see each other.' : ''}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => !composeSending && setComposeOpen(false)} className="text-[#B5A898]"><X size={16} /></Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Field label="Subject">
                      <Input placeholder="e.g. Quiver's 2026 — Registration is now open" value={composeSubject} onChange={e => setComposeSubject(e.target.value)} className={inputCls} disabled={composeSending} />
                    </Field>
                    <Field label="Message" hint="Plain text is fine — line breaks are preserved. You may also paste HTML.">
                      <Textarea placeholder="Write your message here…" value={composeBody} onChange={e => setComposeBody(e.target.value)} className={inputCls} rows={10} disabled={composeSending} />
                    </Field>
                    {composeMode === 'bulk' && composeTargets.length > 20 && (
                      <p className="text-xs text-[#6B5E50]">Recipients will be split into batches of 45 (Resend BCC limit).</p>
                    )}
                    <div className="flex justify-between items-center pt-2">
                      <Button
                        onClick={sendTestEmail}
                        disabled={composeSending || testEmailSending}
                        variant="outline"
                        className="border-[#E8620A]/60 text-[#E8620A] hover:bg-[#E8620A]/10"
                      >
                        {testEmailSending ? 'Sending Test…' : <><Send size={14} className="mr-1" /> Send Test Email</>}
                      </Button>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setComposeOpen(false)} disabled={composeSending} className="border-[#2A2520] text-[#B5A898]">Cancel</Button>
                        <Button onClick={sendComposedEmail} disabled={composeSending} className="bg-[#E8620A] hover:bg-[#cf5709] text-white">
                          {composeSending ? 'Sending…' : <><Send size={14} className="mr-1" /> Send</>}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ── Content Tab ──────────────────────────────────────────────── */}

          <TabsContent value="content" className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-xl font-semibold">Website Content</h2>
                <p className="text-sm text-[#6B5E50]">Edit all text on the website. Changes update in real-time.</p>
              </div>
              <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', ...Array.from(new Set(CONTENT_DEFAULTS.map(c => c.group)))].map(g => (
                <button key={g} onClick={() => setContentGroup(g)} className={`text-[10px] font-bold tracking-[1.5px] uppercase px-3 py-1.5 rounded-full border transition-colors ${contentGroup === g ? 'bg-[#E8620A] text-white border-[#E8620A]' : 'border-[#2A2520] text-[#6B5E50] hover:border-[#E8620A]/50'}`}>
                  {g === 'all' ? 'All' : g}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {CONTENT_DEFAULTS.filter(cd => contentGroup === 'all' || cd.group === contentGroup).map(cd => {
                // ── Hero slides JSON is managed via the dedicated UI below ──
                if (cd.key === 'hero_slides_json') return null;

                const isPwaIcon = cd.key === 'pwa_icon_192_url' || cd.key === 'pwa_icon_512_url' || cd.key === 'pwa_icon_apple_url';
                return (
                  <Card key={cd.key} className="bg-[#1A1814] border-[#2A2520]">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <label className="text-sm font-medium text-[#B5A898]">{cd.label}</label>
                        <span className="text-[9px] tracking-[1px] uppercase text-[#6B5E50] bg-[#0F0D0A] px-2 py-0.5 rounded">{cd.group}</span>
                      </div>
                      <div className="flex gap-2">
                        {(contentValues[cd.key] ?? '').length > 80 ? (
                          <Textarea value={contentValues[cd.key] ?? ''} onChange={e => setContentValues(prev => ({ ...prev, [cd.key]: e.target.value }))} className={`flex-1 ${inputCls}`} rows={3} />
                        ) : (
                          <Input value={contentValues[cd.key] ?? ''} onChange={e => setContentValues(prev => ({ ...prev, [cd.key]: e.target.value }))} className={`flex-1 ${inputCls}`} />
                        )}
                        <Button onClick={() => saveContentSetting(cd.key)} className="bg-[#E8620A] hover:bg-[#cf5709] text-white self-start"><Save size={14} /></Button>
                        {isPwaIcon && (
                          <div className="relative self-start">
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="absolute inset-0 opacity-0 cursor-pointer w-full"
                              title={`Upload ${cd.label}`}
                              onChange={async e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const ext = file.name.split('.').pop() || 'png';
                                const path = `pwa-icons/${cd.key}-${Date.now()}.${ext}`;
                                let bucket = 'gallery-images';
                                let { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
                                if (upErr) {
                                  bucket = 'event-images';
                                  ({ error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false }));
                                }
                                if (upErr) { toast.error(`Upload failed: ${upErr.message}`); return; }
                                const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
                                if (urlData) {
                                  setContentValues(prev => ({ ...prev, [cd.key]: urlData.publicUrl }));
                                  toast.success('Icon uploaded. Click Save to persist.');
                                }
                              }}
                            />
                            <div className="flex items-center gap-1.5 rounded-md bg-[#2A2520] px-3 py-2 text-xs text-[#B5A898] hover:bg-[#3A3530] transition-colors pointer-events-none">
                              <Download size={14} /> Upload
                            </div>
                          </div>
                        )}
                      </div>
                      {isPwaIcon && contentValues[cd.key] && (
                        <img src={contentValues[cd.key]} alt="" className="mt-2 h-12 w-12 rounded-lg object-cover border border-[#2A2520]" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ── Hero Slides Manager ─────────────────────────────────────── */}
            {(contentGroup === 'all' || contentGroup === 'Hero Section') && (
              <HeroSlidesManager
                settingsMap={siteSettings}
                settingsMeta={settingsMeta}
                onSave={() => { loadAllData(); }}
                supabase={supabase}
                inputCls={inputCls}
                toast={toast}
              />
            )}
          </TabsContent>

          {/* ── Audit Log Tab ──────────────────────────────────────────── */}
          <TabsContent value="audit" className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Audit Log</h2>
                <p className="text-sm text-[#B5A898]">Every admin action is recorded here — who did what and when.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
                <select
                  value={auditFilterAction}
                  onChange={e => setAuditFilterAction(e.target.value)}
                  className="bg-[#0F0D0A] border-[#2A2520] text-white rounded-md px-3 py-2 border text-xs"
                >
                  <option value="all">All Actions</option>
                  {Array.from(new Set(auditLogs.map(l => l.action))).sort().map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
                <select
                  value={auditFilterEntity}
                  onChange={e => setAuditFilterEntity(e.target.value)}
                  className="bg-[#0F0D0A] border-[#2A2520] text-white rounded-md px-3 py-2 border text-xs"
                >
                  <option value="all">All Entities</option>
                  {Array.from(new Set(auditLogs.map(l => l.entity_type))).sort().map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
                <Input
                  placeholder="Search admin email..."
                  value={auditSearch}
                  onChange={e => setAuditSearch(e.target.value)}
                  className="bg-[#0F0D0A] border-[#2A2520] text-white placeholder:text-[#6B5E50] w-56 text-xs"
                />
              </div>
            </div>

            {(() => {
              // Filter and sort audit logs
              let filtered = [...auditLogs];
              if (auditSearch.trim()) {
                const q = auditSearch.toLowerCase();
                filtered = filtered.filter(l => l.admin_email.toLowerCase().includes(q));
              }
              if (auditFilterAction !== 'all') {
                filtered = filtered.filter(l => l.action === auditFilterAction);
              }
              if (auditFilterEntity !== 'all') {
                filtered = filtered.filter(l => l.entity_type === auditFilterEntity);
              }
              filtered.sort((a, b) => {
                const av = String(a[auditSort.col] ?? '');
                const bv = String(b[auditSort.col] ?? '');
                return auditSort.asc ? av.localeCompare(bv) : bv.localeCompare(av);
              });

              const toggleAuditSort = (col: keyof AuditLogEntry) => {
                setAuditSort(prev => prev.col === col ? { col, asc: !prev.asc } : { col, asc: true });
              };

              const SortBtnAudit = ({ col, label }: { col: keyof AuditLogEntry; label: string }) => (
                <button onClick={() => toggleAuditSort(col)} className={`text-[10px] font-bold tracking-[1.5px] uppercase inline-flex items-center gap-1 ${auditSort.col === col ? 'text-[#E8620A]' : 'text-[#6B5E50]'}`}>
                  {label} <ArrowUpDown size={10} />
                </button>
              );

              return (
                <Card className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-0">
                    {auditLogsLoading ? (
                      <div className="p-6 text-center text-sm text-[#6B5E50]">Loading audit logs…</div>
                    ) : filtered.length === 0 ? (
                      <div className="p-6 text-center text-sm text-[#6B5E50]">
                        {auditLogs.length === 0
                          ? 'No audit records yet. Actions will appear here as admins manage the site.'
                          : 'No records match your filters.'}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="border-b border-[#2A2520]">
                            <tr>
                              <th className="px-4 py-3 text-left"><SortBtnAudit col="admin_email" label="Admin" /></th>
                              <th className="px-4 py-3 text-left"><SortBtnAudit col="action" label="Action" /></th>
                              <th className="px-4 py-3 text-left"><SortBtnAudit col="entity_type" label="Entity" /></th>
                              <th className="px-4 py-3 text-left"><SortBtnAudit col="entity_id" label="Entity ID" /></th>
                              <th className="px-4 py-3 text-left">Details</th>
                              <th className="px-4 py-3 text-left"><SortBtnAudit col="created_at" label="Time" /></th>
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map(log => (
                              <tr key={log.id} className="border-b border-[#2A2520]/50 hover:bg-[#0F0D0A]/50 transition-colors">
                                <td className="px-4 py-3 text-white whitespace-nowrap">{log.admin_email}</td>
                                <td className="px-4 py-3">
                                  <span className="inline-block px-2 py-0.5 rounded-full bg-[#E8620A]/15 text-[#E8620A] text-[9px] font-bold tracking-wider uppercase whitespace-nowrap">
                                    {log.action}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-[#B5A898] capitalize">{log.entity_type}</td>
                                <td className="px-4 py-3 text-[#6B5E50] font-mono text-[10px] max-w-[120px] truncate" title={log.entity_id || ''}>
                                  {log.entity_id ? log.entity_id.slice(0, 16) + '…' : '—'}
                                </td>
                                <td className="px-4 py-3">
                                  {log.details && Object.keys(log.details).length > 0 ? (
                                    <details className="group">
                                      <summary className="text-[#6B5E50] cursor-pointer hover:text-[#B5A898] text-[10px] font-medium">View</summary>
                                      <pre className="mt-1 bg-[#0F0D0A] border border-[#2A2520] rounded p-2 text-[10px] text-[#B5A898] max-w-[300px] overflow-auto max-h-32 whitespace-pre-wrap">
                                        {JSON.stringify(log.details, null, 2)}
                                      </pre>
                                    </details>
                                  ) : (
                                    <span className="text-[#6B5E50] text-[10px]">—</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-[#6B5E50] whitespace-nowrap text-[10px]">
                                  {new Date(log.created_at).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="px-4 py-2 text-[10px] text-[#6B5E50] border-t border-[#2A2520]">
                          Showing {filtered.length} of {auditLogs.length} logs
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })()}
          </TabsContent>

          {/* ── Settings Tab ─────────────────────────────────────────────── */}
          <TabsContent value="settings" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Site Settings</h2>
                <p className="text-sm text-[#6B5E50]">Changes here update the website in real-time.</p>
              </div>
              <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
            </div>
            <div className="space-y-4">
              {settingsMeta.filter(m => !CONTENT_DEFAULTS.some(cd => cd.key === m.key)).map(meta => (
                <Card key={meta.id} className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-4">
                    <label className="text-sm font-medium text-[#B5A898] block mb-1.5">{meta.label}</label>
                    <div className="flex gap-2">
                      {meta.type === 'boolean' ? (
                        <select value={siteSettings[meta.key] ?? ''} onChange={e => setSiteSettings(prev => ({ ...prev, [meta.key]: e.target.value }))} className={`flex-1 rounded-md px-3 py-2 ${inputCls} border`}>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <Input value={siteSettings[meta.key] ?? ''} onChange={e => setSiteSettings(prev => ({ ...prev, [meta.key]: e.target.value }))} className={`flex-1 ${inputCls}`} type={meta.type === 'email' ? 'email' : meta.type === 'url' ? 'url' : 'text'} />
                      )}
                      <Button onClick={() => saveSetting(meta.key)} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Save size={14} /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── SEO Tab ─────────────────────────────────────────────────── */}
          <TabsContent value="seo" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">SEO & Meta Settings</h2>
                <p className="text-sm text-[#6B5E50]">Manage search engine optimisation — meta tags, social previews, favicons, and per-page titles &amp; descriptions.</p>
              </div>
              <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
            </div>

            {/* ── Global Defaults ──────────────────────────────────────── */}
            <Card className="bg-[#1A1814] border-[#2A2520]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Search size={16} /> Global Defaults
                </CardTitle>
                <p className="text-xs text-[#6B5E50]">Used as fallback when a page does not have its own meta configured.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'seo_default_title', label: 'Default Site Title', hint: 'Used as the browser tab title and fallback og:title' },
                  { key: 'seo_default_description', label: 'Default Meta Description', hint: 'Shown in search results when a page-specific description is missing' },
                  { key: 'seo_default_image', label: 'Default OG Image URL', hint: 'Social preview image — recommended 1200×630px' },
                ].map(field => (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-[#B5A898]">{field.label}</label>
                      <span className="text-[9px] tracking-[1px] uppercase text-[#6B5E50]">Global</span>
                    </div>
                    <div className="flex gap-2">
                      {(contentValues[field.key] ?? '').length > 80 ? (
                        <Textarea
                          value={contentValues[field.key] ?? ''}
                          onChange={e => setContentValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className={`flex-1 ${inputCls}`}
                          rows={3}
                        />
                      ) : (
                        <Input
                          value={contentValues[field.key] ?? ''}
                          onChange={e => setContentValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className={`flex-1 ${inputCls}`}
                        />
                      )}
                      <Button onClick={() => saveContentSetting(field.key)} className="bg-[#E8620A] hover:bg-[#cf5709] text-white self-start"><Save size={14} /></Button>
                    </div>
                    {field.hint && <p className="text-[10px] text-[#6B5E50] mt-1">{field.hint}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ── Social Preview Card ──────────────────────────────────── */}
            {(() => {
              const previewTitle = contentValues['seo_default_title'] || 'Cherubs Cove Ministry — The Making Place';
              const previewDesc = contentValues['seo_default_description'] || 'An interdenominational ministry raising burning youths for the Lord...';
              const previewUrl = 'https://cherubscove.net/';
              const previewImg = contentValues['seo_default_image'] || '';
              return (
                <Card className="bg-[#1A1814] border-[#2A2520]">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-base flex items-center gap-2">
                      <Eye size={16} /> Social Preview (Google / Facebook / Twitter)
                    </CardTitle>
                    <p className="text-xs text-[#6B5E50]">How your default page will look when shared on social media or shown in search results.</p>
                  </CardHeader>
                  <CardContent>
                    {previewImg && (
                      <img
                        src={previewImg}
                        alt="OG Preview"
                        className="w-full max-w-[600px] h-auto rounded-t-lg border border-[#2A2520] object-cover"
                        style={{ aspectRatio: '1200/630' }}
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    )}
                    <div className="bg-[#0F0D0A] border border-[#2A2520] border-t-0 rounded-b-lg p-4 max-w-[600px]">
                      <div className="text-[10px] text-[#6B5E50] uppercase tracking-[1px] truncate">{previewUrl}</div>
                      <div className="text-sm font-semibold text-white mt-0.5 truncate">{previewTitle}</div>
                      <div className="text-xs text-[#B5A898] mt-0.5 line-clamp-2">{previewDesc}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}

            {/* ── Favicon URLs ─────────────────────────────────────────── */}
            <Card className="bg-[#1A1814] border-[#2A2520]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Image size={16} /> Favicon &amp; Browser Icons
                </CardTitle>
                <p className="text-xs text-[#6B5E50]">Upload or paste URLs for browser tab icons and pinned tab icons.</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { key: 'seo_favicon_url', label: 'Favicon URL', hint: 'Standard browser tab icon (.png / .ico / .svg)' },
                  { key: 'seo_favicon_apple_url', label: 'Apple Touch Icon URL', hint: 'Used when saving to iPhone/iPad home screen' },
                  { key: 'seo_favicon_mask_url', label: 'Mask Icon URL (Safari)', hint: 'For Safari pinned tabs — solid SVG recommended' },
                ].map(field => (
                  <div key={field.key}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-sm font-medium text-[#B5A898]">{field.label}</label>
                      <span className="text-[9px] tracking-[1px] uppercase text-[#6B5E50]">Favicon</span>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={siteSettings[field.key] ?? contentValues[field.key] ?? ''}
                        onChange={e => {
                          setContentValues(prev => ({ ...prev, [field.key]: e.target.value }));
                          setSiteSettings(prev => ({ ...prev, [field.key]: e.target.value }));
                        }}
                        className={`flex-1 ${inputCls}`}
                      />
                      <Button onClick={() => saveContentSetting(field.key)} className="bg-[#E8620A] hover:bg-[#cf5709] text-white self-start"><Save size={14} /></Button>
                      <div className="relative self-start">
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/svg+xml"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full"
                          title={`Upload ${field.label}`}
                          onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const ext = file.name.split('.').pop() || 'png';
                            const path = `icons/${field.key}-${Date.now()}.${ext}`;
                            let bucket = 'gallery-images';
                            let { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
                            if (upErr) {
                              bucket = 'event-images';
                              ({ error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false }));
                            }
                            if (upErr) { toast.error(`Upload failed: ${upErr.message}`); return; }
                            const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
                            if (urlData) {
                              setContentValues(prev => ({ ...prev, [field.key]: urlData.publicUrl }));
                              setSiteSettings(prev => ({ ...prev, [field.key]: urlData.publicUrl }));
                              toast.success('Icon uploaded. Click Save to persist.');
                            }
                          }}
                        />
                        <div className="flex items-center gap-1.5 rounded-md bg-[#2A2520] px-3 py-2 text-xs text-[#B5A898] hover:bg-[#3A3530] transition-colors pointer-events-none">
                          <Download size={14} /> Upload
                        </div>
                      </div>
                    </div>
                    {field.hint && <p className="text-[10px] text-[#6B5E50] mt-1">{field.hint}</p>}
                    {(siteSettings[field.key] || contentValues[field.key]) && (
                      <div className="flex items-center gap-3 mt-2">
                        <img
                          src={siteSettings[field.key] || contentValues[field.key]}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover border border-[#2A2520] bg-[#0F0D0A]"
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <span className="text-[10px] text-[#6B5E50] truncate max-w-[300px]">{siteSettings[field.key] || contentValues[field.key]}</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* ── Per-Page SEO ─────────────────────────────────────────── */}
            <Card className="bg-[#1A1814] border-[#2A2520]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <FileText size={16} /> Per-Page Meta
                </CardTitle>
                <p className="text-xs text-[#6B5E50]">Customise the title, description, and social preview image for every route on the site.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { prefix: 'seo_home', page: 'Home', path: '/', icon: '🏠' },
                  { prefix: 'seo_about', page: 'About Jesse', path: '/about-jesse', icon: '👤' },
                  { prefix: 'seo_events', page: 'Events & Conferences', path: '/events-conferences', icon: '📅' },
                  { prefix: 'seo_pastconferences', page: 'Past Conferences', path: '/past-conferences', icon: '📷' },
                  { prefix: 'seo_resources', page: 'Resources', path: '/resources', icon: '📖' },
                  { prefix: 'seo_connect', page: 'Connect', path: '/connect', icon: '📬' },
                  { prefix: 'seo_register', page: 'Register', path: '/register/:eventId?', icon: '📝' },
                  { prefix: 'seo_support', page: 'Support', path: '/support', icon: '💝' },
                ].map(({ prefix, page, path: pagePath, icon }) => {
                  const titleKey = `${prefix}_title`;
                  const descKey = `${prefix}_description`;
                  const imgKey = `${prefix}_image`;
                  return (
                    <details key={prefix} className="group border border-[#2A2520] rounded-lg overflow-hidden">
                      <summary className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#2A2520]/50 transition-colors list-none">
                        <span className="text-lg">{icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-white">{page}</span>
                          <span className="text-[10px] text-[#6B5E50] block truncate">{pagePath}</span>
                        </div>
                        <span className="text-xs text-[#6B5E50] opacity-0 group-open:opacity-100 transition-opacity">▼</span>
                      </summary>
                      <div className="px-4 pb-4 space-y-3 border-t border-[#2A2520] pt-3">
                        <div>
                          <label className="text-xs font-medium text-[#B5A898] block mb-1">Meta Title</label>
                          <div className="flex gap-2">
                            <Input
                              value={contentValues[titleKey] ?? ''}
                              onChange={e => setContentValues(prev => ({ ...prev, [titleKey]: e.target.value }))}
                              className={`flex-1 ${inputCls}`}
                            />
                            <Button onClick={() => saveContentSetting(titleKey)} className="bg-[#E8620A] hover:bg-[#cf5709] text-white self-start"><Save size={14} /></Button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[#B5A898] block mb-1">Meta Description</label>
                          <div className="flex gap-2">
                            <Textarea
                              value={contentValues[descKey] ?? ''}
                              onChange={e => setContentValues(prev => ({ ...prev, [descKey]: e.target.value }))}
                              className={`flex-1 ${inputCls}`}
                              rows={2}
                            />
                            <Button onClick={() => saveContentSetting(descKey)} className="bg-[#E8620A] hover:bg-[#cf5709] text-white self-start"><Save size={14} /></Button>
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-[#B5A898] block mb-1">OG Image URL</label>
                          <div className="flex gap-2">
                            <Input
                              value={contentValues[imgKey] ?? ''}
                              onChange={e => setContentValues(prev => ({ ...prev, [imgKey]: e.target.value }))}
                              className={`flex-1 ${inputCls}`}
                              placeholder="Leave blank to use default OG image"
                            />
                            <Button onClick={() => saveContentSetting(imgKey)} className="bg-[#E8620A] hover:bg-[#cf5709] text-white self-start"><Save size={14} /></Button>
                            <div className="relative self-start">
                              <input
                                type="file"
                                accept="image/png,image/jpeg,image/webp"
                                className="absolute inset-0 opacity-0 cursor-pointer w-full"
                                title={`Upload ${page} OG Image`}
                                onChange={async e => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const ext = file.name.split('.').pop() || 'png';
                                  const path = `og/${prefix}-${Date.now()}.${ext}`;
                                  let bucket = 'gallery-images';
                                  let { error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false });
                                  if (upErr) {
                                    bucket = 'event-images';
                                    ({ error: upErr } = await supabase.storage.from(bucket).upload(path, file, { upsert: false }));
                                  }
                                  if (upErr) { toast.error(`Upload failed: ${upErr.message}`); return; }
                                  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
                                  if (urlData) {
                                    setContentValues(prev => ({ ...prev, [imgKey]: urlData.publicUrl }));
                                    setSiteSettings(prev => ({ ...prev, [imgKey]: urlData.publicUrl }));
                                    toast.success('OG image uploaded. Click Save to persist.');
                                  }
                                }}
                              />
                              <div className="flex items-center gap-1.5 rounded-md bg-[#2A2520] px-3 py-2 text-xs text-[#B5A898] hover:bg-[#3A3530] transition-colors pointer-events-none">
                                <Download size={14} /> Upload
                              </div>
                            </div>
                          </div>
                          {contentValues[imgKey] && (
                            <img
                              src={contentValues[imgKey]}
                              alt={`${page} OG preview`}
                              className="mt-2 h-16 w-auto rounded border border-[#2A2520] object-cover"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          )}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </CardContent>
            </Card>

            {/* ── Structured Data Info ─────────────────────────────────── */}
            <Card className="bg-[#1A1814] border-[#2A2520]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <FileText size={16} /> Structured Data (JSON-LD)
                </CardTitle>
                <p className="text-xs text-[#6B5E50]">Schema.org structured data is automatically injected on every page. You do not need to configure anything here.</p>
              </CardHeader>
              <CardContent>
                <div className="bg-[#0F0D0A] border border-[#2A2520] rounded-lg p-4 text-xs text-[#B5A898] space-y-2">
                  <p><span className="text-primary font-medium">Organization</span> — Home page (Organization + WebSite schemas)</p>
                  <p><span className="text-primary font-medium">BreadcrumbList</span> — About Jesse and Connect pages</p>
                  <p><span className="text-primary font-medium">Event</span> — Event schemas are dynamically generated on event/conference pages</p>
                  <p className="text-[#6B5E50] mt-2">Data is sourced from your site settings and cannot be edited directly here. Update your content and contact settings to reflect in structured data.</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Admins Tab ───────────────────────────────────────────────── */}
          <TabsContent value="admins" className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-xl font-semibold">Admin Users</h2>
                <p className="text-sm text-[#6B5E50]">
                  {isSuperAdmin
                    ? 'You are the super admin. You can add, remove, and change roles.'
                    : `Only the super admin (${SUPER_ADMIN_EMAIL}) can add or remove admins.`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={loadAllData} variant="outline" className="border-[#2A2520] text-[#B5A898] hover:bg-[#1A1814]" title="Refresh data"><RefreshCw size={14} /></Button>
                <span className="text-xs text-[#6B5E50]">{adminList.length} admin{adminList.length !== 1 ? 's' : ''}</span>
              </div>
            </div>

            {/* ── Change My Password ──────────────────────────────────── */}
            <Card className="bg-[#1A1814] border-[#2A2520]">
              <CardContent className="p-4">
                <button
                  onClick={() => setShowChangePassword(!showChangePassword)}
                  className="flex items-center justify-between w-full text-left"
                >
                  <div>
                    <h3 className="text-white font-semibold text-sm">Change Your Password</h3>
                    <p className="text-xs text-[#6B5E50] mt-0.5">Update your login password</p>
                  </div>
                  <span className={`text-[#6B5E50] transition-transform ${showChangePassword ? 'rotate-180' : ''}`}>▼</span>
                </button>
                {showChangePassword && (
                  <div className="mt-4 space-y-3 border-t border-[#2A2520] pt-4">
                    <Field label="Current Password">
                      <div className="relative">
                        <Input
                          type={showPwCurrent ? 'text' : 'password'}
                          placeholder="Enter your current password"
                          value={changePwCurrent}
                          onChange={e => setChangePwCurrent(e.target.value)}
                          className={inputCls + ' pr-10'}
                        />
                        <button type="button" onClick={() => setShowPwCurrent(!showPwCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5E50] hover:text-white">
                          {showPwCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>
                    <Field label="New Password">
                      <div className="relative">
                        <Input
                          type={showPwNew ? 'text' : 'password'}
                          placeholder="At least 6 characters"
                          value={changePwNew}
                          onChange={e => setChangePwNew(e.target.value)}
                          className={inputCls + ' pr-10'}
                        />
                        <button type="button" onClick={() => setShowPwNew(!showPwNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5E50] hover:text-white">
                          {showPwNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>
                    <Field label="Confirm New Password">
                      <div className="relative">
                        <Input
                          type={showPwConfirm ? 'text' : 'password'}
                          placeholder="Re-enter new password"
                          value={changePwConfirm}
                          onChange={e => setChangePwConfirm(e.target.value)}
                          className={inputCls + ' pr-10'}
                        />
                        <button type="button" onClick={() => setShowPwConfirm(!showPwConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5E50] hover:text-white">
                          {showPwConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>
                    <Button
                      onClick={handleChangeOwnPassword}
                      disabled={changePwSaving || !changePwNew || !changePwConfirm}
                      className="bg-[#E8620A] hover:bg-[#cf5709] text-white"
                    >
                      {changePwSaving ? 'Saving…' : <><Save size={14} className="mr-1" /> Update Password</>}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-2">
              {adminList.map(a => {
                const isSuper = a.email.toLowerCase() === SUPER_ADMIN_EMAIL;
                const isCurrentUser = session?.user?.email?.toLowerCase() === a.email.toLowerCase();
                return (
                  <Card key={a.email} className="bg-[#1A1814] border-[#2A2520]">
                    <CardContent className="p-4 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#E8620A]/20 text-[#E8620A] flex items-center justify-center text-sm font-bold uppercase">
                          {a.email[0]}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium truncate">{a.email}</span>
                            {isSuper && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#E8620A]/20 text-[#E8620A] font-bold tracking-wider uppercase">Super Admin</span>
                            )}
                            {!isSuper && a.role === 'super_admin' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 font-bold tracking-wider uppercase">Super Admin</span>
                            )}
                            {a.role === 'admin' && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-300 font-bold tracking-wider uppercase">Admin</span>
                            )}
                            {isCurrentUser && (
                              <span className="text-[10px] text-[#6B5E50]">(you)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Super admin: change another admin's password */}
                        {isSuperAdmin && !isCurrentUser && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAdminPwTargetEmail(a.email);
                              setAdminPwNewPassword('');
                              setAdminPwDialogOpen(true);
                            }}
                            className="text-[#B5A898] hover:text-white"
                            title="Change this admin's password"
                          >
                            <Settings size={14} />
                          </Button>
                        )}
                        {!isSuper && isSuperAdmin && (
                          <select
                            value={a.role}
                            onChange={e => changeAdminRole(a.email, e.target.value as 'admin' | 'super_admin')}
                            className={`${inputCls} rounded-md px-2 py-1 border text-xs`}
                          >
                            <option value="admin">Admin</option>
                            <option value="super_admin">Super Admin</option>
                          </select>
                        )}
                        {!isSuper && isSuperAdmin && (
                          <Button size="sm" variant="ghost" onClick={() => removeAdmin(a.email)} className="text-red-400 hover:text-red-300">
                            <Trash2 size={14} />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* ── Super Admin: Change Admin Password Dialog ──────────── */}
            {adminPwDialogOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setAdminPwDialogOpen(false)}>
                <Card className="w-full max-w-md bg-[#1A1814] border-[#E8620A]/40" onClick={e => e.stopPropagation()}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-white text-lg">Change Password</CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => setAdminPwDialogOpen(false)} className="text-[#B5A898]"><X size={16} /></Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-[#B5A898]">
                      Updating password for <strong className="text-white">{adminPwTargetEmail}</strong>
                    </p>
                    <Field label="New Password" hint="Must be at least 6 characters">
                      <div className="relative">
                        <Input
                          type={showAdminPwNew ? 'text' : 'password'}
                          placeholder="Enter new password"
                          value={adminPwNewPassword}
                          onChange={e => setAdminPwNewPassword(e.target.value)}
                          className={inputCls + ' pr-10'}
                          autoFocus
                        />
                        <button type="button" onClick={() => setShowAdminPwNew(!showAdminPwNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5E50] hover:text-white">
                          {showAdminPwNew ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </Field>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" onClick={() => setAdminPwDialogOpen(false)} className="border-[#2A2520] text-[#B5A898]">Cancel</Button>
                      <Button
                        onClick={handleAdminChangePassword}
                        disabled={adminPwSaving || adminPwNewPassword.length < 6}
                        className="bg-[#E8620A] hover:bg-[#cf5709] text-white"
                      >
                        {adminPwSaving ? 'Updating…' : <><Save size={14} className="mr-1" /> Update Password</>}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {isSuperAdmin && (
              <>
                <h3 className="text-lg font-semibold pt-4">Add New Admin</h3>
                <Card className="bg-[#1A1814] border-[#2A2520]">
                  <CardContent className="p-5 space-y-3">
                    <p className="text-sm text-[#B5A898]">Creates a login and adds them to the admin list. They'll sign in at <code className="text-[#E8620A]">/quiveradminconsole007</code> with the password you set.</p>
                    <div className="grid md:grid-cols-3 gap-3">
                      <Field label="Email">
                        <Input placeholder="name@example.com" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className={inputCls} />
                      </Field>
                      <Field label="Temporary Password">
                        <div className="relative">
                          <Input placeholder="At least 6 characters" type={showInvitePw ? 'text' : 'password'} value={invitePassword} onChange={e => setInvitePassword(e.target.value)} className={inputCls + ' pr-10'} />
                          <button type="button" onClick={() => setShowInvitePw(!showInvitePw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B5E50] hover:text-white">
                            {showInvitePw ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const prefix = inviteEmail.split('@')[0];
                            if (prefix) {
                              const randomSuffix = Math.random().toString(36).slice(2, 6);
                              setInvitePassword(prefix + randomSuffix);
                            }
                          }}
                          className="text-[10px] text-[#E8620A] hover:text-[#cf5709] mt-1 underline underline-offset-2"
                          disabled={!inviteEmail.includes('@')}
                        >
                          Generate from email
                        </button>
                      </Field>
                      <Field label="Role">
                        <select value={inviteRole} onChange={e => setInviteRole(e.target.value as 'admin' | 'super_admin')} className={`${inputCls} rounded-md px-3 py-2 border text-sm w-full`}>
                          <option value="admin">Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      </Field>
                    </div>
                    <Button onClick={inviteAdmin} className="bg-[#E8620A] hover:bg-[#cf5709] text-white"><Users size={14} className="mr-1" /> Create Admin</Button>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <ScrollToTop />
    </div>
    </AdminErrorBoundary>
  );
}
