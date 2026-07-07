const SITE_URL = 'https://cherubscove.net';
const DEFAULT_TITLE = 'Cherubs Cove Ministry — The Making Place';
const DEFAULT_DESC =
  'An interdenominational ministry raising burning youths for the Lord. Home of the International Quivers Conference.';
const DEFAULT_IMAGE = SITE_URL + '/og-image.jpg';

/**
 * Page-specific SEO overrides keyed by path prefix.
 * Order matters — first match wins.
 */
const PAGE_META = [
  { match: (p) => p === '/' || p === '', title: DEFAULT_TITLE, desc: DEFAULT_DESC },
  {
    match: (p) => p.startsWith('/about-jesse'),
    title: 'About Jesse Falodun — President, Cherubs Cove Ministry',
    desc: 'Meet Jesse Falodun, President of Cherubs Cove Ministry. OAP, Spoken Word Artist, and convener of the International Quivers Conference.',
  },
  {
    match: (p) => p.startsWith('/events-conferences'),
    title: 'Events & Conferences — Cherubs Cove Ministry',
    desc: 'Join us at the International Quivers Conference and other gatherings. Annual conferences, monthly services, and mid-week fellowships.',
  },
  {
    match: (p) => p.startsWith('/past-conferences'),
    title: 'Past Conferences Archive — Cherubs Cove Ministry',
    desc: 'Photo galleries from past editions of the International Quivers Conference — a visual journey through years of encounter.',
  },
  {
    match: (p) => p.startsWith('/resources') || p.startsWith('/downloads'),
    title: 'Sermons & Downloads — Cherubs Cove Ministry',
    desc: 'Download sermon audio, video teachings, and study documents from Cherubs Cove Ministry and the International Quivers Conference.',
  },
  {
    match: (p) => p.startsWith('/connect'),
    title: 'Connect — Cherubs Cove Ministry',
    desc: 'Get in touch with Cherubs Cove Ministry. Subscribe to our newsletter, follow us on social media, or send us a message.',
  },
  {
    match: (p) => p.startsWith('/register'),
    title: 'Register for Events — Cherubs Cove Ministry',
    desc: 'Register for upcoming events at Cherubs Cove Ministry. Free registration for the International Quivers Conference and other gatherings.',
  },
  {
    match: (p) => p.startsWith('/quiveradminconsole007'),
    title: 'Admin — Cherubs Cove Ministry',
    desc: 'Cherubs Cove Ministry administration dashboard.',
  },
];

function getMeta(path) {
  const normalized = path.split('?')[0].replace(/\/+$/, '') || '/';
  for (const page of PAGE_META) {
    if (page.match(normalized)) {
      return { title: page.title, desc: page.desc, image: DEFAULT_IMAGE };
    }
  }
  return { title: DEFAULT_TITLE, desc: DEFAULT_DESC, image: DEFAULT_IMAGE };
}

module.exports = function handler(req, res) {
  const path = req.url || '/';
  const meta = getMeta(path);
  const url = SITE_URL + (path.split('?')[0] || '/');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${meta.title}</title>
<meta name="description" content="${meta.desc}"/>
<meta property="og:type" content="website"/>
<meta property="og:title" content="${meta.title}"/>
<meta property="og:description" content="${meta.desc}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:image" content="${meta.image}"/>
<meta property="og:site_name" content="Cherubs Cove Ministry — The Making Place"/>
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${meta.title}"/>
<meta name="twitter:description" content="${meta.desc}"/>
<meta name="twitter:image" content="${meta.image}"/>
<meta http-equiv="refresh" content="0;url=${url}"/>
<link rel="canonical" href="${url}"/>
</head>
<body>
<script>window.location.replace("${url}");</script>
</body>
</html>`);
};
