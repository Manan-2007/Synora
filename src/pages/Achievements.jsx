import { useEffect } from "react";
import Icon from "../components/Icon.jsx";
import useStore from "../hooks/useStore.js";
import { achievements, streak } from "../lib/engine.js";
import { formatDate, toISODate } from "../lib/util.js";

/* The badges. They unlock from what the person actually does — the
   definitions and the unlock logic live in the engine (lib/engine.js),
   so they fire from any page; this page displays progress. */
export default function Achievements() {
  useStore();

  // Catch up silently on load.
  useEffect(() => { achievements.evaluate(false); }, []);

  const list = achievements.list();
  const unlocked = list.filter((a) => a.unlocked).length;

  return (
    <>
      <div className="page__header">
        <p className="page__subtitle">Stay motivated as you go — these unlock from what you actually do.</p>
      </div>

      <div>
        <div className="dash-hero" style={{ marginBottom: 24 }}>
          <span className="ach-badge" style={{ width: 52, height: 52, margin: 0 }}><Icon name="trophy" size={24} /></span>
          <div>
            <div className="dash-hero__greet">{unlocked + " of " + list.length + " unlocked"}</div>
            <div className="dash-hero__sub">Small wins, marked. Keep going to unlock the rest.</div>
          </div>
          <div className="dash-hero__streak">
            <span className="pill"><Icon name="flame" size={14} /><strong>{streak.current()}</strong> day streak</span>
          </div>
        </div>

        <div className="ach-grid">
          {list.map((a) => (
            <div key={a.id} className={"ach-card" + (a.unlocked ? "" : " is-locked")}>
              <span className="ach-badge"><Icon name={a.unlocked ? a.icon : "trophy"} size={26} /></span>
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
      </div>
    </>
  );
}
