const DISALLOWED_BLOCK_TAGS = /<\/?(script|style|iframe|object|embed|link|meta|base|form)[^>]*>/gi;
const EVENT_HANDLER_ATTR = /\son[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi;
const JS_PROTOCOL_ATTR = /\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi;

/**
 * Sanitizes user-authored HTML email templates using a conservative allow strategy.
 * Keeps HTML formatting while removing scriptable vectors.
 */
export function sanitizeHtmlEmail(input: string): string {
  return input
    .replace(DISALLOWED_BLOCK_TAGS, "")
    .replace(EVENT_HANDLER_ATTR, "")
    .replace(JS_PROTOCOL_ATTR, "");
}

/**
 * Converts rich HTML to plaintext for email providers and clients that prefer text.
 */
export function htmlToPlainText(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n");
  const withoutTags = withBreaks.replace(/<[^>]+>/g, " ");
  const decoded = withoutTags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
  return decoded.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
}
