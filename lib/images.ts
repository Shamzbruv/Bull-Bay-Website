/**
 * Builds a URL for Next's built-in image optimizer.
 *
 * Normally you would never write one of these by hand — `next/image` does
 * it for you. The homepage hero is the exception: it uses `<picture>` with
 * a `media` rule to serve a *different crop* on phones (a tall portrait of
 * the entrance) from the one on desktop (the wide shot). That is art
 * direction, which `next/image` deliberately does not support, so the hero
 * was serving the original JPEG at full size — 413KB, on the page that
 * matters most and as the element that decides the page's Largest
 * Contentful Paint score.
 *
 * Pointing the `<source>` elements at the optimizer keeps both crops
 * exactly as designed while letting the browser take WebP or AVIF. If a
 * future Next.js changes this endpoint the images fall back to looking
 * unoptimized rather than breaking, because the final <img src> below is
 * still the plain file.
 */
/**
 * `quality` must be one of the values Next is configured to allow — the
 * default config permits only 75, and anything else is answered with a 400.
 * That matters more than it sounds: when a <source> in a <picture> fails to
 * load, the browser does NOT fall back to the <img>, it shows nothing. A
 * quality of 72 here would have left the homepage with no hero at all.
 */
export function optimizedImage(src: string, width: number, quality = 75) {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${width}&q=${quality}`;
}

/** Widths Next is configured to generate; picking others makes it 400. */
export const IMAGE_WIDTHS = [640, 750, 828, 1080, 1200, 1920, 2048, 3840] as const;

/** A srcSet across the sizes that make sense for a full-bleed hero. */
export function heroSrcSet(src: string, widths: readonly number[]) {
  return widths.map((width) => `${optimizedImage(src, width)} ${width}w`).join(", ");
}
