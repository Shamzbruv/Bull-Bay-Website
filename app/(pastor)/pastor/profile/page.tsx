import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/members/avatar";
import { ProfileForm } from "@/app/(member)/member/profile/profile-form";
import { AvatarUploader } from "@/app/(member)/member/profile/avatar-uploader";

export const metadata: Metadata = { title: "My Profile" };

/**
 * Same profile form as /member/profile, rendered inside the Pastor shell —
 * a link there switches the whole workspace chrome to the Member
 * workspace, which reads as "clicking a link logged me out of Pastor".
 * The pastor edits their own details from right where they already are.
 */
export default async function PastorProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>My Profile</h1>
          <p>Keep your church, contact and professional details up to date.</p>
        </div>
      </div>
      {profile ? (
        <>
          <AvatarUploader
            name={[profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Pastor"}
            avatarUrl={await getAvatarUrl(profile.avatar_path)}
          />
          <ProfileForm profile={profile} />
        </>
      ) : (
        <div className="alert warn">We couldn&apos;t load your church profile. Please contact the church office.</div>
      )}
    </>
  );
}
