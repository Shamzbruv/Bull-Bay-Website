import type { Metadata } from "next";
import Link from "next/link";
import { getPrimaryCampus } from "@/lib/data/public";
import { JoinForm } from "./join-form";

export const revalidate = 120;
export const metadata: Metadata = {
  title: "Request to Join",
  description: "Ask to join New Testament Church of God, Bull Bay — the pastor and team will review your request and welcome you in.",
  alternates: { canonical: "/join" },
};

export default async function JoinPage() {
  const campus = await getPrimaryCampus();

  return (
    <section aria-labelledby="join-title">
      <div className="page-hero compact-hero olive-wash">
        <p className="eyebrow">
          <span /> MEMBERSHIP
        </p>
        <h1 id="join-title">
          Ready to call
          <br />
          <em>Bull Bay home?</em>
        </h1>
        <p>Send us a short request and our pastor and team will follow up to welcome you into membership.</p>
      </div>
      <section className="section form-layout">
        <aside className="form-aside">
          <span className="card-icon">✦</span>
          <h2>What happens next</h2>
          <p>
            Your request goes straight to our pastor and church office. Once approved, we&apos;ll email you an
            invitation to set up your member account — from there you&apos;ll have your own place inside the church
            platform: giving, events, groups, prayer, and more.
          </p>
          <div className="mini-stat">
            <b>Already a member?</b>
            <span>
              <Link href="/login">Sign in to the member portal</Link> instead.
            </span>
          </div>
          <div className="mini-stat">
            <b>Just visiting?</b>
            <span>
              Read <Link href="/visit">what to expect</Link> on your first Sunday.
            </span>
          </div>
        </aside>
        <JoinForm />
      </section>
    </section>
  );
}
