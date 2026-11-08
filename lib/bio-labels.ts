// Biography paragraph labels (owner, 8 Nov 2026, DR1 and DR2). A paragraph of mp_biography.political_bio may start with
// "**Label.**": exactly two asterisks, a label ending in a full stop, two asterisks, then a space or the paragraph's end.
// The MP page shows the label in bold (MagazineProfileSections.tsx, BIO_LABEL); plain text outputs such as the RSS feed
// show "Label." with the asterisks removed. Only that pattern, only at the very start of a paragraph (the start of the
// text, or after a blank line); any other asterisks are left as they are, and a text without labels is returned unchanged.
const LABEL_AT_PARAGRAPH_START = /(^|\n[ \t]*\n\s*)\*\*([^*\n]+\.)\*\*(?=[ \n]|$)/g;

export function stripParagraphLabels(text: string): string {
  return text.replace(LABEL_AT_PARAGRAPH_START, '$1$2');
}

// For the RSS feed's one sentence lead (owner, 8 Nov 2026, DR3): a biography that starts with a label loses that label, so
// the lead is the first sentence after it; any later labels are plain "Label.". A biography without labels is unchanged.
const LEADING_LABEL = /^\*\*[^*\n]+\.\*\*(?: |(?=\n)|$)/;
export function withoutLeadingLabel(text: string): string {
  return stripParagraphLabels(text.replace(LEADING_LABEL, ''));
}
