/* eslint-disable jsx-a11y/alt-text -- this is @react-pdf/renderer's <Image>, a PDF-drawing
   primitive with no `alt` prop, not an HTML <img>; the a11y rule doesn't apply here. */
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { cleanDesign, type DocumentDesign } from "@/lib/documents/design";
import { CHURCH_ADDRESS as ORG_ADDRESS, CHURCH_CONTACTS as ORG_CONTACTS, CHURCH_EMAIL as ORG_EMAIL } from "@/lib/org";

/** The church's own palette, matching styles/globals.css and the email
 * templates so a printed certificate, the website and an emailed letter all
 * read as the same institution. */
const NAVY = "#0f2f5e";
const NAVY_DEEP = "#0a2340";
const INK = "#12334e";
const MUTED = "#637181";
const CREAM = "#fffdf8";

const CHURCH_NAME = "New Testament Church of God";
const CHURCH_CAMPUS = "Bull Bay · Jamaica";
const CHURCH_ADDRESS = ORG_ADDRESS.oneLine;
// The church office line only. The pastor's personal number was printed on
// every letter and certificate the church issues; enquiries for him go
// through the Executive Assistant, so it must not be reinstated here.
const CHURCH_CONTACT = `${ORG_CONTACTS[0]?.display} · ${ORG_EMAIL}`;

export type CertifyingSigner = {
  name: string;
  title: string;
  signatureImage?: Buffer | null;
  stampImage?: Buffer | null;
};

/** Whoever actually typed up the letter — the third signature-row column
 * used to be a static "Church Office" label with nobody's name attached
 * to it. Left undefined, that old text-only behaviour is exactly what
 * still renders, so a document from before this existed looks the same
 * as it always did. */
export type PreparingSigner = {
  name: string;
  title?: string;
  signatureImage?: Buffer | null;
};

export type DocumentPdfInput = {
  layout?: string;
  design?: DocumentDesign;
  draft?: boolean;
  documentNumber: string;
  title: string;
  bodyParagraphs: string[];
  recipientName: string;
  issuedDate: string;
  signer?: CertifyingSigner | null;
  preparer?: PreparingSigner | null;
  logoImage: Buffer;
};

/* -- Ornaments ---------------------------------------------------------
   Built from plain Views rather than SVG paths: @react-pdf lays these out
   deterministically at any page size, and a bracket + diamond reads as a
   proper engraved corner flourish without risking a malformed path. */

function CornerFlourish({ accent, corner, size = 26 }: { accent: string; corner: "tl" | "tr" | "bl" | "br"; size?: number }) {
  const top = corner === "tl" || corner === "tr";
  const left = corner === "tl" || corner === "bl";
  return (
    <View style={{ position: "absolute", width: size, height: size, ...(top ? { top: 0 } : { bottom: 0 }), ...(left ? { left: 0 } : { right: 0 }) }}>
      <View
        style={{
          position: "absolute",
          width: size,
          height: size,
          ...(top ? { top: 0, borderTop: `2 solid ${accent}` } : { bottom: 0, borderBottom: `2 solid ${accent}` }),
          ...(left ? { left: 0, borderLeft: `2 solid ${accent}` } : { right: 0, borderRight: `2 solid ${accent}` }),
        }}
      />
      <View
        style={{
          position: "absolute",
          width: 5,
          height: 5,
          backgroundColor: accent,
          transform: "rotate(45deg)",
          ...(top ? { top: 5 } : { bottom: 5 }),
          ...(left ? { left: 5 } : { right: 5 }),
        }}
      />
    </View>
  );
}

/** A centred rule with a small diamond at its middle — the divider used
 * under the crest and above the signature row. */
function RuleWithDiamond({ accent, width = 150 }: { accent: string; width?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", marginVertical: 8 }}>
      <View style={{ width, height: 0.8, backgroundColor: accent }} />
      <View style={{ width: 6, height: 6, backgroundColor: accent, transform: "rotate(45deg)", marginHorizontal: 7 }} />
      <View style={{ width, height: 0.8, backgroundColor: accent }} />
    </View>
  );
}

/** The church crest: logo, name and campus line. Shared by both layouts so
 * a letter and a certificate are unmistakably from the same church. */
function Crest({ logo, accent, dark = false, size = 54 }: { logo: Buffer; accent: string; dark?: boolean; size?: number }) {
  return (
    <View style={{ alignItems: "center" }}>
      <Image src={logo} style={{ width: size, height: size }} />
      <Text style={{ fontFamily: "Times-Bold", fontSize: 15, marginTop: 6, color: dark ? "#ffffff" : INK, letterSpacing: 0.4 }}>
        {CHURCH_NAME.toUpperCase()}
      </Text>
      <Text style={{ fontSize: 8.5, letterSpacing: 2.6, marginTop: 3, color: dark ? "#d7e2f2" : accent }}>
        {CHURCH_CAMPUS.toUpperCase()}
      </Text>
    </View>
  );
}

function SignatureRow({ input, design, accent }: { input: DocumentPdfInput; design: DocumentDesign; accent: string }) {
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 26 }}>
      <View style={{ width: "36%" }}>
        {input.signer?.signatureImage ? (
          <Image src={input.signer.signatureImage} style={{ width: 128, height: 44, objectFit: "contain", marginBottom: 2 }} />
        ) : (
          <View style={{ height: 46 }} />
        )}
        <View style={{ borderTop: `0.8 solid ${INK}`, paddingTop: 4 }}>
          <Text style={{ fontFamily: "Times-Bold", fontSize: 10 }}>{input.signer?.name || design.signer_name || "Pastor"}</Text>
          <Text style={{ fontSize: 8.5, color: MUTED }}>{input.signer?.title || "Pastor"}</Text>
        </View>
      </View>

      <View style={{ width: "22%", alignItems: "center", paddingBottom: 4 }}>
        {input.signer?.stampImage ? (
          <Image src={input.signer.stampImage} style={{ width: 78, height: 78, objectFit: "contain" }} />
        ) : (
          <View style={{ width: 72, height: 72, borderRadius: 36, border: `1 dashed ${accent}`, justifyContent: "center", alignItems: "center" }}>
            <Text style={{ fontSize: 7, color: accent, textAlign: "center" }}>CHURCH{"\n"}SEAL</Text>
          </View>
        )}
      </View>

      <View style={{ width: "36%" }}>
        {input.preparer?.signatureImage ? (
          <Image src={input.preparer.signatureImage} style={{ width: 128, height: 44, objectFit: "contain", marginBottom: 2 }} />
        ) : (
          <View style={{ height: 46 }} />
        )}
        <View style={{ borderTop: `0.8 solid ${INK}`, paddingTop: 4 }}>
          <Text style={{ fontFamily: "Times-Bold", fontSize: 10 }}>{input.preparer?.name || design.secretary_name || "Church Office"}</Text>
          <Text style={{ fontSize: 8.5, color: MUTED }}>{input.preparer ? input.preparer.title || "Prepared by" : `Issued ${input.issuedDate}`}</Text>
        </View>
      </View>
    </View>
  );
}

const letterStyles = StyleSheet.create({
  page: { padding: 0, fontSize: 11, color: INK, fontFamily: "Times-Roman", lineHeight: 1.55, backgroundColor: CREAM },
  band: { backgroundColor: NAVY, paddingTop: 15, paddingBottom: 13, paddingHorizontal: 40 },
  content: { paddingHorizontal: 62, paddingTop: 26, paddingBottom: 96 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", fontSize: 9, color: MUTED, marginBottom: 18, fontFamily: "Helvetica" },
  title: { fontSize: 17, fontFamily: "Times-Bold", color: NAVY, marginBottom: 14, textAlign: "center", letterSpacing: 0.3 },
  paragraph: { fontSize: 11.5, marginBottom: 11, textAlign: "justify" },
});

/* Deliberately uses no `fixed` elements. A masthead/footer marked `fixed`
 * (so it repeats on later pages) made @react-pdf resolve the absolutely
 * positioned footer to the full page height, which painted the entire
 * sheet navy — a letter nobody could read. The certificate layout below
 * never used `fixed` and always rendered correctly, so this matches it:
 * a plain flow masthead and a bottom-pinned footer with a fixed height.
 * Church letters are single-page in practice; a very long one simply
 * carries its letterhead on the first page. */
function LetterDocument({ input, design, accent }: { input: DocumentPdfInput; design: DocumentDesign; accent: string }) {
  return (
    <Document title={input.title}>
      <Page size="A4" style={letterStyles.page}>
        {/* Navy masthead with the crest, then a gold rule under it. */}
        <View style={letterStyles.band}>
          <Crest logo={input.logoImage} accent={accent} dark size={36} />
          <Text style={{ textAlign: "center", fontSize: 7, color: "#c9d6e8", marginTop: 5, fontFamily: "Helvetica", lineHeight: 1.3 }}>
            {CHURCH_ADDRESS} · {CHURCH_CONTACT}
          </Text>
        </View>
        <View style={{ height: 4, backgroundColor: accent }} />

        {/* Slim gold rules down both margins. */}
        <View style={{ position: "absolute", top: 150, bottom: 96, left: 34, width: 0.8, backgroundColor: accent, opacity: 0.55 }} />
        <View style={{ position: "absolute", top: 150, bottom: 96, right: 34, width: 0.8, backgroundColor: accent, opacity: 0.55 }} />

        <View style={letterStyles.content}>
          <View style={letterStyles.metaRow}>
            <Text>Document No. {input.documentNumber}</Text>
            <Text>Issued {input.issuedDate}</Text>
          </View>

          {design.banner ? (
            <Text style={{ backgroundColor: accent, color: "#ffffff", paddingVertical: 6, paddingHorizontal: 10, textAlign: "center", marginBottom: 14, fontSize: 10, letterSpacing: 1.4, fontFamily: "Helvetica-Bold" }}>
              {design.banner.toUpperCase()}
            </Text>
          ) : null}

          <Text style={letterStyles.title}>{input.title}</Text>
          <RuleWithDiamond accent={accent} width={80} />

          <View style={{ marginTop: 10 }}>
            {input.bodyParagraphs.map((paragraph, index) => (
              <Text key={index} style={letterStyles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>

          {input.signer ? (
            <Text style={{ marginTop: 16, alignSelf: "flex-start", backgroundColor: "#eef2f7", color: NAVY, borderRadius: 4, paddingVertical: 5, paddingHorizontal: 11, fontSize: 8.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.8 }}>
              CERTIFIED BY THE PASTOR&apos;S OFFICE
            </Text>
          ) : null}

          <SignatureRow input={input} design={design} accent={accent} />
        </View>

        {/* Footer band mirrors the masthead, pinned to the bottom with an
            explicit height so its box can never resolve to the full page. */}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 52 }}>
          <View style={{ height: 3, backgroundColor: accent }} />
          <View style={{ backgroundColor: NAVY_DEEP, paddingVertical: 10, paddingHorizontal: 42, flexGrow: 1 }}>
            <Text style={{ textAlign: "center", fontSize: 7.5, color: "#c9d6e8", fontFamily: "Helvetica" }}>
              {input.draft ? "DRAFT · Awaiting authorization" : design.footer || `${CHURCH_ADDRESS} · ${CHURCH_CONTACT}`}
            </Text>
            <Text style={{ textAlign: "center", fontSize: 7, color: "#93a8c4", marginTop: 3, fontFamily: "Helvetica" }}>
              {CHURCH_NAME}, Bull Bay · Document No. {input.documentNumber}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function CertificateDocument({ input, design, accent }: { input: DocumentPdfInput; design: DocumentDesign; accent: string }) {
  const landscape = design.orientation !== "portrait";
  const inset = 22;
  return (
    <Document title={input.title}>
      <Page size="A4" orientation={design.orientation} style={{ padding: 0, backgroundColor: CREAM, fontFamily: "Times-Roman", color: INK }}>
        {/* Engraved double frame with flourished corners. */}
        <View style={{ position: "absolute", top: inset, left: inset, right: inset, bottom: inset, border: `2.5 solid ${accent}` }} />
        <View style={{ position: "absolute", top: inset + 7, left: inset + 7, right: inset + 7, bottom: inset + 7, border: `0.7 solid ${accent}`, opacity: 0.75 }} />
        <View style={{ position: "absolute", top: inset + 14, left: inset + 14, right: inset + 14, bottom: inset + 14 }}>
          <CornerFlourish accent={accent} corner="tl" />
          <CornerFlourish accent={accent} corner="tr" />
          <CornerFlourish accent={accent} corner="bl" />
          <CornerFlourish accent={accent} corner="br" />
        </View>

        {/* Faint crest watermark behind the text. */}
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, justifyContent: "center", alignItems: "center" }}>
          <Image src={input.logoImage} style={{ width: landscape ? 300 : 260, height: landscape ? 300 : 260, opacity: 0.05 }} />
        </View>

        <View style={{ paddingHorizontal: landscape ? 74 : 58, paddingTop: 44, paddingBottom: 40, flexGrow: 1 }}>
          <Crest logo={input.logoImage} accent={accent} size={46} />
          <RuleWithDiamond accent={accent} width={landscape ? 170 : 120} />

          <Text style={{ textAlign: "center", fontFamily: "Times-Bold", fontSize: landscape ? 31 : 27, color: NAVY, letterSpacing: 1.2, marginTop: 2 }}>
            {input.title}
          </Text>

          {design.banner ? (
            <Text style={{ alignSelf: "center", backgroundColor: accent, color: "#ffffff", paddingVertical: 5, paddingHorizontal: 22, marginTop: 10, fontSize: 9.5, letterSpacing: 2, fontFamily: "Helvetica-Bold" }}>
              {design.banner.toUpperCase()}
            </Text>
          ) : null}

          {design.subtitle ? (
            <Text style={{ textAlign: "center", fontSize: 10.5, color: MUTED, marginTop: 9, fontFamily: "Times-Italic" }}>{design.subtitle}</Text>
          ) : null}

          <Text style={{ textAlign: "center", fontSize: 9, letterSpacing: 3, color: MUTED, marginTop: 16, fontFamily: "Helvetica" }}>
            THIS CERTIFICATE IS PRESENTED TO
          </Text>
          <Text style={{ textAlign: "center", fontFamily: "Times-Italic", fontSize: landscape ? 33 : 28, color: accent, marginTop: 6 }}>
            {input.recipientName}
          </Text>
          <RuleWithDiamond accent={accent} width={landscape ? 200 : 150} />

          <View style={{ marginHorizontal: landscape ? 46 : 16, marginTop: 6 }}>
            {input.bodyParagraphs.map((paragraph, index) => (
              <Text key={index} style={{ textAlign: "center", fontSize: 11.5, lineHeight: 1.6, marginBottom: 7 }}>
                {paragraph}
              </Text>
            ))}
          </View>

          <View style={{ flexGrow: 1 }} />
          <SignatureRow input={input} design={design} accent={accent} />

          <Text style={{ textAlign: "center", fontSize: 7.5, color: MUTED, marginTop: 16, fontFamily: "Helvetica" }}>
            {input.draft ? "DRAFT · Awaiting authorization" : `Certificate No. ${input.documentNumber}`} ·{" "}
            {design.footer || `${CHURCH_ADDRESS} · ${CHURCH_CONTACT}`}
          </Text>
        </View>
      </Page>
    </Document>
  );
}

function DocumentPdf({ input }: { input: DocumentPdfInput }) {
  const design = cleanDesign(input.design);
  const accent = design.accent ?? "#ba963c";
  return input.layout === "certificate" ? (
    <CertificateDocument input={input} design={design} accent={accent} />
  ) : (
    <LetterDocument input={input} design={design} accent={accent} />
  );
}

export async function generateDocumentPdf(input: DocumentPdfInput): Promise<Buffer> {
  return renderToBuffer(<DocumentPdf input={input} />);
}
