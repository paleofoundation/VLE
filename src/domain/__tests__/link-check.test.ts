import {describe,it,expect} from "vitest";
import {isPublicAddress,checkedLinkState} from "../link-check";
describe("document link checks",()=>{
 it("excludes private and reserved addresses",()=>{
  for(const a of ["127.0.0.1","10.1.1.1","169.254.169.254","172.16.0.1","192.168.0.1","100.64.0.1","198.18.0.1","::1","::ffff:127.0.0.1","fc00::1","fe80::1","2001:db8::1","2002:7f00:1::"])expect(isPublicAddress(a)).toBe(false);
  expect(isPublicAddress("8.8.8.8")).toBe(true);expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
 });
 it("marks only definitive removals and never restores moderation",()=>{
  for(const s of [null,200,401,403,429,500])expect(checkedLinkState("LIVE",s)).toBe("LIVE");
  for(const s of [404,410])expect(checkedLinkState("LIVE",s)).toBe("NO_LONGER_PUBLISHED");
  expect(checkedLinkState("NO_LONGER_PUBLISHED",200)).toBe("NO_LONGER_PUBLISHED");
 });
});
