import { Link } from "react-router-dom";

export const LandingPage = () => (
  <div className="landing">
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow">Splitwise, rebuilt for the assignment</p>
        <h1>Shared expenses without the fog.</h1>
        <p className="hero-text">
          Create groups, split bills by equal, unequal, percentage, or shares, track balances, and record settle-up
          flows with a polished consumer-grade interface.
        </p>
        <div className="hero-actions">
          <Link to="/auth" className="button">
            Sign in
          </Link>
          <a href="#features" className="button button-secondary">
            Explore features
          </a>
        </div>
      </div>
      <div className="hero-card panel">
        <p className="eyebrow">What this build covers</p>
        <ul className="feature-list">
          <li>Google auth and email magic link</li>
          <li>Trip, home, couple, and custom groups</li>
          <li>Expense splits across 4 methods</li>
          <li>Group balances and settle-up suggestions</li>
          <li>Local group chat via IndexedDB + WebSockets</li>
        </ul>
      </div>
    </section>

    <section id="features" className="feature-grid">
      <article className="panel accent-panel">
        <p className="eyebrow">Track balances</p>
        <h2>See what you owe and what you’re owed.</h2>
        <p>Dashboard summaries roll up group balances, per-person exposure, and net position in INR.</p>
      </article>
      <article className="panel">
        <p className="eyebrow">Organize groups</p>
        <h2>Use one home for trips, roommates, couples, and everything else.</h2>
        <p>Each group keeps its own members, expense feed, balances, and settle-up flow.</p>
      </article>
      <article className="panel">
        <p className="eyebrow">Split with precision</p>
        <h2>Handle equal, uneven, percentage, and share-based entries.</h2>
        <p>Multiple payers are supported, and receipt uploads stay attached to the expense detail page.</p>
      </article>
      <article className="panel">
        <p className="eyebrow">Settle clearly</p>
        <h2>Record partial and full payments without external payment integrations.</h2>
        <p>Global settle-up flows stay visible in the dashboard while group-specific balances remain traceable.</p>
      </article>
    </section>

    <section className="trust-band">
      <div>
        <p className="eyebrow">Consumer polish</p>
        <h2>Built as a real app, not a demo slide.</h2>
      </div>
      <p>
        Responsive layout, structured flows, and a schema designed for data consistency with Supabase and Vercel.
      </p>
    </section>
  </div>
);
