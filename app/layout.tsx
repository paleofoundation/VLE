import type { Metadata } from "next";
export const metadata: Metadata = {title:"VLE | Meet your next source",description:"Find your ingredient. Meet the supplier. See the lot evidence for yourself."};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
