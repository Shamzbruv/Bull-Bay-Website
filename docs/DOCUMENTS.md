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

## Previewing before sending

"Use template" and "Prepare the document" each have a **Preview PDF** button
next to the send button. It opens the document in a new tab, from what's
filled in so far (blanks show as `[Child name]`), with the same layout,
name and "prepared by" as the certified PDF. Nothing is saved or sent. A
preview is marked DRAFT and never carries the Pastor's signature, the church
stamp or a document number; those are only added when it's certified.
Routes: `app/api/office/documents/templates/[id]/preview` and
`app/api/office/documents/[id]/preview` (POST for unsaved text; GET for the
saved document, or the issued PDF). Shared code: `lib/documents/preview.ts`.

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

### A different pastor officiated (including visiting pastors)

On **Documents → Certificates → Baby Dedication Certificate → Use template**,
select **Request acknowledgement from a different officiating pastor**. Choose
an existing pastor, or enter a visiting pastor's full name and email. The
minister field is filled with that pastor's name. Prepare and send the request.
Existing documents can use the same option on **Continue preparing**.

The pastor receives a private, seven-day link, without needing an account. It
shows the prepared document and asks them to confirm they officiated and draw
their signature with a mouse, finger or pen. Their acknowledgement and timestamp
are kept with the document and in the audit log. No certificate is issued yet.
The office then certifies it using that signature, the officiating pastor's name,
and the church stamp. Their signature is never added to reusable staff assets.

Changing the document details requires a fresh request; replacing a request
invalidates its old link and signature. The preparation page shows the signing
status. **Cancel request and use church pastor** explicitly returns an unissued
document to the usual signing workflow. Failed request emails appear in
**Email delivery** and use the existing retry worker. Signing requests are only
sent when an admin submits the form.

### Reusable pastor signatures (sign once)

Go to **Documents → Pastor signatures**, enter the pastor's email and send an
invitation. The pastor opens the private link, enters their own full name and
title, signs with a mouse or finger, and explicitly authorizes reuse on church
certificates, letters, forms and other documents and records generated through
the system. The exact consent and acceptance time are retained. No account is
required. Pending invitations expire after seven days and can be resent.

Once authorized, choose the pastor under **Use an authorized saved signature**
when preparing a document or using a template. No separate email or signature is
required per document. The office still reviews and certifies before issuing.
Each use records the selected authorization and the staff member who used it;
blanket permission is not recorded as an acknowledgement of a particular ceremony.

**Revoke** disables the link and stops future use, including on documents already
prepared but not yet certified. Issued documents keep their original signatures.
To replace a signature or change the pastor's name, revoke and invite again.
