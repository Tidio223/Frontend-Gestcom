import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Body {
  action: "create" | "delete" | "block" | "unblock" | "set_role";
  email?: string;
  password?: string;
  first_name?: string;
  last_name?: string;
  user_id?: string;
  role?: "admin" | "user";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non authentifié" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Vérifier l'utilisateur connecté
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Session invalide" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Client admin (service role)
    const admin = createClient(supabaseUrl, serviceKey);

    // Vérifier rôle admin
    const { data: roleRow } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Accès refusé : admin requis" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: Body = await req.json();
    let logAction = "";
    let logDetails: Record<string, unknown> = {};
    let targetId: string | undefined;

    switch (body.action) {
      case "create": {
        if (!body.email || !body.password) {
          return new Response(JSON.stringify({ error: "Email et mot de passe requis" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data, error } = await admin.auth.admin.createUser({
          email: body.email,
          password: body.password,
          email_confirm: true,
          user_metadata: {
            first_name: body.first_name ?? "",
            last_name: body.last_name ?? "",
          },
        });
        if (error) throw error;
        targetId = data.user.id;

        // Le trigger handle_new_user a déjà créé profile + role 'user'
        // Si on demande un rôle admin, on l'ajoute
        if (body.role === "admin") {
          await admin.from("user_roles").delete().eq("user_id", data.user.id);
          await admin.from("user_roles").insert({ user_id: data.user.id, role: "admin" });
        }

        logAction = "user_created";
        logDetails = { email: body.email, role: body.role ?? "user" };
        break;
      }

      case "delete": {
        if (!body.user_id) throw new Error("user_id requis");
        if (body.user_id === user.id) throw new Error("Vous ne pouvez pas vous supprimer");
        const { error } = await admin.auth.admin.deleteUser(body.user_id);
        if (error) throw error;
        targetId = body.user_id;
        logAction = "user_deleted";
        break;
      }

      case "block":
      case "unblock": {
        if (!body.user_id) throw new Error("user_id requis");
        if (body.user_id === user.id) throw new Error("Action impossible sur vous-même");
        const isBlocked = body.action === "block";
        await admin.from("profiles").update({ is_blocked: isBlocked }).eq("id", body.user_id);
        if (isBlocked) {
          // Invalider les sessions actives
          await admin.auth.admin.signOut(body.user_id, "global").catch(() => {});
        }
        targetId = body.user_id;
        logAction = isBlocked ? "user_blocked" : "user_unblocked";
        break;
      }

      case "set_role": {
        if (!body.user_id || !body.role) throw new Error("user_id et role requis");
        await admin.from("user_roles").delete().eq("user_id", body.user_id);
        await admin.from("user_roles").insert({ user_id: body.user_id, role: body.role });
        targetId = body.user_id;
        logAction = "role_changed";
        logDetails = { role: body.role };
        break;
      }

      default:
        throw new Error("Action inconnue");
    }

    // Journaliser l'action admin
    await admin.from("activity_logs").insert({
      user_id: user.id,
      user_email: user.email,
      action: logAction,
      entity_type: "user",
      entity_id: targetId,
      details: logDetails,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur serveur";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
