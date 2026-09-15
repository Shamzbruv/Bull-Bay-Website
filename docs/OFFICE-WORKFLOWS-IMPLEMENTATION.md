# Church office workflow implementation — 14 September 2026

Requested scope and verification checklist (in progress):
- [ ] Role labels: Pastor, Executive Assistant, Admin Assistant, Deacon/Deaconess Board, Student Pastor. Keep the founder role locked and switching restricted to super admin. Preserve existing specialist roles.
- [ ] Pastor and administrative team edit pastor working hours/calendar; actor attribution, audit, notifications; coloured entries and availability. Restrict shared subscriptions.
- [ ] Google account-picker OAuth connection, phone calendar subscriptions, honest configuration state and disconnect.
- [ ] Pastor task delegation, executive delegation to assistant; assigned prayer → completion request → pastor approval → requester email.
- [ ] Member directory full detail, edit, export, protected deletion.
- [ ] Shared member dashboard/features for all staff.
- [ ] Editable document/certificate masters from provided baptism, baby dedication, membership and letterhead references; reusable fields, layout/banner/footer controls, PDF preview and attachments.
- [ ] Executive signature/stamp authority with pastor notification and audit; assistant preparation requires approval. Private original supplied assets.
- [ ] Editable email templates mapped to documents/certificates and system functions, delivery visibility/retry.
- [ ] Saved form builder, selected-member email links, stored submissions and office notification.
- [ ] Opt-in browser/phone push, subscription lifecycle and delivery.
- [ ] Database permission and workflow tests; build/lint/typecheck; browser workflows; deploy and smoke check.

Reference assets are in the user-specified WhatsApp folder. Baptism fields: recipient, baptism date/place, minister, secretary. Baby dedication fields: child, birth date/place, parents, dedication date/place, godparents, minister, secretary. Membership fields: recipient, fellowship date, pastor, secretary. Letterhead includes church address/contact and editable office footer. Do not copy sample names into live templates.

Existing internal role codes will remain stable for existing assignments: `church_executive` is Executive Assistant, `secretary` is Admin Assistant, `pastoral_care_team` is Deacon/Deaconess Board. User-facing wording must use the new names. Student Pastor receives the same board permissions.

Google OAuth configuration was not found in local environment. User was asked where an existing client is configured; setup work can proceed independently.
