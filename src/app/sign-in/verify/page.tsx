"use client";
import {useEffect,useRef,useState} from "react";
import {useClerk} from "@clerk/nextjs";
import Link from "next/link";
import {safeReturn} from "@/domain/account";
export default function Verify(){const clerk=useClerk(),started=useRef(false),[error,setError]=useState(false);useEffect(()=>{if(!clerk.loaded||started.current)return;started.current=true;const next=safeReturn(new URLSearchParams(window.location.search).get("next"))??"/onboarding";void clerk.handleEmailLinkVerification({redirectUrl:next,redirectUrlComplete:next}).catch(()=>setError(true));},[clerk]);return <main id="main-content" className="fw-container fw-auth-page"><div className="fw-auth-card"><h1>{error?"This link could not be verified.":"Verifying your email."}</h1>{error?<Link className="fw-text-link" href="/sign-in">Request a new sign-in link</Link>:<p role="status">Please keep this page open.</p>}</div></main>}
