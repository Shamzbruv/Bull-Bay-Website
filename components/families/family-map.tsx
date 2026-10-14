"use client";
import { useRef, useState } from "react";
import {
  familyCircle,
  familyNodeId,
  linkSentence,
  type FamilyData,
  type FamilyLink,
} from "@/lib/families/model";
import {
  familyLabel,
  familyPaths,
  relationshipLabel,
} from "@/lib/families/paths";
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
  const paths = familyPaths(data, root, depth);
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
  const tallestColumn = Math.max(1, ...columnCounts.values());
  for (const n of nodes)
    n.y += ((tallestColumn - columnCounts.get(n.level)!) * 155) / 2;
  const width = Math.max(600, ...nodes.map((n) => n.x + 420));
  const height = Math.max(260, ...nodes.map((n) => n.y + 145));
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
  const currentNode = nodes.find((n) => n.id === selectedNode);
  const selectedFamily = currentNode
    ? peopleView
      ? familyNodeId(data.people.find((p) => p.id === currentNode.id)!)
      : currentNode.id
    : null;
  const selectedPath = selectedFamily ? (paths.get(selectedFamily) ?? []) : [];
  const pathLinks = new Set(selectedPath.map((s) => s.link.id));
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
    : new Set(
        peopleView
          ? selectedNode
            ? [selectedNode]
            : []
          : selectedPath.length
            ? [root, ...selectedPath.map((s) => s.to)]
            : selectedNode
              ? [selectedNode]
              : [],
      );
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
        style={{ height: Math.min(480, Math.max(280, height * zoom)) }}
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
            const sameColumn = a.x === b.x;
            const ax = a.x + (sameColumn || b.x > a.x ? 224 : 0),
              ay = a.y + 56,
              bx = b.x + (sameColumn || a.x > b.x ? 224 : 0),
              by = b.y + 56;
            const controlX = sameColumn ? ax + 150 + offset : (ax + bx) / 2;
            const d = `M ${ax} ${ay} C ${controlX} ${ay + offset}, ${controlX} ${by + offset}, ${bx} ${by}`;
            const labelX = sameColumn ? ax + 112 + offset : (ax + bx) / 2;
            const labelY = (ay + by) / 2 + offset;
            const emphasized = selected === l.id || pathLinks.has(l.id);
            const edgeLabel = relationshipLabel(l.kind);
            const labelWidth = Math.max(
              88,
              Math.min(225, edgeLabel.length * 6 + 24),
            );
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
                  stroke={emphasized ? "#ab8034" : "#5b8d83"}
                  strokeWidth={emphasized ? 4 : 2.5}
                />
                <rect
                  x={labelX - labelWidth / 2}
                  y={labelY - 15}
                  width={labelWidth}
                  height="29"
                  rx="14"
                  fill="#fffdf8"
                  stroke="#d8e1dc"
                />
                <text
                  x={labelX}
                  y={labelY + 4}
                  textAnchor="middle"
                  fontSize="12"
                  fill="#234a45"
                >
                  {edgeLabel}
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
        ) : currentNode ? (
          <>
            <span className={styles.eyebrow}>
              {peopleView ? "Relative" : "Connected household"}
            </span>
            <h3>{currentNode.name}</h3>
            <p>{currentNode.subtitle}</p>
            {selectedPath.length > 0 && (
              <>
                <p className={styles.routeNames}>
                  {[root, ...selectedPath.map((s) => s.to)]
                    .map((id) => familyLabel(data, id))
                    .join(" → ")}
                </p>
                {selectedPath.map((s) => (
                  <p key={s.link.id}>
                    <strong>{linkSentence(s.link, data.people)}</strong>
                    {s.link.notes && <> · {s.link.notes}</>}
                  </p>
                ))}
              </>
            )}
            {peopleView &&
              circle.links
                .filter((l) =>
                  [l.sourceId, l.targetId].includes(currentNode.id),
                )
                .map((l) => (
                  <button
                    className={styles.quietButton}
                    key={l.id}
                    type="button"
                    onClick={() => showLink(l)}
                  >
                    {linkSentence(l, data.people)}
                  </button>
                ))}
            {selectedFamily && selectedFamily !== root && (
              <button
                className={styles.quietButton}
                type="button"
                onClick={() => onSelectFamily(selectedFamily)}
              >
                Explore {familyLabel(data, selectedFamily)} →
              </button>
            )}
          </>
        ) : (
          <>
            <strong>
              Select a family, person, or connection to see how they are linked.
            </strong>
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
