import {it,expect} from "vitest";
import {textToDraft,pdfDraft} from "../pdf-draft";
it("creates unconfirmed candidate values without inventing units or converting ND",()=>{const rows=textToDraft("Lead <0.01 mg/kg\nCadmium 0.20 ppm\nMercury ND ppb\nArsenic no result");expect(rows).toHaveLength(3);expect(rows[0].value).toBe("<0.01");expect(rows[2].value).toBe("ND");expect(rows.every(r=>r.confirmed===false)).toBe(true)});
it("rejects non-PDF and encrypted bytes",()=>{expect(()=>pdfDraft(Buffer.from("not a PDF"))).toThrow();expect(()=>pdfDraft(Buffer.from("%PDF-1.7 /Encrypt"))).toThrow()});
