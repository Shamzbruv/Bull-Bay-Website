import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getOrganizationId } from "@/lib/auth/session";

type CheckoutBody = {
  items: { variantId: string; quantity: number }[];
  customerName?: string;
  customerEmail?: string;
  fulfillmentMethod?: string;
};

/**
 * Creates a pending order from the cart. Never trusts prices from the
 * client — every price is re-read from Postgres. No payment is collected
 * here: the order stays `pending` until a real gateway is wired in (see
 * lib/payments), matching the blueprint's webhook-first checkout sequence.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as CheckoutBody;
  if (!body.items?.length) {
    return NextResponse.json({ error: "Your bag is empty." }, { status: 400 });
  }

  const supabase = await createClient();
  const organizationId = await getOrganizationId();
  if (!organizationId) return NextResponse.json({ error: "Store unavailable." }, { status: 500 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let customerProfileId: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("id").eq("auth_user_id", user.id).maybeSingle();
    customerProfileId = profile?.id ?? null;
  }

  const variantIds = body.items.map((i) => i.variantId);
  const { data: variants, error: variantError } = await supabase
    .from("product_variants")
    .select("id, sku, name, price_minor_override, product_id, products(id, name, price_minor, status)")
    .in("id", variantIds);

  if (variantError || !variants || variants.length === 0) {
    return NextResponse.json({ error: "We couldn't find those items." }, { status: 400 });
  }

  let subtotal = 0;
  const lineItems = body.items.map((item) => {
    const variant = variants.find((v) => v.id === item.variantId);
    const product = variant?.products as unknown as { id: string; name: string; price_minor: number; status: string } | null;
    if (!variant || !product || product.status !== "active") {
      throw new Error("unavailable_item");
    }
    const unitPrice = variant.price_minor_override ?? product.price_minor;
    const total = unitPrice * item.quantity;
    subtotal += total;
    return {
      product_id: product.id,
      variant_id: variant.id,
      name_snapshot: product.name,
      sku_snapshot: variant.sku,
      unit_price_minor: unitPrice,
      quantity: item.quantity,
      total_minor: total,
    };
  });

  if (!customerProfileId && !body.customerEmail) {
    return NextResponse.json({ error: "Please provide an email for guest checkout." }, { status: 400 });
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      organization_id: organizationId,
      customer_profile_id: customerProfileId,
      customer_email: body.customerEmail ?? null,
      customer_name: body.customerName ?? null,
      status: "pending",
      subtotal_minor: subtotal,
      total_minor: subtotal,
      fulfillment_method: body.fulfillmentMethod ?? null,
    })
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "We couldn't start your order. Please try again." }, { status: 500 });
  }

  const { error: itemsError } = await supabase
    .from("order_items")
    .insert(lineItems.map((item) => ({ ...item, order_id: order.id })));

  if (itemsError) {
    return NextResponse.json({ error: "We couldn't complete your order. Please try again." }, { status: 500 });
  }

  return NextResponse.json({
    orderId: order.id,
    orderNumber: order.order_number,
    message:
      "Order received. Online payment is being finalized while the church sets up a Jamaican payment provider — our office will follow up to arrange payment and fulfillment.",
  });
}
