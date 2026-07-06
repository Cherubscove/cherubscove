import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';

export interface SEOProps {
  /** Page-specific <title> — if omitted falls back to site default */
  title?: string;
  /** Page-specific meta description */
  description?: string;
  /** Canonical / og:url path (e.g. "/about-jesse"). Defaults to current pathname. */
  path?: string;
  /** Page-specific og:image URL */
  image?: string;
  /** Type of og:type (default "website") */
  type?: string;
  /** JSON-LD structured data to inject */
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const SITE_URL = 'https://cherubscove.net';
const SITE_NAME = 'Cherubs Cove Ministry — The Making Place';

/**
 * SEO component — updates <title>, meta tags, og/twitter properties,
 * canonical link, and injects JSON-LD structured data on mount.
 * Place one per page, preferably near the top of the component tree.
 */
export default function SEO({
  title,
  description,
  path,
  image,
  type = 'website',
  jsonLd,
}: SEOProps) {
  const settings = useSiteSettings();
  const location = useLocation();
  const jsonLdRef = useRef<HTMLScriptElement | null>(null);

  const defaultTitle = getSetting(settings, 'seo_default_title', SITE_NAME);
  const defaultDescription = getSetting(
    settings,
    'seo_default_description',
    'An interdenominational ministry raising burning youths for the Lord. Home of the International Quivers Conference.',
  );
  const defaultImage = getSetting(
    settings,
    'seo_default_image',
    'https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/521415bc-95f5-45dd-8ba6-a559b83800b0/id-preview-f8413c32--4c3af28d-7334-4cb2-a015-3cd76b4f1c68.lovable.app-1775261401832.png',
  );

  const effectiveTitle = title || defaultTitle;
  const effectiveDescription = description || defaultDescription;
  const effectiveImage = image || defaultImage;
  const effectiveUrl = `${SITE_URL}${path || location.pathname}`;

  useEffect(() => {
    // Helper to set or update a meta tag
    const setMeta = (name: string, content: string, property?: string) => {
      const attr = property ? 'property' : 'name';
      const attrVal = property || name;
      let el = document.querySelector(`meta[${attr}="${attrVal}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, attrVal);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Remove existing JSON-LD script if any
    if (jsonLdRef.current) {
      jsonLdRef.current.remove();
      jsonLdRef.current = null;
    }

    // --- Title ---
    document.title = effectiveTitle;

    // --- Standard meta ---
    setMeta('description', effectiveDescription);

    // --- Open Graph ---
    setMeta('og:title', effectiveTitle, 'og:title');
    setMeta('og:description', effectiveDescription, 'og:description');
    setMeta('og:url', effectiveUrl, 'og:url');
    setMeta('og:image', effectiveImage, 'og:image');
    setMeta('og:type', type, 'og:type');
    setMeta('og:site_name', SITE_NAME, 'og:site_name');

    // --- Twitter Card ---
    setMeta('twitter:card', 'summary_large_image');
    setMeta('twitter:title', effectiveTitle);
    setMeta('twitter:description', effectiveDescription);
    setMeta('twitter:image', effectiveImage);

    // --- Canonical ---
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', effectiveUrl);

    // --- JSON-LD ---
    if (jsonLd) {
      const scripts = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      const frag = document.createDocumentFragment();
      for (const data of scripts) {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.textContent = JSON.stringify(data);
        frag.appendChild(script);
        jsonLdRef.current = script;
      }
      document.head.appendChild(frag);
    }

    // Cleanup
    return () => {
      // Title is restored by the next SEO mount automatically
      if (jsonLdRef.current) {
        jsonLdRef.current.remove();
        jsonLdRef.current = null;
      }
    };
  }, [
    effectiveTitle,
    effectiveDescription,
    effectiveImage,
    effectiveUrl,
    type,
    jsonLd,
  ]);

  // This component does not render any visible UI
  return null;
}

/**
 * Factory helpers for common JSON-LD schemas.
 */

export function orgJsonLd(settings: Record<string, string>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Cherubs Cove Ministry',
    alternateName: 'Cherubs Cove',
    description:
      'An interdenominational ministry raising burning youths for the Lord. Home of the International Quivers Conference.',
    url: SITE_URL,
    logo: getSetting(settings, 'seo_default_image', ''),
    foundingDate: '2023',
    founder: {
      '@type': 'Person',
      name: 'Jesse Falodun',
      jobTitle: 'President',
    },
    sameAs: [
      getSetting(settings, 'facebook_url', ''),
      getSetting(settings, 'youtube_url', ''),
      getSetting(settings, 'instagram_url', ''),
      getSetting(settings, 'twitter_url', ''),
    ].filter(Boolean),
    contactPoint: {
      '@type': 'ContactPoint',
      email: getSetting(settings, 'contact_email', 'cherubscove@gmail.com'),
      telephone: getSetting(settings, 'contact_phone', '+234 817 930 3228'),
      contactType: 'general',
    },
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function eventJsonLd(event: {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  location?: string;
  image?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description || '',
    startDate: event.startDate,
    ...(event.endDate ? { endDate: event.endDate } : {}),
    ...(event.location
      ? {
          location: {
            '@type': 'Place',
            name: event.location,
          },
        }
      : {}),
    ...(event.image ? { image: event.image } : {}),
  };
}
