import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGroupBySlug } from "@/lib/data/public";
import { getSessionUser } from "@/lib/auth/session";
import { JoinButton } from "./join-button";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const group = await getGroupBySlug(slug);
  if (!group) return {};
  return { title: group.name, description: group.description ?? undefined, alternates: { canonical: `/groups/${slug}` } };
}

export default async function GroupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [group, user] = await Promise.all([getGroupBySlug(slug), getSessionUser()]);
  if (!group) notFound();

  return (
    <section className="section two-col" style={{ paddingTop: 50 }}>
      <div>
        {group.category && <span className="tag">{group.category}</span>}
        <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "clamp(2rem,4vw,3rem)", margin: "16px 0" }}>
          {group.name}
        </h1>
        {group.description && <p className="large-copy">{group.description}</p>}
        {group.meeting_schedule && <p>🗓 {group.meeting_schedule}</p>}
        {group.location_area && <p>📍 {group.location_area}</p>}
      </div>
      <JoinButton groupId={group.id} signedIn={Boolean(user)} />
    </section>
  );
}
