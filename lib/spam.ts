/**
 * Spam scoring for the public forms (connection card, contact, request to
 * join, prayer). Every signal here was taken from mail that actually
 * reached the Visitor Follow-up screen — SEO//"Instagram growth"/web-video
 * cold pitches, and the "Hello http://bullbayntcog.org/fekal0911 Webmaster"
 * bots that paste a URL into the name field.
 *
 * The same function runs in two places, which is the point:
 *   - at submission time, to refuse the insert entirely; and
 *   - over rows already in the table, so staff can see what's flagged and
 *     clear it out without a schema change or a nightly job.
 *
 * Nothing here is allowed to be clever at the church's expense. A real
 * visitor writing "I found you on Google and would like to visit" must
 * score clean, so single weak signals never reach the block threshold on
 * their own — it always takes a combination, or one signal (a link where a
 * human name belongs) that no genuine submission produces.
 */

export type SpamVerdict = "clean" | "suspect" | "spam";

export type SpamAssessment = {
  score: number;
  reasons: string[];
  verdict: SpamVerdict;
};

export type ScorableSubmission = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  interest?: string | null;
  message?: string | null;
};

/** Block at this score; refuse the insert and tell the sender nothing. */
export const SPAM_BLOCK_THRESHOLD = 5;
/** Flag at this score: stored and shown, but badged so staff can bin it. */
export const SPAM_SUSPECT_THRESHOLD = 3;

// Built fresh on each use: a shared /g regex carries `lastIndex` between
// calls, so the same string can match once and then not match a moment
// later. That bug would let spam through at random.
const urlPattern = () =>
  /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|io|biz|pro|info|co|xyz|online|site|shop|agency|digital|tech|services?)\b/gi;

// Phrases that belong to a sales pitch, not to someone getting in touch
// with a church. Kept as whole phrases rather than single words so that
// "I'd like to know more about your services" doesn't trip anything.
const PITCH_PHRASES = [
  "increase your followers",
  "instagram service",
  "brand awareness",
  "higher engagement",
  "more customers",
  "search engine",
  "seo strateg",
  "target keywords",
  "target market",
  "online presence",
  "improve your visibility",
  "improving your visibility",
  "traffic on search engines",
  "search index",
  "displayed in online search",
  "send a full proposal",
  "our prices start",
  "the price is just",
  "per month. you can find out",
  "explainer video",
  "engaging video",
  "samples of our previous work",
  "i came across your business",
  "we checked your website",
  "complete the form on the above page",
  "if you are not interested",
  "just ignore this email",
  "no problem, just ignore",
  "web design",
  "digital marketing",
  "backlink",
  "guest post",
  "crypto",
  "bitcoin",
  "loan offer",
  "viagra",
  "casino",
];

/**
 * Links to the church's own site don't count. Members do paste
 * bullbayntcog.org into messages ("I saw the livestream on your site") and
 * that must never be held against them. Spam that quotes the domain back
 * at us is already caught by the wording and sender-address signals.
 */
function countLinks(haystack: string, exemptHost?: string) {
  const links = haystack.match(urlPattern()) ?? [];
  return exemptHost ? links.filter((link) => !link.toLowerCase().includes(exemptHost)).length : links.length;
}

/**
 * `siteHost` lets us catch the lookalike-sender trick — mail from
 * domains@search-bullbayntcog.org, which borrows the church's own domain
 * to look official. An exact match on the real domain is fine (staff do
 * submit forms); a domain that merely *contains* it is not.
 */
export function scoreSubmission(input: ScorableSubmission, siteHost = "bullbayntcog.org"): SpamAssessment {
  const reasons: string[] = [];
  let score = 0;
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  const name = `${input.firstName ?? ""} ${input.lastName ?? ""}`.trim();
  const message = (input.message ?? "").trim();
  const haystack = `${message} ${input.interest ?? ""}`.toLowerCase();

  // A link or an email address where a human name belongs. No genuine
  // submission has ever done this; the bots do it constantly.
  if (name && (countLinks(name) > 0 || /@/.test(name))) {
    add(6, "Link or email address in the name field");
  }

  const links = countLinks(message, siteHost);
  if (links === 1) add(3, "Contains a link");
  else if (links > 1) add(4, `Contains ${links} links`);

  const hits = PITCH_PHRASES.filter((phrase) => haystack.includes(phrase));
  if (hits.length) {
    add(Math.min(hits.length * 2, 6), `Sales-pitch wording (${hits.slice(0, 3).join(", ")})`);
  }

  if (/(?:\$|usd|eur|gbp)\s?\d|\d+\s?(?:usd|eur|gbp)\b/i.test(message)) {
    add(2, "Quotes a price");
  }

  if (/<\/?[a-z][\s\S]*>|\[url=|\[\/?link\]/i.test(message)) {
    add(3, "Contains markup or BBCode");
  }

  const emailDomain = (input.email ?? "").split("@")[1]?.toLowerCase() ?? "";
  if (emailDomain && emailDomain !== siteHost && emailDomain.includes(siteHost.split(".")[0] ?? "")) {
    add(5, "Sender address imitates the church domain");
  }

  if (message.length > 600 && links > 0) {
    add(1, "Long message with links");
  }

  const verdict: SpamVerdict =
    score >= SPAM_BLOCK_THRESHOLD ? "spam" : score >= SPAM_SUSPECT_THRESHOLD ? "suspect" : "clean";

  return { score, reasons, verdict };
}

/**
 * The two signals that come from the form itself rather than its content.
 *
 * `website` is the honeypot: rendered off-screen and hidden from assistive
 * technology, so only an automated form-filler ever puts anything in it.
 * A hit is treated as certain, because a human physically cannot trip it.
 *
 * `form_ts` is stamped by the browser when the form mounts. Missing is
 * neutral on purpose — a visitor with JavaScript blocked still deserves to
 * reach the church — but a submission that arrives faster than a person
 * can type their own name was not typed by a person.
 */
export const HONEYPOT_FIELD = "website";
export const TIMESTAMP_FIELD = "form_ts";
const MIN_HUMAN_FILL_MS = 2500;

export function checkFormShield(formData: FormData): { blocked: boolean; reason: string | null } {
  if (String(formData.get(HONEYPOT_FIELD) || "").trim()) {
    return { blocked: true, reason: "honeypot" };
  }
  const stamp = Number(formData.get(TIMESTAMP_FIELD));
  if (Number.isFinite(stamp) && stamp > 0) {
    const elapsed = Date.now() - stamp;
    if (elapsed >= 0 && elapsed < MIN_HUMAN_FILL_MS) {
      return { blocked: true, reason: `submitted in ${elapsed}ms` };
    }
  }
  return { blocked: false, reason: null };
}
