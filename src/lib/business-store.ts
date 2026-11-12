import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  role: "owner" | "manager" | "staff";
};

const SELECTED_WORKSPACE_KEY = "lavage-selected-workspace";

export function getSelectedWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(SELECTED_WORKSPACE_KEY);
}

export function selectWorkspace(id: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(SELECTED_WORKSPACE_KEY, id);
  }
}

export function useWorkspaces(enabled = true) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: queryError } = await (supabase as any)
        .from("business_memberships")
        .select("business_id, role, businesses!inner(id, name, slug)")
        .order("created_at", { ascending: true });
      if (queryError) throw queryError;
      const rows = (data ?? []) as Array<{
        business_id: string;
        role: Workspace["role"];
        businesses: { id: string; name: string; slug: string } | { id: string; name: string; slug: string }[];
      }>;
      setWorkspaces(rows.map((row) => {
        const business = Array.isArray(row.businesses) ? row.businesses[0] : row.businesses;
        if (!business) throw new Error("A business membership is missing its business record.");
        return { ...business, role: row.role };
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load business workspaces.");
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { workspaces, loading, error, refresh };
}

export async function createBusiness(name: string, slug: string): Promise<Workspace> {
  const cleanName = name.trim();
  const cleanSlug = slug.trim().toLowerCase();
  if (cleanName.length < 2) throw new Error("Enter a business name with at least two characters.");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cleanSlug)) {
    throw new Error("Use lowercase letters, numbers and single hyphens in the business URL.");
  }
  const { data, error } = await (supabase as any).rpc("create_business_with_owner", {
    p_name: cleanName,
    p_slug: cleanSlug,
  });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.business_id) throw new Error("The database did not confirm the new business.");
  return { id: row.business_id, name: row.business_name, slug: row.business_slug, role: "owner" };
}
