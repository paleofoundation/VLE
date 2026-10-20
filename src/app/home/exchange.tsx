import Link from "next/link";
import { buildHomeView, categories, copy, homeHref, type CategoryId } from "./catalog";
import styles from "./home.module.css";

export function Exchange({
  view,
}: {
  view: ReturnType<typeof buildHomeView>;
}) {
  const category = view.category;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" className={styles.mark} aria-label="VLE home">
            <i aria-hidden="true" />
            VLE
          </Link>
          <nav className={styles.nav} aria-label="Marketplace">
            <a className={styles.navLink} href="#suppliers">{copy.navSuppliers}</a>
            <a className={styles.navLink} href="#documents">{copy.navDocuments}</a>
            <Link className={styles.navLink} href="/for-suppliers">{copy.forSuppliers}</Link>
            <Link className={styles.signIn} href="/sign-in">{copy.signIn}</Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
        <div className={styles.wrap}>
          <section className={styles.hero} aria-labelledby="exchange-title">
            <p className={styles.kicker}>{copy.kicker}</p>
            <h1 id="exchange-title">
              <span className={styles.lineA}>
                <span className={styles.find}>{copy.titleFind}</span>{" "}
                <span className={styles.rest}>{copy.titleRest}</span>
              </span>
              <span className={styles.lineB}>
                <span className={styles.by}>{copy.titleEnd}</span>
                <em>{copy.titleEm}</em>
              </span>
            </h1>
            <p className={styles.lede}>{copy.lede}</p>
            <form className={styles.search} action="/" method="get" role="search">
              <label className={styles.sr} htmlFor="exchange-search">{copy.searchLabel}</label>
              <input
                id="exchange-search"
                name="q"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder={copy.searchLabel}
                defaultValue={view.query}
                key={view.query}
              />
              {category ? <input type="hidden" name="category" value={category} /> : null}
              <button type="submit">{copy.searchButton}</button>
            </form>
            <ul className={styles.chips}>
              {categories.map((item) => {
                const active = item.id === category;
                const next: CategoryId | null = active ? null : item.id;
                return (
                  <li key={item.id}>
                    <Link href={homeHref(view.query, next)} aria-current={active ? "true" : undefined}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className={styles.block} id="suppliers" aria-labelledby="suppliers-heading">
            <div className={styles.blockHead}>
              <h2 id="suppliers-heading">{copy.suppliers}</h2>
              <p>
                {view.resultLine}
                {view.filtered ? <Link href="/">{copy.clear}</Link> : null}
              </p>
            </div>

            {view.supplier ? (
              <article className={styles.sheet}>
                <p className={styles.origin}>{copy.origin}</p>
                <h3>
                  <Link href={view.supplier.href}>{view.supplier.name}</Link>
                </h3>
                <p className={styles.legal}>{view.supplier.legalName}</p>
                <p className={styles.summary}>{copy.summary}</p>
                <p className={styles.banner}>
                  {copy.bannerBefore}
                  <a href="mailto:marcus@vle.exchange">{copy.claim}</a>
                  {copy.bannerAfter}
                </p>
                <dl className={styles.facts}>
                  <div>
                    <dt>{copy.formatsLabel}</dt>
                    <dd>{view.supplier.products.length}</dd>
                  </div>
                  <div>
                    <dt>{copy.certificationsLabel}</dt>
                    <dd>{view.supplier.certifications.length}</dd>
                  </div>
                  <div>
                    <dt>{copy.reportsLabel}</dt>
                    <dd>{view.supplier.reportCount}</dd>
                  </div>
                  <div>
                    <dt>{copy.lotLabel}</dt>
                    <dd>{copy.lotValue}</dd>
                  </div>
                </dl>
                <div className={styles.metaGrid}>
                  <div>
                    <h4>{copy.formatsHeading}</h4>
                    <ul className={styles.pills}>
                      {view.supplier.products.map((product) => (
                        <li key={product.url}>{product.name}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>{copy.certificationsHeading}</h4>
                    <ul className={styles.pills}>
                      {view.supplier.certifications.map((name) => (
                        <li key={name}>{name}</li>
                      ))}
                    </ul>
                    <p className={styles.note}>{copy.certsNote}</p>
                  </div>
                </div>
                <div className={styles.lot} aria-label={copy.lotStatus}>
                  <p className={styles.lotKicker}>{copy.lotStatus}</p>
                  <ol className={styles.steps}>
                    {view.supplier.steps.map((step) => (
                      <li key={step.title}>
                        <span>{step.title}</span>
                        <strong>{copy.stepPending}</strong>
                      </li>
                    ))}
                  </ol>
                  <p className={styles.lotNote}>{copy.lotNote}</p>
                </div>
                <div className={styles.identityLinks}>
                  <Link href={view.supplier.href}>{copy.viewProfile}</Link>
                  <a href={view.supplier.website} rel="noopener noreferrer">{view.supplier.websiteLabel}</a>
                </div>
              </article>
            ) : (
              <div className={styles.empty}>
                <h3>{view.categoryLabel && !view.query ? copy.emptyCategory(view.categoryLabel) : copy.emptySearch}</h3>
                <p>{view.query ? copy.emptySearchNote : copy.emptyCategoryNote}</p>
                <Link href="/for-suppliers">{copy.listButton}</Link>
              </div>
            )}
          </section>

          <section className={styles.block} id="documents" aria-labelledby="documents-heading">
            <div className={styles.blockHead}>
              <h2 id="documents-heading">{view.showLatestNote ? copy.documents : copy.documentsMatch}</h2>
              <p>{view.showLatestNote ? copy.documentsLede : copy.documentsChecked}</p>
            </div>
            {view.showLatestNote ? <p className={styles.checked}>{copy.documentsChecked}</p> : null}
            {view.documents.length ? (
              <ol className={view.showLatestNote ? `${styles.docs} ${styles.strip}` : styles.docs}>
                {view.documents.map((document) => (
                  <li key={document.id}>
                    <div className={styles.docMain}>
                      <p className={styles.kind}>{document.kind}</p>
                      <h3>{document.title}</h3>
                      <p className={styles.detail}>{document.detail}</p>
                      {document.statusNote ? <p className={styles.detail}>{document.statusNote}</p> : null}
                      <p className={styles.notice}>{document.notice}</p>
                    </div>
                    <p className={styles.date}>{document.datePrinted}</p>
                    <a href={document.url} rel="noopener noreferrer">
                      {copy.openPdf}
                      <span aria-hidden="true"> ↗</span>
                    </a>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.emptyDocs}>{copy.emptyDocuments}</p>
            )}
            {view.supplier ? <p className={styles.more}><Link href={view.supplier.href}>{copy.allDocuments}</Link></p> : null}
          </section>
        </div>

        <section className={styles.band} aria-labelledby="list-heading">
          <div className={styles.wrap}>
            <p className={styles.kickerLight}>{copy.forSuppliers}</p>
            <h2 id="list-heading">{copy.listTitle}</h2>
            <p>{copy.listNote}</p>
            <Link href="/for-suppliers">{copy.listButton}</Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.wrap}>
          <div className={styles.footerTop}>
            <p className={styles.footerMark}>VLE</p>
            <p>{copy.footerLine}</p>
          </div>
          <div className={styles.footerMeta}>
            <p>{copy.operated}</p>
            <p>
              {copy.claims}
            </p>
            <p>
              <a href="https://contaminantstandards.com" rel="noopener noreferrer">{copy.programs}</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
