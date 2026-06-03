// /expenses/story — three-chapter feature article with a parchment
// book-turn animation between chapters. Layout injects the View
// Transitions keyframes that StoryNav triggers on Prev/Next clicks.
//
// Animation: outgoing chapter pivots on its LEFT edge (book spine)
// and rotates AWAY from the reader, stopping at about -72deg with
// reduced opacity — visible-but-clearly-turning, like a paper page
// mid-flip. The incoming chapter fades in beneath as the old page
// turns. Total length ~900ms.
//
// IMPORTANT: the animation only activates when navigation is wrapped
// in document.startViewTransition() — i.e. only the Next/Previous
// buttons in StoryNav.tsx. The top BackLink ('← Back to Top 10') uses
// router.back() / router.push() directly with no view-transition
// wrapper, so it routes normally with no fold.
//
// View Transitions API: Chrome 111+, Edge 111+, Safari 18+, Firefox
// 138+ stable. Older browsers route normally with no animation.

export default function StoryLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        /* Outgoing chapter: book page turning over its left spine.
           Stops at -72deg with opacity 0.35 so the page remains
           partially visible as it rotates away — the 'closing book
           leaf' read the user asked for. */
        @keyframes pca-book-turn-out {
          0%   { transform: perspective(2000px) rotateY(0deg);   opacity: 1;    box-shadow: 0 0 0 rgba(0,0,0,0); }
          55%  { transform: perspective(2000px) rotateY(-48deg); opacity: 0.7;  box-shadow: 24px 16px 28px -12px rgba(20,16,13,0.45); }
          100% { transform: perspective(2000px) rotateY(-72deg); opacity: 0.35; box-shadow: 36px 22px 40px -18px rgba(20,16,13,0.6); }
        }
        /* Incoming chapter: was sitting beneath the outgoing leaf.
           Just fades in as the leaf turns away. No 3D — the new page
           is the destination state, so it should feel arrived, not
           still-arriving. */
        @keyframes pca-book-fade-in {
          0%   { opacity: 0; }
          40%  { opacity: 0.15; }
          100% { opacity: 1; }
        }

        ::view-transition-old(pca-chapter) {
          animation: pca-book-turn-out 760ms cubic-bezier(0.55, 0, 0.45, 1) both;
          transform-origin: left center;
          backface-visibility: hidden;
          z-index: 2;
        }
        ::view-transition-new(pca-chapter) {
          animation: pca-book-fade-in 700ms ease-out both;
          z-index: 1;
        }
        /* Disable the default crossfade group so our two halves
           drive the timing. */
        ::view-transition-group(pca-chapter) {
          animation-duration: 900ms;
        }

        @media (prefers-reduced-motion: reduce) {
          ::view-transition-old(pca-chapter),
          ::view-transition-new(pca-chapter) {
            animation: none !important;
          }
        }
      `}</style>
      {children}
    </>
  );
}
