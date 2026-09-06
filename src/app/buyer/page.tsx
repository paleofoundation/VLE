import Link from "next/link";
import { createReservationAction, transitionQuoteAction, cancelReservationAction } from "@/app/commercial-actions";
import { getCurrentPageActor } from "@/lib/page-actor";
import { formatQuantity } from "@/lib/presentation";
import { listCommercialWorkspace } from "@/services/commercial";

export const dynamic = "force-dynamic";

const date = (value: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(value);

export default async function BuyerDeskPage({ searchParams }: PageProps<"/buyer">) {
  const { created } = await searchParams;
  const actor = await getCurrentPageActor();
  if (!actor.roles.some((role) => role === "BUYER" || role === "OPS" || role === "ADMIN")) {
    return <main id="main-content" className="accessPage"><div className="accessCard"><span className="mono">AUTHZ / BUYER</span><h1>Buyer access required.</h1><Link className="textLink" href="/">Return to the public shelf</Link></div></main>;
  }
  const workspace = await listCommercialWorkspace(actor, "BUYER");
  return (
    <main id="main-content" className="commercialPage">
      <section className="commercialHero"><div><p className="eyebrow">Buyer desk · Cocoa powder</p><h1>Requirements and commercial intent</h1><p className="sectionLead">Review matches to currently eligible lots, accept a time-limited quote, and record a reservation intent. Nothing here creates an Order.</p></div><Link className="button" href="/find">New requirement</Link></section>
      {created === "1" ? <div className="success" role="status" aria-live="polite"><strong>Requirement recorded.</strong><span>VLE operations can now run eligibility-bound matching.</span></div> : null}
      <section className="commercialBoard">
        <div className="boardHeading"><div><p className="eyebrow">Your pipeline</p><h2>Passing-lot requirements</h2></div><p>A match or reservation automatically becomes invalid when its listing unlists.</p></div>
        <div className="commercialList">
          {workspace.requirements.map((requirement) => {
            const matches = workspace.matches.filter((match) => match.requirementId === requirement.id);
            return <article className="commercialCard" key={requirement.id}>
              <div className="commercialCardHead"><div><span className="stateChip state-qualified">{requirement.profileName} v{requirement.profileVersion}</span><h3>{formatQuantity(requirement.quantity)} {requirement.quantityUnit} to {requirement.destination}</h3><p>Recorded {date(requirement.createdAt)}</p></div></div>
              {!matches.length ? <div className="inlineEmpty"><strong>Awaiting managed matching.</strong><span>Only currently eligible public listings can appear here.</span></div> : null}
              {matches.map((match) => {
                const quotes = workspace.quotes.filter((quote) => quote.requirementMatchId === match.id);
                const reservations = workspace.reservations.filter((reservation) => reservation.requirementMatchId === match.id);
                return <div className="matchPanel" key={match.id}>
                  <div className="matchTitle"><div><span className={`stateChip ${match.status === "ACTIVE" ? "state-qualified" : "state-unlisted"}`}>{match.status} match</span><h4>{match.lotCode}</h4><p>{match.supplier} · {formatQuantity(match.quantity)} {match.quantityUnit} · {match.location}, {match.countryCode}</p></div>{match.listingStatus === "LISTED" ? <Link className="textLink" href={`/lots/${match.publicSlug}`}>Public listing</Link> : <span className="muted">Listing withdrawn</span>}</div>
                  {match.status === "INVALIDATED" ? <p className="warningText">Listing eligibility ended: {match.invalidationReason}</p> : null}
                  {quotes.map((quote) => {
                    const reservation = reservations.find((item) => item.supplierQuoteId === quote.id);
                    return <div className="quoteRow" key={quote.id}>
                      <div><span className={`stateChip state-${quote.status.toLowerCase()}`}>Quote {quote.status}</span><strong>{quote.currency} {Number(quote.unitPrice).toFixed(2)} / {quote.quantityUnit}</strong><small>{formatQuantity(quote.quantity)} {quote.quantityUnit} · expires {date(quote.expiresAt)}</small></div>
                      <div className="commercialActions">
                        {quote.status === "SENT" && match.status === "ACTIVE" ? <form action={transitionQuoteAction}><input type="hidden" name="quoteId" value={quote.id} /><input type="hidden" name="to" value="ACCEPTED" /><button className="button buttonSmall" type="submit">Accept quote</button></form> : null}
                        {quote.status === "ACCEPTED" && !reservation && match.status === "ACTIVE" ? <form action={createReservationAction} className="inlineForm"><input type="hidden" name="quoteId" value={quote.id} /><label>Intent window<select name="expiresInHours" defaultValue="48"><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><button className="button buttonSmall" type="submit">Create reservation intent</button></form> : null}
                        {reservation ? <div className="reservationRecord"><span className={`stateChip state-${reservation.status.toLowerCase()}`}>Intent {reservation.status}</span><small>Expires {date(reservation.expiresAt)} · explicitly not an Order</small>{reservation.status === "ACTIVE" ? <form action={cancelReservationAction}><input type="hidden" name="reservationId" value={reservation.id} /><input type="hidden" name="reason" value="Cancelled by buyer" /><button className="textButton" type="submit">Cancel intent</button></form> : null}</div> : null}
                      </div>
                    </div>;
                  })}
                  {!quotes.length ? <div className="inlineEmpty"><strong>Match recorded; awaiting supplier quote.</strong><span>Quote expiry and tenant boundaries will be enforced.</span></div> : null}
                </div>;
              })}
            </article>;
          })}
          {!workspace.requirements.length ? <div className="opsEmpty"><h3>No buyer requirements yet.</h3><p>Record the cocoa quantity, destination, and frozen profile that must be met.</p><Link className="button buttonSmall" href="/find">Find a passing lot</Link></div> : null}
        </div>
      </section>
    </main>
  );
}
