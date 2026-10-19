import { isIP } from "node:net";
export function isPublicAddress(address: string) {
 if (isIP(address) === 4) {
  const [a,b] = address.split(".").map(Number);
  return !(a===0 || a===10 || a===127 || a>=224 || (a===169&&b===254) || (a===172&&b>=16&&b<=31) || (a===192&&(b===168||b===0||b===2)) || (a===100&&b>=64&&b<=127) || (a===198&&(b===18||b===19||b===51)) || (a===203&&b===0));
 }
 return isIP(address)===6 && /^[23]/i.test(address) && !/^(2001:(0:|db8:)|2002:)/i.test(address);
}
export function checkedLinkState(current: string, status: number | null) {
 // Robot blocks and timeouts do not establish removal. Never undo moderation.
 return status===404 || status===410 ? "NO_LONGER_PUBLISHED" as const : current;
}
