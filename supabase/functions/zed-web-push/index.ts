import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-push-webhook-secret",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  if (request.method === "GET") {
    if (!publicKey) return json({ error: "VAPID_PUBLIC_KEY is not configured" }, 503);
    return json({ publicKey });
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expectedSecret = Deno.env.get("PUSH_WEBHOOK_SECRET") || "";
  const receivedSecret = request.headers.get("x-push-webhook-secret") || "";
  if (!expectedSecret || receivedSecret !== expectedSecret) return json({ error: "Unauthorized webhook" }, 401);

  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  const subject = Deno.env.get("VAPID_SUBJECT") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  let serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const secretKeysJson = Deno.env.get("SUPABASE_SECRET_KEYS") || "";
  if (secretKeysJson) {
    try { serviceRoleKey = JSON.parse(secretKeysJson)["default"] || serviceRoleKey; }
    catch { console.error("SUPABASE_SECRET_KEYS is not valid JSON."); }
  }
  if (!publicKey || !privateKey || !subject || !supabaseUrl || !serviceRoleKey) {
    console.error("Push function is missing one or more required secrets.");
    return json({ error: "Push service is not configured" }, 503);
  }

  let payload: any;
  try { payload = await request.json(); }
  catch { return json({ error: "Invalid JSON body" }, 400); }

  if (payload?.type !== "INSERT" || payload?.table !== "notifications" || payload?.schema !== "public") {
    return json({ ignored: true, reason: "Not a notifications INSERT event" });
  }
  const record = payload.record;
  if (!record?.owner_id || !record?.id) return json({ error: "Notification record is incomplete" }, 400);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    const { data: subscriptions, error } = await admin
      .from("push_subscriptions").select("id, subscription").eq("owner_id", record.owner_id);
    if (error) throw error;
    if (!subscriptions?.length) return json({ sent: 0, expired: 0, total: 0 });

    let sent = 0;
    let expired = 0;
    const results = await Promise.allSettled(subscriptions.map(async (row) => {
      const message = JSON.stringify({
        title: record.title || "ZED STORE",
        body: record.message || "Yeni bildiriş var.",
        tag: record.id,
        url: "/notifications",
      });
      try {
        await webpush.sendNotification(row.subscription, message, { TTL: 3600 });
        sent += 1;
      } catch (error: any) {
        const statusCode = Number(error?.statusCode || error?.status || 0);
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("push_subscriptions").delete().eq("id", row.id);
          expired += 1;
          return;
        }
        console.error("Push delivery failed:", statusCode || "unknown status");
      }
    }));
    const failed = results.filter((result) => result.status === "rejected").length;
    return json({ sent, expired, failed, total: subscriptions.length });
  } catch (error) {
    console.error("Push webhook failed:", error?.message || String(error));
    return json({ error: "Push delivery failed" }, 500);
  }
});