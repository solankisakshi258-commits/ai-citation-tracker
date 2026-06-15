"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function CollectButton({
  keywordId,
  size = "sm",
  variant = "outline",
  label = "Collect",
}: {
  keywordId: string;
  size?: "sm" | "default";
  variant?: "outline" | "default";
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/collect/${keywordId}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Collection failed");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Collection failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <Button size={size} variant={variant} onClick={run} disabled={loading}>
        {loading ? "Collecting…" : label}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
