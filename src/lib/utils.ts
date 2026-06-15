import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Extracts a normalized registrable domain from a URL or hostname.
 * Strips protocol, "www." prefix, path, query and lowercases the result.
 * Returns "" when the input cannot be parsed.
 */
export function extractDomain(input: string): string {
  if (!input) return "";
  let value = input.trim();
  try {
    // Ensure URL() has a protocol to work with.
    if (!/^https?:\/\//i.test(value)) {
      value = `https://${value}`;
    }
    const { hostname } = new URL(value);
    return hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    // Fallback: best-effort manual parse.
    return value
      .replace(/^https?:\/\//i, "")
      .replace(/^www\./i, "")
      .split("/")[0]
      .toLowerCase();
  }
}

/** Formats a Date (or ISO string) for compact display. */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
