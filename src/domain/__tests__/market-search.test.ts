import {it,expect} from "vitest";
import {parseMarketSearch,mergeSearchFilters,supplierMatches,documentMatches,comparisonIds} from "../market-search";
import {suppliers} from "../../content/fieldwork/catalog";
it("parses the exact sourcing examples into inspectable constraints",()=>{expect(parseMarketSearch("olive oil with lead not detected").filters).toEqual({category:"Olive oil",analyte:"lead",result:"not-detected"});expect(parseMarketSearch("matcha from Japan tested for arsenic").filters).toEqual({category:"Tea & matcha",analyte:"arsenic",country:"Japan"});});
it("does not silently drop unrecognized requirements",()=>expect(parseMarketSearch("olive oil low nickel organic").remaining).toContain("low"));
it("binds tests and result claims to a matching document",()=>{const f=mergeSearchFilters({q:"olive oil with lead not detected"}).filters;expect(suppliers.filter(s=>supplierMatches(s,f)).map(s=>s.slug)).toEqual(["kasandrinos"]);const d={...suppliers[0].documents[0],title:"Heavy metals"};expect(documentMatches(d,{analyte:"lead"})).toBe(false);});
it("bounds comparison and freshness without assigning dates to partial records",()=>{expect(()=>comparisonIds("s:a,s:b,s:c,s:d,s:e")).toThrow();expect(comparisonIds("s:a,s:a,l:lot-1")).toEqual(["s:a","l:lot-1"]);expect(documentMatches({...suppliers[0].documents[0],date:"2026-07"},{months:"6"})).toBe(false);});
