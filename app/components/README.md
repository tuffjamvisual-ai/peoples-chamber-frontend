# app/components

## PageShell: the order a page opens in on a phone

`PageShell.tsx` (QA6 A7, owner, 10 November 2026) gives every page the same first screen:

1. **Title:** the page's `h1`.
2. **Note:** one line saying what the page is. It is optional.
3. **Main action:** the one thing a reader came to do, such as a search field, a postcode box, the first question or the first record. Its wrapper carries `data-main-action`.
4. **Sections:** everything else, each in a native `<details>` fold. Folds are closed unless `open` is set, and they work with JavaScript off.

```tsx
import PageShell from '@/app/components/PageShell';

<PageShell
  title="Donors"
  note="The 200 biggest UK political donors by lifetime giving."
  mainAction={<DonorSearch />}
  sections={[
    { id: 'top-donors', label: 'Top 200 donors', summary: '200 donors', open: true, children: <DonorTable /> },
    { id: 'method', label: 'How this is counted', children: <Method /> },
  ]}
/>
```

### The gate

The QA1 rendered checks, run by the pre-push hook, measure `data-main-action` on one page of each type. This is check A6 in `scripts/checks/qa/rendered-checks.mjs`. The main action must start:

- above 760px at 430 x 932;
- above 700px at 390 x 844;
- above 520px at 320 x 568;
- within 390px at 844 x 390, where the `h1` must start within 390px too.

Every page type marks its main action: a page with no `data-main-action` fails A6 whatever the baseline says (UX3c). The A6 baseline in `rendered-baseline.json` is empty, so any A6 failure blocks a push.

If a page cannot use `PageShell` yet, put `data-main-action` on its main action directly. A6 measures whichever element carries it.

### Rules

- **One main action per page.** A6 reads the first element marked `data-main-action`.
- **Main action, not a filler line.** Nothing between the note and the main action that a reader has to scroll past. Use a section for it.
- **Summaries are honest.** A section summary comes from figures already on the page, or is left out.
- **The shell sets no page width or margins.** It sits inside `OpenGovShell` like any page content.
