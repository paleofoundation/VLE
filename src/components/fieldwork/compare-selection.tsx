"use client";
import {useSyncExternalStore,useState} from "react";
import Link from "next/link";
const key="vle-compare-v1",eventName="vle-compare-change";
function subscribe(fn:()=>void){window.addEventListener(eventName,fn);window.addEventListener("storage",fn);return ()=>{window.removeEventListener(eventName,fn);window.removeEventListener("storage",fn);};}
function snapshot(){return localStorage.getItem(key)??"[]";}
function useSelection(){const raw=useSyncExternalStore(subscribe,snapshot,()=>"[]");try{const parsed:unknown=JSON.parse(raw);return Array.isArray(parsed)?parsed.filter((x):x is string=>typeof x==="string"&&/^[sl]:[a-z0-9-]+$/.test(x)).slice(0,4):[];}catch{return [];}}
function save(ids:string[]){localStorage.setItem(key,JSON.stringify(ids));window.dispatchEvent(new Event(eventName));}
export function CompareButton({id,label}:{id:string;label:string}){const ids=useSelection(),selected=ids.includes(id),[message,setMessage]=useState("");return <><button type="button" className="fw-compare-toggle" aria-pressed={selected} aria-label={`${selected?"Remove":"Add"} ${label} ${selected?"from":"to"} comparison`} onClick={()=>{if(!selected&&ids.length>=4){setMessage("Compare up to four. Remove a selection first.");return;}setMessage("");save(selected?ids.filter(x=>x!==id):[...ids,id]);}}><span aria-hidden="true">{selected?"✓":"+"}</span> Compare</button>{message?<span role="status" className="fw-fineprint">{message}</span>:null}</>}
export function CompareTray(){const ids=useSelection();return ids.length?<aside className="fw-compare-tray" aria-label="Comparison selections"><span>{ids.length} of 4 selected</span><Link className="fw-button fw-primary" href={`/compare?items=${ids.join(",")}`}>Compare selections</Link><button className="fw-button fw-quiet" type="button" onClick={()=>save([])}>Clear</button></aside>:null;}
