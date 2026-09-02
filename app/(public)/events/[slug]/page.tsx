import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { getEventBySlug } from "@/lib/data/public";
import { getSessionUser } from "@/lib/auth/session";
import { RegisterForm } from "./register-form";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  return {
    title: event.title,
    description: event.description ?? undefined,
    alternates: { canonical: `/events/${slug}` },
  };
}

export default async function EventDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [event, user] = await Promise.all([getEventBySlug(slug), getSessionUser()]);
  if (!event || event.status !== "published") notFound();

  const startsAt = new Date(event.starts_at);

  return (
    <section className="section two-col" style={{ paddingTop: 50 }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: event.title,
          startDate: event.starts_at,
          endDate: event.ends_at ?? undefined,
          location: event.location_name
            ? { "@type": "Place", name: event.location_name }
            : { "@type": "VirtualLocation", url: event.online_url ?? undefined },
          description: event.description ?? undefined,
        }}
      />
      <div>
        {event.category && <span className="tag">{event.category}</span>}
        <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "clamp(2.2rem,4vw,3.2rem)", margin: "16px 0" }}>
          {event.title}
        </h1>
        <p style={{ color: "var(--color-muted-2)" }}>
          {startsAt.toLocaleDateString("en-JM", { dateStyle: "full", timeZone: "America/Jamaica" })} •{" "}
          {startsAt.toLocaleTimeString("en-JM", { timeStyle: "short", timeZone: "America/Jamaica" })}
        </p>
        {event.location_name && <p style={{ color: "var(--color-muted)" }}>📍 {event.location_name}</p>}
        {event.description && <p className="large-copy">{event.description}</p>}
      </div>
      <RegisterForm eventId={event.id} signedIn={Boolean(user)} />
    </section>
  );
}
