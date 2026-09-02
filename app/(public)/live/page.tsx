import type { Metadata } from "next";
import Link from "next/link";
import { getPrimaryCampus } from "@/lib/data/public";

export const metadata: Metadata = {
  title: "Live",
  description: "Worship with Bull Bay live, wherever you are.",
  alternates: { canonical: "/live" },
};

export default async function LivePage() {
  const campus = await getPrimaryCampus();
  const schedule = Array.isArray(campus?.service_schedule)
    ? (campus?.service_schedule as { day: string; time: string; label: string }[])
    : [];

  return (
    <section aria-labelledby="live-title">
      <div className="page-hero live-hero">
        <p className="eyebrow light">
          <span /> JOIN FROM ANYWHERE
        </p>
        <h1 id="live-title">
          Church is not just a place.
          <br />
          <em>It is a people.</em>
        </h1>
        <p>Worship with Bull Bay live, wherever you are.</p>
        {campus?.livestream_url ? (
          <a className="light-button live-link" href={campus.livestream_url} target="_blank" rel="noreferrer">
            Open Livestream <span>▶</span>
          </a>
        ) : (
          <p style={{ color: "#d9e2f1", fontSize: ".82rem", marginTop: 16 }}>
            Our livestream link will appear here once the church&apos;s streaming channel is connected.
          </p>
        )}
      </div>
      <div className="section stream-grid">
        <article className="stream-card">
          <span className="tag">SUNDAY • {schedule.find((s) => s.day === "Sunday")?.time ?? "9:50 AM"}</span>
          <h2>Join our next live worship experience.</h2>
          <p>Live chat, prayer, Bible reading, and giving will be connected here when the streaming channel is added.</p>
          <Link className="primary-button compact" href="/prayer">
            Request Prayer <span>→</span>
          </Link>
        </article>
        <article className="schedule-card">
          <h3>This week at Bull Bay</h3>
          {schedule.map((item) => (
            <div key={item.day}>
              <b>{item.day}</b>
              <span>{item.label}</span>
              <em>{item.time}</em>
            </div>
          ))}
        </article>
      </div>
    </section>
  );
}
