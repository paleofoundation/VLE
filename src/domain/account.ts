import {z} from "zod";
export const roleChoice=z.enum(["SUPPLIER","BUYER"]);
export function safeReturn(value:unknown){if(typeof value!=="string"||!value.startsWith("/")||value.startsWith("//")||/[\\\r\n]/.test(value))return null;const url=new URL(value,"https://vle.exchange");return url.origin==="https://vle.exchange"&&!/^\/(sign-in|sign-up|onboarding|sso-callback)([/?]|$)/.test(value)?`${url.pathname}${url.search}`:null;}
export type PriceRecord={amount:string;currency:string;unit:string;sourceUrl?:string|null;sourceDate?:string|null};
export function priceVisibility(price:PriceRecord|null,kind:"MEMBER"|"PUBLIC_DOCUMENTS",signedIn:boolean){if(!price||!signedIn)return null;if(kind==="PUBLIC_DOCUMENTS")return price.sourceUrl&&price.sourceDate?price:null;return signedIn?price:null;}
