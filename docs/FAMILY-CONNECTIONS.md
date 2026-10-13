# Households and family connections

My Household now has three views: Household, Family connections, and Family tree. Household shows the named family and its people; Family connections draws household-to-household lines; Family tree draws the actual people and relationships. One, two, or three levels can be explored. Zoom, fit-to-map, dragging, and a text equivalent support different screen sizes and keyboard users.

Households are explicit assignments. They may contain different surnames, and two people with the same surname are never assumed to be related. When a person changes household, their person-to-person relationships remain and the map reflects the new household label.

The church office maintains the complete family directory under Families & connections. Staff with `people.write` can create households, assign existing people, record office-verified relationships, and review pending requests. `people.read` permits inspection. Role preview is read-only. A family link is also available from member records.

Members can name their own household and send invitations by the relative's church account email. An invitation does not change a person's household until that person or authorized staff accepts it. Acceptance changes the primary household assignment and cancels other pending invitations for that person. Requests for relatives without linked accounts go to the church office for review.

Members request relationships involving themselves. The recipient or authorized staff confirms the relationship before it appears on a map. Parent/child and other reciprocal choices are stored in a canonical direction; symmetric cousin, sibling, spouse and in-law pairs are deduplicated. Incorrect links can be removed without erasing their audit history and then recorded again correctly. Requesters receive the same response for unknown emails; the form cannot be used as an account directory.

Confirmed relationships share only names, household labels, and the explicitly provided connection story within the connected family circle, up to three links away. Other households' complete rosters are not sent to members; only relationship participants are shown. Pending relationships do not expand the map. Addresses, dates of birth, contact details, and office notes are not part of the graph. Household membership no longer grants direct REST access to full housemates' profile rows. Admin family data remains scoped to the current church.

Migration `20261013222101_family_connections.sql` adds household descriptions/timestamps, church-scoped relationship/invitation tables, read policies, a guard against unauthorized household reassignment, and a service-only transactional API. Family changes, audit records, and in-app notifications commit together. Per-church transaction locks prevent reciprocal requests and simultaneous invitation responses from deadlocking on profile foreign keys. Existing people are not assigned to families automatically and no sample relationships are inserted in production.

Tests cover canonical relationships, mixed surnames, cycles, three-level bounds, privacy of unrelated and unconfirmed people, duplicate requests, recipient approval, office authorization, invitation acceptance, cross-church rejection, raw REST/RPC restrictions, stale reviews, and auditing.
