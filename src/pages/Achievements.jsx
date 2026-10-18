import { useEffect, useState } from "react";
import Icon from "../components/Icon.jsx";
import useStore from "../hooks/useStore.js";
import { achievements, streak, ACH_CATEGORIES } from "../lib/engine.js";
import { formatDate, toISODate } from "../lib/util.js";

/* The badges. They unlock from what the person actually does — the
   definitions and the unlock logic live in the engine (lib/engine.js),
   so they fire from any page; this page shows the level they add up to,
   what's closest to unlocking, and every badge by category. */

const TIER = { 1: "Bronze", 2: "Silver", 3: "Gold" };

function Badge({ a, size = 26 }) {
  return (
    <span className={"ach-badge ach-badge--t" + a.tier + (a.unlocked ? "" : " is-locked")}>
      <Icon name={a.icon} size={size} />
      {!a.unlocked && <span className="ach-badge__lock"><Icon name="lock" size={11} /></span>}
    </span>
  );
}

function LevelRing({ frac, level }) {
  const r = 46, C = 2 * Math.PI * r;
  return (
    <div className="ach-level">
      <svg viewBox="0 0 108 108" aria-hidden="true">
        <defs>
          <linearGradient id="ach-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--color-brand)" />
            <stop offset="1" stopColor="var(--color-accent-bright)" />
          </linearGradient>
        </defs>
        <circle cx="54" cy="54" r={r} className="ach-level__track" />
        <circle cx="54" cy="54" r={r} className="ach-level__fill" strokeDasharray={C} strokeDashoffset={C * (1 - frac)} />
      </svg>
      <span className="ach-level__num"><small>Level</small>{level}</span>
    </div>
  );
}

export default function Achievements() {
  useStore();
  const [cat, setCat] = useState("all");

  // Catch up silently on load.
  useEffect(() => { achievements.evaluate(false); }, []);

  const list = achievements.list();
  const sum = achievements.summary(list);
  const next = achievements.nextUp(3, list);
  const shown = cat === "all" ? list : list.filter((a) => a.cat === cat);
  const sorted = [...shown].sort((a, b) => (b.unlocked - a.unlocked) || (b.current / b.goal - a.current / a.goal));

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Every badge unlocks from what you actually do. Earn XP, level up, keep the streak alive.</p>
      </div>

      <section className="ach-hero card" aria-label="Your level">
        <LevelRing frac={sum.span ? sum.into / sum.span : 1} level={sum.level} />
        <div className="ach-hero__main">
          <p className="ach-hero__eyebrow">{sum.title}</p>
          <h2 className="ach-hero__title">{sum.xp} XP</h2>
          <div className="ach-xp" role="progressbar" aria-label="Progress to the next level"
            aria-valuemin={0} aria-valuemax={sum.span} aria-valuenow={sum.into}>
            <span style={{ width: (sum.span ? (sum.into / sum.span) * 100 : 100) + "%" }}></span>
          </div>
          <p className="ach-hero__sub">{sum.toNext} XP to level {sum.level + 1}</p>
        </div>
        <div className="ach-hero__stats">
          <div><strong>{sum.unlocked}<small>/{sum.total}</small></strong><span>badges</span></div>
          <div><strong>{streak.current()}</strong><span>day streak</span></div>
        </div>
      </section>

      {next.length > 0 && (
        <section className="ach-next" aria-labelledby="ach-next-title">
          <h2 id="ach-next-title" className="ach-section-title">Up next</h2>
          <div className="ach-next__grid">
            {next.map((a) => (
              <div key={a.id} className="card ach-next__card">
                <Badge a={a} size={22} />
                <div className="ach-next__body">
                  <strong>{a.title}</strong>
                  <span>{a.desc}</span>
                  <div className="meter"><span className="meter__fill" style={{ width: Math.round((a.current / a.goal) * 100) + "%" }}></span></div>
                </div>
                <span className="ach-next__count">{a.current}/{a.goal}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="segmented ach-filter" role="group" aria-label="Badge category">
        {[["all", "All"], ...Object.entries(ACH_CATEGORIES)].map(([id, label]) => (
          <button key={id} type="button" className={cat === id ? "is-active" : ""} aria-pressed={cat === id} onClick={() => setCat(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="ach-grid">
        {sorted.map((a) => (
          <div key={a.id} className={"ach-card" + (a.unlocked ? " is-unlocked" : " is-locked")}>
            <div className="ach-card__top">
              <Badge a={a} />
              <span className={"ach-tier ach-tier--t" + a.tier}>{TIER[a.tier]} · {a.xp} XP</span>
            </div>
            <h3 className="ach-card__title">{a.title}</h3>
            <p className="ach-card__desc">{a.desc}</p>
            {!a.unlocked && (
              <div className="meter" style={{ marginBottom: 10 }}>
                <span className="meter__fill" style={{ width: Math.round((a.current / a.goal) * 100) + "%" }}></span>
              </div>
            )}
            <p className="ach-card__status">
              {a.unlocked
                ? "Unlocked" + (a.unlockedAt ? " · " + formatDate(toISODate(new Date(a.unlockedAt))) : "")
                : a.current + " / " + a.goal}
            </p>
          </div>
        ))}
      </div>
    </>
  );
}
