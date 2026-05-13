'use client';

export default function ScrollToTopButton() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        style={{
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          background: '#7a1612',
          color: '#f4e8d4',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'rotate(-90deg)',
          transition: 'background 0.2s',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#5a1210')}
        onMouseLeave={(e) => (e.currentTarget.style.background = '#7a1612')}
      >
        →
      </button>
    </div>
  );
}
