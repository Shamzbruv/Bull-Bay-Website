import type { Metadata } from "next";
import { AccessDenied } from "@/components/access-denied";
import { SITE_URL } from "@/lib/org";
import { churchToolsAccess } from "@/lib/tools/access";
import { CopyField } from "../integrations/copy-field";

export const metadata: Metadata = { title: "Live countdown & quiz" };

/**
 * The two service tools that used to be separate apps with their own
 * Railway servers: the Live Countdown (sanctuary TVs and OBS) and Quiz
 * Night. Both now run inside this site; this page is how admins find them
 * and the addresses the TVs and OBS need.
 */
export default async function ChurchToolsPage() {
  if ((await churchToolsAccess()) !== "admin") return <AccessDenied reason="The live countdown and quiz night are for church admins." />;

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Live countdown &amp; quiz night</h1>
          <p>Run the service countdown on the sanctuary screens and livestream, and host quiz night.</p>
        </div>
      </div>

      <section className="panel">
        <h2>Live countdown</h2>
        <p>
          Set the service start time, show notices and lyrics, play background music and start the end-of-service
          outro on every screen at once.
        </p>
        <div className="office-toolbar">
          <a className="primary-button" href="/tools/live/admin" target="_blank" rel="noopener">
            Open the control panel
          </a>
        </div>

        <h3>Addresses for the screens</h3>
        <p className="form-note">
          These open without signing in, so TVs and OBS can show them. Only the control panel needs an admin sign-in.
        </p>
        <CopyField label="Sanctuary TV display" value={`${SITE_URL}/tools/live`} />
        <CopyField label="OBS countdown overlay (browser source)" value={`${SITE_URL}/tools/live/overlay.html`} />
        <CopyField label="OBS lyrics & text overlay (browser source)" value={`${SITE_URL}/tools/live/text-overlay.html`} />
        <p className="form-note">
          Moving from the old countdown app: change the address on each TV and in each OBS browser source to the ones
          above. Templates, songs, backgrounds and music carry over. The old app keeps working until it is switched
          off, but changes made in one don&apos;t show on screens following the other.
        </p>
      </section>

      <section className="panel">
        <h2>Quiz night</h2>
        <p>
          Build Bible quizzes, then host a game on the big screen with teams, timers and scores. Players buzz in from
          their phones by scanning the QR code the game shows; they don&apos;t need an account.
        </p>
        <div className="office-toolbar">
          <a className="primary-button" href="/tools/quiz" target="_blank" rel="noopener">
            Open Quiz Night
          </a>
        </div>
      </section>
    </>
  );
}
