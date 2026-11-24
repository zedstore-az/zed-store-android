import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigin = "https://zedstore-management.onrender.com";
const headers = {
  "Access-Control-Allow-Origin": allowedOrigin,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function respond(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers });
}

async function removeUserFiles(admin: ReturnType<typeof createClient>, userId: string) {
  const bucket = admin.storage.from("zedstore-products");
  const paths: string[] = [];

  async function collect(folder: string, depth = 0) {
    if (depth > 8) throw new Error("Storage folder nesting limit exceeded");
    let offset = 0;
    while (true) {
      const { data, error } = await bucket.list(folder, { limit: 1000, offset });
      if (error) throw error;
      const entries = data || [];
      for (const entry of entries) {
        if (entry.id) {
          paths.push(folder + "/" + entry.name);
        } else {
          await collect(folder + "/" + entry.name, depth + 1);
        }
      }
      if (entries.length < 1000) break;
      offset += entries.length;
    }
  }

  await collect(userId);
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await bucket.remove(paths.slice(i, i + 100));
    if (error) throw error;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return respond(405, { error: "Method not allowed" });

  const origin = req.headers.get("origin");
  if (origin && origin !== allowedOrigin) {
    return respond(403, { error: "Bu əməliyyat bu ünvandan icazəli deyil." });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return respond(401, { error: "Giriş sessiyası tapılmadı." });
    }

    const body = await req.json();
    const password = typeof body?.password === "string" ? body.password : "";
    if (body?.confirmed !== true) {
      return respond(400, { error: "Son təsdiq verilməyib." });
    }
    if (password.length < 8 || password.length > 256) {
      return respond(400, { error: "Hesab şifrəsini düzgün daxil et." });
    }

    const url = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !anonKey || !serviceKey) {
      return respond(500, { error: "Hesab silmə xidməti hazır deyil." });
    }

    const token = authHeader.slice(7);
    const caller = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: callerData, error: callerError } = await caller.auth.getUser(token);
    const user = callerData?.user;
    if (callerError || !user?.id || !user.email) {
      return respond(401, { error: "Giriş sessiyası etibarlı deyil. Yenidən daxil ol." });
    }

    const verifier = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: verified, error: passwordError } = await verifier.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (passwordError || verified?.user?.id !== user.id) {
      return respond(400, { error: "Hesab şifrəsi yanlışdır." });
    }

    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });

    const { data: adminAccess, error: adminAccessError } = await admin
      .from("admin_access")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (adminAccessError) throw adminAccessError;
    if (adminAccess) {
      return respond(403, { error: "Əsas sistem administratorunun hesabı bu bölmədən silinə bilməz." });
    }

    const { data: registration, error: registrationError } = await admin
      .from("store_registrations")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (registrationError) throw registrationError;
    if (!registration || registration.status !== "approved") {
      return respond(403, { error: "Yalnız təsdiqlənmiş mağaza hesabı silinə bilər." });
    }

    // Storage objects must be removed before deleting the Auth user.
    await removeUserFiles(admin, user.id);

    // Clear the two non-cascading audit references, then remove rows whose
    // foreign keys would otherwise prevent deleting the store's products/user.
    const auditActor = await admin
      .from("activity_logs")
      .update({ actor_id: null })
      .eq("actor_id", user.id);
    if (auditActor.error) throw auditActor.error;

    const reviewed = await admin
      .from("store_registrations")
      .update({ reviewed_by: null })
      .eq("reviewed_by", user.id);
    if (reviewed.error) throw reviewed.error;

    const returns = await admin.from("returns").delete().eq("owner_id", user.id);
    if (returns.error) throw returns.error;

    const movements = await admin.from("stock_movements").delete().eq("owner_id", user.id);
    if (movements.error) throw movements.error;

    const purchases = await admin.from("purchases").delete().eq("owner_id", user.id);
    if (purchases.error) throw purchases.error;

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;

    return respond(200, { success: true });
  } catch (error) {
    console.error("delete-store-account failed:", error instanceof Error ? error.message : "unknown error");
    return respond(500, { error: "Mağazanı silmək mümkün olmadı. Məlumatlar tam silinməyib; yenidən cəhd etməzdən əvvəl dəstəyə müraciət et." });
  }
});
