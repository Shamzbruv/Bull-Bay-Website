import type { Metadata } from "next";
import { getCurrentProfile } from "@/lib/auth/session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>My Profile</h1>
          <p>Keep your contact details up to date.</p>
        </div>
      </div>
      {profile && <ProfileForm profile={profile} />}
    </>
  );
}
