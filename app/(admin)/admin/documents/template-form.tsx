"use client";
import { useState } from "react";
import { saveTemplate } from "./actions";
import { OfficeActionForm } from "@/components/office-action-form";
import { cleanDesign } from "@/lib/documents/design";
import type { EmailTemplate } from "@/lib/office/types";
import type { Json } from "@/lib/supabase/types";

type EditableTemplate = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  body: string;
  layout?: string;
  design?: Json;
  email_template_id?: string | null;
};

export function TemplateForm({
  template,
  emails = [],
  defaultLayout = "letter",
}: {
  template?: EditableTemplate;
  emails?: EmailTemplate[];
  defaultLayout?: string;
}) {
  const design = cleanDesign(template?.design);
  const [layout, setLayout] = useState(template?.layout ?? defaultLayout);
  const [name, setName] = useState(template?.name ?? "");
  const [accent, setAccent] = useState(design.accent ?? "#ba963c");
  const [banner, setBanner] = useState(design.banner ?? "");
  const [subtitle, setSubtitle] = useState(design.subtitle ?? "");
  const isCertificate = layout === "certificate";

  return (
    <OfficeActionForm action={saveTemplate} label={template ? "Save master template" : "Create master template"}>
      <input type="hidden" name="id" value={template?.id ?? ""} />

      {/* Live preview — mirrors the real PDF (crest, gold frame, banner,
          recipient line, signature and seal) so the office can see what
          they're building without generating a document first. */}
      <div className={`doc-preview${isCertificate ? " doc-preview-certificate" : " doc-preview-letter"}`} style={{ borderColor: accent }}>
        {!isCertificate && (
          <div className="doc-preview-band">
            {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset in a scaled preview */}
            <img src="/images/brand/bull-bay-logo.png" alt="" width={26} height={26} />
            <span>NEW TESTAMENT CHURCH OF GOD</span>
            <small>Weise Road, 9 Miles, Bull Bay · St. Andrew · Jamaica</small>
          </div>
        )}
        <div className="doc-preview-body">
          {isCertificate && (
            <div className="doc-preview-crest">
              {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset in a scaled preview */}
              <img src="/images/brand/bull-bay-logo.png" alt="" width={34} height={34} />
              <span>NEW TESTAMENT CHURCH OF GOD</span>
              <small style={{ color: accent }}>BULL BAY · JAMAICA</small>
            </div>
          )}
          <h3 style={isCertificate ? { color: "#0f2f5e" } : undefined}>{name || "Your document title"}</h3>
          {banner && (
            <p className="doc-preview-banner" style={{ background: accent }}>
              {banner.toUpperCase()}
            </p>
          )}
          {subtitle && <p className="doc-preview-subtitle">{subtitle}</p>}
          {isCertificate && (
            <>
              <p className="doc-preview-presented">THIS CERTIFICATE IS PRESENTED TO</p>
              <p className="doc-preview-recipient" style={{ color: accent }}>
                Member name
              </p>
            </>
          )}
          <p className="doc-preview-text">Your document text appears here, with each field filled in when the template is used.</p>
          <div className="doc-preview-signatures">
            <span>Pastor signature</span>
            <span className="doc-preview-seal" style={{ borderColor: accent, color: accent }}>
              SEAL
            </span>
            <span>Church office</span>
          </div>
        </div>
      </div>

      <div className="form-row">
        <label>
          Template name
          <input name="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Format
          <select name="layout" value={layout} onChange={(e) => setLayout(e.target.value)}>
            <option value="letter">Letter / document</option>
            <option value="certificate">Certificate</option>
          </select>
        </label>
      </div>
      <label>
        Category
        <input name="category" defaultValue={template?.category ?? ""} />
      </label>
      <label>
        Description
        <input name="description" defaultValue={template?.description ?? ""} />
      </label>
      <label>
        Document text
        <textarea name="body" required rows={10} defaultValue={template?.body ?? ""} placeholder="This certifies that {{member_name}}..." />
      </label>
      <p className="form-note">
        Create editable fields using double braces, for example {"{{member_name}}"}, {"{{recipient_address}}"},{" "}
        {"{{ceremony_date}}"}. Each becomes a field when you select Use template.
      </p>
      <div className="form-row">
        <label>
          Accent colour
          <input name="accent" type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
        </label>
        <label>
          Certificate orientation
          <select name="orientation" defaultValue={design.orientation}>
            <option value="landscape">Landscape</option>
            <option value="portrait">Portrait</option>
          </select>
        </label>
      </div>
      <label>
        Banner
        <input name="banner" value={banner} onChange={(e) => setBanner(e.target.value)} />
      </label>
      <label>
        Subtitle
        <input name="subtitle" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} />
      </label>
      <label>
        Footer
        <textarea name="footer" defaultValue={design.footer} rows={2} />
      </label>
      <div className="form-row">
        <label>
          Pastor display name
          <input name="signer_name" defaultValue={design.signer_name} />
        </label>
        <label>
          Secretary display name
          <input name="secretary_name" defaultValue={design.secretary_name} />
        </label>
      </div>
      <label>
        Email sent with the PDF
        <select name="email_template_id" defaultValue={template?.email_template_id ?? ""}>
          <option value="">Default {isCertificate ? "certificate" : "document"} email</option>
          {emails.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </label>
    </OfficeActionForm>
  );
}
