import { describe, expect, it } from "vitest";
import { parseContaminantForm } from "../contaminant-form";
import { assertContaminantAttachment, MAX_CONTAMINANT_FILE_BYTES } from "../contaminants";

function form() {
  const data = new FormData();
  data.set("documentationType", "MICROPLASTICS");
  data.set("subject", "PROFILE");
  data.set("complianceProfileId", "22222222-2222-4222-8222-222222222222");
  return data;
}
const pdf = "%PDF-1.4\n% Synthetic test fixture\n%%EOF";

describe("supplier document form boundary", () => {
  it("uses the uploaded filename and leaves absent dates unset", async () => {
    const data = form();
    data.set("file", new File([pdf], "fixture.pdf", { type: "application/pdf" }));
    const input = await parseContaminantForm(data);
    expect(input.fileName).toBe("fixture.pdf");
    expect(input.referenceUrl).toBeUndefined();
    expect(input.documentDate).toBeUndefined();
    expect(input.retestOn).toBeUndefined();
    expect(() => assertContaminantAttachment(input)).not.toThrow();
  });
  it("retains reference-only input and rejects simultaneous reference and upload", async () => {
    const data = form();
    data.set("fileName", "reference.pdf");
    data.set("referenceUrl", "https://example.test/reference.pdf");
    expect(() => assertContaminantAttachment({ documentationType: "PFAS", subject: "PROFILE", complianceProfileId: "profile", fileName: "reference.pdf", referenceUrl: "https://example.test/reference.pdf" })).not.toThrow();
    expect((await parseContaminantForm(data)).referenceUrl).toBe("https://example.test/reference.pdf");
    data.set("file", new File([pdf], "fixture.pdf", { type: "application/pdf" }));
    await expect(parseContaminantForm(data)).rejects.toThrow(/not both/);
  });
  it("rejects blank files, excessive size and spoofed content without accepting a result", async () => {
    for (const file of [new File([], "empty.pdf", { type: "application/pdf" }), new File([new Uint8Array(MAX_CONTAMINANT_FILE_BYTES + 1)], "large.pdf", { type: "application/pdf" })]) {
      const data = form(); data.set("file", file);
      await expect(parseContaminantForm(data)).rejects.toThrow(/512 KiB/);
    }
    const data = form();
    data.set("file", new File(["<html>test</html>"], "spoof.pdf", { type: "application/pdf" }));
    expect(() => assertContaminantAttachment({ documentationType: "PFAS", subject: "PROFILE", complianceProfileId: "profile", fileName: "fixture.pdf" })).toThrow(/Choose/);
    const input = await parseContaminantForm(data);
    expect(() => assertContaminantAttachment(input)).toThrow(/PDF/);
  });
  it("rejects invalid calendar dates, unrecognized types and cross-subject payloads", async () => {
    const data = form(); data.set("documentDate", "2026-02-30");
    await expect(parseContaminantForm(data)).rejects.toThrow(/valid date/);
    data.set("documentDate", ""); data.set("documentationType", "UNKNOWN");
    await expect(parseContaminantForm(data)).rejects.toThrow();
    data.set("documentationType", "PFAS"); data.set("physicalLotId", "11111111-1111-4111-8111-111111111111");
    data.set("fileName", "reference.pdf"); data.set("referenceUrl", "https://example.test/ref.pdf");
    const input = await parseContaminantForm(data);
    expect(() => assertContaminantAttachment(input)).toThrow(/one compliance profile/);
  });
});
