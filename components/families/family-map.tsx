"use client";
import { useRef, useState } from "react";
import {
  familyCircle,
  familyNodeId,
  linkSentence,
  type FamilyData,
  type FamilyLink,
} from "@/lib/families/model";
import styles from "./family.module.css";
type Node = {
  id: string;
  name: string;
  subtitle: string;
  x: number;
  y: number;
  level: number;
};
export function FamilyMap({
  data,
  root,
  depth,
  peopleView,
  onSelectFamily,
}: {
  data: FamilyData;
  root: string;
  depth: number;
  peopleView: boolean;
  onSelectFamily: (id: string) => void;
}) {
  const circle = familyCircle(data.people, data.links, root, depth);
  const involved = new Set(
    circle.links.flatMap((l) => [l.sourceId, l.targetId]),
  );
  const persons = data.people.filter(
    (p) => involved.has(p.id) || familyNodeId(p) === root,
  );
  const levels = [...circle.levels];
  const columnCounts = new Map<number, number>();
  const nodes: Node[] = [];
  if (peopleView) {
    for (const p of persons) {
      const family = familyNodeId(p);
      const level = circle.levels.get(family) ?? 0;
      const row = columnCounts.get(level) ?? 0;
      columnCounts.set(level, row + 1);
      nodes.push({
        id: p.id,
        name: p.name,
        subtitle:
          data.households.find((h) => h.id === p.householdId)?.name ??
          "Household not yet set",
        x: 60 + level * 340,
        y: 60 + row * 155,
        level,
      });
    }
  } else
    for (const [id, level] of levels) {
      const row = columnCounts.get(level) ?? 0;
      columnCounts.set(level, row + 1);
      const relatives = persons.filter((p) => familyNodeId(p) === id);
      nodes.push({
        id,
        name:
          data.households.find((h) => h.id === id)?.name ??
          relatives[0]?.name ??
          "Family",
        subtitle:
          relatives.map((p) => p.name).join(" · ") || "No people assigned yet",
        x: 60 + level * 340,
        y: 60 + row * 155,
        level,
      });
    }
  const totalNodes = nodes.length;
  nodes.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name, "en"));
  nodes.splice(100);
  columnCounts.clear();
  for (const n of nodes) {
    const row = columnCounts.get(n.level) ?? 0;
    columnCounts.set(n.level, row + 1);
    n.x = 60 + n.level * 340;
    n.y = 60 + row * 155;
  }
  const width = Math.max(600, ...nodes.map((n) => n.x + 280));
  const height = Math.max(480, ...nodes.map((n) => n.y + 145));
  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const byPerson = new Map(data.people.map((p) => [p.id, p]));
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const drag = useRef<{
    x: number;
    y: number;
    left: number;
    top: number;
  } | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const selectedLink = circle.links.find((l) => l.id === selected);
  const showLink = (l: FamilyLink) => {
    setSelected(l.id);
    setSelectedNode(null);
  };
  const highlight = selectedLink
    ? new Set([
        peopleView
          ? selectedLink.sourceId
          : familyNodeId(byPerson.get(selectedLink.sourceId)!),
        peopleView
          ? selectedLink.targetId
          : familyNodeId(byPerson.get(selectedLink.targetId)!),
      ])
    : new Set(selectedNode ? [selectedNode] : []);
  const edges = peopleView
    ? circle.links
    : circle.links.filter(
        (l) =>
          familyNodeId(byPerson.get(l.sourceId)!) !==
          familyNodeId(byPerson.get(l.targetId)!),
      );
  const seen = new Map<string, number>();
  return (
    <div className={styles.mapShell}>
      <div className={styles.mapToolbar}>
        <div>
          <strong>
            {peopleView ? "People and relationships" : "Your family circle"}
          </strong>
          <span>
            {nodes.length}
            {totalNodes > nodes.length ? ` of ${totalNodes}` : ""}{" "}
            {peopleView ? "people" : "families"} · {circle.links.length}{" "}
            confirmed connections
          </span>
        </div>
        <div className={styles.zoom}>
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.35, z - 0.15))}
          >
            −
          </button>
          <output aria-live="polite">{Math.round(zoom * 100)}%</output>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(1.8, z + 0.15))}
          >
            +
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(
                Math.max(
                  0.35,
                  Math.min(1, (stage.current?.clientWidth ?? 800) / width),
                ),
              );
              stage.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" });
            }}
          >
            Fit map
          </button>
        </div>
      </div>
      <div
        className={styles.mapStage}
        ref={stage}
        tabIndex={0}
        aria-label="Scrollable family map. Use the relationship list below for a text view."
        onPointerDown={(e) => {
          if ((e.target as Element).closest('button,[role="button"]')) return;
          drag.current = {
            x: e.clientX,
            y: e.clientY,
            left: e.currentTarget.scrollLeft,
            top: e.currentTarget.scrollTop,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current) {
            e.currentTarget.scrollLeft =
              drag.current.left - (e.clientX - drag.current.x);
            e.currentTarget.scrollTop =
              drag.current.top - (e.clientY - drag.current.y);
          }
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <svg
          width={width * zoom}
          height={height * zoom}
          viewBox={`0 0 ${width} ${height}`}
          role="group"
          aria-label={
            peopleView
              ? "Confirmed family relationships"
              : "Connections between named families"
          }
        >
          <defs>
            <pattern
              id="family-dot"
              width="24"
              height="24"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="2" cy="2" r="1" fill="#d6dfdd" />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#family-dot)" />
          {edges.map((l) => {
            const a = nodeById.get(
              peopleView ? l.sourceId : familyNodeId(byPerson.get(l.sourceId)!),
            );
            const b = nodeById.get(
              peopleView ? l.targetId : familyNodeId(byPerson.get(l.targetId)!),
            );
            if (!a || !b) return null;
            const key = [a.id, b.id].sort().join(":");
            const offset = (seen.get(key) ?? 0) * 22;
            seen.set(key, (seen.get(key) ?? 0) + 1);
            const ax = a.x + 112,
              ay = a.y + 56,
              bx = b.x + 112,
              by = b.y + 56;
            const d = `M ${ax} ${ay} C ${ax + (bx - ax) / 2} ${ay + offset}, ${bx - (bx - ax) / 2} ${by + offset}, ${bx} ${by}`;
            const labelY = (ay + by) / 2 + offset;
            return (
              <g
                key={l.id}
                role="button"
                tabIndex={0}
                aria-label={linkSentence(l, data.people)}
                onClick={() => showLink(l)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    showLink(l);
                  }
                }}
                className={styles.edge}
              >
                <title>{linkSentence(l, data.people)}</title>
                <path d={d} fill="none" stroke="transparent" strokeWidth={24} />
                <path
                  d={d}
                  fill="none"
                  stroke={selected === l.id ? "#ab8034" : "#5b8d83"}
                  strokeWidth={selected === l.id ? 4 : 2.5}
                  strokeDasharray={selected === l.id ? undefined : "7 5"}
                />
                <rect
                  x={(ax + bx) / 2 - 58}
                  y={labelY - 15}
                  width="116"
                  height="29"
                  rx="14"
                  fill="#fffdf8"
                  stroke="#d8e1dc"
                />
                <text
                  x={(ax + bx) / 2}
                  y={labelY + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#234a45"
                >
                  {l.kind.replaceAll("_", " / ")}
                </text>
              </g>
            );
          })}
          {nodes.map((n) => (
            <foreignObject key={n.id} x={n.x} y={n.y} width="230" height="125">
              <button
                type="button"
                title={`${n.name} · ${n.subtitle}`}
                className={`${styles.node} ${n.level === 0 ? styles.homeNode : ""} ${highlight.has(n.id) ? styles.highlightNode : ""}`}
                onClick={() => {
                  setSelectedNode(n.id);
                  setSelected(null);
                  if (!peopleView) onSelectFamily(n.id);
                }}
              >
                <small>
                  {n.level === 0
                    ? "Focused family"
                    : `${n.level} ${n.level === 1 ? "connection" : "connections"} away`}
                </small>
                <strong>{n.name}</strong>
                <span>{n.subtitle}</span>
              </button>
            </foreignObject>
          ))}
        </svg>
      </div>
      {totalNodes > 100 && (
        <p className={styles.emptyMap}>
          Showing the first 100 nodes. Choose fewer connection levels or focus a
          household to explore a smaller part of the circle. The text list
          includes every connection in this view.
        </p>
      )}
      <div className={styles.mapDetail} aria-live="polite">
        {selectedLink ? (
          <>
            <strong>{linkSentence(selectedLink, data.people)}</strong>
            {selectedLink.notes && <p>{selectedLink.notes}</p>}
          </>
        ) : (
          <>
            <strong>Select a connection to read its story.</strong>
            <p>
              Drag the background or scroll to explore. Every line comes from a
              confirmed relationship.
            </p>
          </>
        )}
      </div>
      {circle.links.length === 0 && (
        <p className={styles.emptyMap}>
          Your family is the starting point. Add and confirm a relative to draw
          the first connection.
        </p>
      )}
      <details className={styles.textView}>
        <summary>
          Read all connections as a list ({circle.links.length})
        </summary>
        {circle.links.map((l) => (
          <button key={l.id} type="button" onClick={() => showLink(l)}>
            <strong>{linkSentence(l, data.people)}</strong>
            {l.notes && <span>{l.notes}</span>}
          </button>
        ))}
      </details>
    </div>
  );
}
