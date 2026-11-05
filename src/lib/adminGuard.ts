import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Resolves the current user and whether they hold the 'admin' role.
 * The role lives in the `profiles` table (RLS lets a user read only
 * their own row), so this check cannot be spoofed client-side.
 */
async function getRole() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, isAdmin: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  return { user, isAdmin: profile?.role === "admin" };
}

/**
 * PAGES — call at the top of every /admin page.
 * Signed out → login. Signed in but NOT admin → login with a 403 notice.
 */
export async function requireAdmin() {
  const { user, isAdmin } = await getRole();
  if (!user) redirect("/admin/login");
  if (!isAdmin) redirect("/admin/login?error=forbidden");
  return user!;
}

/**
 * API ROUTES — returns a NextResponse (401/403) when access must be denied,
 * or null when the caller is an admin. Usage:
 *   const denied = await requireAdminApi(); if (denied) return denied;
 */
export async function requireAdminApi(): Promise<NextResponse | null> {
  const { user, isAdmin } = await getRole();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}

/**
 * SERVER ACTIONS — must be the FIRST line of every admin "use server"
 * function. Server actions are network endpoints and can be invoked
 * directly, so page-level guards are NOT enough.
 */
export async function assertAdmin() {
  const { user, isAdmin } = await getRole();
  if (!user || !isAdmin) throw new Error("Forbidden");
}
