"use client";
import Link from "next/link";
import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { OfficeActionForm } from "@/components/office-action-form";
import {
  saveFamilyHousehold,
  requestFamilyRelationship,
  inviteHouseholdMember,
  reviewFamilyRequest,
  assignFamilyMember,
} from "@/lib/families/actions";
import {
  familyCircle,
  familyNodeId,
  linkSentence,
  relationshipOptions,
  type FamilyData,
} from "@/lib/families/model";
import { FamilyMap } from "./family-map";
import styles from "./family.module.css";

export function FamilyWorkspace({
  data,
  initialFocus,
}: {
  data: FamilyData;
  initialFocus?: string;
}) {
  const home = data.householdId ?? `person:${data.viewerId}`;
  const [focus, setFocus] = useState<string | null>(initialFocus ?? null);
  const [view, setView] = useState("household");
  const [depth, setDepth] = useState(2);
  const [search, setSearch] = useState("");
  const [peoplePage, setPeoplePage] = useState(0);
  const root =
    focus &&
    (data.households.some((h) => h.id === focus) ||
      data.people.some((p) => familyNodeId(p) === focus))
      ? focus
      : home;
  const household = data.households.find((h) => h.id === root);
  const householdPeople = data.people.filter((p) => familyNodeId(p) === root);
  const own = root === home;
  const canEdit = !data.readOnly && (data.canManage || own);
  const circle = familyCircle(data.people, data.links, root, depth);
  const pending = data.links.filter((l) => l.status === "pending");
  const invitations = data.invitations;
  const circleFamilies = [...circle.levels.keys()].filter((id) => id !== root);
  const filteredHouseholds = data.households.filter((h) =>
    h.name.toLowerCase().includes(search.toLowerCase()),
  );
  const chooserPeople = data.people.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );
  const lastPage = Math.max(0, Math.ceil(chooserPeople.length / 40) - 1);
  const page = Math.min(peoplePage, lastPage);
  const visiblePeople = chooserPeople.slice(page * 40, (page + 1) * 40);
  const name = (id: string) =>
    data.people.find((p) => p.id === id)?.name ?? "Invited relative";
  return (
    <div className={styles.workspace}>
      <header className={styles.hero}>
        <div>
          <span className={styles.kicker}>
            {data.staff
              ? "Church family directory"
              : "Your people · Your story"}
          </span>
          <h1>
            {household?.name ??
              (own
                ? "My Household"
                : (householdPeople[0]?.name ?? "Family circle"))}
          </h1>
          <p>
            {household?.description ||
              "Family reaches beyond a surname. See who belongs together and the relationships that connect one household to another."}
          </p>
        </div>
        <div className={styles.stats}>
          <div>
            <strong>{householdPeople.length}</strong>
            <span>people shown</span>
          </div>
          <div>
            <strong>{circleFamilies.length}</strong>
            <span>linked families</span>
          </div>
          <div>
            <strong>{circle.links.length}</strong>
            <span>relationships</span>
          </div>
        </div>
      </header>
      <div className={styles.controls}>
        <div
          className={styles.tabs}
          role="tablist"
          aria-label="Family views"
          onKeyDown={(e) => {
            const ids = ["household", "connections", "tree"];
            let index = ids.indexOf(view);
            if (e.key === "ArrowRight") index = (index + 1) % 3;
            else if (e.key === "ArrowLeft") index = (index + 2) % 3;
            else if (e.key === "Home") index = 0;
            else if (e.key === "End") index = 2;
            else return;
            e.preventDefault();
            const id = ids[index]!;
            setView(id);
            document.getElementById(`family-tab-${id}`)?.focus();
          }}
        >
          {[
            ["household", "Household"],
            ["connections", "Family connections"],
            ["tree", "Family tree"],
          ].map(([id, label]) => (
            <button
              key={id}
              id={`family-tab-${id}`}
              role="tab"
              type="button"
              aria-selected={view === id}
              tabIndex={view === id ? 0 : -1}
              aria-controls="family-view"
              onClick={() => setView(id!)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.selector}>
          <label>
            Connections deep
            <select
              aria-label="Number of family connection levels"
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
            >
              <option value={1}>1 · Direct relatives</option>
              <option value={2}>2 · Extended circle</option>
              <option value={3}>3 · Wider family circle</option>
            </select>
          </label>
          {!own && (
            <button
              className={styles.quietButton}
              type="button"
              onClick={() => setFocus(null)}
            >
              Back to my household
            </button>
          )}
        </div>
      </div>
      {data.staff && (
        <div className={styles.selector}>
          <label>
            Focus household
            <select
              value={household?.id ?? ""}
              onChange={(e) => setFocus(e.target.value || null)}
            >
              <option value="">My household / not assigned</option>
              {data.households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      <section
        id="family-view"
        role="tabpanel"
        aria-labelledby={`family-tab-${view}`}
      >
        {view === "household" ? (
          <div className={styles.twoColumns}>
            <div className={styles.panel}>
              <h2>
                {own
                  ? "People in your household"
                  : "Known relatives in this family"}
              </h2>
              <p className={styles.note}>
                {data.staff || own
                  ? "A household can include different surnames. Relationships are recorded separately from household membership."
                  : "Only people participating in your confirmed family connections are shown here."}
              </p>
              <div className={styles.members}>
                {householdPeople.map((p) => (
                  <div key={p.id} className={styles.person}>
                    <span className={styles.initials}>
                      {p.name
                        .split(" ")
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <div>
                      <strong>
                        {data.staff ? (
                          <Link href={`/admin/people/${p.id}`}>{p.name}</Link>
                        ) : (
                          p.name
                        )}
                      </strong>
                      <small>
                        {p.id === data.viewerId
                          ? "You"
                          : household
                            ? "Household member"
                            : "Household not yet set"}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
              {!householdPeople.length && (
                <p className={styles.empty}>
                  No people assigned to this household yet.
                </p>
              )}
              {own && !household && (
                <p className={styles.help}>
                  Name your household to start, such as “The Bakers.” You can
                  then invite people to join and connect relatives in other
                  families.
                </p>
              )}
              <h3>Family stories</h3>
              {circle.links
                .filter((l) => {
                  const a = data.people.find((p) => p.id === l.sourceId),
                    b = data.people.find((p) => p.id === l.targetId);
                  return (
                    (a && familyNodeId(a) === root) ||
                    (b && familyNodeId(b) === root)
                  );
                })
                .map((l) => (
                  <div className={styles.request} key={l.id}>
                    <strong>{linkSentence(l, data.people)}</strong>
                    {l.notes && <p>{l.notes}</p>}
                  </div>
                ))}
              {!circle.links.length && (
                <p className={styles.note}>
                  Confirmed relationships will appear here and draw lines in
                  your family map.
                </p>
              )}
            </div>
            <div className={styles.panel}>
              <h2>{canEdit ? "Household details" : "About this family"}</h2>
              {canEdit ? (
                <OfficeActionForm
                  key={household?.updatedAt ?? "new"}
                  action={saveFamilyHousehold}
                  label={household ? "Save household" : "Create my household"}
                >
                  <input
                    type="hidden"
                    name="household_id"
                    value={household?.id ?? ""}
                  />
                  {household && (
                    <input
                      type="hidden"
                      name="updated_at"
                      value={household.updatedAt}
                    />
                  )}
                  <label>
                    Household name
                    <input
                      name="name"
                      defaultValue={household?.name ?? ""}
                      placeholder="e.g. The Bakers"
                      minLength={2}
                      maxLength={120}
                      required
                    />
                  </label>
                  <label>
                    About your family (shown in the family circle)
                    <textarea
                      name="description"
                      defaultValue={household?.description ?? ""}
                      rows={4}
                      maxLength={1000}
                      placeholder="A short introduction to your family"
                    />
                  </label>
                </OfficeActionForm>
              ) : (
                <p className={styles.description}>
                  {household?.description || "No introduction added yet."}
                </p>
              )}
              {household && !data.readOnly && (own || data.canManage) && (
                <details className={styles.request}>
                  <summary>Invite someone to this household</summary>
                  <p className={styles.note}>
                    Use their church account email. They decide whether to join;
                    an invitation does not move their record automatically.
                  </p>
                  <OfficeActionForm
                    action={inviteHouseholdMember}
                    label="Send household invitation"
                  >
                    <input
                      type="hidden"
                      name="household_id"
                      value={household.id}
                    />
                    <label>
                      Church account email
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                      />
                    </label>
                  </OfficeActionForm>
                </details>
              )}
            </div>
          </div>
        ) : (
          <FamilyMap
            key={`${root}-${view}`}
            data={data}
            root={root}
            depth={depth}
            peopleView={view === "tree"}
            onSelectFamily={setFocus}
          />
        )}
      </section>
      {!data.readOnly && (
        <div className={styles.panel}>
          <details>
            <summary>
              <strong>+ Connect a relative in this or another family</strong>
            </summary>
            <p className={styles.note}>
              {data.canManage
                ? "Select the people and record how they are related. Office-verified relationships can be confirmed immediately."
                : "Choose how you are related and enter your relative’s church account email. They confirm the relationship before it appears in the map. The church office can help add relatives who do not have an account."}
            </p>
            <OfficeActionForm
              action={requestFamilyRelationship}
              label={
                data.canManage
                  ? "Record family connection"
                  : "Request family connection"
              }
            >
              <div className="office-grid">
                {data.canManage ? (
                  <>
                    <label>
                      First person
                      <select
                        name="source_id"
                        required
                        defaultValue={data.viewerId}
                      >
                        {data.people.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ·{" "}
                            {data.households.find((h) => h.id === p.householdId)
                              ?.name ?? "No household"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Related person
                      <select name="target_id" required defaultValue="">
                        <option value="">Choose a person</option>
                        {data.people.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ·{" "}
                            {data.households.find((h) => h.id === p.householdId)
                              ?.name ?? "No household"}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <>
                    <input
                      type="hidden"
                      name="source_id"
                      value={data.viewerId}
                    />
                    <label>
                      Relative’s church account email
                      <input
                        name="email"
                        type="email"
                        required
                        maxLength={254}
                      />
                    </label>
                  </>
                )}
                <label>
                  {data.canManage
                    ? "First person is the related person’s…"
                    : "I am this person’s…"}
                  <select name="kind" required defaultValue="cousin">
                    {relationshipOptions.map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Connection story (optional, shown on the map)
                  <textarea
                    name="notes"
                    rows={3}
                    maxLength={1000}
                    placeholder="e.g. Our mothers are sisters; this connects the Baker and White families."
                  />
                </label>
              </div>
              {data.canManage && (
                <label className="checkbox-label">
                  <input type="checkbox" name="confirmed" value="yes" />
                  The church office has verified this relationship; add it to
                  the confirmed family map.
                </label>
              )}
              <p className={styles.note}>
                Confirmed relationships share names, household labels, and the
                connection story with the connected family circle, up to three
                links away.
              </p>
            </OfficeActionForm>
          </details>
        </div>
      )}
      {(pending.length > 0 || invitations.length > 0) && (
        <div className={styles.panel}>
          <h2>Requests and invitations</h2>
          {pending.map((l) => {
            const canReview =
              !data.readOnly &&
              (data.canManage || l.recipientId === data.viewerId);
            return (
              <div className={styles.request} key={`${l.id}-${l.updatedAt}`}>
                <span className={styles.badge}>Relationship request</span>
                <strong>{linkSentence(l, data.people)}</strong>
                {l.notes && <p>{l.notes}</p>}
                {canReview ? (
                  <OfficeActionForm
                    action={reviewFamilyRequest}
                    label="Confirm relationship"
                    submitValue={{ name: "decision", value: "confirmed" }}
                    actions={
                      <SubmitButton
                        className={styles.quietButton}
                        name="decision"
                        value="declined"
                        formNoValidate
                      >
                        Decline
                      </SubmitButton>
                    }
                  >
                    <input type="hidden" name="id" value={l.id} />
                    <input
                      type="hidden"
                      name="updated_at"
                      value={l.updatedAt}
                    />
                    <label className="checkbox-label">
                      <input
                        name="consent"
                        value="yes"
                        type="checkbox"
                        required
                      />
                      This relationship is correct. I agree it can appear in the
                      connected family circle.
                    </label>
                  </OfficeActionForm>
                ) : (
                  <p className={styles.note}>
                    Awaiting confirmation from the relative or church office.
                  </p>
                )}
              </div>
            );
          })}
          {invitations.map((i) => {
            const canReview =
              !data.readOnly &&
              (data.canManage || i.targetId === data.viewerId);
            const dest = data.households.find((h) => h.id === i.householdId);
            return (
              <div className={styles.request} key={`${i.id}-${i.updatedAt}`}>
                <span className={styles.badge}>Household invitation</span>
                <strong>
                  {i.targetId === data.viewerId
                    ? `${name(i.sourceId)} invited you to ${dest?.name ?? "their household"}`
                    : `Invitation to ${dest?.name ?? "your household"}`}
                </strong>
                {canReview ? (
                  <OfficeActionForm
                    action={reviewFamilyRequest}
                    label="Join household"
                    submitValue={{ name: "decision", value: "accepted" }}
                    actions={
                      <SubmitButton
                        className={styles.quietButton}
                        name="decision"
                        value="declined"
                        formNoValidate
                      >
                        Decline
                      </SubmitButton>
                    }
                  >
                    <input type="hidden" name="type" value="invitation" />
                    <input type="hidden" name="id" value={i.id} />
                    <input
                      type="hidden"
                      name="updated_at"
                      value={i.updatedAt}
                    />
                    <label className="checkbox-label">
                      <input
                        name="consent"
                        value="yes"
                        type="checkbox"
                        required
                      />
                      I agree to join {dest?.name ?? "this household"}. This
                      replaces my current household assignment and shares my
                      name within the household.
                    </label>
                  </OfficeActionForm>
                ) : (
                  <p className={styles.note}>
                    The invited person can accept or decline in My Household.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
      {data.links.some(
        (l) =>
          l.status === "confirmed" &&
          (data.canManage || [l.sourceId, l.targetId].includes(data.viewerId)),
      ) &&
        !data.readOnly && (
          <details className={styles.panel}>
            <summary>Manage confirmed connections</summary>
            <p className={styles.note}>
              Remove an incorrect connection before recording its correction.
              Removed links stay in the office audit history.
            </p>
            {data.links
              .filter(
                (l) =>
                  l.status === "confirmed" &&
                  (data.canManage ||
                    [l.sourceId, l.targetId].includes(data.viewerId)),
              )
              .map((l) => (
                <div className={styles.request} key={`${l.id}-${l.updatedAt}`}>
                  <strong>{linkSentence(l, data.people)}</strong>
                  <OfficeActionForm
                    action={reviewFamilyRequest}
                    label="Remove connection"
                  >
                    <input type="hidden" name="id" value={l.id} />
                    <input
                      type="hidden"
                      name="updated_at"
                      value={l.updatedAt}
                    />
                    <input type="hidden" name="decision" value="removed" />
                  </OfficeActionForm>
                </div>
              ))}
          </details>
        )}
      {data.staff && (
        <div className={styles.panel}>
          <h2>Church households and membership</h2>
          <input
            className={styles.search}
            type="search"
            aria-label="Search families and people"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPeoplePage(0);
            }}
            placeholder="Search a family or person"
          />
          <div className={styles.familyList}>
            {filteredHouseholds.map((h) => (
              <div className={styles.familyRow} key={h.id}>
                <div>
                  <h3>{h.name}</h3>
                  <small>
                    {data.people.filter((p) => p.householdId === h.id).length}{" "}
                    people
                  </small>
                </div>
                <button
                  className={styles.quietButton}
                  type="button"
                  onClick={() => {
                    setFocus(h.id);
                    setView("connections");
                  }}
                >
                  Explore family
                </button>
              </div>
            ))}
          </div>
          {data.canManage && (
            <>
              <details className={styles.request}>
                <summary>+ Create a church household</summary>
                <OfficeActionForm
                  action={saveFamilyHousehold}
                  label="Create household"
                >
                  <input type="hidden" name="new" value="true" />
                  <label>
                    Family name
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="e.g. The Whites"
                    />
                  </label>
                  <label>
                    Introduction
                    <textarea name="description" maxLength={1000} rows={3} />
                  </label>
                </OfficeActionForm>
              </details>
              <details className={styles.request}>
                <summary>Assign people to households</summary>
                <p className={styles.note}>
                  Assign existing people here.{" "}
                  <Link href="/admin/people">
                    Add a person in the directory
                  </Link>{" "}
                  if they do not have a record yet.
                </p>
                <p className={styles.note}>
                  {chooserPeople.length} matching people · page {page + 1} of{" "}
                  {lastPage + 1}
                </p>
                <div className={styles.actions}>
                  <button
                    type="button"
                    className={styles.quietButton}
                    disabled={page === 0}
                    onClick={() => setPeoplePage(page - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className={styles.quietButton}
                    disabled={page >= lastPage}
                    onClick={() => setPeoplePage(page + 1)}
                  >
                    Next
                  </button>
                </div>
                {visiblePeople.map((p) => (
                  <details
                    className={styles.request}
                    key={`${p.id}-${p.updatedAt}`}
                  >
                    <summary>
                      {p.name} ·{" "}
                      {data.households.find((h) => h.id === p.householdId)
                        ?.name ?? "Unassigned"}
                    </summary>
                    <OfficeActionForm
                      action={assignFamilyMember}
                      label="Save household assignment"
                    >
                      <input type="hidden" name="profile_id" value={p.id} />
                      <input
                        type="hidden"
                        name="updated_at"
                        value={p.updatedAt}
                      />
                      <label>
                        Household
                        <select
                          name="household_id"
                          defaultValue={p.householdId ?? ""}
                        >
                          <option value="">No household</option>
                          {data.households.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    </OfficeActionForm>
                  </details>
                ))}
              </details>
            </>
          )}
        </div>
      )}
      <p className={styles.note}>
        The family map includes confirmed relationships only. A shared surname
        never creates a connection automatically.
      </p>
    </div>
  );
}
