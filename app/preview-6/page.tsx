import './preview-6.css';

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

const inTrayItems = [
  "Renters' Reform Bill (Committee Stage)",
  "Employment Rights Bill (Report Stage)",
  "Online Safety (Amendment) Bill (Committee Stage)",
];

const clarificationItems = [
  "MP Expenses Rules",
  "People's Lobbying Register",
  "Gift Transparency Thresholds",
];

const normalItems = ["Second Jobs", "Revolving Doors", "Consultancy Contracts"];

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

const bigSpenders = [
  {
    rank: "1",
    name: "Stuart Andrew",
    seat: "Daventry",
    amount: "£368k",
  },
  {
    rank: "2",
    name: "Brendan O'Hara",
    seat: "Argyll, Bute and South Lochaber",
    amount: "£358k",
  },
  {
    rank: "3",
    name: "Jamie Stone",
    seat: "Caithness, Sutherland and Easter Ross",
    amount: "£346k",
  },
];

const pressItems = [
  {
    department: "Department for Science, Innovation and Technology",
    title:
      "Government steps up action to strengthen cyber defences as UK cyber industry continues to grow",
    date: "11 May",
  },
  {
    department: "Prime Minister's Office, 10 Downing Street",
    title:
      "PM vows to tear up “status quo” that failed young people on apprenticeships and skills",
    date: "11 May",
  },
  {
    department: "Foreign, Commonwealth & Development Office",
    title: "UK sanctions Iranian targets in response to national security threats",
    date: "11 May",
  },
  {
    department: "Skills England",
    title: "Simpler, shared system for describing skills needs launched",
    date: "11 May",
  },
];

const liveNumbers = [
  {
    value: "3,884",
    label: "Bills tracked",
  },
  {
    value: "650",
    label: "Sitting MPs",
  },
  {
    value: "32,377",
    label: "Contracts",
  },
  {
    value: "7,670",
    label: "Donations",
  },
];

export default function HomePage() {
  return (
    <main className="outer-stage">
      <div className="page-shell">
        <header className="masthead">
          <div className="paperclip" aria-hidden="true" />

          <div className="stamp-row">
            <span className="stamp stamp-green">Public Version</span>
            <span className="stamp stamp-plain">Cleared for Citizens</span>
            <span className="stamp stamp-red">
              Ministerial Panic: Low to Moderate
            </span>
          </div>

          <div className="masthead-inner">
            <div className="crest-box" aria-hidden="true">
              ♜
            </div>

            <div>
              <h1>The People&apos;s Chamber</h1>
              <p>UK Government. In Public View.</p>
            </div>
          </div>
        </header>

        <nav className="nav-strip" aria-label="Primary navigation">
          {navItems.map((item) => (
            <a key={item} href="#">
              {item}
            </a>
          ))}
          <button aria-label="Search">⌕</button>
        </nav>

        <section className="hero-section">
          <article className="briefing-copy">
            <span className="small-label">Briefing Note</span>

            <h2>
              Power is
              <br />
              not hidden.
              <br />
              It is minuted.
            </h2>

            <p>
              We read the records so the official version has less room to
              wander.
            </p>

            <div className="button-stack">
              <a href="#" className="briefing-button red">
                Read the Briefing →
              </a>
              <a href="#" className="briefing-button green">
                Follow the Money →
              </a>
            </div>
          </article>

          <article className="office-scene" aria-label="Whitehall office scene" />


          <aside className="filing-cabinet">
            <SidebarSection title="In The Tray" items={inTrayItems} red />
            <SidebarSection title="Waiting For Clarification" items={clarificationItems} />
            <SidebarSection title={'Filed Under “Perfectly Normal”'} items={normalItems} />
            <div className="drawer-note">
              <h3>Public Says Otherwise</h3>
              <p>
                Most polling says one thing. Westminster often does another.
                We keep the receipts.
              </p>
              <span>On File</span>
            </div>
          </aside>
        </section>

        <section className="card-grid">
          <article className="file-card ministerial">
            <span className="pin" />
            <p className="file-kicker">Ministerial Briefing · Top Story</p>
            <h2>New £3 million Centre to help grow healthy gardens</h2>
            <p>
              A new National Centre for Environmental Horticulture Plant Health
              will help to protect the UK&apos;s 23 million gardens.
            </p>
            <div className="plant-sketch" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <a href="#">Read the full story →</a>
          </article>

          <article className="file-card vote-card">
            <span className="pin" />
            <p className="file-kicker">Public Vote · Public Tally</p>
            <h2>Removal of Peerages Bill</h2>
            <p>
              1,577 members of the public have voted. Parliament&apos;s tally may
              differ. Read the bill, then add yours.
            </p>

            <div className="vote-split">
              <div>
                <strong>94%</strong>
                <span>Support</span>
              </div>
              <div>
                <strong>6%</strong>
                <span>Oppose</span>
              </div>
            </div>

            <p className="record-line">
              1,484 yes · 93 no · 0 abstain · 1,577 total
            </p>

            <div className="verified-stamp">Verified Public Tally</div>

            <a href="#">Read the bill →</a>
            <a href="#">See how MPs voted →</a>
          </article>

          <article className="file-card procurement">
            <span className="pin" />
            <p className="file-kicker">Procurement File · Notable Transaction</p>
            <h2>Largest contract on record.</h2>
            <p>
              Norfolk &amp; Norwich University Hospitals NHS Foundation Trust
              (Including James Paget University Hospitals NHS Foundation Trust
              and The Queen Elizabeth Hospital Kings Lynn NHS Foundation Trust)
              Acute Services Contract 2026 - 2031.
            </p>
            <p>
              Awarded to Norfolk &amp; Norwich University Hospitals NHS Foundation
              Trust.
            </p>
            <a className="money-link" href="#">
              £11.8bn view details →
            </a>
          </article>

          <article className="spin-board">
            <div className="section-heading">
              <h2>Today&apos;s Spin</h2>
              <p>Independent press, with our take.</p>
            </div>

            {spinItems.map((item, index) => (
              <section key={item.title} className="spin-row">
                <span>{index + 1}</span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                  <a href="#">Read more →</a>
                </div>
              </section>
            ))}
          </article>

          <article className="expenses-ledger">
            <div className="section-heading">
              <h2>Expenses Ledger</h2>
              <p>2024 / 2025</p>
            </div>

            <h3>Who&apos;s spending your money?</h3>
            <p>
              The ten MPs with the biggest business-cost claims this year.
              Mostly the ones whose constituencies are furthest from
              Westminster. Make of that what you will.
            </p>

            <ol>
              {bigSpenders.map((spender) => (
                <li key={spender.name}>
                  <span>{spender.rank}</span>
                  <div>
                    <strong>{spender.name}</strong>
                    <small>{spender.seat}</small>
                  </div>
                  <b>{spender.amount}</b>
                </li>
              ))}
            </ol>

            <a href="#">See top 10 →</a>
          </article>

          <article className="press-offices">
            <div className="section-heading">
              <h2>From the Press Offices</h2>
              <p>The official line, straight from Whitehall.</p>
            </div>

            <div className="press-grid">
              {pressItems.map((item) => (
                <a href="#" key={item.title}>
                  <strong>{item.department}</strong>
                  <span>{item.title}</span>
                  <em>{item.date}</em>
                </a>
              ))}
            </div>
          </article>

          <article className="live-numbers">
            <div className="section-heading">
              <h2>Live Numbers</h2>
              <p>Pulled from the records this hour.</p>
            </div>

            <div className="number-grid">
              {liveNumbers.map((item) => (
                <div key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </article>

          <article className="take-part">
            <p className="file-kicker">Take Part</p>
            <h2>Add your voice to the public record.</h2>
            <p>
              Vote on bills, browse contracts, and keep an eye on who&apos;s
              coming and going through the Westminster door. We track it. You
              decide what to make of it.
            </p>
            <div className="button-stack horizontal">
              <a href="#" className="briefing-button red">
                Vote on Bills →
              </a>
              <a href="#" className="briefing-button green">
                Transparency Records →
              </a>
            </div>
          </article>
        </section>

        <section className="stamp-strip">
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
            <h2>The People&apos;s Chamber</h2>
            <p>
              UK political transparency. Built from official sources:
              Parliament, IPSA, Companies House, Electoral Commission, Cabinet
              Office. Updated daily.
            </p>
          </div>

          <div className="footer-links">
            <a href="#">Bills</a>
            <a href="#">MPs</a>
            <a href="#">Departments</a>
            <a href="#">Transparency</a>
            <a href="#">Expenses</a>
            <a href="#">Earnings</a>
            <a href="#">About &amp; Methodology</a>
            <a href="#">Sources</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
            <a href="#">GitHub ↗</a>
            <a href="#">Contact</a>
          </div>
        </footer>
      </div>
    </main>
  );
}

function SidebarSection({
  title,
  items,
  red = false,
}: {
  title: string;
  items: string[];
  red?: boolean;
}) {
  return (
    <section className="drawer-section">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>
            <span className={red ? "dot red-dot" : "dot"} />
            {item}
          </li>
        ))}
      </ul>
      <a href="#">View all →</a>
    </section>
  );
}
