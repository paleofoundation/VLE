import {ClerkProvider} from "@clerk/nextjs";
export const metadata={robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <ClerkProvider>{children}</ClerkProvider>}
