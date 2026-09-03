/* eslint-disable jsx-a11y/alt-text -- this is @react-pdf/renderer's <Image>, a PDF-drawing
   primitive with no `alt` prop, not an HTML <img>; the a11y rule doesn't apply here. */
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { SITE_NAME } from "@/lib/org";

const BRAND_BLUE = "#173f89";
const BRAND_OLIVE = "#6a7e30";
const INK = "#1d2b45";
const MUTED = "#5c6a80";
const BORDER = "#dde1d9";

const styles = StyleSheet.create({
  page: { padding: 56, fontSize: 11, color: INK, fontFamily: "Helvetica", lineHeight: 1.5 },
  letterhead: { flexDirection: "row", alignItems: "center", gap: 14, borderBottom: `2 solid ${BRAND_BLUE}`, paddingBottom: 18, marginBottom: 30 },
  logo: { width: 56, height: 56 },
  churchName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: BRAND_BLUE },
  churchSub: { fontSize: 8.5, color: MUTED, letterSpacing: 1, marginTop: 2, textTransform: "uppercase" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24, fontSize: 9.5, color: MUTED },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: BRAND_BLUE, marginBottom: 20, textAlign: "center" },
  body: { fontSize: 11.5, color: INK, marginBottom: 40, textAlign: "justify" },
  signatureBlock: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 50 },
  signatureCol: { width: "48%" },
  signatureImg: { width: 140, height: 50, objectFit: "contain", marginBottom: 4 },
  stampImg: { width: 90, height: 90, objectFit: "contain", position: "absolute", right: 0, top: -30 },
  signatureLine: { borderTop: `1 solid ${INK}`, paddingTop: 5, fontSize: 10 },
  signatureName: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  signatureTitle: { fontSize: 9, color: MUTED },
  footer: { position: "absolute", bottom: 34, left: 56, right: 56, borderTop: `0.5 solid ${BORDER}`, paddingTop: 10, flexDirection: "row", justifyContent: "space-between", fontSize: 8, color: MUTED },
  certifiedBadge: { marginTop: 30, alignSelf: "flex-start", backgroundColor: "#eef1ec", borderRadius: 6, paddingVertical: 6, paddingHorizontal: 12, fontSize: 9, color: BRAND_OLIVE, fontFamily: "Helvetica-Bold" },
});

export type CertifyingSigner = {
  name: string;
  title: string;
  signatureImage?: Buffer | null;
  stampImage?: Buffer | null;
};

export type DocumentPdfInput = {
  documentNumber: string;
  title: string;
  bodyParagraphs: string[];
  recipientName: string;
  issuedDate: string;
  signer?: CertifyingSigner | null;
  logoImage: Buffer;
};

function DocumentPdf({ input }: { input: DocumentPdfInput }) {
  return (
    <Document title={input.title}>
      <Page size="A4" style={styles.page}>
        <View style={styles.letterhead}>
          <Image src={input.logoImage} style={styles.logo} />
          <View>
            <Text style={styles.churchName}>New Testament Church of God</Text>
            <Text style={styles.churchSub}>Bull Bay · St. Andrew · Jamaica</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text>Document No. {input.documentNumber}</Text>
          <Text>Issued {input.issuedDate}</Text>
        </View>

        <Text style={styles.title}>{input.title}</Text>

        <View style={styles.body}>
          {input.bodyParagraphs.map((p, i) => (
            <Text key={i} style={{ marginBottom: 12 }}>
              {p}
            </Text>
          ))}
        </View>

        {input.signer && (
          <Text style={styles.certifiedBadge}>Certified by the Pastor&apos;s Office</Text>
        )}

        <View style={styles.signatureBlock}>
          <View style={styles.signatureCol}>
            <Text style={{ fontSize: 9, color: MUTED }}>Prepared for</Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, marginTop: 2 }}>{input.recipientName}</Text>
          </View>
          {input.signer && (
            <View style={[styles.signatureCol, { position: "relative", alignItems: "flex-end" }]}>
              {input.signer.stampImage && <Image src={input.signer.stampImage} style={styles.stampImg} />}
              {input.signer.signatureImage && <Image src={input.signer.signatureImage} style={styles.signatureImg} />}
              <View style={{ width: "100%" }}>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureName}>{input.signer.name}</Text>
                  <Text style={styles.signatureTitle}>{input.signer.title}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>{SITE_NAME}</Text>
          <Text>This document was generated and certified electronically via the church platform.</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateDocumentPdf(input: DocumentPdfInput): Promise<Buffer> {
  return renderToBuffer(<DocumentPdf input={input} />);
}
