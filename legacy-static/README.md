# NTCOG Bull Bay Digital Church

A responsive, front-end church website for New Testament Church of God, Bull Bay. It uses a royal blue, olive green, and white claymorphism visual system and is designed to become the public experience of a future Supabase-powered church platform.

## Included experiences

- Home, Plan Your Visit, Live Church, Sermons, Events, Ministries, Prayer, Giving, Shop, About, Connection Card, and Member Portal preview.
- Responsive navigation, live-style service schedule, accordion FAQs, sermon/product filters, search, working demo forms, giving fund selection, and a client-side shopping-bag indicator.
- Accessible keyboard navigation, skip link, labelled form controls, readable contrast, mobile layout, and no false claims of processing payment or storing personal information.
- Church-specific content scaffolded from the supplied product blueprints: public website, spiritual engagement, events, giving, commerce, ministry engagement, and future member portal.

## Run it locally

Open `index.html` in a modern browser. No install, build process, or framework is required.

## Connect Supabase next

The front end deliberately does not send real data or accept payments. Replace the form submit handlers in `app.js` with secured server/API calls after Supabase is configured.

Suggested initial Supabase tables / domains:

1. `profiles`, `households`, `roles`, `user_roles`, and `permissions` for identity and least-privilege access.
2. `sermons`, `sermon_series`, `events`, `event_registrations`, `ministries`, `groups`, and `group_memberships` for church content and engagement.
3. `prayer_requests`, `form_submissions`, and `pastoral_care_cases` with tightly scoped Row Level Security policies for sensitive workflows.
4. `funds`, `donations`, `payments`, `products`, `product_variants`, `orders`, and `order_items`; keep donations separate from shop orders.

Do not expose Supabase `service_role` credentials in the browser. Use Supabase Auth, Row Level Security, private storage buckets for confidential files, and server-side webhook verification for payment confirmations.

## Content items to confirm before launch

- Church address, office phone, email, social handles, map destination and official livestream URL.
- Leadership names, ministry leaders, event dates, service schedule, and final church mission / vision wording.
- Selected Jamaica-supported payment provider and approved giving funds.
- Privacy notice, retention rules, consent language, and staff access roles.
