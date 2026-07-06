import { useEffect } from 'react';
import { useSiteSettings, getSetting } from '@/hooks/useSiteSettings';

/**
 * Reads PWA settings from site_settings and dynamically updates the
 * manifest.webmanifest link so the browser sees the admin-customized
 * app name, icons, colors, etc. at runtime.
 *
 * Also updates apple-touch-icon and theme-color meta tags.
 */
export function useDynamicManifest() {
  const settings = useSiteSettings();

  useEffect(() => {
    const name = getSetting(settings, 'pwa_short_name', 'Cherubs Cove');
    const fullName = getSetting(settings, 'pwa_popup_title', 'Cherubs Cove Ministry — The Making Place').replace(/^Install\s+/i, '');
    const description = getSetting(settings, 'pwa_popup_description', 'An interdenominational ministry raising burning youths for the Lord.');
    const themeColor = getSetting(settings, 'pwa_theme_color', '#0f172a');
    const bgColor = getSetting(settings, 'pwa_theme_color', '#0f172a');
    const icon192 = getSetting(settings, 'pwa_icon_192_url', '/pwa-192x192.png');
    const icon512 = getSetting(settings, 'pwa_icon_512_url', '/pwa-512x512.png');
    const appleIcon = getSetting(settings, 'pwa_icon_apple_url', '/apple-touch-icon.png');

    // ── Update apple-touch-icon ──────────────────────────────────────────
    let appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (appleLink) {
      appleLink.href = appleIcon;
    } else if (appleIcon) {
      appleLink = document.createElement('link');
      appleLink.rel = 'apple-touch-icon';
      appleLink.href = appleIcon;
      document.head.appendChild(appleLink);
    }

    // ── Update theme-color meta ──────────────────────────────────────────
    let themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.content = themeColor;
    } else {
      themeMeta = document.createElement('meta');
      themeMeta.name = 'theme-color';
      themeMeta.content = themeColor;
      document.head.appendChild(themeMeta);
    }

    // ── Convert relative URLs to absolute URLs ──────────────────────────
    // Blob-served manifests can have issues resolving relative paths,
    // so we always use the full origin for start_url, scope, and icons.
    const origin = window.location.origin;
    const toAbsolute = (url: string) => {
      if (!url) return url;
      if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) return url;
      return origin + (url.startsWith('/') ? url : '/' + url);
    };

    // ── Generate & inject dynamic manifest.webmanifest ────────────────────
    const manifest: Record<string, any> = {
      name: fullName,
      short_name: name,
      description,
      start_url: origin + '/',
      display: 'standalone',
      background_color: bgColor,
      theme_color: themeColor,
      lang: 'en',
      scope: origin + '/',
      orientation: 'portrait-primary',
      icons: [
        {
          src: toAbsolute(icon192),
          sizes: '192x192',
          type: 'image/png',
        },
        {
          src: toAbsolute(icon512),
          sizes: '512x512',
          type: 'image/png',
        },
        {
          src: toAbsolute(icon512),
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    };

    const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);

    // Find existing manifest link or create one
    let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifestLink) {
      manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      document.head.appendChild(manifestLink);
    }

    // Revoke old blob URL if we set one previously
    const oldBlobUrl = (manifestLink as any)._dynamicBlobUrl;
    if (oldBlobUrl) URL.revokeObjectURL(oldBlobUrl);

    manifestLink.href = blobUrl;
    (manifestLink as any)._dynamicBlobUrl = blobUrl;

    // Cleanup on unmount
    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [settings]);
}
