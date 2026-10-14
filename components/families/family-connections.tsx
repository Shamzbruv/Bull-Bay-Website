"use client";
import { useState } from "react";
import {
  familyNodeId,
  linkSentence,
  type FamilyData,
} from "@/lib/families/model";
import {
  familyLabel,
  familyPaths,
  relationshipLabel,
} from "@/lib/families/paths";
import styles from "./family.module.css";

export function FamilyConnections({
  data,
  root,
  depth,
  onExplore,
}: {
  data: FamilyData;
  root: string;
  depth: number;
  onExplore: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const paths = familyPaths(data, root, depth);
  const connections = [...paths]
    .filter(([id]) => id !== root)
    .sort(
      ([a, x], [b, y]) =>
        x.length - y.length ||
        familyLabel(data, a).localeCompare(familyLabel(data, b)),
    );
  const active =
    selected && paths.has(selected) ? selected : connections[0]?.[0];
  const route = active ? paths.get(active)! : [];
  const visible = connections.filter(([id, steps]) =>
    [
      familyLabel(data, id),
      ...steps.map((s) => linkSentence(s.link, data.people)),
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <section
      className={styles.connectionSection}
      aria-label="How families are connected"
    >
      <div className={styles.sectionHeading}>
        <div>
          <span className={styles.eyebrow}>Beyond the surname</span>
          <h2>How our families connect</h2>
          <p>Follow the people who link one household to another.</p>
        </div>
        <span className={styles.connectionCount}>
          {connections.length} connected{" "}
          {connections.length === 1 ? "family" : "families"}
        </span>
      </div>
      {connections.length ? (
        <div className={styles.connectionGrid}>
          <div className={styles.connectionDirectory}>
            <label className={styles.searchLabel}>
              Find a family or relative
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Family name or person’s name"
              />
            </label>
            <div className={styles.connectionChoices}>
              {visible.map(([id, steps]) => {
                const bridge = steps[steps.length - 1]!.link;
                const relatives = data.people.filter(
                  (p) =>
                    familyNodeId(p) === id &&
                    [bridge.sourceId, bridge.targetId].includes(p.id),
                );
                return (
                  <button
                    key={id}
                    type="button"
                    aria-pressed={active === id}
                    onClick={() => setSelected(id)}
                  >
                    <span className={styles.familyMonogram} aria-hidden="true">
                      {familyLabel(data, id)
                        .replace(/^the\s+/i, "")
                        .slice(0, 1)}
                    </span>
                    <span>
                      <strong>{familyLabel(data, id)}</strong>
                      <small>{relatives.map((p) => p.name).join(" · ")}</small>
                    </span>
                    <span className={styles.levelPill}>
                      {steps.length === 1 ? "Direct" : `${steps.length} links`}
                    </span>
                  </button>
                );
              })}
              {!visible.length && (
                <p className={styles.note}>
                  No connected family matches that search.
                </p>
              )}
            </div>
          </div>
          <div className={styles.connectionStory} aria-live="polite">
            <span className={styles.eyebrow}>
              Connection to {familyLabel(data, root)}
            </span>
            <h3>{active ? familyLabel(data, active) : "Choose a family"}</h3>
            <ol className={styles.connectionTrail}>
              <li className={styles.trailStart}>
                <span aria-hidden="true" />{" "}
                <strong>{familyLabel(data, root)}</strong>
              </li>
              {route.map((step) => (
                <li key={step.to}>
                  <div className={styles.bridgeStory}>
                    <span className={styles.relationPill}>
                      {relationshipLabel(step.link.kind)}
                    </span>
                    <strong>{linkSentence(step.link, data.people)}</strong>
                    {step.link.notes && <p>{step.link.notes}</p>}
                  </div>
                  <div className={styles.trailFamily}>
                    <span aria-hidden="true" />
                    <strong>{familyLabel(data, step.to)}</strong>
                  </div>
                </li>
              ))}
            </ol>
            {route.length > 1 && (
              <p className={styles.note}>
                This shows a chain of recorded connections between households.
                Each relationship applies to the named people.
              </p>
            )}
            {active && (
              <button
                className={styles.quietButton}
                type="button"
                onClick={() => onExplore(active)}
              >
                Explore {familyLabel(data, active)} →
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className={styles.connectionEmpty}>
          <div>
            <h3>Your first family connection starts with a person.</h3>
            <p>
              Add a relative, choose how you are related, and confirm the
              connection. Their household will appear here with the people who
              connect your families.
            </p>
          </div>
          <div
            className={styles.exampleBridge}
            aria-label="Example only: the Bakers connected to the Whites through cousins"
          >
            <span>Example only</span>
            <div>
              <strong>The Bakers</strong>
              <span className={styles.exampleLine}>Cousins</span>
              <strong>The Whites</strong>
            </div>
            <p>
              A Baker family member and a White family member are cousins. Their
              different surnames do not change the connection.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
