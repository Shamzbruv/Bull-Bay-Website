import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { DeleteButton } from "@/components/delete-button";
import { deleteProduct } from "@/app/(admin)/admin/actions";
import { formatJmd } from "@/lib/money";
import { ProductForm } from "./product-form";
import { OrderStatus } from "./order-status";

export const metadata: Metadata = { title: "Shop" };

export default async function AdminShopPage() {
  const organizationId = await getOrganizationId();
  const permissions = await getUserPermissions(organizationId ?? "");
  if (!permissions.has("shop.manage")) return <AccessDenied />;

  const supabase = await createClient();
  const [{ data: products }, { data: orders }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, description, kind, status, price_minor, image_urls")
      .eq("organization_id", organizationId ?? "")
      .order("name"),
    supabase
      .from("orders")
      .select("id, order_number, customer_name, customer_email, total_minor, status, created_at")
      .eq("organization_id", organizationId ?? "")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Shop</h1>
          <p>Products, inventory and orders.</p>
        </div>
      </div>

      <div className="panel">
        <h2>New product</h2>
        <ProductForm />
      </div>

      <div className="panel">
        <h2>Products</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Photo</th>
                <th>Name</th>
                <th>Kind</th>
                <th>Price</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products?.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.image_urls?.[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_urls[0]} alt="" style={{ width: 44, height: 44, objectFit: "cover", borderRadius: 8 }} />
                    ) : (
                      <span style={{ color: "var(--color-muted)" }}>—</span>
                    )}
                  </td>
                  <td>
                    <details className="table-editor">
                      <summary>{p.name}</summary>
                      <ProductForm product={p} />
                    </details>
                  </td>
                  <td>{p.kind}</td>
                  <td>{formatJmd(p.price_minor)}</td>
                  <td>
                    <span className={`badge ${p.status === "active" ? "" : "gray"}`}>{p.status}</span>
                  </td>
                  <td>
                    <DeleteButton
                      action={deleteProduct}
                      id={p.id}
                      confirmText={`Delete "${p.name}" permanently? Past orders keep their record of it, but it disappears from the store.`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!products || products.length === 0) && <p className="panel-empty">No products yet.</p>}
      </div>

      <div className="panel">
        <h2>Orders</h2>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders?.map((o) => (
                <tr key={o.id}>
                  <td>{o.order_number}</td>
                  <td>{o.customer_name ?? o.customer_email ?? "—"}</td>
                  <td>{formatJmd(o.total_minor)}</td>
                  <td>
                    <OrderStatus orderId={o.id} status={o.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(!orders || orders.length === 0) && <p className="panel-empty">No orders yet.</p>}
      </div>
    </>
  );
}
