import './preview-4.css';

const navItems = [
  "Home",
  "Bills",
  "Laws",
  "People's Polls",
  "MPs",
  "Departments",
  "Transparency",
  "Search",
  "About",
];

const spinItems = [
  {
    title: "94% of Britons want Lords gone. The other 6% are Lords.",
    copy:
      "Polling on the Removal of Peerages Bill has surfaced a result so neat it deserves to be stitched onto a tea towel: 94% of the British public would like the House of Lords abolished, while 6% would prefer it left exactly as it is.",
  },
  {
    title: "99% want more doctors trained. The 1% are consultants.",
    copy:
      "The Medical Training (Prioritisation) Act has secured 99% public support. Train more doctors, train them faster, and stop allowing the entire pipeline to drain steadily away.",
  },
  {
    title:
      "MP claims £367,659 in expenses, insists it's “terribly efficient” compared to last year",
    copy:
      "Stuart Andrew, MP for Daventry, has claimed £367,659 in business costs for 2024-25, earning the unofficial gold medal in this year's Big Spenders league.",
  },
];

const liveNumbers = [
  ["3,884", "Bills tracked"],
  ["650", "Sitting MPs"],
  ["32,377", "Contracts"],
  ["7,670", "Donations"],
];

const bigSpenders = [
  ["1", "Stuart Andrew", "Daventry", "£368k"],
  ["2", "Brendan O'Hara", "Argyll, Bute and South Lochaber", "£358k"],
  ["3", "Jamie Stone", "Caithness, Sutherland and Easter Ross", "£346k"],
];

const pressItems = [
  [
    "Department for Science, Innovation and Technology",
    "Government steps up action to strengthen cyber defences as UK cyber industry continues to grow",
    "11 May",
  ],
  [
    "Prime Minister's Office, 10 Downing Street",
    "PM vows to tear up “status quo” that failed young people on apprenticeships and skills",
    "11 May",
  ],
  [
    "Foreign, Commonwealth & Development Office",
    "UK sanctions Iranian targets in response to national security threats",
    "11 May",
  ],
  [
    "Skills England",
    "Simpler, shared system for describing skills needs launched",
    "11 May",
  ],
];

export default function HomePage() {
  return (
    <main className="site-frame">
      <div className="page-shell">
        <header className="masthead">
          <div className="brand-block">
            <div className="portcullis" aria-hidden="true">
              ♜
            </div>
            <div>
              <p className="issue-note">Public-record reporting</p>
              <h1>Open Govt</h1>
              <p className="strapline">UK Government. In Public View.</p>
            </div>
          </div>

          <div className="masthead-sticker">
            <span>No spin.</span>
            <strong>Just the public record.</strong>
          </div>
        </header>

        <nav className="nav-strip" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item} href="#" className="nav-link">
              {item}
            </a>
          ))}
          <button className="search-button" aria-label="Search">
            ⌕
          </button>
        </nav>

        <section className="hero-grid">
          <article className="hero-copy panel">
            <p className="kicker">Cover story</p>
            <h2>
              Power
              <br />
              isn&apos;t hidden.
              <br />
              <span>It&apos;s published.</span>
            </h2>
            <p className="hero-text">
              Vote on bills, browse contracts, and keep an eye on who&apos;s
              coming and going through the Westminster door.
            </p>
            <div className="hero-actions">
              <a href="#" className="button button-red">
                Vote on Bills →
              </a>
              <a href="#" className="button button-blue">
                Transparency Records →
              </a>
            </div>
          </article>

          <article className="hero-art panel">
            <div className="comic-sky" />
            <div className="parliament-shape">
              <div className="clock-tower" />
              <div className="westminster-block" />
            </div>
            <div className="crowd" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="placard placard-one">Where&apos;s our money?</div>
            <div className="placard placard-two">Accountability is not a scandal.</div>
            <div className="speech-bubble">Finally. Someone checking.</div>
          </article>

          <aside className="issue-sidebar panel">
            <h3>In this issue...</h3>
            <a href="#" className="issue-card purple">
              <span>Featured Vote</span>
              <strong>Removal of Peerages Bill</strong>
              <small>Public tally inside</small>
            </a>
            <a href="#" className="issue-card green">
              <span>Notable Transaction</span>
              <strong>Largest contract on record</strong>
              <small>£11.8bn view details</small>
            </a>
            <a href="#" className="issue-card orange">
              <span>Today&apos;s Spin</span>
              <strong>Independent press, with our take.</strong>
              <small>Read the latest</small>
            </a>
          </aside>
        </section>

        <section className="live-strip">
          <strong>Live Numbers</strong>
          <span>Pulled from the records this hour.</span>
          {liveNumbers.map(([value, label]) => (
            <div key={label} className="live-number">
              <b>{value}</b>
              <small>{label}</small>
            </div>
          ))}
        </section>

        <section className="content-grid">
          <article className="panel top-story">
            <p className="label-red">Top story · Animal and Plant Health Agency</p>
            <h2>New £3 million Centre to help grow healthy gardens</h2>
            <p>
              A new National Centre for Environmental Horticulture Plant Health
              will help to protect the UK&apos;s 23 million gardens.
            </p>
            <div className="garden-art" aria-hidden="true">
              <span className="sun" />
              <span className="plant p1" />
              <span className="plant p2" />
              <span className="plant p3" />
            </div>
            <a className="text-link" href="#">
              Read the full story →
            </a>
          </article>

          <article className="panel vote-card">
            <p className="label-yellow">Featured Vote · Public Tally</p>
            <h2>Removal of Peerages Bill</h2>
            <p>
              1,577 members of the public have voted. Parliament&apos;s tally may
              differ. Read the bill, then add yours.
            </p>
            <div className="vote-bars">
              <div>
                <strong>94%</strong>
                <span>Support</span>
              </div>
              <div>
                <strong>6%</strong>
                <span>Oppose</span>
              </div>
            </div>
            <p className="small-stat">1,484 yes · 93 no · 0 abstain · 1,577 total</p>
            <div className="button-row">
              <a href="#" className="mini-button">
                Read the full story →
              </a>
              <a href="#" className="mini-button">
                See how MPs voted →
              </a>
            </div>
          </article>

          <article className="panel contract-card">
            <p className="label-blue">Notable Transaction</p>
            <h2>Largest contract on record.</h2>
            <p>
              Norfolk &amp; Norwich University Hospitals NHS Foundation Trust
              (Including James Paget University Hospitals NHS Foundation Trust
              and The Queen Elizabeth Hospital Kings Lynn NHS Foundation Trust)
              Acute Services Contract 2026 - 2031.
            </p>
            <p className="muted">
              Awarded to Norfolk &amp; Norwich University Hospitals NHS Foundation
              Trust.
            </p>
            <a href="#" className="money-button">
              £11.8bn view details →
            </a>
          </article>

          <article className="panel spin-panel">
            <div className="panel-title-row">
              <h2>Today&apos;s Spin</h2>
              <span>Independent press, with our take.</span>
            </div>

            <div className="spin-list">
              {spinItems.map((item) => (
                <section key={item.title} className="spin-item">
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                  <a href="#">Read at thepeopleschamber.uk ↗</a>
                </section>
              ))}
            </div>
          </article>

          <article className="panel spenders-panel">
            <p className="label-black">The Big Spenders · 2024 / 2025</p>
            <h2>Who&apos;s spending your money?</h2>
            <p>
              The ten MPs with the biggest business-cost claims this year.
              Mostly the ones whose constituencies are furthest from Westminster.
              Make of that what you will.
            </p>
            <ol className="spender-list">
              {bigSpenders.map(([rank, name, seat, amount]) => (
                <li key={name}>
                  <span>{rank}</span>
                  <div>
                    <strong>{name}</strong>
                    <small>{seat}</small>
                  </div>
                  <b>{amount}</b>
                </li>
              ))}
            </ol>
            <a className="text-link" href="#">
              See top 10 →
            </a>
          </article>

          <article className="panel press-panel">
            <div className="panel-title-row">
              <h2>From the Press Offices</h2>
              <span>The official line, straight from Whitehall.</span>
            </div>
            <div className="press-list">
              {pressItems.map(([dept, title, date]) => (
                <a href="#" key={title} className="press-item">
                  <strong>{dept}</strong>
                  <span>{title}</span>
                  <em>{date}</em>
                </a>
              ))}
            </div>
          </article>

          <article className="panel take-part">
            <p className="label-green">Take part</p>
            <h2>Add your voice to the public record.</h2>
            <p>
              Vote on bills, browse contracts, and keep an eye on who&apos;s
              coming and going through the Westminster door. We track it. You
              decide what to make of it.
            </p>
            <div className="hero-actions">
              <a href="#" className="button button-red">
                Vote on Bills →
              </a>
              <a href="#" className="button button-blue">
                Transparency Records →
              </a>
            </div>
          </article>
        </section>

        <section className="proof-strip">
          <div>
            <strong>100% Independent</strong>
            <span>Not funded by government or political parties.</span>
          </div>
          <div>
            <strong>Real-time Data</strong>
            <span>Live updates from official sources across the UK.</span>
          </div>
          <div>
            <strong>Open to All</strong>
            <span>Built for citizens, not politicians.</span>
          </div>
          <div>
            <strong>Accountability First</strong>
            <span>Because transparency drives better government.</span>
          </div>
        </section>

        <footer className="footer">
          <div>
            <h2>Open Govt</h2>
            <p>
              UK political transparency. Built from official sources: Parliament,
              IPSA, Companies House, Electoral Commission, Cabinet Office.
              Updated daily.
            </p>
          </div>

          <div className="footer-columns">
            <section>
              <h3>Records</h3>
              <a href="#">Bills</a>
              <a href="#">MPs</a>
              <a href="#">Departments</a>
              <a href="#">Transparency</a>
              <a href="#">Expenses</a>
              <a href="#">Earnings</a>
            </section>

            <section>
              <h3>Legal</h3>
              <a href="#">About &amp; Methodology</a>
              <a href="#">Sources</a>
              <a href="#">Privacy</a>
              <a href="#">Terms</a>
            </section>

            <section>
              <h3>Connect</h3>
              <a href="#">GitHub ↗</a>
              <a href="#">Contact</a>
            </section>
          </div>
        </footer>
      </div>
    </main>
  );
}
