import { DEFAULT_SETTINGS, type FormDefinition, type FormItem, type FormSettings } from "./schema";

// Ready-made church forms to start from, each showing off what the builder
// can do: spot-limited sign-ups, follow-up questions that appear only when
// needed, signatures and consent, a self-marking Bible quiz.

export type FormTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  definition: FormDefinition;
};

const yesNo = (prefix: string) => [
  { id: `${prefix}_yes`, label: "Yes" },
  { id: `${prefix}_no`, label: "No" },
];

const contactDetails: FormItem[] = [
  { kind: "question", id: "q_name", title: "Full name", type: "short_text", required: true, prefill: "full_name" },
  { kind: "question", id: "q_email", title: "Email address", type: "email", required: true, prefill: true },
  { kind: "question", id: "q_phone", title: "Phone number", type: "phone", required: false, prefill: true },
];

function settings(overrides: Partial<FormSettings>): FormSettings {
  return { ...DEFAULT_SETTINGS, ...overrides, quiz: { ...DEFAULT_SETTINGS.quiz, ...overrides.quiz }, theme: { ...DEFAULT_SETTINGS.theme, ...overrides.theme }, notify: { ...DEFAULT_SETTINGS.notify, ...overrides.notify } };
}

export const FORM_TEMPLATES: FormTemplate[] = [
  {
    id: "event_registration",
    name: "Event registration",
    description: "Names, numbers attending, dietary needs, with a copy emailed to each person.",
    icon: "🗓",
    definition: {
      title: "Event registration",
      description: "Let us know you're coming so we can prepare for you.",
      items: [
        ...contactDetails,
        { kind: "question", id: "q_party", title: "How many people are coming, including you?", type: "number", required: true, min: 1, max: 20, integer: true },
        {
          kind: "question",
          id: "q_children",
          title: "Will any children under 12 be with you?",
          type: "multiple_choice",
          required: true,
          options: yesNo("kids"),
        },
        {
          kind: "question",
          id: "q_children_count",
          title: "How many children under 12?",
          type: "number",
          required: true,
          min: 1,
          max: 15,
          integer: true,
          showIf: [{ questionId: "q_children", op: "equals", value: "kids_yes" }],
        },
        {
          kind: "question",
          id: "q_diet",
          title: "Any dietary needs?",
          type: "checkboxes",
          required: false,
          other: true,
          options: [
            { id: "diet_none", label: "None" },
            { id: "diet_veg", label: "Vegetarian" },
            { id: "diet_diabetic", label: "Diabetic-friendly" },
            { id: "diet_gluten", label: "Gluten-free" },
          ],
        },
        { kind: "question", id: "q_notes", title: "Anything else we should know?", type: "long_text", required: false },
      ],
      settings: settings({ receipts: "requested", confirmationMessage: "Thank you for registering. We look forward to seeing you!", listInMemberPortal: true }),
    },
  },
  {
    id: "volunteer_signup",
    name: "Volunteer sign-up",
    description: "Shifts that close by themselves once they're full.",
    icon: "🤝",
    definition: {
      title: "Volunteer sign-up",
      description: "Choose a shift. Each one closes automatically when it's full.",
      items: [
        ...contactDetails,
        {
          kind: "question",
          id: "q_shift",
          title: "Which shift can you serve?",
          type: "multiple_choice",
          required: true,
          options: [
            { id: "shift_sat_am", label: "Saturday 8–11 AM: cleaning crew", limit: 6 },
            { id: "shift_sat_pm", label: "Saturday 11 AM–2 PM: set-up team", limit: 6 },
            { id: "shift_sun_ush", label: "Sunday 8–9:30 AM: ushering", limit: 4 },
            { id: "shift_sun_kids", label: "Sunday 9:30 AM–12 PM: children's church", limit: 3 },
          ],
        },
        {
          kind: "question",
          id: "q_areas",
          title: "Where else would you like to serve?",
          type: "checkboxes",
          required: false,
          options: [
            { id: "area_music", label: "Music and worship" },
            { id: "area_media", label: "Media and sound" },
            { id: "area_hosp", label: "Hospitality" },
            { id: "area_outreach", label: "Community outreach" },
          ],
        },
        { kind: "question", id: "q_commit", title: "Commitment", type: "consent", required: true, statement: "I'll let the team leader know as early as possible if I can't make my shift." },
      ],
      settings: settings({ listInMemberPortal: true, receipts: "always", confirmationMessage: "Thank you for serving! You'll get a copy of your sign-up by email." }),
    },
  },
  {
    id: "baby_dedication",
    name: "Baby dedication application",
    description: "Child and parents' details, godparents, a preferred Sunday and the birth certificate.",
    icon: "👶",
    definition: {
      title: "Baby dedication application",
      description: "Please complete this form at least three weeks before the Sunday you'd like.",
      items: [
        { kind: "section", id: "s_child", title: "About the child" },
        { kind: "question", id: "q_child_name", title: "Child's full name", type: "short_text", required: true },
        { kind: "question", id: "q_birth_date", title: "Date of birth", type: "date", required: true, includeYear: true, includeTime: false },
        { kind: "question", id: "q_birth_place", title: "Place of birth", type: "short_text", required: true },
        { kind: "question", id: "q_certificate", title: "Birth certificate (photo or PDF)", type: "file_upload", required: false, maxFiles: 1, maxSizeMb: 10, accept: ["image", "pdf"] },
        { kind: "section", id: "s_family", title: "Parents and godparents" },
        { kind: "question", id: "q_parents", title: "Parents' full names", type: "short_text", required: true },
        { kind: "question", id: "q_parent_email", title: "Parent's email address", type: "email", required: true, prefill: true },
        { kind: "question", id: "q_parent_phone", title: "Parent's phone number", type: "phone", required: true, prefill: true },
        { kind: "question", id: "q_members", title: "Are the parents members of this church?", type: "multiple_choice", required: true, options: yesNo("members") },
        { kind: "question", id: "q_godparents", title: "Godparents' full names", description: "One per line.", type: "long_text", required: false },
        { kind: "question", id: "q_sunday", title: "Preferred dedication Sunday", type: "date", required: false, includeYear: true, includeTime: false },
      ],
      settings: settings({ receipts: "always", notify: { office: true, emailProfileIds: [] } }),
    },
  },
  {
    id: "youth_camp",
    name: "Youth camp permission slip",
    description: "Camper and guardian details, health questions that follow up only when needed, consent and signature.",
    icon: "⛺",
    definition: {
      title: "Youth camp permission slip",
      description: "To be completed by a parent or guardian.",
      items: [
        { kind: "section", id: "s_camper", title: "Camper" },
        { kind: "question", id: "q_camper", title: "Camper's full name", type: "short_text", required: true },
        { kind: "question", id: "q_dob", title: "Date of birth", type: "date", required: true, includeYear: true, includeTime: false },
        {
          kind: "question",
          id: "q_shirt",
          title: "T-shirt size",
          type: "dropdown",
          required: true,
          options: ["Youth S", "Youth M", "Youth L", "Adult S", "Adult M", "Adult L", "Adult XL"].map((label, i) => ({ id: `shirt_${i + 1}`, label })),
        },
        { kind: "section", id: "s_guardian", title: "Parent or guardian" },
        { kind: "question", id: "q_guardian", title: "Your full name", type: "short_text", required: true, prefill: "full_name" },
        { kind: "question", id: "q_guardian_phone", title: "Phone number for emergencies", type: "phone", required: true, prefill: true },
        { kind: "question", id: "q_guardian_email", title: "Email address", type: "email", required: true, prefill: true },
        { kind: "section", id: "s_health", title: "Health" },
        { kind: "question", id: "q_medication", title: "Does the camper take any medication?", type: "multiple_choice", required: true, options: yesNo("meds") },
        {
          kind: "question",
          id: "q_medication_details",
          title: "Which medication, and when is it taken?",
          type: "long_text",
          required: true,
          showIf: [{ questionId: "q_medication", op: "equals", value: "meds_yes" }],
        },
        { kind: "question", id: "q_allergies", title: "Allergies or medical conditions we should know about", type: "long_text", required: false },
        { kind: "section", id: "s_permission", title: "Permission" },
        {
          kind: "question",
          id: "q_permission",
          title: "Permission",
          type: "consent",
          required: true,
          statement: "I give permission for my child to attend youth camp and for the leaders to seek medical help for them if needed.",
        },
        { kind: "question", id: "q_signature", title: "Parent or guardian's signature", type: "signature", required: true },
      ],
      settings: settings({ receipts: "always" }),
    },
  },
  {
    id: "service_feedback",
    name: "Service feedback",
    description: "Star rating, a would-you-invite score, and agree/disagree statements, anonymously.",
    icon: "⭐",
    definition: {
      title: "How was today's service?",
      description: "Your answers are anonymous and help us serve you better.",
      items: [
        { kind: "question", id: "q_overall", title: "Overall, how was today's service?", type: "rating", required: true, levels: 5, icon: "star" },
        { kind: "question", id: "q_welcome", title: "How welcome did you feel?", type: "linear_scale", required: false, min: 1, max: 5, minLabel: "Not at all", maxLabel: "Very welcome" },
        { kind: "question", id: "q_invite", title: "How likely are you to invite a friend to church?", type: "nps", required: false, minLabel: "Not at all likely", maxLabel: "Extremely likely" },
        {
          kind: "question",
          id: "q_statements",
          title: "How much do you agree?",
          type: "grid_choice",
          required: false,
          style: "likert",
          rows: [
            { id: "st_worship", label: "The worship was uplifting" },
            { id: "st_message", label: "The message was clear and helpful" },
            { id: "st_time", label: "The service started on time" },
          ],
          columns: [
            { id: "lk_1", label: "Strongly disagree" },
            { id: "lk_2", label: "Disagree" },
            { id: "lk_3", label: "Neutral" },
            { id: "lk_4", label: "Agree" },
            { id: "lk_5", label: "Strongly agree" },
          ],
        },
        { kind: "question", id: "q_better", title: "What could we do better?", type: "long_text", required: false },
      ],
      settings: settings({ showSubmitAnother: false, confirmationMessage: "Thank you for helping us grow." }),
    },
  },
  {
    id: "bible_quiz",
    name: "Bible quiz",
    description: "Marks itself and shows the score straight away, with feedback on each answer.",
    icon: "📖",
    definition: {
      title: "Bible quiz",
      description: "Test what you know. Your score appears as soon as you submit.",
      items: [
        { kind: "question", id: "q_name", title: "Your name", type: "short_text", required: true, prefill: "full_name" },
        {
          kind: "question",
          id: "q_exodus",
          title: "Who led the Israelites out of Egypt?",
          type: "multiple_choice",
          required: true,
          options: [
            { id: "ex_moses", label: "Moses" },
            { id: "ex_aaron", label: "Aaron" },
            { id: "ex_joshua", label: "Joshua" },
            { id: "ex_david", label: "David" },
          ],
          quiz: { points: 1, correct: ["ex_moses"], feedbackCorrect: "Yes! Exodus 3–14.", feedbackIncorrect: "It was Moses (Exodus 3–14)." },
        },
        {
          kind: "question",
          id: "q_gospels",
          title: "Which of these books are Gospels?",
          type: "checkboxes",
          required: true,
          options: [
            { id: "gs_matthew", label: "Matthew" },
            { id: "gs_mark", label: "Mark" },
            { id: "gs_acts", label: "Acts" },
            { id: "gs_luke", label: "Luke" },
            { id: "gs_romans", label: "Romans" },
          ],
          quiz: { points: 2, correct: ["gs_matthew", "gs_mark", "gs_luke"], feedbackIncorrect: "The Gospels are Matthew, Mark, Luke and John." },
        },
        {
          kind: "question",
          id: "q_verse",
          title: "Complete the verse: \"For God so loved the ___ …\" (John 3:16)",
          type: "short_text",
          required: true,
          quiz: { points: 1, correct: ["world", "the world"], feedbackIncorrect: "\"For God so loved the world.\"" },
        },
        {
          kind: "question",
          id: "q_books",
          title: "How many books are in the Bible?",
          type: "dropdown",
          required: true,
          options: [
            { id: "bk_39", label: "39" },
            { id: "bk_66", label: "66" },
            { id: "bk_27", label: "27" },
            { id: "bk_73", label: "73" },
          ],
          quiz: { points: 1, correct: ["bk_66"] },
        },
        {
          kind: "question",
          id: "q_order",
          title: "Put these books in Bible order.",
          type: "ranking",
          required: true,
          options: [
            { id: "or_numbers", label: "Numbers" },
            { id: "or_genesis", label: "Genesis" },
            { id: "or_leviticus", label: "Leviticus" },
            { id: "or_exodus", label: "Exodus" },
          ],
          quiz: { points: 2, correct: ["or_genesis", "or_exodus", "or_leviticus", "or_numbers"], feedbackIncorrect: "Genesis, Exodus, Leviticus, Numbers." },
        },
      ],
      settings: settings({ quiz: { enabled: true, release: "immediately", showMissed: true, showCorrect: true, showPoints: true }, confirmationMessage: "Well done for taking part!" }),
    },
  },
  {
    id: "ministry_interest",
    name: "Ministry interest survey",
    description: "Which ministries people are drawn to, and when they're free, in one grid.",
    icon: "⛪",
    definition: {
      title: "Where would you like to serve?",
      description: "Tick every ministry that interests you and the times you're usually free.",
      items: [
        ...contactDetails,
        {
          kind: "question",
          id: "q_ministries",
          title: "Ministries and availability",
          type: "grid_checkbox",
          required: true,
          rows: [
            { id: "mn_music", label: "Music and worship" },
            { id: "mn_ushers", label: "Ushering and hospitality" },
            { id: "mn_kids", label: "Children's ministry" },
            { id: "mn_youth", label: "Youth ministry" },
            { id: "mn_media", label: "Media and sound" },
            { id: "mn_outreach", label: "Outreach and evangelism" },
            { id: "mn_prayer", label: "Prayer team" },
          ],
          columns: [
            { id: "av_sun", label: "Sundays" },
            { id: "av_eve", label: "Weekday evenings" },
            { id: "av_sat", label: "Saturdays" },
          ],
        },
        { kind: "question", id: "q_gifts", title: "Any gifts or experience you'd like us to know about?", type: "long_text", required: false },
      ],
      settings: settings({ listInMemberPortal: true }),
    },
  },
  {
    id: "contact_update",
    name: "Update your details",
    description: "Members' details filled in for them; they correct what's changed.",
    icon: "✏️",
    definition: {
      title: "Update your contact details",
      description: "Check your details and correct anything that has changed.",
      items: [
        ...contactDetails,
        { kind: "question", id: "q_address", title: "Home address", type: "long_text", required: false },
        { kind: "question", id: "q_birthday", title: "Birthday", type: "date", required: false, includeYear: false, includeTime: false },
        {
          kind: "question",
          id: "q_contact_by",
          title: "How would you like the church to reach you?",
          type: "checkboxes",
          required: false,
          options: [
            { id: "cb_whatsapp", label: "WhatsApp" },
            { id: "cb_call", label: "Phone call" },
            { id: "cb_email", label: "Email" },
            { id: "cb_sms", label: "Text message" },
          ],
        },
      ],
      settings: settings({ requireSignIn: true, collectEmail: "verified", limitOneResponse: true, allowEdit: true, listInMemberPortal: true, notify: { office: true, emailProfileIds: [] } }),
    },
  },
];

export const BLANK_DEFINITION: FormDefinition = {
  title: "Untitled form",
  description: "",
  items: [{ kind: "question", id: "q_1", title: "Untitled question", type: "multiple_choice", required: false, options: [{ id: "q_1_o1", label: "Option 1" }] }],
  settings: DEFAULT_SETTINGS,
};
