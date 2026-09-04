import type { Metadata } from "next";
import Link from "next/link";
import { getActiveProducts } from "@/lib/data/public";
import { formatJmd } from "@/lib/money";
import { CartBadge } from "@/components/cart-badge";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Shop",
  description: "Shop ministry apparel, devotional resources, and digital church products.",
  alternates: { canonical: "/shop" },
};

const KINDS = [
  { value: "all", label: "All items" },
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
];

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ kind?: string }> }) {
  const { kind = "all" } = await searchParams;
  const products = await getActiveProducts(kind);

  return (
    <section aria-labelledby="shop-title">
      <div className="page-hero compact-hero">
        <p className="eyebrow">
          <span /> BULL BAY STORE
        </p>
        <h1 id="shop-title">
          Resources that help
          <br />
          <em>faith travel further.</em>
        </h1>
        <p>Shop ministry items, devotional resources, and church-created digital products.</p>
      </div>
      <section className="section">
        <div className="shop-tools">
          <div className="filter-pills">
            {KINDS.map((k) => (
              <Link key={k.value} href={`/shop?kind=${k.value}`} className={kind === k.value ? "active" : ""}>
                {k.label}
              </Link>
            ))}
          </div>
          <CartBadge />
        </div>
        <div className="shop-grid">
          {products.length === 0 && <p className="panel-empty">No items available right now.</p>}
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              {product.image_urls?.[0] ? (
                <div className="product-thumb" style={{ padding: 0, overflow: "hidden" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- Supabase Storage public URL */}
                  <img src={product.image_urls[0]} alt="" style={{ width: "100%", height: "100%", minHeight: 150, objectFit: "cover" }} />
                </div>
              ) : (
                <div className="product-thumb">{product.kind === "digital" ? "✦ Digital" : product.name.split(" ")[0]}</div>
              )}
              <h3>{product.name}</h3>
              {product.description && <p>{product.description}</p>}
              <footer>
                <b>{formatJmd(product.price_minor)}</b>
                <Link href={`/shop/${product.slug}`}>View →</Link>
              </footer>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
