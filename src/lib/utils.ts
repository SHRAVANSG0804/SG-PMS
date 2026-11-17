export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

/** "2026-04-01" or ISO timestamp → "1 Apr 2026". Uses UTC so server and client agree. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Weighted score = Σ(rating × weightage) / Σ(weightage), rounded to 1 decimal. */
export function weightedScore(items: Array<{ rating: number | null | undefined; weightage: number }>): number | null {
  const rated = items.filter((i) => typeof i.rating === "number" && i.rating > 0);
  if (rated.length === 0) return null;
  const totalWeight = rated.reduce((s, i) => s + i.weightage, 0);
  if (totalWeight === 0) return null;
  const score = rated.reduce((s, i) => s + (i.rating as number) * i.weightage, 0) / totalWeight;
  return Math.round(score * 10) / 10;
}

export function percent(part: number, total: number): number {
  return total === 0 ? 0 : Math.round((part / total) * 100);
}

export function appUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}
