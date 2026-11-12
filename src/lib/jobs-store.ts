import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
export const STATUSES = [
  "Car Received",
  "Inspection",
  "Washing",
  "Detailing",
  "Quality Check",
  "Ready for Pickup",
  "Completed",
] as const;
export type Status = (typeof STATUSES)[number];
export const SERVICES = [
  "Exterior Wash",
  "Interior Deep Clean",
  "Full Wash & Interior",
  "Polish & Wax",
  "Full Detailing",
  "Ceramic Coating",
] as const;
export type Service = (typeof SERVICES)[number];
export type StatusHistoryEntry = {
  status: Status;
  at: string;
};
export type Job = {
  id: string;
  trackingCode: string;
  vehicle: string;
  plate: string;
  service: string;
  status: Status;
  createdAt: string;
  updatedAt: string;
  history: StatusHistoryEntry[];
};
export type StaffJob = Job & {
  customerName: string;
  phone: string;
  notes: string;
};
type DatabaseJob = {
  id: string | number;
  tracking_code: string;
  customer_name: string;
  phone: string | null;
  vehicle: string | null;
  plate: string | null;
  service: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  job_status_history?: Array<{
    status: string;
    changed_at: string;
  }>;
};
type PublicLookupRow = {
  id?: string | number;
  tracking_code: string;
  vehicle: string | null;
  plate: string | null;
  service: string;
  status: string;
  created_at: string;
  updated_at: string | null;
  history: Array<{
    status: string;
    at: string;
  }> | null;
};
function isValidStatus(value: string): value is Status {
  return STATUSES.includes(value as Status);
}
function normalizeStatus(value: string): Status {
  if (isValidStatus(value)) {
    return value;
  }
  throw new Error(`Invalid status returned by database: ${value}`);
}
function normalizeHistory(
  history:
    | Array<{
        status: string;
        changed_at: string;
      }>
    | null
    | undefined,
): StatusHistoryEntry[] {
  if (!history) {
    return [];
  }
  return history
    .filter((entry) => isValidStatus(entry.status))
    .map((entry) => ({
      status: normalizeStatus(entry.status),
      at: entry.changed_at,
    }))
    .sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
}
function toStaffJob(row: DatabaseJob): StaffJob {
  return {
    id: String(row.id),
    trackingCode: row.tracking_code,
    customerName: row.customer_name,
    phone: row.phone ?? "",
    vehicle: row.vehicle ?? "",
    plate: row.plate ?? "",
    service: row.service,
    status: normalizeStatus(row.status),
    notes: row.notes ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    history: normalizeHistory(row.job_status_history),
  };
}
function toCustomerJob(row: PublicLookupRow): Job {
  return {
    id: String(row.id ?? row.tracking_code),
    trackingCode: row.tracking_code,
    vehicle: row.vehicle ?? "",
    plate: row.plate ?? "",
    service: row.service,
    status: normalizeStatus(row.status),
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? row.created_at,
    history: (row.history ?? [])
      .filter((entry) => isValidStatus(entry.status))
      .map((entry) => ({
        status: normalizeStatus(entry.status),
        at: entry.at,
      }))
      .sort(
        (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
      ),
  };
}
/**
 * Customer-safe lookup.
 *
 * Calls the database RPC instead of querying the jobs table directly.
 * The RPC intentionally does NOT expose customer phone numbers
 * or internal staff notes.
 */
export async function lookupJob(code: string): Promise<Job | null> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return null;
  }
  const { data, error } = await supabase.rpc("public_job_lookup", {
    p_code: normalizedCode,
  });
  if (error) {
    console.error("Customer job lookup failed:", error);
    throw new Error("Unable to load vehicle progress.");
  }
  const rows = (data ?? []) as PublicLookupRow[];
  const firstRow = rows[0];
  if (!firstRow) {
    return null;
  }
  return toCustomerJob(firstRow);
}
/**
 * Loads all jobs for authenticated staff.
 *
 * This requires the authenticated user to have the appropriate
 * Supabase RLS permissions on the jobs table.
 */
export async function listJobs(): Promise<StaffJob[]> {
  const { data, error } = await supabase
    .from("jobs")
    .select(`
      *,
      job_status_history (
        status,
        changed_at
      )
    `)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Failed to load staff jobs:", error);
    throw new Error("Unable to load jobs.");
  }
  return ((data ?? []) as DatabaseJob[]).map(toStaffJob);
}
/**
 * Creates a job through the PostgreSQL RPC.
 *
 * Tracking-code generation happens inside PostgreSQL while
 * holding an advisory transaction lock. This prevents duplicate
 * tracking codes when multiple staff members create jobs.
 */
export async function createJob(input: {
  customerName: string;
  phone: string;
  vehicle: string;
  plate: string;
  service: string;
  status: Status;
  notes: string;
}): Promise<StaffJob> {
  const customerName = input.customerName.trim();
  const phone = input.phone.trim();
  const vehicle = input.vehicle.trim();
  const plate = input.plate.trim().toUpperCase();
  const service = input.service.trim();
  const notes = input.notes.trim();
  if (!customerName) {
    throw new Error("Customer name is required.");
  }
  if (!phone) {
    throw new Error("Phone number is required.");
  }
  if (!vehicle) {
    throw new Error("Vehicle make/model is required.");
  }
  if (!plate) {
    throw new Error("Plate number is required.");
  }
  if (!service) {
    throw new Error("Service is required.");
  }
  if (!isValidStatus(input.status)) {
    throw new Error("Invalid initial status.");
  }
  const { data, error } = await supabase.rpc("create_staff_job", {
    p_customer_name: customerName,
    p_phone: phone,
    p_vehicle: vehicle,
    p_plate: plate,
    p_service: service,
    p_status: input.status,
    p_notes: notes || null,
  });
  if (error) {
    console.error("Failed to create job:", error);
    if (
      error.code === "23505" ||
      error.message.toLowerCase().includes("duplicate")
    ) {
      throw new Error(
        "A tracking code conflict occurred. Please try creating the job again.",
      );
    }
    if (
      error.message.toLowerCase().includes("authentication required") ||
      error.message.toLowerCase().includes("authorized staff access required")
    ) {
      throw new Error(
        "You must be signed in with an authorized staff account to create a job.",
      );
    }
    throw new Error(error.message || "Unable to create job.");
  }
  /*
   * The create_staff_job() PostgreSQL function returns SETOF jobs.
   * Supabase may therefore return an array of rows rather than
   * a single job object. Handle both shapes safely.
   */
  const returnedRow = Array.isArray(data) ? data[0] : data;
  if (!returnedRow) {
    throw new Error(
      "The database did not return the new job. Check the jobs list before trying again.",
    );
  }
  const row = returnedRow as unknown as DatabaseJob;
  if (!row.id || !row.tracking_code || !row.status) {
    console.error("Unexpected create_staff_job response:", returnedRow);
    throw new Error(
      "The database returned incomplete job details. Check the jobs list before trying again.",
    );
  }
  return toStaffJob(row);
}
/**
 * Updates the current job status.
 *
 * The database trigger automatically creates a status-history
 * entry whenever the status changes.
 */
export async function updateStatus(
  id: string,
  status: Status,
): Promise<StaffJob> {
  if (!id) {
    throw new Error("Job ID is required.");
  }
  if (!isValidStatus(status)) {
    throw new Error("Invalid status.");
  }
  const { data, error } = await supabase
    .from("jobs")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(`
      *,
      job_status_history (
        status,
        changed_at
      )
    `)
    .single();
  if (error) {
    console.error("Failed to update status:", error);
    throw new Error("Unable to update job status.");
  }
  return toStaffJob(data as DatabaseJob);
}
/**
 * Updates internal staff notes.
 *
 * These notes are never exposed by public_job_lookup().
 */
export async function updateNotes(
  id: string,
  notes: string,
): Promise<StaffJob> {
  if (!id) {
    throw new Error("Job ID is required.");
  }
  const { data, error } = await supabase
    .from("jobs")
    .update({
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select(`
      *,
      job_status_history (
        status,
        changed_at
      )
    `)
    .single();
  if (error) {
    console.error("Failed to update notes:", error);
    throw new Error("Unable to save staff notes.");
  }
  return toStaffJob(data as DatabaseJob);
}
export function useStaffJobs(enabled = true) {
  const [jobs, setJobs] = useState<StaffJob[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listJobs();
      setJobs(result);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unable to load jobs.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [enabled]);
  useEffect(() => {
    if (enabled) {
      void refresh();
    }
  }, [enabled, refresh]);
  return {
    jobs,
    loading,
    error,
    refresh,
  };
}
export function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
