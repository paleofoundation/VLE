"use server";
import {currentUser} from "@clerk/nextjs/server";
import {redirect} from "next/navigation";
import {chooseAccountRole} from "@/services/account";
import {safeReturn} from "@/domain/account";
export async function chooseRole(data:FormData){const u=await currentUser();if(!u)redirect("/sign-in?next=/onboarding");const e=u.emailAddresses.find(e=>e.id===u.primaryEmailAddressId);if(!e)throw new Error("A verified email is required.");const role=await chooseAccountRole({clerkUserId:u.id,email:e.emailAddress,displayName:u.fullName??e.emailAddress,verified:e.verification?.status==="verified"},data.get("role"));redirect(safeReturn(data.get("next"))??(role==="SUPPLIER"?"/dashboard/supplier":"/dashboard/brand"));}
