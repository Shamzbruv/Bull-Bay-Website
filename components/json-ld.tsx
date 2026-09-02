/** Renders a JSON-LD <script> tag for structured data (Organization, Event,
 * VideoObject, Product, …). See docs/ARCHITECTURE.md — SEO. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
