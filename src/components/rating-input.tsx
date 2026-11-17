import { RATING_SCALE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * 1–5 rating as a radio group: works without JavaScript, keyboard accessible,
 * and big enough to tap on a phone.
 */
export function RatingInput({
  name,
  defaultValue,
  error,
  legend,
}: {
  name: string;
  defaultValue?: number | null;
  error?: string;
  legend: string;
}) {
  return (
    <fieldset>
      <legend className="label">{legend}</legend>
      <div className="grid grid-cols-5 gap-1.5">
        {RATING_SCALE.map((r) => (
          <label key={r.value} title={`${r.label} — ${r.hint}`} className="cursor-pointer">
            <input type="radio" name={name} value={r.value} defaultChecked={defaultValue === r.value} className="peer sr-only" />
            <span
              className={cn(
                "flex h-11 flex-col items-center justify-center rounded-lg border text-sm font-bold transition",
                "peer-checked:border-brand-600 peer-checked:bg-brand-600 peer-checked:text-white",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500",
                error ? "border-red-300 bg-red-50 text-red-700" : "border-slate-300 bg-white text-slate-700 hover:border-brand-400",
              )}
            >
              {r.value}
            </span>
          </label>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-slate-400">
        <span>Unsatisfactory</span>
        <span>Outstanding</span>
      </div>
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </fieldset>
  );
}

export function RatingPill({ value, label }: { value: number | null | undefined; label?: string }) {
  const r = RATING_SCALE.find((x) => x.value === value);
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      {label && <span className="text-slate-500">{label}</span>}
      {r ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 font-semibold text-brand-700 ring-1 ring-brand-100 ring-inset">
          {r.value}
          <span className="font-normal">· {r.label}</span>
        </span>
      ) : (
        <span className="text-slate-400">Not rated</span>
      )}
    </span>
  );
}
