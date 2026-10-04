# Documents and certificates

How a letter or certificate goes from the office to its recipient.

1. **Prepared** by the office (`documents.manage`: Executive Assistant, Admin
   Assistant, Pastor, super administrator), either from a member's request
   (`/admin/documents/<id>`) or straight from a template
   (`/admin/documents/templates/<id>/use`). It then waits for the Pastor
   (`pending_pastor`).
2. **Certified**: the Pastor's signature and the church stamp are applied, a
   number is assigned (`BB-DOC-YYYY-NNNNN`), the PDF is saved and emailed.
   The Pastor certifies (`documents.certify`); the Executive Assistant may
   certify for him (`documents.sign_delegate`), and he is notified.

All certification goes through `lib/documents/certify.ts`. Nothing can be
certified until the Pastor's signature and the church stamp are on file. The
Pastor uploads them himself (Pastor workspace → Documents → Your signature &
stamp), or the super administrator adds them for him from scans
(Documents → The Pastor's signature & church stamp, or the same panel on the
Pastor's Documents page). Those go on the Pastor's own profile, exactly as
if he had uploaded them; the audit log records who did it and he is
notified.

Nothing can be changed while the super administrator previews another role:
the middleware refuses it, and the error page now says so and how to switch
back, instead of "This page didn't finish loading".

## Sending to someone outside the church

"Use template" asks where the finished PDF goes: a church member, or someone
not in the members list (name, email, optional postal address). The typed-in
recipient is stored on the document (`recipient_name`, `recipient_email`,
`recipient_address`). A member may still be chosen when the letter is about
them (a letter of good standing sent straight to an embassy): it stays on
their record, but is emailed only to the outside address.

Outside recipients get the "Document sent outside the church" email
(`document-sent`), which doesn't point them to the member portal. Members
keep the template's own email. Rules: `lib/documents/delivery.ts`.

The name a certificate is "presented to" is the child (`child_name`) on a
dedication certificate, so it can be emailed to the parents; otherwise the
member it's about, otherwise the name the office filled in (`member_name`),
otherwise the typed-in recipient.

Master templates keep their blanks (`{{child_name}}` and so on): fill them in
on "Use template", never by editing the master, or every later document
starts with the first family's details.

## Urgent signing for the Pastor

When something can't wait, anyone with `documents.urgent_sign` (Executive
Assistant, Admin Assistant, super administrator) can apply the Pastor's
signature and the church stamp themselves:

- tick **Urgent: can't wait for the Pastor** when preparing a document, or
- press **Urgent: sign now** on a document already waiting for him (shown to
  those who can't certify the normal way).

A reason is required and kept on the document (`urgent_reason`). The Pastor
is told at once by bell and by email: who used his signature, on what, sent
to whom, and why. His Documents page lists everything signed on his behalf.
The audit log records it as `urgent_office_signature`. To take the option
away from a role, remove `documents.urgent_sign` in Roles & access.

## Titles on the signature row

The person who prepared a document is printed beside the Pastor's signature
with their role's title (`primaryRoleName`). The secretary role prints as
**Admin Secretary**; other roles use their name. An account with no name on
file shows the title alone, rather than "Church Office".
