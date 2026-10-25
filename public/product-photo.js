// Reviewed product bounds in the original 900 × 900 supplier photographs.
// Trim the displayed whitespace without resampling or changing the source files.
const products = {
  '/assets/kas-250ml.png': [390, 275, 120, 540],
  '/assets/kas-3l-can.jpg': [255, 70, 390, 765],
  '/assets/kas-3l-box.png': [260, 65, 375, 800],
};
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function productPhoto(src, alt, className = '') {
  const bounds = products[src];
  if (!bounds) return `<img loading="lazy" src="${escape(src)}" alt="${escape(alt)}" class="${escape(className)}">`;
  const [x, y, width, height] = bounds;
  return `<svg class="product-photo ${escape(className)}" viewBox="${x} ${y} ${width} ${height}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escape(alt)}" xmlns="http://www.w3.org/2000/svg"><svg x="${x}" y="${y}" width="${width}" height="${height}" viewBox="${x} ${y} ${width} ${height}" overflow="hidden"><image href="${src}" width="900" height="900" /></svg></svg>`;
}
