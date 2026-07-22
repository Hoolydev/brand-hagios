import * as cheerio from "cheerio";

export type SourceMetadata = {
  url: string;
  canonicalUrl: string | null;
  title: string;
  publisher: string | null;
  summary: string | null;
  imageUrl: string | null;
};

function isBlockedHost(hostname: string) {
  const host = hostname.toLowerCase();
  return host === "localhost" || host.endsWith(".local") || host === "0.0.0.0" || host === "::1" ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) || /^169\.254\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host);
}

export function assertSafeExternalUrl(value: string) {
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || isBlockedHost(url.hostname)) {
    throw new Error("URL externa inválida ou bloqueada");
  }
  return url;
}

function absoluteUrl(value: string | undefined, base: URL) {
  if (!value) return null;
  try {
    return new URL(value, base).toString();
  } catch {
    return null;
  }
}

export async function readSourceMetadata(value: string): Promise<SourceMetadata> {
  const url = assertSafeExternalUrl(value);
  const response = await fetch(url, {
    headers: { "User-Agent": "HagiosResearchBot/1.0 (+editorial-source-preview)" },
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Fonte respondeu ${response.status}`);
  const html = await response.text();
  const $ = cheerio.load(html.slice(0, 1_500_000));
  const finalUrl = new URL(response.url || url.toString());
  const title = $('meta[property="og:title"]').attr("content") || $("title").text().trim() || finalUrl.hostname;
  const summary = $('meta[property="og:description"]').attr("content") || $('meta[name="description"]').attr("content") || null;
  const publisher = $('meta[property="og:site_name"]').attr("content") || finalUrl.hostname.replace(/^www\./, "");
  const canonicalUrl = absoluteUrl($('link[rel="canonical"]').attr("href"), finalUrl);
  const imageUrl = absoluteUrl($('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content"), finalUrl);
  return { url: finalUrl.toString(), canonicalUrl, title, publisher, summary, imageUrl };
}
