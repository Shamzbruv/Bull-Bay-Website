/* eslint-disable jsx-a11y/alt-text -- this is @react-pdf/renderer's <Image>, a PDF-drawing
   primitive with no `alt` prop, not an HTML <img>; the a11y rule doesn't apply here. */
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { cleanDesign, type DocumentDesign } from "@/lib/documents/design";
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
  layout?: string;
  design?: DocumentDesign;
  draft?: boolean;
  documentNumber: string;
  title: string;
  bodyParagraphs: string[];
  recipientName: string;
  issuedDate: string;
  signer?: CertifyingSigner | null;
  logoImage: Buffer;
};

function DocumentPdf({ input }: { input: DocumentPdfInput }) {
  const design = cleanDesign(input.design);
  if (input.layout === "certificate") return <Document title={input.title}><Page size="A4" orientation={design.orientation} style={{padding:36,fontFamily:"Times-Roman",color:"#12334e",backgroundColor:"#fffdf8"}}>
    <View style={{position:"absolute",top:18,left:18,right:18,bottom:18,border:`3 solid ${design.accent}`}}/><View style={{position:"absolute",top:25,left:25,right:25,bottom:25,border:`0.7 solid ${design.accent}`}}/>
    <View style={{alignItems:"center",marginBottom:12}}><Image src={input.logoImage} style={{width:52,height:52}}/><Text style={{fontFamily:"Times-Bold",fontSize:16,marginTop:5}}>NEW TESTAMENT CHURCH OF GOD</Text><Text style={{fontSize:10,letterSpacing:3,marginTop:3}}>BULL BAY · JAMAICA</Text></View>
    <Text style={{textAlign:"center",fontFamily:"Times-Bold",fontSize:30,marginTop:8,marginBottom:8}}>{input.title}</Text>
    {design.banner && <Text style={{backgroundColor:design.accent,color:"#fff",textAlign:"center",padding:6,fontSize:12,marginHorizontal:80}}>{design.banner}</Text>}
    {design.subtitle && <Text style={{textAlign:"center",fontSize:11,marginTop:8}}>{design.subtitle}</Text>}
    <Text style={{textAlign:"center",fontFamily:"Times-Italic",fontSize:28,color:"#866421",marginTop:16,marginBottom:12}}>{input.recipientName}</Text>
    <View style={{marginHorizontal:35}}>{input.bodyParagraphs.map((p,i)=><Text key={i} style={{textAlign:"center",fontSize:12,lineHeight:1.55,marginBottom:8}}>{p}</Text>)}</View>
    <View style={{flexDirection:"row",justifyContent:"space-between",marginTop:22,marginHorizontal:40,alignItems:"flex-end"}}><View style={{width:180}}>{input.signer?.signatureImage?<Image src={input.signer.signatureImage} style={{width:130,height:45,objectFit:"contain"}}/>:<View style={{height:45}}/>}<Text style={{borderTop:"0.8 solid #12334e",paddingTop:5,fontSize:10}}>{input.signer?.name || design.signer_name || "Pastor signature"}</Text><Text style={{fontSize:9}}>Pastor</Text></View><View style={{width:80,alignItems:"center"}}>{input.signer?.stampImage?<Image src={input.signer.stampImage} style={{width:75,height:75,objectFit:"contain"}}/>:<View style={{border:`1 dashed ${design.accent}`,width:70,height:70,justifyContent:"center",alignItems:"center"}}><Text style={{fontSize:8}}>CHURCH STAMP</Text></View>}</View><View style={{width:180}}><Text style={{borderTop:"0.8 solid #12334e",paddingTop:5,fontSize:10}}>{design.secretary_name || "Administrative team"}</Text><Text style={{fontSize:9}}>Issued {input.issuedDate}</Text></View></View>
    <Text style={{position:"absolute",bottom:34,left:40,right:40,textAlign:"center",fontSize:8,color:"#637181"}}>{input.draft?"DRAFT · Awaiting authorization":`Certificate No. ${input.documentNumber}`} · {design.footer || "One Family · One Faith · One Mission"}</Text>
  </Page></Document>;
  return (
    <Document title={input.title}>
      <Page size="A4" style={styles.page}>
        <View style={styles.letterhead}>
          <Image src={input.logoImage} style={styles.logo} />
          <View>
            <Text style={styles.churchName}>New Testament Church of God</Text>
            <Text style={styles.churchSub}>Weise Road, 9 Miles, Bull Bay · St. Andrew · Jamaica</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <Text>Document No. {input.documentNumber}</Text>
          <Text>Issued {input.issuedDate}</Text>
        </View>

        {design.banner && <Text style={{backgroundColor:design.accent,color:"#fff",padding:8,textAlign:"center",marginBottom:18}}>{design.banner}</Text>}
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
          {(
            <View style={[styles.signatureCol, { position: "relative", alignItems: "flex-end" }]}>
              {input.signer?.stampImage && <Image src={input.signer.stampImage} style={styles.stampImg} />}
              {input.signer?.signatureImage && <Image src={input.signer.signatureImage} style={styles.signatureImg} />}
              {!input.signer && <View style={{height:55,border:`1 dashed ${design.accent}`,padding:8,marginBottom:8}}><Text style={{fontSize:8}}>CHURCH STAMP</Text></View>}
              <View style={{ width: "100%" }}>
                <View style={styles.signatureLine}>
                  <Text style={styles.signatureName}>{input.signer?.name || design.signer_name || "Pastor signature"}</Text>
                  <Text style={styles.signatureTitle}>{input.signer?.title || "Pastor"}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer} fixed>
          <Text>{SITE_NAME}</Text>
          <Text>{input.draft ? "DRAFT · Awaiting authorization" : design.footer || "Certified electronically by the church office."}</Text>
        </View>
      </Page>
    </Document>
  );
}

export async function generateDocumentPdf(input: DocumentPdfInput): Promise<Buffer> {
  return renderToBuffer(<DocumentPdf input={input} />);
}
