import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { getSermonBySlug } from "@/lib/data/public";
import { createPublicClient } from "@/lib/supabase/public";

export const revalidate = 120;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const sermon = await getSermonBySlug(slug);
  if (!sermon) return {};
  return {
    title: sermon.title,
    description: sermon.summary ?? `A message by ${sermon.speaker}`,
    alternates: { canonical: `/sermons/${slug}` },
  };
}

export default async function SermonDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sermon = await getSermonBySlug(slug);
  if (!sermon || sermon.status !== "published") notFound();

  const embedUrl =
    sermon.video_provider === "youtube" && sermon.video_id
      ? `https://www.youtube-nocookie.com/embed/${sermon.video_id}`
      : null;
  const selfHostedUrl =
    sermon.video_provider === "upload" && sermon.video_path
      ? createPublicClient().storage.from("sermon-video").getPublicUrl(sermon.video_path).data.publicUrl
      : null;

  return (
    <section className="section" style={{ paddingTop: 50, maxWidth: 860 }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "VideoObject",
          name: sermon.title,
          description: sermon.summary ?? sermon.title,
          uploadDate: sermon.preached_at,
          ...(sermon.duration_seconds
            ? { duration: `PT${Math.round(sermon.duration_seconds / 60)}M` }
            : {}),
        }}
      />
      <span className="tag">{sermon.topics?.[0]?.toUpperCase() ?? "MESSAGE"}</span>
      <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "clamp(2.2rem,4vw,3.4rem)", margin: "16px 0" }}>
        {sermon.title}
      </h1>
      <p style={{ color: "var(--color-muted-2)" }}>
        {sermon.speaker}
        {sermon.preached_at ? ` • ${new Date(sermon.preached_at).toLocaleDateString("en-JM", { dateStyle: "long" })}` : ""}
      </p>

      {embedUrl ? (
        <div style={{ borderRadius: 24, overflow: "hidden", margin: "24px 0", aspectRatio: "16/9" }}>
          <iframe
            src={embedUrl}
            title={sermon.title}
            style={{ width: "100%", height: "100%", border: 0 }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      ) : selfHostedUrl ? (
        <div style={{ borderRadius: 24, overflow: "hidden", margin: "24px 0", aspectRatio: "16/9", background: "#000" }}>
          <video src={selfHostedUrl} controls style={{ width: "100%", height: "100%" }} />
        </div>
      ) : (
        <div className="sermon-image" style={{ minHeight: 220, margin: "24px 0" }}>
          <p>
            VIDEO COMING
            <br />
            <strong>SOON</strong>
          </p>
        </div>
      )}

      {sermon.summary && (
        <div className="panel">
          <h2>Summary</h2>
          <p>{sermon.summary}</p>
        </div>
      )}

      {sermon.transcript && (
        <div className="panel">
          <h2>Transcript</h2>
          <p style={{ whiteSpace: "pre-wrap", color: "var(--color-muted-2)" }}>{sermon.transcript}</p>
        </div>
      )}
    </section>
  );
}
