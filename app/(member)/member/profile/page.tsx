import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/members/avatar";
import { ProfileForm } from "./profile-form";
import { AvatarUploader } from "./avatar-uploader";

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
          <h1>{isOnboarding ? "Finish setting up your account" : "My Profile"}</h1>
          <p>
            {isOnboarding
              ? "Tell us what you would like the church office and ministry team to know."
              : "Keep your church, contact and professional details up to date."}
          </p>
        </div>
      </div>
      {isOnboarding && (
        <div className="alert info" style={{ marginBottom: 20 }}>
          <strong>Your password is ready.</strong> Work through the three short sections below, then continue to your
          dashboard. Only your name is required, so you can leave optional details for later.
        </div>
      )}
      {profile ? (
        <>
          <AvatarUploader
            name={[profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Church member"}
            avatarUrl={await getAvatarUrl(profile.avatar_path)}
          />
          <ProfileForm profile={profile} onboarding={isOnboarding} />
        </>
      ) : (
        <div className="alert warn">We couldn&apos;t load your church profile. Please contact the church office.</div>
      )}
    </>
  );
}
