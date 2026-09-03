import type { Metadata } from "next";
import { getPublishedGalleryImages } from "@/lib/data/public";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Gallery",
  description: "Moments from life together at Bull Bay.",
  alternates: { canonical: "/gallery" },
};

export default async function GalleryPage() {
  const images = await getPublishedGalleryImages();

  return (
    <section aria-labelledby="gallery-title">
      <div className="page-hero">
        <p className="eyebrow light">
          <span /> COMMUNITY
        </p>
        <h1 id="gallery-title">Life together at Bull Bay.</h1>
        <p>A look at what God is doing among us.</p>
      </div>

      <div className="section">
        {images.length === 0 ? (
          <p className="panel-empty">Photos from church life will appear here soon.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 20 }}>
            {images.map((img) => (
              <figure key={img.id} style={{ margin: 0, borderRadius: 16, overflow: "hidden", background: "var(--color-surface-2)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt={img.caption ?? ""} style={{ width: "100%", aspectRatio: "4/3", objectFit: "cover", display: "block" }} loading="lazy" />
                {(img.caption || img.story) && (
                  <figcaption style={{ padding: "12px 14px" }}>
                    {img.caption && <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{img.caption}</div>}
                    {img.story && <p style={{ margin: "4px 0 0", fontSize: ".82rem", color: "var(--color-muted-2)" }}>{img.story}</p>}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
