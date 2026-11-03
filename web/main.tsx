import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./style.css";

type Stage = { id: string; title: string; text: string };
type Card = { id: string; stage: string; revision: number; category: string; prompt: string; answer: string };
type Atlas = {
  id: string; title: string;
  nodes: { id: string; label: string; detail: string }[];
  edges: { from: string; to: string; label: string }[];
  scenarios: { id: string; label: string; steps: string[] }[];
};
type Concept = {
  schemaVersion: 1; id: string; revision: number; title: string; collections: string[];
  sources: { id: string; label: string; url?: string }[];
  lesson: Stage[]; cards: Card[]; atlas: Atlas;
  links: { relation: string; target: string }[];
};
type Schedule = Record<string, { due: number; level: number }>;
const scheduleKey = "knowledge-os:review:v1";
const tabs = ["learn", "review", "atlas"];
const route = () => {
  const [id, view] = location.hash.slice(1).split("/");
  if (tabs.includes(id)) return { id: "idempotency", tab: id };
  return { id: id || "idempotency", tab: tabs.includes(view) ? view : "learn" };
};
const href = (id: string, tab: string) => `#${id}/${tab}`;

function App() {
  const [catalog, setCatalog] = useState<Concept[]>();
  const [error, setError] = useState(false);
  const [{ id, tab }, setRoute] = useState(route);
  useEffect(() => {
    const onRoute = () => setRoute(route());
    window.addEventListener("hashchange", onRoute);
    fetch("/api/concepts").then(response => {
      if (!response.ok) throw new Error("Catalog unavailable");
      return response.json();
    }).then(setCatalog).catch(() => setError(true));
    return () => window.removeEventListener("hashchange", onRoute);
  }, []);
  const concept = catalog?.find(item => item.id === id);
  return <>
    <header><strong>Engineering Knowledge OS</strong><nav aria-label="Study views">
      {tabs.map(item => <a key={item} aria-current={item === tab ? "page" : undefined} href={href(id, item)}>{item}</a>)}
    </nav></header>
    <main>
      {!catalog && <p role="status">{error ? "The lesson could not load. Reconnect and refresh." : "Loading lesson…"}</p>}
      {catalog && <label className="catalog">System design concept
        <select value={concept ? id : ""} onChange={event => { location.hash = href(event.target.value, tab); }}>
          {!concept && <option value="" disabled>Choose a concept</option>}
          {catalog.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </label>}
      {catalog && !concept && <p role="status">Choose a concept from the library.</p>}
      {concept && tab === "learn" && <>
        <p className="eyebrow">System design · Microlearning</p>
        <h1>{concept.title}</h1>
        <section><h2>{concept.lesson[0].title}</h2><p>{concept.lesson[0].text}</p></section>
        <details><summary>Reveal the design</summary>
          {concept.lesson.slice(1).map(stage => <section key={stage.id}><h2>{stage.title}</h2><p>{stage.text}</p></section>)}
          <ul>{concept.sources.map(source => <li key={source.id}>{source.url ? <a href={source.url}>{source.label}</a> : source.label}</li>)}</ul>
        </details>
        <p><a href={href(concept.id, "review")}>Practice recall</a> · <a href={href(concept.id, "atlas")}>Open Component Atlas</a></p>
      </>}
      {concept && tab === "review" && <Review key={concept.id} concept={concept} />}
      {concept && tab === "atlas" && <AtlasView key={concept.id} concept={concept} />}
    </main>
  </>;
}

function Review({ concept }: { concept: Concept }) {
  const [schedule, setSchedule] = useState<Schedule>(() => {
    try { return JSON.parse(localStorage.getItem(scheduleKey) ?? "{}") ?? {}; }
    catch { return {}; }
  });
  const [revealed, setRevealed] = useState(false);
  const [clock, setClock] = useState(Date.now);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const keyFor = (card: Card) => [concept.id, card.id, card.revision].join(":");
  const card = concept.cards.find(item => (schedule[keyFor(item)]?.due ?? 0) <= clock);
  function rate(item: Card, good: boolean) {
    const key = keyFor(item);
    const days = [1, 3, 7, 14, 30];
    const level = Math.min(schedule[key]?.level ?? 0, days.length - 1);
    const delay = good ? days[level] * 86_400_000 : 600_000;
    const next = { ...schedule, [key]: { due: Date.now() + delay, level: good ? level + 1 : 0 } };
    try {
      localStorage.setItem(scheduleKey, JSON.stringify(next));
      setStorageError(false);
    } catch { setStorageError(true); }
    setSchedule(next);
    setRevealed(false);
  }
  return <><h1>Review {concept.title}</h1>
    {storageError && <p role="alert">This browser could not save your schedule. This session still tracks your ratings.</p>}
    {card ? <section key={card.id}><p className="eyebrow">{card.category}</p><h2>{card.prompt}</h2>
      {revealed ? <><p>{card.answer}</p><div className="controls">
        <button onClick={() => rate(card, false)}>Again · 10 min</button>
        <button onClick={() => rate(card, true)}>Good</button>
      </div></> : <button onClick={() => setRevealed(true)}>Reveal answer</button>}
    </section> : <p role="status">You’re caught up. Next review {new Date(Math.min(...concept.cards.map(item => schedule[keyFor(item)].due))).toLocaleString()}.</p>}
    <p><a href={href(concept.id, "learn")}>Revisit the lesson</a></p>
  </>;
}

function AtlasView({ concept }: { concept: Concept }) {
  const { atlas } = concept;
  const [node, setNode] = useState(atlas.nodes[0]);
  const [scenario, setScenario] = useState(atlas.scenarios[0]);
  return <><p className="eyebrow">Component Atlas</p><h1>{atlas.title}</h1>
    <section><h2>Components</h2><div className="controls">{atlas.nodes.map(item =>
      <button key={item.id} aria-pressed={node.id === item.id} onClick={() => setNode(item)}>{item.label}</button>
    )}</div><p aria-live="polite">{node.detail}</p>
      <ul>{atlas.edges.map(edge => <li key={edge.from + edge.to}>{atlas.nodes.find(item => item.id === edge.from)?.label} → {atlas.nodes.find(item => item.id === edge.to)?.label} · {edge.label}</li>)}</ul>
    </section>
    <section><h2>Trace a request</h2><div className="controls">{atlas.scenarios.map(item =>
      <button key={item.id} aria-pressed={scenario.id === item.id} onClick={() => setScenario(item)}>{item.label}</button>
    )}</div><ol aria-live="polite">{scenario.steps.map(step => <li key={step}>{step}</li>)}</ol></section>
    <p><a href={href(concept.id, "learn")}>Study the design</a> · <a href={href(concept.id, "review")}>Practice recall</a></p>
  </>;
}

createRoot(document.getElementById("root")!).render(<App />);
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(console.error);
  });
}
