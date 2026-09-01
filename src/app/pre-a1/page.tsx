import Link from "next/link";

import { getPreA1Bridge } from "@/modules/curriculum/infrastructure/pre-a1-bridge-source";

function lines(content: string) {
  return content.split("\n").map((line) => line.replace(/[-*]\s+/, "").replace(/\*+/g, "").trim()).filter(Boolean);
}

export default function PreA1BridgePage() {
  const bridge = getPreA1Bridge();
  return (
    <main className="bridge-shell">
      <Link className="back-link" href="/">← Back to A1</Link>
      <header className="bridge-hero">
        <div className="eyebrow">Optional / recommended foundation</div>
        <h1>Pre-A1 → A1 Bridge</h1>
        <p>15 short sessions for a near-zero learner. You may skip this bridge and start A1 Day 1 immediately.</p>
        <Link className="button primary" href="/">Start A1 Day 1 directly</Link>
      </header>
      <aside className="bridge-boundary"><strong>This is not a second A1 course.</strong> It builds calm reading, listening, speaking, and tiny-chunk habits, then hands off to the locked 42-day A1 curriculum. It never unlocks or delays A1.</aside>
      <section className="bridge-sessions" aria-label="15 optional Pre-A1 bridge sessions">
        {bridge.sessions.map((session) => <article key={session.number}><span>Session {session.number}</span><h2>{session.title}</h2>{lines(session.content).map((line) => <p key={line}>{line}</p>)}</article>)}
      </section>
      <footer className="bridge-footer"><p>Ready when you are.</p><Link className="button primary" href="/">Continue to A1 Day 1</Link></footer>
    </main>
  );
}
