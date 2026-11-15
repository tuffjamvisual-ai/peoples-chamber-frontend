// How an unsubscribe request is answered (security review L6 and COWORK-TO-T1 ENTRY 58 item 2, owner approved 14 Nov
// 2026). Opening the link in an email (GET) used to unsubscribe at once, so the link checkers some mail services run on
// every link (Outlook Safe Links and similar) could unsubscribe a reader who never clicked. Now:
//  - GET: no change to anything; the reader is sent to a page with one "Unsubscribe" button (/newsletter/unsubscribe).
//  - POST from that page's form (it carries confirm=1): unsubscribe, then back to /newsletter with the result.
//  - Any other POST: a mail program's one-click unsubscribe (List-Unsubscribe-Post, RFC 8058, body
//    "List-Unsubscribe=One-Click"): unsubscribe and answer with JSON, as before.
export type UnsubscribeAction = 'show-confirm-page' | 'form-confirmed' | 'one-click';
export const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function unsubscribeAction(method: string, form: { confirm?: string | null } | null): UnsubscribeAction {
  if (method.toUpperCase() !== 'POST') return 'show-confirm-page';
  return form?.confirm === '1' ? 'form-confirmed' : 'one-click';
}
