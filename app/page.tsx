import { supabase } from "@/lib/supabase"
import Navigation from "./components/Navigation"
import Link from "next/link"

export const revalidate = 3600

async function getGovUKNews() {
  try {
    const { data } = await supabase
      .from("press_releases")
      .select("title, description, organisation, published_at, gov_url")
      .order("published_at", { ascending: false })
      .limit(4)
    return data || []
  } catch (e) {
    console.error("News fetch error:", e)
    return []
  }
}

export default async function HomePage() {
  const [news, { data: bills }, { data: activity }, { data: contracts }, { data: donations }] = await Promise.all([
    getGovUKNews(),
    supabase.from("bill").select("id, title, vote_count_yes, vote_count_no, vote_count_abstain").order("vote_count_yes", { ascending: false }).limit(3),
    supabase.from("ministers_hospitality").select("minister_name, donor, value, hospitality_date").order("hospitality_date", { ascending: false }).limit(5),
    supabase.from("government_contracts").select("id, title, supplier, value").order("id", { ascending: false }).limit(3),
    supabase.from("political_donations").select("id, donor_name, recipient_name, amount").order("id", { ascending: false }).limit(3),
  ])

  const leadStory = news[0]
  const otherNews = news.slice(1, 4)

  const now = new Date()
  const dateString = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })

  return (
    <div className="min-h-screen" style={{ background: "#1a1a1a", color: "#ffffff" }}>
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 pb-10">

        <div style={{ borderTop: "3px solid #ffffff", borderBottom: "1px solid #444444", padding: "0.75rem 0", marginBottom: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div style={{ fontSize: "22px", fontWeight: 700, color: "#ffffff", letterSpacing: "0.06em" }}>THE PEOPLES CHAMBER</div>
          <div style={{ fontSize: "12px", color: "#7697a2", letterSpacing: "0.05em" }}>{dateString} · thepeopleschamber.uk</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0", marginBottom: "1px", background: "#333333" }}>

          <div style={{ background: "#1a1a1a", padding: "1rem 1.25rem 1rem 0" }}>
            <div style={{ fontSize: "10px", color: "#7697a2", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "0.75rem", borderBottom: "0.5px solid #333333", paddingBottom: "6px" }}>Latest from GOV.UK</div>

            {leadStory && (
              
                href={leadStory.gov_url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "block", textDecoration: "none", marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid #333333" }}
              >
                <div style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff", lineHeight: 1.25, marginBottom: "0.4rem" }}>{leadStory.title}</div>
                <div style={{ fontSize: "12px", color: "#7697a2" }}>
                  {leadStory.organisation || "GOV.UK"} · {leadStory.published_at ? new Date(leadStory.published_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}
                </div>
              </a>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {otherNews.map((item: any, i: number) => (
                
                  key={i}
                  href={item.gov_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "block", textDecoration: "none", padding: "0.6rem 0", borderBottom: "0.5px solid #2e2e2e" }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#ffffff", lineHeight: 1.35, marginBottom: "2px" }}>{item.title}</div>
                  <div style={{ fontSize: "12px", color: "#7697a2" }}>{item.organisation || "GOV.UK"}</div>
                </a>
              ))}
            </div>
          </div>

          <div style={{ background: "#1a1a1a", padding: "1rem 0 1rem 1.25rem", borderLeft: "1px solid #333333" }}>
            <div style={{ fontSize: "10px", color: "#7697a2", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "0.75rem", borderBottom: "0.5px solid #333333", paddingBottom: "6px" }}>The Public vs Parliament</div>

            {bills?.map((bill) => {
              const total = (bill.vote_count_yes || 0) + (bill.vote_count_no || 0) + (bill.vote_count_abstain || 0)
              const yesPct = total > 0 ? Math.round((bill.vote_count_yes || 0) / total * 100) : 0
              const noPct = total > 0 ? Math.round((bill.vote_count_no || 0) / total * 100) : 0
              return (
                <Link
                  href={}
                  key={bill.id}
                  style={{ display: "block", textDecoration: "none", marginBottom: "1.1rem", paddingBottom: "1.1rem", borderBottom: "0.5px solid #2e2e2e" }}
                >
                  <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffffff", lineHeight: 1.35, marginBottom: "6px" }}>{bill.title}</div>
                  <div style={{ height: "6px", background: "#2e2e2e", display: "flex", marginBottom: "4px" }}>
                    {yesPct > 0 && <div style={{ height: "100%", width: , background: "#4a8a3a" }}></div>}
                    {noPct > 0 && <div style={{ height: "100%", width: , background: "#8a3a3a" }}></div>}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontFamily: "monospace" }}>
                    <span style={{ color: "#4a8a3a" }}>{yesPct}% Support</span>
                    <span style={{ color: "#8a3a3a" }}>{noPct}% Oppose</span>
                  </div>
                  <div style={{ fontSize: "11px", color: "#7697a2", marginTop: "2px", fontFamily: "monospace" }}>{total.toLocaleString()} votes cast</div>
                </Link>
              )
            })}
          </div>
        </div>

        <div style={{ borderTop: "1px solid #444444", borderBottom: "1px solid #444444", padding: "0.6rem 0", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.25rem" }}>
          <Link href="/bills" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>3,884</span>
            <span style={{ fontSize: "11px", color: "#7697a2", textTransform: "uppercase", letterSpacing: "0.1em" }}>Bills tracked</span>
          </Link>
          <Link href="/mps" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>650</span>
            <span style={{ fontSize: "11px", color: "#7697a2", textTransform: "uppercase", letterSpacing: "0.1em" }}>MPs</span>
          </Link>
          <Link href="/transparency/government-contracts" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>8,011</span>
            <span style={{ fontSize: "11px", color: "#7697a2", textTransform: "uppercase", letterSpacing: "0.1em" }}>Contracts</span>
          </Link>
          <Link href="/transparency" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: "6px" }}>
            <span style={{ fontSize: "20px", fontWeight: 700, color: "#ffffff" }}>21k+</span>
            <span style={{ fontSize: "11px", color: "#7697a2", textTransform: "uppercase", letterSpacing: "0.1em" }}>Records</span>
          </Link>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0", background: "#333333" }}>

          <div style={{ background: "#1a1a1a", padding: "1rem 1.25rem 1rem 0" }}>
            <div style={{ fontSize: "10px", color: "#7697a2", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "0.6rem", borderBottom: "0.5px solid #333333", paddingBottom: "6px" }}>Ministerial Hospitality</div>
            {activity?.map((item, i) => (
              <Link
                href="/transparency/ministers-hospitality"
                key={i}
                style={{ display: "flex", gap: "8px", padding: "0.5rem 0", borderBottom: "0.5px solid #2e2e2e", textDecoration: "none", alignItems: "flex-start" }}
              >
                <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#7697a2", marginTop: "5px", flexShrink: 0 }}></div>
                <div>
                  <div style={{ fontSize: "13px", color: "#ffffff", lineHeight: 1.35, fontWeight: 600 }}>{item.minister_name}</div>
                  <div style={{ fontSize: "12px", color: "#C9C9C9", marginTop: "1px" }}>{item.donor} · £{Number(item.value).toLocaleString()}</div>
                  <div style={{ fontSize: "11px", color: "#7697a2", marginTop: "1px" }}>
                    {item.hospitality_date ? new Date(item.hospitality_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ background: "#1a1a1a", padding: "1rem 1.25rem", borderLeft: "1px solid #333333" }}>
            <div style={{ fontSize: "10px", color: "#7697a2", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "0.6rem", borderBottom: "0.5px solid #333333", paddingBottom: "6px" }}>Latest Contracts</div>
            {contracts?.map((c, i) => (
              <Link
                href="/transparency/government-contracts"
                key={i}
                style={{ display: "block", padding: "0.5rem 0", borderBottom: "0.5px solid #2e2e2e", textDecoration: "none" }}
              >
                <div style={{ fontSize: "13px", color: "#ffffff", lineHeight: 1.35, fontWeight: 600 }}>{c.title}</div>
                <div style={{ fontSize: "12px", color: "#C9C9C9", marginTop: "2px" }}>{c.supplier}</div>
                <div style={{ fontSize: "11px", color: "#7697a2", marginTop: "1px", fontFamily: "monospace" }}>£{c.value ? Number(c.value).toLocaleString() : "undisclosed"}</div>
              </Link>
            ))}
          </div>

          <div style={{ background: "#1a1a1a", padding: "1rem 0 1rem 1.25rem", borderLeft: "1px solid #333333" }}>
            <div style={{ fontSize: "10px", color: "#7697a2", textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: "0.6rem", borderBottom: "0.5px solid #333333", paddingBottom: "6px" }}>Latest Donations</div>
            {donations?.map((d, i) => (
              <Link
                href="/transparency/political-donations"
                key={i}
                style={{ display: "block", padding: "0.5rem 0", borderBottom: "0.5px solid #2e2e2e", textDecoration: "none" }}
              >
                <div style={{ fontSize: "13px", color: "#ffffff", lineHeight: 1.35, fontWeight: 600 }}>{d.donor_name}</div>
                <div style={{ fontSize: "12px", color: "#C9C9C9", marginTop: "2px" }}>{d.recipient_name}</div>
                <div style={{ fontSize: "11px", color: "#7697a2", marginTop: "1px", fontFamily: "monospace" }}>£{Number(d.amount).toLocaleString()}</div>
              </Link>
            ))}
          </div>

        </div>

      </main>
    </div>
  )
}