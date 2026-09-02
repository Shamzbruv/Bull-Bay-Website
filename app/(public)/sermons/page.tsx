import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedSermons } from "@/lib/data/public";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Sermons",
  description: "Watch, listen and grow from faith-building teaching at Bull Bay.",
  alternates: { canonical: "/sermons" },
};

const TOPICS = [
  { value: "all", label: "All" },
  { value: "discipleship", label: "Discipleship" },
  { value: "worship", label: "Worship" },
  { value: "prayer", label: "Prayer" },
  { value: "stewardship", label: "Stewardship" },
  { value: "evangelism", label: "Evangelism" },
  { value: "family", label: "Family" },
  { value: "faith", label: "Faith" },
  { value: "purpose", label: "Purpose" },
];

export default async function SermonsPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; q?: string }>;
}) {
  const { topic = "all", q } = await searchParams;
  const sermons = await getPublishedSermons({ topic, query: q });

  return (
    <section aria-labelledby="sermons-title">
      <div className="page-hero compact-hero">
        <p className="eyebrow">
          <span /> WORD FOR THE JOURNEY
        </p>
        <h1 id="sermons-title">
          Messages that
          <br />
          <em>move you forward.</em>
        </h1>
        <p>Watch, listen, save and share faith-building teaching from Bull Bay.</p>
      </div>
      <section className="section">
        <form className="filter-row" action="/sermons">
          <label htmlFor="sermon-filter">
            Find a message
            <input
              id="sermon-filter"
              className="filter-input"
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search by topic, scripture or speaker"
            />
          </label>
          <div className="filter-pills">
            {TOPICS.map((t) => (
              <Link key={t.value} href={`/sermons?topic=${t.value}`} className={topic === t.value ? "active" : ""}>
                {t.label}
              </Link>
            ))}
          </div>
        </form>
        <div className="sermon-grid">
          {sermons.length === 0 && <p className="panel-empty">No messages found. Try another topic.</p>}
          {sermons.map((sermon) => (
            <article className="sermon-card" key={sermon.id}>
              <div className={`sermon-thumb ${sermon.topics?.[0] ?? ""}`}>
                <span className="tag">{sermon.topics?.[0]?.toUpperCase() ?? "MESSAGE"}</span>
                <strong>{sermon.title}</strong>
                <span>▶ Watch message</span>
              </div>
              <h3>{sermon.title}</h3>
              <p>
                {sermon.speaker}
                {sermon.duration_seconds ? ` • ${Math.round(sermon.duration_seconds / 60)} min` : ""}
              </p>
              <Link className="watch-link" href={`/sermons/${sermon.slug}`}>
                Watch now →
              </Link>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
