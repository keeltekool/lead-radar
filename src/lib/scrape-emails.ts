// Common contact page paths for Estonian and international sites
const CONTACT_PATHS = [
  "",           // homepage
  "/kontakt",
  "/kontaktid",
  "/contact",
  "/contact-us",
  "/meist",
  "/about",
  "/about-us",
  "/info",
];

const JUNK_PATTERNS = [
  ".png", ".jpg", ".svg", ".webp", ".gif", ".css", ".js",
  "wixpress", "sentry", "example.com", "email.com",
  "wordpress.org", "w3.org", "schema.org", "googleapis.com",
  "gravatar.com", "creativecommons.org",
];

async function fetchPageEmails(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });
    if (!res.ok) return [];
    const html = await res.text();

    // Match emails in plain text and mailto: links
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const rawEmails = html.match(emailRegex) || [];

    return rawEmails.filter(
      (e) => !JUNK_PATTERNS.some((p) => e.toLowerCase().includes(p))
    );
  } catch {
    return [];
  }
}

export async function scrapeEmails(websiteUrl: string): Promise<string[]> {
  try {
    // Normalize base URL
    const base = new URL(websiteUrl);
    const origin = base.origin;

    // Scrape homepage + contact pages in parallel
    const urls = CONTACT_PATHS.map((path) => `${origin}${path}`);
    const results = await Promise.allSettled(
      urls.map((url) => fetchPageEmails(url))
    );

    const allEmails: string[] = [];
    for (const result of results) {
      if (result.status === "fulfilled") {
        allEmails.push(...result.value);
      }
    }

    // Deduplicate and return
    return [...new Set(allEmails)].slice(0, 10);
  } catch {
    return [];
  }
}
