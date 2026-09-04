import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/json-ld";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductGallery } from "@/components/product-gallery";
import { getProductBySlug } from "@/lib/data/public";
import { formatJmd } from "@/lib/money";

export const revalidate = 120;
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return { title: product.name, description: product.description ?? undefined, alternates: { canonical: `/shop/${slug}` } };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product || product.status !== "active") notFound();

  const variant = product.product_variants?.[0];
  const stock = variant?.variant_stock_levels?.[0]?.available;
  const outOfStock = variant?.track_inventory && typeof stock === "number" && stock <= 0;

  return (
    <section className="section two-col" style={{ paddingTop: 50 }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description ?? product.name,
          offers: {
            "@type": "Offer",
            priceCurrency: product.currency,
            price: (product.price_minor / 100).toFixed(2),
            availability: outOfStock ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          },
        }}
      />
      <div>
        {product.image_urls && product.image_urls.length > 0 ? (
          <ProductGallery images={product.image_urls} name={product.name} />
        ) : (
          <div className="product-thumb" style={{ minHeight: 260, fontSize: "2rem" }}>
            {product.kind === "digital" ? "✦ Digital" : product.name.split(" ")[0]}
          </div>
        )}
      </div>
      <div>
        <span className="tag">{product.kind.toUpperCase()}</span>
        <h1 style={{ fontFamily: "var(--font-display)", color: "var(--color-blue-700)", fontSize: "clamp(2rem,4vw,2.8rem)", margin: "16px 0" }}>
          {product.name}
        </h1>
        {product.description && <p className="large-copy">{product.description}</p>}
        <p style={{ fontFamily: "var(--font-display)", fontSize: "1.6rem", color: "var(--color-olive-700)" }}>
          {formatJmd(product.price_minor)}
        </p>
        {variant && (
          <AddToCartButton
            productId={product.id}
            variantId={variant.id}
            slug={product.slug}
            name={product.name}
            priceMinor={variant.price_minor_override ?? product.price_minor}
            label={outOfStock ? "Sold out" : "Add to bag +"}
            disabled={Boolean(outOfStock)}
          />
        )}
        {outOfStock && <p className="form-note">This item is currently sold out.</p>}
      </div>
    </section>
  );
}
