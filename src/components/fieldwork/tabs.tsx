"use client";
import {useRef,useState,type ReactNode} from "react";
export function Tabs({items}:{items:{id:string;label:string;count?:number;content:ReactNode}[]}) {
 const [active,setActive]=useState(items[0]?.id); const refs=useRef<(HTMLButtonElement|null)[]>([]);
 return <><div className="fw-tabs" role="tablist" aria-label="Supplier details">{items.map((item,i)=><button key={item.id} ref={el=>{refs.current[i]=el}} id={`tab-${item.id}`} type="button" role="tab" aria-selected={active===item.id} aria-controls={`panel-${item.id}`} tabIndex={active===item.id?0:-1} onClick={()=>setActive(item.id)} onKeyDown={e=>{let next=i;if(e.key==="ArrowRight")next=(i+1)%items.length;else if(e.key==="ArrowLeft")next=(i-1+items.length)%items.length;else if(e.key==="Home")next=0;else if(e.key==="End")next=items.length-1;else return;e.preventDefault();setActive(items[next].id);refs.current[next]?.focus();}}>{item.label}{item.count!==undefined?<span>{item.count}</span>:null}</button>)}</div>{items.map(item=><section key={item.id} id={`panel-${item.id}`} role="tabpanel" aria-labelledby={`tab-${item.id}`} hidden={active!==item.id} tabIndex={0}>{item.content}</section>)}</>
}
