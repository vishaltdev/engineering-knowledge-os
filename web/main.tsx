import { useEffect, useId, useState } from "react";
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
    fetch("./concepts.json").then(response => {
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
          <ArchitectureDiagram atlas={concept.atlas} />
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

function ArchitectureDiagram({ atlas, selected, onSelect }: {
  atlas: Atlas; selected?: string; onSelect?: (id: string) => void;
}) {
  const arrow = useId();
  const layers: Atlas["nodes"][] = [];
  const positions = new Map<string, { x: number; y: number; label: string }>();
  let remaining = atlas.nodes;
  while (remaining.length) {
    const ready = remaining.filter(node => atlas.edges.every(edge =>
      edge.to !== node.id || positions.has(edge.from)
    ));
    const layer = ready.length ? ready : [remaining[0]];
    const y = 20 + layers.length * 115;
    layer.forEach((node, index) => positions.set(node.id, {
      x: (index + 0.5) * 180 + Math.max(0, 360 - layer.length * 180) / 2,
      y,
      label: node.label,
    }));
    layers.push(layer);
    remaining = remaining.filter(node => !positions.has(node.id));
  }
  const width = Math.max(360, ...layers.map(layer => layer.length * 180));
  const height = layers.length * 115 - 30;
  // Center shorter rows within the widest row.
  for (const layer of layers) {
    const offset = (width - Math.max(360, layer.length * 180)) / 2;
    layer.forEach(node => { positions.get(node.id)!.x += offset; });
  }
  return <figure className="architecture">
    <figcaption>{atlas.title} · architecture map</figcaption>
    {onSelect && <p className="diagram-hint">Select a component to see what it does.</p>}
    <div className="diagram-scroll">
      <svg className="diagram" viewBox={`0 0 ${width} ${height}`} style={{ width: width + "px" }}
        role="group" aria-label="Architecture map. Numbered connections are described below.">
        <defs><marker id={arrow} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
        </marker></defs>
        {atlas.edges.map((edge, index) => {
          const from = positions.get(edge.from);
          const to = positions.get(edge.to);
          if (!from || !to) return null;
          const forward = to.y > from.y;
          const start = from.y + (forward ? 50 : 0);
          const end = to.y + (forward ? 0 : 50);
          const middle = (start + end) / 2;
          const badgeX = (from.x + to.x) / 2;
          const active = selected === edge.from || selected === edge.to;
          return <g key={index} className={active ? "diagram-edge active" : "diagram-edge"} aria-hidden="true">
            <path d={`M ${from.x} ${start} C ${from.x} ${middle}, ${to.x} ${middle}, ${to.x} ${end}`}
              markerEnd={`url(#${arrow})`} />
            <circle cx={badgeX} cy={middle} r="11" />
            <text x={badgeX} y={middle} textAnchor="middle" dominantBaseline="central">{index + 1}</text>
          </g>;
        })}
        {atlas.nodes.map(node => {
          const { x, y } = positions.get(node.id)!;
          return <foreignObject key={node.id} x={x - 77} y={y} width="154" height="50">
            {onSelect
              ? <button className="diagram-node" aria-pressed={selected === node.id} onClick={() => onSelect(node.id)}>{node.label}</button>
              : <span className="diagram-node">{node.label}</span>}
          </foreignObject>;
        })}
      </svg>
    </div>
    <ol className="diagram-legend" aria-label="Diagram connections">
      {atlas.edges.map((edge, index) => <li key={index}>
        <strong>{edge.label}</strong>
        <span>{positions.get(edge.from)?.label} → {positions.get(edge.to)?.label}</span>
      </li>)}
    </ol>
  </figure>;
}

function AtlasView({ concept }: { concept: Concept }) {
  const { atlas } = concept;
  const [node, setNode] = useState(atlas.nodes[0].id);
  const [scenario, setScenario] = useState(atlas.scenarios[0]);
  return <><p className="eyebrow">Component Atlas</p><h1>{atlas.title}</h1>
    <section><h2>Components</h2>
      <ArchitectureDiagram atlas={atlas} selected={node} onSelect={setNode} />
      <p className="diagram-detail" aria-live="polite">{atlas.nodes.find(item => item.id === node)?.detail}</p>
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
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
