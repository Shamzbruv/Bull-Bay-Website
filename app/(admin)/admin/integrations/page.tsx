import type { Metadata } from "next";
import { getOrganizationId, getUserPermissions } from "@/lib/auth/session";
import { AccessDenied } from "@/components/access-denied";
import { OfficeActionForm } from "@/components/office-action-form";
import { googleConfig } from "@/lib/calendar/integrations";
import { pushConfig } from "@/lib/push/server";
import { SITE_NAME } from "@/lib/org";
import { CopyField } from "./copy-field";
import { saveGoogleConfig, enablePhoneNotifications } from "./actions";

export const metadata: Metadata = { title: "Calendar & phone setup" };

/**
 * These instructions are the whole point of this page. Whoever does this
 * setup does it once, probably years apart, and almost certainly is not the
 * person who wrote this software — so everything needed is written here
 * rather than left in a document that will be lost, including the two
 * things Google's own screens get people wrong on: the JavaScript origins
 * box that must stay empty, and the publishing status that silently breaks
 * every connection after seven days.
 */
export default async function IntegrationsPage() {
  const org = await getOrganizationId();
  if (!org || !(await getUserPermissions(org)).has("integrations.manage")) return <AccessDenied />;

  const config = await googleConfig();
  const push = await pushConfig();
  const configured = Boolean(config.clientId && config.clientSecret);
  const origin = config.redirectUri.replace("/api/calendar/google/callback", "");

  return (
    <>
      <div className="dashboard-header">
        <div>
          <h1>Calendar &amp; phone setup</h1>
          <p>Connect the church platform to Google Calendar, and enable notifications on phones.</p>
        </div>
      </div>

      <section className="panel">
        <h2>Google Calendar</h2>
        <p className={configured ? "badge" : "badge red"}>{configured ? "Configured" : "Setup required"}</p>

        <div className="setup-purpose">
          <h3>What this does, and why it is needed</h3>
          <p>
            Once this is set up, the pastor and staff can press <strong>Connect</strong> on their Calendar page and
            have their church appointments — counselling slots, visits, bookings members make — appear in the
            Google Calendar on their own phone, and keep updating there as things change.
          </p>
          <p>
            Google does not let one website write into people&apos;s calendars just by asking. The church has to
            register itself with Google once and receive two credentials. That is all the form below is: those two
            credentials, stored encrypted on the server. <strong>You only ever do this once.</strong> It does not
            need repeating for each person — every member of staff then connects their own account with one click.
          </p>
          <p className="setup-scope">
            The only permission requested is <code>calendar.app.created</code>, which lets this platform manage{" "}
            <strong>a calendar it creates itself</strong> and nothing else. It cannot read, change or delete
            anyone&apos;s existing personal or work calendars — Google enforces that, not us.
          </p>
        </div>

        <div className="setup-steps">
          <h3>Setting it up in Google Cloud</h3>
          <ol>
            <li>
              Go to <a href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com" target="_blank" rel="noopener noreferrer">Google Cloud → APIs &amp; Services</a>{" "}
              and enable the <strong>Google Calendar API</strong>. Nothing below works until this is on.
            </li>
            <li>
              Under <strong>Google Auth Platform → Branding</strong>, put the church&apos;s name and logo in. This is
              what staff see on the Google screen asking them to approve access, so it should read{" "}
              &ldquo;{SITE_NAME}&rdquo; and not a project code.
            </li>
            <li>
              Under <strong>Audience</strong>, set the user type to <strong>External</strong> — staff use ordinary
              Gmail addresses, not a Google Workspace belonging to the church.
            </li>
            <li>
              <strong>Then press &ldquo;Publish app&rdquo; so the status reads &ldquo;In production&rdquo;.</strong> See
              the warning below — this step is the one that matters most.
            </li>
            <li>
              Under <strong>Clients</strong>, click <strong>Create client</strong> and choose application type{" "}
              <strong>Web application</strong>. Name it anything you like; only you ever see that name.
            </li>
            <li>
              Leave <strong>Authorized JavaScript origins</strong> completely empty. It is not used here, and adding
              something there does no harm but no good either.
            </li>
            <li>
              Under <strong>Authorized redirect URIs</strong>, click <strong>Add URI</strong> and paste this exactly:
            </li>
          </ol>

          <CopyField
            label="Authorized redirect URI"
            value={config.redirectUri}
            hint="Must match character for character. A trailing slash or http instead of https gives a “redirect_uri_mismatch” error on the Google screen."
          />

          <p className="form-note">
            If Google asks for a home page or authorized domain while setting up branding, use{" "}
            <code>{origin}</code>. While you are on this screen you can also add a second redirect URI,{" "}
            <code>http://localhost:3000/api/calendar/google/callback</code> — it is only useful to a developer
            working on a copy of the site, but adding it now saves anyone having to create a second client and
            repeat all of this later.
          </p>

          <p>
            Press <strong>Create</strong>. Google shows a client ID and a client secret. Paste both below — the
            secret is only shown once, so do it now rather than later.
          </p>
        </div>

        <div className="alert warn setup-warning">
          <strong>Do not leave the app in &ldquo;Testing&rdquo;.</strong> Google gives apps still marked Testing a
          login that <strong>expires after 7 days</strong>. Everything would appear to work, and then every
          calendar in the church would quietly stop updating a week later, with staff having to reconnect
          endlessly. Set the publishing status to <strong>In production</strong> under Google Auth Platform →
          Audience.
          <br />
          <br />
          The first time each person connects, Google may show a &ldquo;Google hasn&apos;t verified this app&rdquo;
          screen. That is expected for a small organisation and is safe to continue past —{" "}
          <em>Advanced → Continue</em>. It appears because the church has not paid for Google&apos;s review process,
          not because anything is wrong. Verification is optional and only worth doing if more than 100 people
          will ever connect a calendar.
        </div>

        <OfficeActionForm action={saveGoogleConfig} label="Save Google configuration">
          <label>
            Client ID
            <input
              name="client_id"
              required
              defaultValue={config.clientId ?? ""}
              autoComplete="off"
              placeholder="000000000000-xxxxxxxxxxxxxxxx.apps.googleusercontent.com"
            />
          </label>
          <label>
            Client secret
            <input name="client_secret" type="password" required autoComplete="new-password" placeholder="GOCSPX-…" />
          </label>
        </OfficeActionForm>
        <p className="form-note">
          The client secret and everyone&apos;s Google tokens are encrypted before they are stored, and never leave
          the server. Saving again replaces the secret; the field is blank because it is never sent back to the
          browser.
        </p>
      </section>

      <section className="panel">
        <h2>Phone notifications</h2>
        <p>
          {push
            ? "Push notifications are configured. Each person turns them on for their own device under their notification settings."
            : "Enable Web Push so members can receive notifications on their phone or browser. This is a one-off switch for the whole church; each person then opts in on their own device."}
        </p>
        {!push && <OfficeActionForm action={enablePhoneNotifications} label="Enable phone notifications" />}
      </section>
    </>
  );
}
