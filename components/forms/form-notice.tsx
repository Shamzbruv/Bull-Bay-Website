import Image from "next/image";

/** A form that can't be filled in right now: closed, not yet open, needs a
 *  sign-in, already answered. Styled like the form itself. */
export function FormNotice({ title, formTitle, message, action, accent = "#173f89" }: {
  title: string;
  formTitle?: string;
  message: string;
  action?: { href: string; label: string };
  accent?: string;
}) {
  return (
    <div className="fr-page font-serif" style={{ ["--fr-accent" as string]: accent } as React.CSSProperties}>
      <section className="fr-card fr-notice">
        <Image src="/images/brand/bull-bay-logo.png" alt="New Testament Church of God, Bull Bay" width={64} height={64} />
        {formTitle && <p className="fr-kicker">{formTitle}</p>}
        <h1>{title}</h1>
        <p style={{ whiteSpace: "pre-wrap" }}>{message}</p>
        {action && (
          <a className="fr-button" href={action.href}>
            {action.label}
          </a>
        )}
      </section>
    </div>
  );
}
