import Link from "next/link";
import { cancelReservationAction, createQuoteAction, transitionQuoteAction } from "@/app/commercial-actions";
import { getCurrentActor } from "@/lib/current-actor";
import { formatQuantity } from "@/lib/presentation";
import { listCommercialWorkspace } from "@/services/commercial";

export const dynamic = "force-dynamic";

const date = (value: Date) => new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(value);

export default async function SupplierDeskPage() {
  const actor = await getCurrentActor();
  if (!actor.roles.some((role) => role === "SUPPLIER" || role === "OPS" || role === "ADMIN")) {
    return <main id="main-content" className="accessPage"><div className="accessCard"><span className="mono">AUTHZ / SUPPLIER</span><h1>Supplier access required.</h1><Link className="textLink" href="/">Return to the public shelf</Link></div></main>;
  }
  const workspace = await listCommercialWorkspace(actor, "SUPPLIER");
  const requirements = new Map(workspace.requirements.map((item) => [item.id, item]));
  return (
    <main id="main-content" className="commercialPage">
      <section className="commercialHero"><div><p className="eyebrow">Supplier desk · Cocoa powder</p><h1>Matched demand and quotes</h1><p className="sectionLead">Quote only against an eligible listing. Quote acceptance and reservation intent never override listing eligibility or create an Order.</p></div><Link className="textLink" href="/ops/commercial">Commercial operations →</Link></section>
      <section className="commercialBoard">
        <div className="boardHeading"><div><p className="eyebrow">Matched requirements</p><h2>Quote queue</h2></div><p>Draft and sent quotes expire automatically. Withdrawn, expired, and accepted states are terminal.</p></div>
        <div className="commercialList">
          {workspace.matches.map((match) => {
            const requirement = requirements.get(match.requirementId);
            const quotes = workspace.quotes.filter((quote) => quote.requirementMatchId === match.id);
            const hasOpenQuote = quotes.some(({ status }) => status === "DRAFT" || status === "SENT" || status === "ACCEPTED");
            return <article className="commercialCard" key={match.id}>
              <div className="commercialCardHead"><div><span className={`stateChip ${match.status === "ACTIVE" ? "state-qualified" : "state-unlisted"}`}>{match.status} match</span><h3>{match.lotCode}</h3><p>{requirement ? `${formatQuantity(requirement.quantity)} ${requirement.quantityUnit} to ${requirement.destination}` : "Buyer requirement"}</p></div><time>{date(match.matchedAt)}</time></div>
              {match.status === "ACTIVE" && !hasOpenQuote && requirement ? <form action={createQuoteAction} className="quoteForm"><input type="hidden" name="requirementMatchId" value={match.id} /><input type="hidden" name="currency" value="USD" /><label>Quote quantity <span>kg</span><input name="quantity" type="number" min={Number(requirement.quantity)} max={Number(match.quantity)} defaultValue={Number(requirement.quantity)} step="1" required /></label><label>Unit price <span>USD / kg</span><input name="unitPrice" type="number" min="0.0001" step="0.0001" required placeholder="4.2500" /></label><label>Quote expiry<select name="expiresInHours" defaultValue="48"><option value="24">24 hours</option><option value="48">48 hours</option><option value="72">72 hours</option></select></label><label className="wideField">Terms <span>optional</span><input name="terms" maxLength={1000} placeholder="Packaging or commercial notes; no freight booking" /></label><button className="button buttonSmall" type="submit">Create draft quote</button></form> : null}
              {quotes.map((quote) => {
                const reservation = workspace.reservations.find((item) => item.supplierQuoteId === quote.id);
                return <div className="quoteRow" key={quote.id}><div><span className={`stateChip state-${quote.status.toLowerCase()}`}>Quote {quote.status}</span><strong>{quote.currency} {Number(quote.unitPrice).toFixed(2)} / {quote.quantityUnit}</strong><small>{formatQuantity(quote.quantity)} {quote.quantityUnit} · expires {date(quote.expiresAt)}</small></div><div className="commercialActions">{quote.status === "DRAFT" ? <><form action={transitionQuoteAction}><input type="hidden" name="quoteId" value={quote.id} /><input type="hidden" name="to" value="SENT" /><button className="button buttonSmall" type="submit">Send quote</button></form><form action={transitionQuoteAction}><input type="hidden" name="quoteId" value={quote.id} /><input type="hidden" name="to" value="WITHDRAWN" /><button className="textButton" type="submit">Withdraw</button></form></> : null}{quote.status === "SENT" ? <form action={transitionQuoteAction}><input type="hidden" name="quoteId" value={quote.id} /><input type="hidden" name="to" value="WITHDRAWN" /><button className="textButton" type="submit">Withdraw quote</button></form> : null}{reservation ? <div className="reservationRecord"><span className={`stateChip state-${reservation.status.toLowerCase()}`}>Intent {reservation.status}</span><small>{reservation.statusReason ?? `Expires ${date(reservation.expiresAt)}`}</small>{reservation.status === "ACTIVE" ? <form action={cancelReservationAction}><input type="hidden" name="reservationId" value={reservation.id} /><input type="hidden" name="reason" value="Cancelled by supplier" /><button className="textButton" type="submit">Cancel intent</button></form> : null}</div> : null}</div></div>;
              })}
              {match.status === "INVALIDATED" ? <p className="warningText">No new quote is permitted: {match.invalidationReason}</p> : null}
            </article>;
          })}
          {!workspace.matches.length ? <div className="opsEmpty"><h3>No eligible demand is matched to your listed lots.</h3><p>Supplier quoting begins only after ops binds a cocoa requirement to a currently eligible public listing.</p></div> : null}
        </div>
      </section>
    </main>
  );
}
