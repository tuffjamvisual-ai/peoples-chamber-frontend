// Strips unsafe or site-policy-violating elements from trusted government HTML
// (Hansard debate transcripts, Parliament committee purpose blocks).
//
//   <script> / <style>           — security
//   .column-number spans         — Hansard layout artefact; harmless no-op on other sources
//   <a> / </a>                   — site policy: opengovt never links offsite
//   on* event handlers           — security
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<span[^>]*class="column-number[^"]*"[^>]*>\s*<\/span>/gi, '')
    .replace(/<a\b[^>]*>/gi, '')
    .replace(/<\/a>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .trim();
}
