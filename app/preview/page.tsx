import MagazineLayout from "../components/MagazineLayout";

/*
  Verification overlay
  --------------------
  To compare the rendered page against /public/reference.png at 50% opacity,
  flip DEBUG_OVERLAY to true. The reference image is anchored to the
  magazine-page top-left, 1024px wide, with pointer-events disabled so it
  doesn't block interaction.

  Keep DEBUG_OVERLAY = false before merging / shipping to production.
*/
const DEBUG_OVERLAY = false;

export default function PreviewPage() {
  return (
    <MagazineLayout debug={DEBUG_OVERLAY}>
      <section aria-label="Magazine layout preview" />
    </MagazineLayout>
  );
}
