"use client";

import { useActionState } from "react";
import { saveProduct } from "@/app/(admin)/admin/actions";
import { initialActionState } from "@/lib/action-state";
import { SubmitButton } from "@/components/submit-button";
import { FormStatus } from "@/components/form-status";
import { formatJmd } from "@/lib/money";

type EditableProduct = {
  id: string;
  name: string;
  description: string | null;
  kind: string;
  status: string;
  price_minor: number;
  image_urls: string[] | null;
};

export function ProductForm({ product }: { product?: EditableProduct }) {
  const [state, formAction] = useActionState(saveProduct, initialActionState);
  const existingImages = product?.image_urls ?? [];

  return (
    <form className="clay-form" action={formAction}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="form-row">
        <label>
          Name
          <input name="name" required defaultValue={product?.name ?? ""} />
        </label>
        <label>
          Price (JMD)
          <input name="price" required placeholder="2500" defaultValue={product ? (product.price_minor / 100).toFixed(2) : ""} />
        </label>
      </div>
      <label>
        Description
        <textarea name="description" defaultValue={product?.description ?? ""} />
      </label>
      <div className="form-row">
        <label>
          Kind
          <select name="kind" defaultValue={product?.kind ?? "physical"}>
            <option value="physical">Physical</option>
            <option value="digital">Digital</option>
            <option value="software">Software</option>
            <option value="service">Service</option>
            <option value="subscription">Subscription</option>
          </select>
        </label>
        {!product && (
          <label>
            Initial stock (physical only)
            <input type="number" name="initial_stock" min={0} defaultValue={0} />
          </label>
        )}
      </div>
      <label>
        Status
        <select name="status" defaultValue={product?.status ?? "draft"}>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
      </label>

      <div>
        <strong style={{ display: "block", marginBottom: 8, fontSize: ".82rem", color: "var(--color-blue-700)" }}>Product photos</strong>
        {existingImages.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 10, marginBottom: 12 }}>
            {existingImages.map((url) => (
              <label key={url} style={{ position: "relative", cursor: "pointer" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" style={{ width: "100%", aspectRatio: "1/1", objectFit: "cover", borderRadius: 10 }} />
                <span
                  className="check-label"
                  style={{ position: "absolute", bottom: 4, left: 4, right: 4, background: "rgba(255,255,255,.92)", borderRadius: 6, padding: "2px 6px", fontSize: ".64rem", marginBottom: 0 }}
                >
                  <input type="checkbox" name="keep_images" value={url} defaultChecked style={{ marginRight: 4 }} />
                  Keep
                </span>
              </label>
            ))}
          </div>
        )}
        <label>
          Add photos
          <input type="file" name="images" accept="image/png,image/jpeg,image/webp" multiple />
        </label>
        <p className="form-note" style={{ marginTop: 4 }}>
          Upload as many as you like — uncheck &quot;Keep&quot; on a photo above to remove it.
        </p>
      </div>

      <FormStatus state={state} />
      <SubmitButton pendingLabel="Saving…">{product ? "Save changes" : "Create product"}</SubmitButton>
      {product && (
        <p className="form-note" style={{ marginTop: 6 }}>
          Currently priced at {formatJmd(product.price_minor)}.
        </p>
      )}
    </form>
  );
}
