"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { NativeSelect, LOCATION_OPTIONS } from "@/components/market-select";

type Mode = "single" | "bulk" | "csv";

const TABS: { key: Mode; label: string }[] = [
  { key: "single", label: "Single" },
  { key: "bulk", label: "Bulk" },
  { key: "csv", label: "CSV Upload" },
];

/** Parses a CSV/newline list — takes the first column of each non-empty row. */
function parseKeywordList(raw: string): string[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.split(",")[0]?.trim() ?? "")
    .filter((k) => k.length > 0 && k.toLowerCase() !== "keyword");
}

export function KeywordForm() {
  const router = useRouter();
  const [mode, setMode] = React.useState<Mode>("single");
  const [location, setLocation] = React.useState("India");

  const [keyword, setKeyword] = React.useState("");
  const [bulkText, setBulkText] = React.useState("");

  const [loading, setLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileRef = React.useRef<HTMLInputElement>(null);

  function reset() {
    setKeyword("");
    setBulkText("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submitSingle() {
    const res = await fetch("/api/keywords", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keyword, location }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to add keyword");
    }
    return "Keyword added.";
  }

  async function submitBulk(keywords: string[]) {
    if (keywords.length === 0) {
      throw new Error("No keywords found.");
    }
    const res = await fetch("/api/keywords/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ keywords, location }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || "Failed to add keywords");
    }
    const { created, skipped } = json.data;
    return `${created} added${skipped ? `, ${skipped} skipped (duplicates)` : ""}.`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      let text: string;
      if (mode === "single") {
        text = await submitSingle();
      } else if (mode === "bulk") {
        text = await submitBulk(parseKeywordList(bulkText));
      } else {
        const file = fileRef.current?.files?.[0];
        if (!file) throw new Error("Please choose a CSV file.");
        const content = await file.text();
        text = await submitBulk(parseKeywordList(content));
      }
      setMessage({ type: "success", text });
      reset();
      router.refresh();
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Keywords</CardTitle>
        <CardDescription>
          Enter a keyword and choose a location.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex gap-1 rounded-md bg-muted p-1 text-sm">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                setMode(tab.key);
                setMessage(null);
              }}
              className={`flex-1 rounded px-3 py-1.5 transition-colors ${
                mode === tab.key
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Input 1: Keyword */}
          {mode === "single" && (
            <div className="space-y-2">
              <Label htmlFor="keyword">Keyword</Label>
              <Input
                id="keyword"
                placeholder="best suv under 15 lakh"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                required
              />
            </div>
          )}

          {mode === "bulk" && (
            <div className="space-y-2">
              <Label htmlFor="bulk">Keywords (one per line)</Label>
              <Textarea
                id="bulk"
                rows={6}
                placeholder={"brezza review\ncar loan emi calculator\nhyundai creta price"}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
            </div>
          )}

          {mode === "csv" && (
            <div className="space-y-2">
              <Label htmlFor="csv">CSV file</Label>
              <Input id="csv" type="file" accept=".csv,text/csv" ref={fileRef} />
              <p className="text-xs text-muted-foreground">
                The first column of each row is used. A &quot;keyword&quot; header row
                is ignored.
              </p>
            </div>
          )}

          {/* Input 2: Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <NativeSelect
              id="location"
              options={LOCATION_OPTIONS}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          {message && (
            <p
              className={`text-sm ${
                message.type === "success"
                  ? "text-green-700"
                  : "text-destructive"
              }`}
            >
              {message.text}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Add Keywords"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
