import { ButtonLink, EmptyState } from "@/components/ui";
export default function NotFound(){return <main id="main-content" className="container section-space"><EmptyState title="This page isn't available." action={<ButtonLink href="/suppliers">Browse suppliers</ButtonLink>}>The address may have changed, or the listing may no longer be published.</EmptyState></main>;}
