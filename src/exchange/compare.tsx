"use client";

import { useState } from "react";
import { COMPARE_LINE } from "./copy";

export type CompareOption = {
  id: string;
  title: string;
  rows: { label: string; value: string }[];
};

const MAX = 4;

export function CompareBoard({ options }: { options: CompareOption[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const chosen = options.filter((option) => selected.includes(option.id));
  const slots = [...chosen];
  while (slots.length < MAX) {
    const number = slots.length + 1;
    slots.push({ id: `empty-${number}`, title: `Empty compare slot ${number}`, rows: [] });
  }
  const labels = Array.from(new Set(options.flatMap((option) => option.rows.map((row) => row.label))));
  const full = selected.length >= MAX;

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= MAX) return current;
      return [...current, id];
    });
  }

  return (
    <section className="x-compare" data-testid="compare" aria-label={COMPARE_LINE}>
      <h2 className="x-h2">{COMPARE_LINE}</h2>
      <p className="x-note">{selected.length} of 4 selected. The compare page is not in this round. This is the side-by-side layout.</p>
      <div className="x-dock-actions">
        {options.map((option) => {
          const on = selected.includes(option.id);
          return (
            <button key={option.id} className={on ? "x-btn" : "x-btn-secondary"} type="button" aria-pressed={on} disabled={!on && full} onClick={() => toggle(option.id)}>
              {on ? `Remove ${option.title}` : `Add ${option.title}`}
            </button>
          );
        })}
      </div>
      <div className="x-results-wrap">
        <table className="x-results">
          <caption>{COMPARE_LINE}</caption>
          <thead>
            <tr>
              <th scope="col">Field</th>
              {slots.slice(0, MAX).map((slot) => (
                <th key={slot.id} scope="col">
                  {slot.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((label) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                {slots.slice(0, MAX).map((slot) => (
                  <td key={slot.id} data-label={label}>
                    {slot.rows.find((row) => row.label === label)?.value ?? ""}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function CompareSpecimen() {
  const rows = [
    { label: "Makes", values: ["EXAMPLE oil", "EXAMPLE powder", "EXAMPLE protein", "EXAMPLE spice"] },
    { label: "MOQ (minimum order)", values: ["EXAMPLE 500 kg", "EXAMPLE 1,000 kg", "EXAMPLE 200 kg", "EXAMPLE 100 kg"] },
    { label: "Lead, plain words", values: ["Not detected", "Not detected", "Below the EXAMPLE limit", "Not detected"] },
  ];
  return (
    <div className="x-results-wrap" data-testid="compare-specimen">
      <table className="x-results">
        <caption>{COMPARE_LINE} EXAMPLE columns only.</caption>
        <thead>
          <tr>
            <th scope="col">Field</th>
            {["EXAMPLE slot 1", "EXAMPLE slot 2", "EXAMPLE slot 3", "EXAMPLE slot 4"].map((slot) => (
              <th key={slot} scope="col">
                {slot}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {row.values.map((value, index) => (
                <td key={`${row.label}-${index}`} data-label={row.label}>
                  {value}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
