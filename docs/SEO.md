# Search visibility — what is built, and what only the church can do

## The honest position on ranking for "Bull Bay"

"Bull Bay" on its own is a **place name**. When somebody types it, Google
assumes they want the place — the district, a map of it, its Wikipedia
entry, hotels and beaches near it. No church website ranks first for a
query like that, and any agency promising otherwise is selling something.
It is not a failure of the site; it is what the query means.

What this church can realistically own, and what actually brings visitors
through the door on a Sunday:

- "church in Bull Bay" / "Bull Bay church"
- "New Testament Church of God Bull Bay" (this should be an outright win)
- "church near me", searched by somebody standing in Bull Bay or 9 Miles
- "Pentecostal church St. Andrew"
- "church service times Bull Bay"

Those are the searches of somebody looking for a church, which is the
person the church wants to find. This document covers what the site now
does for those searches, and the two things the church must do itself.

## The single most important action — and it is not code

**Create and verify a Google Business Profile.**
<https://business.google.com>

For every "near me" and local search, Google shows a map with three
businesses above the ordinary results. That block is drawn almost entirely
from Google Business Profiles, not from websites. A church without one is
invisible there no matter how good its site is; a church with a complete,
verified one usually appears for local church searches within weeks.

When creating it, the name, address and phone number must match this site
**character for character**, because Google cross-checks them:

- **Name:** New Testament Church of God, Bull Bay
- **Address:** Weise Road, 9 Miles, Bull Bay, P.O. Box 119, St. Andrew, Jamaica
- **Phone:** +1 (876) 596-3890
- **Website:** https://bullbayntcog.org
- **Category:** Church of God (primary), Pentecostal Church
- **Hours:** Sun 9:50 AM, Wed 9:00 AM, Fri 4:30 PM

Then: add photos (the exterior especially — it is how people recognise the
building from the road), and ask members to leave reviews. Review count and
recency are among the strongest local ranking signals there are.

**Second: verify the site in Google Search Console** (<https://search.google.com/search-console>).
Choose the HTML-tag method, then set `GOOGLE_SITE_VERIFICATION` in Railway
to the token it gives you — the meta tag appears on the next deploy, no code
change needed. Then submit `https://bullbayntcog.org/sitemap.xml`. Search
Console is also where you see which searches are finding the church.

## What the site does now

**One address, everywhere.** `lib/org.ts` holds the address, the three phone
numbers and the map coordinates, and the footer, contact page, visit page,
PDF letterhead and structured data all read from it. Search engines treat
an address that differs between a site's own pages as a reason to trust
none of them.

**Structured data** (`lib/seo.ts`) tells Google what it needs to verify a
real place: a `Church` with its street address, coordinates, the three
contact points, and opening hours generated from the real service schedule
in the database. Service times are converted to 24-hour form, and a time
that cannot be parsed is **dropped rather than guessed** — publishing a
wrong service time is worse than publishing none. Also emitted: `WebSite`,
`BreadcrumbList` on inner pages, and `FAQPage` on Plan Your Visit, which is
what can earn expandable questions directly in the results.

**One address for the site itself.** `www.bullbayntcog.org` and
`bullbayntcog.org` both served the whole site with a 200 and no redirect,
so every page existed at two addresses and their standing was split. www now
redirects permanently to the apex.

**A complete sitemap.** Five real pages were missing from it — Beliefs,
Doctrinal Commitments, Direction, Gallery and Request to Join — so Google
was never told they existed. Pages are now weighted by what a stranger
needs first, and `/give` and `/cart` are excluded because a sitemap that
lists a redirect or a disallowed URL is reported as an error.

**Speed.** Core Web Vitals are a ranking factor, and more to the point the
congregation reads this site on mobile data. Five images bypassed Next's
optimizer entirely; they no longer do. Homepage images dropped from about
1.17MB to roughly 0.44MB, About from 2.2MB to 180KB, and 7.5MB of images
that nothing referenced were deleted.

## Still outstanding

- **Social profile URLs.** `CHURCH_SOCIAL_PROFILES` in `lib/seo.ts` is
  empty. Send the church's Facebook and YouTube URLs and they go into the
  `sameAs` field, which is how Google links this site to those pages and
  builds a knowledge panel. Left empty deliberately — a guessed URL would
  connect the church to somebody else's page.
- **Reviews and photos on the Business Profile**, once it exists. This is
  ongoing work for the office, not a one-off task, and it outweighs
  everything on this page.
