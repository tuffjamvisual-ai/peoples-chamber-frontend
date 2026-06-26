'use client';

export default function ScrollToTopButton() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        style={{
          background: 'transparent',
          border: 'none',
          padding: 0,
          color: '#000',
          fontSize: '44px',
          lineHeight: 1,
          cursor: 'pointer',
          transform: 'rotate(-90deg)',
        }}
      >
        →
      </button>
    </div>
  );
}
