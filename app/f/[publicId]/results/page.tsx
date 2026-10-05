import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { FormNotice } from "@/components/forms/form-notice";
import { SummaryCharts, type SummaryBlock } from "@/components/forms/summary-charts";
import { isQuestion, type Answers } from "@/lib/forms/schema";
import { definitionOf, loadFormByPublicId, signInNeeded } from "@/lib/forms/server";
import { summarize } from "@/lib/forms/summary";

type Params = { params: Promise<{ publicId: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const form = await loadFormByPublicId((await params).publicId);
  return { title: form ? `Results: ${form.title}` : "Results", robots: { index: false, follow: false } };
}

/** The summary respondents may see when the form allows it: charts of the
 *  choices people made, never anyone's written answers or files. */
export default async function FormResultsPage({ params }: Params) {
  const { publicId } = await params;
  const form = await loadFormByPublicId(publicId);
  if (!form) notFound();
  const { title, items, settings } = definitionOf(form);
  if (!settings.showResultsSummary) {
    return <FormNotice formTitle={title} title="Results aren't shared" message="The church office keeps the answers to this form private." accent={settings.theme.accent} />;
  }
  if (signInNeeded(settings)) {
    const profile = await getCurrentProfile();
    if (!profile || profile.organization_id !== form.organization_id) {
      return <FormNotice formTitle={title} title="Please sign in" message="Sign in with your church account to see the results." action={{ href: `/login?next=${encodeURIComponent(`/f/${publicId}/results`)}`, label: "Sign in" }} accent={settings.theme.accent} />;
    }
  }
  const { data } = await createServiceRoleClient().from("form_responses").select("answers").eq("form_id", form.id).limit(5000);
  const responses = (data ?? []).map((r) => ({ answers: r.answers as Answers }));
  const blocks: SummaryBlock[] = items
    .filter(isQuestion)
    .filter((q) => q.type !== "file_upload" && q.type !== "signature")
    .map((q) => ({ id: q.id, title: q.title, type: q.type, summary: summarize(q, responses) }));
  return (
    <div className={`fr-page font-${settings.theme.font}`} style={{ ["--fr-accent" as string]: settings.theme.accent, ["--fr-bg" as string]: settings.theme.background } as React.CSSProperties}>
      <header className="fr-card fr-head">
        <div className="fr-head-body">
          <p className="fr-kicker">Results so far</p>
          <h1>{title}</h1>
          <p className="fr-desc">
            {responses.length} {responses.length === 1 ? "response" : "responses"}. <a href={`/f/${publicId}`}>Back to the form</a>
          </p>
        </div>
      </header>
      <SummaryCharts blocks={blocks} showText={false} />
    </div>
  );
}
