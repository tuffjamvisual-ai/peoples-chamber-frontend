// Footer is rendered as a single image (public/footer.png) — same
// approach as the home.png landing-page strip. Just an <img> at full
// container width, no React layout to maintain. Add absolute-positioned
// <Link> hotspots below the img if any pillar needs to be clickable.

export default function PillarsFooter() {
  return (
    <footer
      style={{
        position: 'relative',
        marginTop: '64px',
        width: '100%',
        lineHeight: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/footer.png"
        alt="opengovt, 100% independent, contact / donate, open to all, accountability first"
        style={{ display: 'block', width: '100%', height: 'auto' }}
      />
    </footer>
  );
}
