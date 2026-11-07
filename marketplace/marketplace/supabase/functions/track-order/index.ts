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

  const projectUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!projectUrl || !serviceRoleKey) {
    console.error("Tracking lookup function is missing required server secrets");
    return json({ error: "Shipment tracking is not configured" }, 503);
  }

  try {
    const body = await request.json();
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!/^[A-F0-9]{32}$/.test(code)) return json({ error: "Enter a valid 32-character tracking code" }, 400);

    const adminClient = createClient(projectUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { data: order, error: orderError } = await adminClient
      .from("marketplace_orders")
      .select("id,tracking_code,product_title,quantity,total_xaf,payment_status,order_status,created_at")
      .eq("tracking_code", code)
      .single();
    if (orderError || !order) return json({ error: "No shipment was found for that code" }, 404);

    const { data: updates, error: updatesError } = await adminClient
      .from("marketplace_tracking_updates")
      .select("status_label,note,latitude,longitude,location_label,created_at")
      .eq("order_id", order.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (updatesError) {
      console.error("Could not load tracking updates", updatesError);
      return json({ error: "Could not load shipment location updates" }, 500);
    }

    return json({
      tracking_code: order.tracking_code,
      product_title: order.product_title,
      quantity: order.quantity,
      payment_status: order.payment_status,
      order_status: order.order_status,
      updates: updates ?? [],
    });
  } catch (error) {
    console.error("Shipment tracking lookup failed", error);
    return json({ error: "Could not look up shipment" }, 500);
  }
});
