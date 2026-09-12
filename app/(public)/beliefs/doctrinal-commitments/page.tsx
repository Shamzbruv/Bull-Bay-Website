import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/json-ld";
import { SITE_NAME } from "@/lib/org";

export const metadata: Metadata = {
  title: "Doctrinal Commitments",
  description: "The Doctrinal Commitments of the Church of God, as outlined in Scripture.",
  alternates: { canonical: "/beliefs/doctrinal-commitments" },
};

const COMMITMENTS: string[] = [
  "Repentance. Mark 1:15; Luke 13:3; Acts 3:19.",
  "Justification. Romans 5:1; Titus 3:7.",
  "Regeneration. Titus 3:5.",
  "New birth. John 3:3; 1 Peter 1:23; 1 John 3:9.",
  "Sanctification subsequent to justification. Romans 5:2; 1 Corinthians 1:30; 1 Thessalonians 4:3; Hebrews 13:12.",
  "Holiness. Luke 1:75; 1 Thessalonians 4:7; Hebrews 12:14.",
  "Water baptism. Matthew 28:19; Mark 1:9, 10; John 3:22, 23; Acts 8:36, 38.",
  "Baptism with the Holy Ghost subsequent to cleansing; the enduement of power for service. Matthew 3:11; Luke 24:49, 53; Acts 1:4-8.",
  "The speaking in tongues as the Spirit gives utterance as the initial evidence of the baptism in the Holy Ghost. John 15:26; Acts 2:4; 10:44-46; 19:1-7.",
  "The Church. Exodus 19:5, 6; Psalm 22:22; Matthew 16:13-19; 28:19,20; Acts 1:8; 2:42-47; 7:38; 20:28; Romans 8:14-17; 1 Corinthians 3:16, 17; 12:12-31; 2 Corinthians 6:6-18; Ephesians 2:19-22; 3:9, 21; Philippians 3:10; Hebrews 2:12; 1 Peter 2:9; 1 John 1:6, 7; Revelation 21:2, 9; 22:17.",
  "Spiritual gifts. 1 Corinthians 12:1, 7, 10, 28, 31; 1 Corinthians 14:1.",
  "Signs following believers. Mark 16:17-20; Romans 15:18, 19; Hebrews 2:4.",
  "Fruit of the Spirit. Romans 6:22; Galatians 5:22, 23; Ephesians 5:9; Philippians 1:11.",
  "Divine healing provided for all in the Atonement. Psalm 103:3; Isaiah 53:4, 5; Matthew 8:17; James 5:14-16; 1 Peter 2:24.",
  "The Lord’s Supper. Luke 22:17-20; 1 Corinthians 11:23-26.",
  "Washing the saints’ feet. John 13:4-17; 1 Timothy 5:9, 10.",
  "Tithing and giving. Genesis 14:18-20; 28:20-22; Malachi 3:10; Luke 11:42; 1 Corinthians 16:2; 2 Corinthians 9:6-9; Hebrews 7:1-21.",
  "Restitution where possible. Matthew 3:8; Luke 19:8, 9.",
  "Premillennial second coming of Jesus. First, to resurrect the dead saints and to catch away the living saints to Him in the air. 1 Corinthians 15:52; 1 Thessalonians 4:15-17; 2 Thessalonians 2:1. Second, to reign on the earth a thousand years. Zechariah 14:4; 1 Thessalonians 4:14; 2 Thessalonians 1:7-10; Jude 14, 15; Revelation 5:10; 19:11-21; 20:4-6.",
  "Resurrection. John 5:28, 29; Acts 24:15; Revelation 20:5, 6.",
  "Eternal life for the righteous. Matthew 25:46; Luke 18:30; John 10:28; Romans 6:22; 1 John 5:11-13.",
  "Eternal punishment for the wicked. No liberation nor annihilation. Matthew 25:41-46; Mark 3:29; 2 Thessalonians 1:8, 9; Revelation 20:10-15; 21:8.",
];

export default function DoctrinalCommitmentsPage() {
  return (
    <section className="section" style={{ paddingTop: 50 }}>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `Doctrinal Commitments | ${SITE_NAME}`,
          about: { "@type": "Organization", name: SITE_NAME },
        }}
      />
      <p className="eyebrow">
        <span /> DOCTRINAL COMMITMENTS
      </p>
      <h1
        style={{
          fontFamily: "var(--font-display)",
          color: "var(--color-blue-700)",
          fontSize: "clamp(2.2rem,4vw,3.4rem)",
          margin: "0 0 18px",
          letterSpacing: "-.03em",
        }}
      >
        Doctrinal Commitments
      </h1>
      <p className="large-copy">
        The following Doctrinal Commitments represent the core beliefs of the denomination as outlined in Scripture.
      </p>
      <p className="form-note" style={{ marginBottom: 40 }}>
        See also our <Link href="/beliefs">Declaration of Faith</Link>.
      </p>

      <ol style={{ listStyle: "none", padding: 0, display: "grid", gap: 14 }}>
        {COMMITMENTS.map((text, i) => (
          <li key={i} className="panel" style={{ display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 0 }}>
            <span
              aria-hidden="true"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "1.6rem",
                color: "var(--color-olive-600)",
                minWidth: 40,
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <p style={{ margin: 0, color: "var(--color-ink)", fontSize: "1.02rem", lineHeight: 1.6 }}>{text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
