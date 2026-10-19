import { expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
function files(path: string): string[] { return readdirSync(path, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? files(`${path}/${e.name}`) : [`${path}/${e.name}`]); }
it("keeps listing copy within the editorial rules", () => {
  const targets = [...files("src/components/listing"), ...files("src/app/ops/listings-preview"), "src/domain/public-listings.ts", "src/lib/public-listings.ts", "scripts/seed-public-suppliers.ts"];
  for (const file of targets) expect(readFileSync(file, "utf8"), file).not.toMatch(/\u2014|\bpartne[r]\w*/i);
});
