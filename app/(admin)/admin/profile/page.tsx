import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/session";
import { getAvatarUrl } from "@/lib/members/avatar";
import { ProfileForm } from "@/app/(member)/member/profile/profile-form";
import { AvatarUploader } from "@/app/(member)/member/profile/avatar-uploader";

export const metadata: Metadata = { title: "My Profile" };

/**
 * Same profile form as /member/profile, rendered inside the Admin shell —
 * a link there switches the whole workspace chrome to the Member
 * workspace, which reads as "clicking a link logged me out of Admin".
 * Staff edit their own details from right where they already are instead.
 */
export default async function AdminProfilePage() {
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
            name={[profile.first_name, profile.last_name].filter(Boolean).join(" ") || profile.email || "Church staff"}
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
