import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return json({ error: "Authentication required" }, 401);

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  const sender = Deno.env.get("ORDER_EMAIL_FROM");
  const companyEmail = Deno.env.get("COMPANY_EMAIL");
  if (!projectUrl || !anonKey || !serviceRoleKey || !resendKey || !sender || !companyEmail) {
    console.error("Order email function is missing required server secrets");
    return json({ error: "Order email notifications are not configured" }, 503);
  }

  const userClient = createClient(projectUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const adminClient = createClient(projectUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: "Invalid session" }, 401);

    const body = await request.json();
    if (!body || typeof body !== "object") return json({ error: "Invalid notification request" }, 400);
    const orderId = typeof body.order_id === "string" ? body.order_id : "";
    const event = body.event;
    if (!orderId || !["order_placed", "payment_received"].includes(event)) {
      return json({ error: "Invalid notification request" }, 400);
    }

    const { data: order, error: orderError } = await adminClient
      .from("marketplace_orders")
      .select("id,tracking_code,buyer_id,seller_id,buyer_email,buyer_name,product_title,quantity,total_xaf,payment_status,order_status")
      .eq("id", orderId)
      .single();
    if (orderError || !order) return json({ error: "Order not found" }, 404);

    const expectedOwner = event === "order_placed" ? order.buyer_id : order.seller_id;
    if (userData.user.id !== expectedOwner) return json({ error: "Not authorized for this notification" }, 403);
    if (event === "payment_received" && order.payment_status !== "received") {
      return json({ error: "Seller must confirm payment before sending a receipt" }, 409);
    }

    const { data: sellerData, error: sellerError } = await adminClient.auth.admin.getUserById(order.seller_id);
    if (sellerError || !sellerData.user?.email) {
      console.error("Could not resolve seller email", sellerError);
      return json({ error: "Seller email is unavailable" }, 503);
    }

    const paymentMessage = event === "payment_received"
      ? "The seller has confirmed your payment."
      : "Your order has been recorded. Follow the seller's payment instructions shown at checkout; your payment is not marked received until the seller confirms it.";
    const subject = event === "payment_received"
      ? `Payment received for order ${order.tracking_code}`
      : `Order received: ${order.product_title}`;
    const text = [
      `Hello ${order.buyer_name},`,
      "",
      paymentMessage,
      `Product: ${order.product_title}`,
      `Quantity: ${order.quantity}`,
      `Total: ${new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(order.total_xaf)}`,
      `Order / tracking code: ${order.tracking_code}`,
      `Track your shipment at: ${Deno.env.get("SITE_URL") ?? ""}/track.html?code=${encodeURIComponent(order.tracking_code)}`,
      "",
      `Marketplace support: ${companyEmail}`,
    ].join("\n");

    const sellerText = [
      `Marketplace order update: ${order.tracking_code}`,
      "",
      `Buyer: ${order.buyer_name} (${order.buyer_email})`,
      `Product: ${order.product_title}`,
      `Quantity: ${order.quantity}`,
      `Total: ${new Intl.NumberFormat("fr-CM", { style: "currency", currency: "XAF", maximumFractionDigits: 0 }).format(order.total_xaf)}`,
      event === "payment_received" ? "You confirmed receipt of payment." : "Please review the order, verify any transfer independently, then update its payment status in your seller account.",
      `Marketplace support: ${companyEmail}`,
    ].join("\n");

    for (const [recipient, message] of [[order.buyer_email, text], [sellerData.user.email, sellerText]]) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: sender, to: [recipient], subject, text: message }),
      });
      if (!emailResponse.ok) {
        console.error("Email provider rejected an order notification", await emailResponse.text());
        return json({ error: "Order was saved, but one or more notification emails could not be sent" }, 502);
      }
    }

    return json({ sent: true });
  } catch (error) {
    console.error("Order notification failed", error);
    return json({ error: "Could not send order notification" }, 500);
  }
});
