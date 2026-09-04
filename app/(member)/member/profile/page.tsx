import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ onboarding?: string }>;
}) {
  const { onboarding } = await searchParams;
  const profile = await getCurrentProfile();
  const isOnboarding = onboarding === "1";

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>{isOnboarding ? "Tell us about yourself" : "My Profile"}</h1>
          <p>
            {isOnboarding
              ? "Complete your church record so the office and ministry team can serve you well."
              : "Keep your church, contact and professional details up to date."}
          </p>
        </div>
      </div>
      {isOnboarding && (
        <div className="alert info" style={{ marginBottom: 20 }}>
          Your password is ready. This is the final step before entering your church dashboard.
        </div>
      )}
      {profile ? (
        <ProfileForm profile={profile} onboarding={isOnboarding} />
      ) : (
        <div className="alert warn">We couldn&apos;t load your church profile. Please contact the church office.</div>
      )}
    </>
  );
}
