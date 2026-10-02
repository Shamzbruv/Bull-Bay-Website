import { OfficeActionForm } from "@/components/office-action-form";
import { sendTemplateCommunication } from "./actions";

// Filled in by sendTemplateCommunication itself, so never shown as a blank.
const AUTO_FILLED_FIELDS = new Set(["church_name", "action_url"]);

// Fields that hold sentences or several lines rather than a short value —
// a letter's body or an address block can't be typed into a one-line input.
const LONG_FIELD = /(body|message|details|intro|address|notes?|summary|description|text)$/i;

function fieldLabel(key: string) {
  return key.replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase());
}

function templateFieldKeys(...texts: (string | null | undefined)[]): string[] {
  const joined = texts.filter(Boolean).join(" ");
  return [...new Set(Array.from(joined.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g), (m) => m[1]!))].filter(
    (k) => !AUTO_FILLED_FIELDS.has(k),
  );
}

/**
 * One self-contained form per template — a plain server-rendered form
 * (same pattern as Admin → Emails' per-template send form), so showing a
 * dozen of these on one page costs nothing in client JavaScript. kind
 * decides which table templateId names a row in; the rest of the fields
 * are identical either way, right down to the merge-field inputs, which
 * are computed here from the template's own text rather than requiring a
 * second trip through the server.
 */
export function TemplateSendForm({
  kind,
  templateId,
  defaultSubject,
  mergeSourceTexts,
}: {
  kind: "email" | "letter";
  templateId: string;
  defaultSubject: string;
  mergeSourceTexts: (string | null | undefined)[];
}) {
  const fieldKeys = templateFieldKeys(...mergeSourceTexts);
  const today = new Date().toLocaleDateString("en-JM", { dateStyle: "long", timeZone: "America/Jamaica" });

  return (
    <OfficeActionForm action={sendTemplateCommunication.bind(null, kind, templateId)} label="Send">
      <div className="form-row">
        <label>
          Send to
          <select name="audience" defaultValue="single">
            <option value="single">One person</option>
            <option value="all">Every member with an email on file</option>
          </select>
        </label>
        <label>
          Recipient email
          <input type="email" name="single_email" placeholder="member@email.com" />
          <span className="form-note">Only used when sending to one person.</span>
        </label>
      </div>

      <label>
        {kind === "letter" ? "Email subject" : "Subject / heading"}
        <input name="subject" defaultValue={defaultSubject} required />
      </label>

      {fieldKeys.map((key) => (
        <label key={key}>
          {fieldLabel(key)}
          {LONG_FIELD.test(key) ? (
            <textarea name={`field_${key}`} required rows={/address$/i.test(key) ? 3 : 7} />
          ) : (
            <input name={`field_${key}`} required defaultValue={key === "date_today" ? today : undefined} />
          )}
        </label>
      ))}

      <label>
        Send as
        <select name="send_mode" defaultValue={kind === "letter" ? "attachment" : "body"}>
          <option value="body">In the email body</option>
          <option value="attachment">As a PDF letter attached to the email — on the church letterhead</option>
        </select>
      </label>
      <label>
        Cover note
        <input name="cover_note" placeholder="Please see the attached letter." />
        <span className="form-note">Shown in the email itself — only used when sending as an attachment.</span>
      </label>

      <label className="check-label">
        <input type="checkbox" name="include_sent_by" defaultChecked />
        Sign off with my name {"("}and my signature, if you&apos;ve saved one in Documents{")"}
      </label>

      <label>
        Reply-to email
        <input type="email" name="reply_to" required placeholder="office@bullbaychurch.org" />
        <span className="form-note">Required — this platform sends as a no-reply address, so replies go here instead.</span>
      </label>
    </OfficeActionForm>
  );
}
