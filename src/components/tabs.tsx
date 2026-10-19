"use client";
import { useId, useState, type KeyboardEvent, type ReactNode } from "react";
export function Tabs({ items }: { items: { label: string; count?: number; content: ReactNode }[] }) {
  const [active, setActive] = useState(0); const id = useId();
  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next = event.key === "ArrowRight" ? (index + 1) % items.length : event.key === "ArrowLeft" ? (index - 1 + items.length) % items.length : event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : null;
    if (next !== null) { event.preventDefault(); setActive(next); document.getElementById(`${id}-tab-${next}`)?.focus(); }
  }
  return <><div className="tabs" role="tablist" aria-label="Supplier details">{items.map((item, index) => <button key={item.label} role="tab" id={`${id}-tab-${index}`} aria-controls={`${id}-panel-${index}`} aria-selected={active === index} tabIndex={active === index ? 0 : -1} onClick={() => setActive(index)} onKeyDown={(e) => move(e, index)}>{item.label}{item.count !== undefined && <span>{item.count}</span>}</button>)}</div>{items.map((item, index) => <div key={item.label} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`} hidden={active !== index} tabIndex={0} className="tab-panel">{item.content}</div>)}</>;
}
