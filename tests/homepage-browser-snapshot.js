// Run through CUA tab.playwright.evaluate on a fresh anonymous homepage.
(() => {
  const rect = (element) => {
    if (!element) return null;
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      top: box.top + scrollY, bottom: box.bottom + scrollY,
      left: box.left, right: box.right, width: box.width, height: box.height,
      display: style.display, visibility: style.visibility, opacity: style.opacity,
      text: element.innerText.trim(),
    };
  };
  const hero = document.querySelector('.home-search-hero');
  const boundaries = [...document.querySelectorAll('details')].find(
    element => element.querySelector('summary')?.textContent.trim() === 'Evidence and sourcing boundaries',
  );
  return {
    url: location.href,
    viewport: { width: innerWidth, height: innerHeight },
    hero: rect(hero),
    headline: rect(hero?.querySelector('h1')),
    subline: rect(hero?.querySelector('p')),
    search: rect(hero?.querySelector('input')),
    findLots: rect(hero?.querySelector('button')),
    heroCards: hero?.querySelectorAll('.hero-supplier,.paths>a').length,
    kasandrinos: rect(document.querySelector('.home-next .hero-supplier')),
    roles: [...document.querySelectorAll('.home-next .paths>a')].map(rect),
    boundaries: {
      open: boundaries?.open,
      summary: rect(boundaries?.querySelector('summary')),
      content: rect(boundaries?.querySelector('.defaults-content')),
      paragraphs: [...boundaries?.querySelectorAll('.defaults-content p') || []].map(
        element => element.textContent.trim(),
      ),
    },
  };
})()
