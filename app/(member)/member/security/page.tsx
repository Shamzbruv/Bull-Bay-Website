import type { Metadata } from "next";
import { MfaEnroll } from "./mfa-enroll";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Security</h1>
          <p>Manage sign-in security for your account.</p>
        </div>
      </div>
      <MfaEnroll />
    </>
  );
}
