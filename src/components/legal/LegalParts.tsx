import type { ReactNode } from "react";
import { OPERATOR } from "@/content/legal/operator";

type OperatorField = keyof typeof OPERATOR;

/** Valeur de l'exploitant·e, ou repère surligné tant qu'elle manque. */
export function Fill({ field, label }: { field: OperatorField; label: string }) {
  const value = OPERATOR[field];
  if (value) return <>{value}</>;
  return (
    <mark className="rounded bg-warning/15 px-1 py-0.5 text-warning [box-decoration-break:clone]">
      [À compléter : {label}]
    </mark>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-xl font-medium text-ink2 sm:text-2xl">{title}</h2>
      {children}
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-relaxed text-ink2-muted sm:text-[15px]">{children}</p>;
}

export function List({ children }: { children: ReactNode }) {
  return (
    <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm leading-relaxed text-ink2-muted marker:text-accent/70 sm:text-[15px]">
      {children}
    </ul>
  );
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className="font-medium text-ink2">{children}</strong>;
}

/** Tableau simple à deux colonnes (ex. durées de conservation). */
export function Table({ head, rows }: { head: [string, string]; rows: [ReactNode, ReactNode][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-hairline">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead className="bg-surface-raised/60 text-ink2">
          <tr>
            <th className="px-4 py-2.5 font-medium">{head[0]}</th>
            <th className="px-4 py-2.5 font-medium">{head[1]}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline text-ink2-muted">
          {rows.map(([a, b], index) => (
            <tr key={index}>
              <td className="px-4 py-2.5 align-top">{a}</td>
              <td className="px-4 py-2.5 align-top">{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
