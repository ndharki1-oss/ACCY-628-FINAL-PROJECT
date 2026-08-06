export type PortalRole =
  | "owner"
  | "admin"
  | "tenant"
  | "employee"
  | "accounting";

/** Roles that have a Help center (Admin intentionally excluded). */
export type HelpRole = Exclude<PortalRole, "admin">;

export type FaqCategoryId =
  | "getting_started"
  | "money"
  | "approvals"
  | "leases"
  | "operations"
  | "reports"
  | "account";

export type FaqArticle = {
  id: string;
  category: FaqCategoryId;
  question: string;
  /** Full answer; omit or empty = stub “coming soon” */
  answer?: string;
  keywords?: string[];
};

export const FAQ_CATEGORY_LABELS: Record<FaqCategoryId, string> = {
  getting_started: "Getting started",
  money: "Money & remittance",
  approvals: "Approvals & decisions",
  leases: "Leases & occupancy",
  operations: "Maintenance & work orders",
  reports: "Reports & analytics",
  account: "Account & access",
};

function stub(
  id: string,
  category: FaqCategoryId,
  question: string,
  keywords: string[] = []
): FaqArticle {
  return { id, category, question, keywords };
}

function answered(
  id: string,
  category: FaqCategoryId,
  question: string,
  answer: string,
  keywords: string[] = []
): FaqArticle {
  return { id, category, question, answer, keywords };
}

const OWNER_FAQ: FaqArticle[] = [
  answered(
    "o-what-harborline",
    "getting_started",
    "What does Harborline do for me as an owner?",
    "Harborline is your commercial property manager. We collect rent from tenants, pay approved operating costs, take a management fee on collections, and remit the remainder to you on owner statements.",
    ["agency", "manager", "role"]
  ),
  answered(
    "o-noi",
    "money",
    "What is NOI in this portal?",
    "NOI (Net Operating Income) here is tenant charges minus operating costs for a selected period. Management fee is shown separately and is not treated as property OpEx. Use the NOI tab for Month / Quarter / YTD views.",
    ["noi", "opex", "margin"]
  ),
  answered(
    "o-remittance",
    "money",
    "What is remittance due?",
    "Remittance is the cash due to you after collections, property expenses, and Harborline’s management fee on the owner statement for that property and period.",
    ["remit", "statement", "cash"]
  ),
  answered(
    "o-fee-range",
    "money",
    "Why is Fee % sometimes a range?",
    "Live billing uses each tenant’s credit-based fee rate on collections. Different tenants in one building can produce a range (for example 6%–7.5%). Agreement averages on some screens are contract references only.",
    ["fee", "credit", "percent"]
  ),
  answered(
    "o-my-items",
    "approvals",
    "What appears in My Items?",
    "My Items holds decisions waiting on you—costs over your approval threshold, work orders needing approval, open tenant requests—plus overdue rent and upcoming lease expirations.",
    ["approve", "threshold", "attention"]
  ),
  answered(
    "o-decline-note",
    "approvals",
    "Where does my decline note go?",
    "When you decline a work order with a note, Harborline property management is notified through Contact / Messages so they can coordinate next steps. The note is for management, not a public tenant message.",
    ["reject", "decline", "message"]
  ),
  answered(
    "o-statements",
    "money",
    "How do Statements differ from the dashboard remittance tile?",
    "Each statement card is one property and one period. The dashboard remittance tile often sums every statement that overlaps the current calendar month across your portfolio, so it can look larger than a single card.",
    ["statement", "dashboard", "sum"]
  ),
  // Volume stubs — searchable titles only
  stub("o-s1", "getting_started", "How do I switch between my properties?", [
    "portfolio",
  ]),
  stub("o-s2", "getting_started", "What should I check first each month?", [
    "checklist",
  ]),
  stub("o-s3", "getting_started", "How do I message Harborline management?", [
    "contact",
  ]),
  stub("o-s4", "getting_started", "Can I download owner statements as PDFs?", [
    "pdf",
    "download",
  ]),
  stub("o-s5", "money", "When is remittance typically issued?", ["timing"]),
  stub("o-s6", "money", "What line items appear on an owner statement?", [
    "collections",
    "fee",
  ]),
  stub("o-s7", "money", "How is management fee calculated on collections?", [
    "fee",
    "credit",
  ]),
  stub("o-s8", "money", "Why doesn’t collection % equal cash received this month?", [
    "collection",
  ]),
  stub("o-s9", "money", "What is project fee on a statement?", ["project"]),
  stub("o-s10", "money", "How do CAM recoveries show up for me?", ["cam"]),
  stub("o-s11", "approvals", "What is my approval threshold?", ["threshold"]),
  stub("o-s12", "approvals", "Which costs need my approval vs Harborline’s?", [
    "cost",
  ]),
  stub("o-s13", "approvals", "What happens after I approve a work order?", [
    "work order",
  ]),
  stub("o-s14", "approvals", "Can I undo a decline?", ["undo"]),
  stub("o-s15", "approvals", "How are emergency work orders handled?", [
    "emergency",
  ]),
  stub("o-s16", "leases", "How is occupancy calculated?", ["occupancy"]),
  stub("o-s17", "leases", "Where do I see leases ending soon?", [
    "expiration",
  ]),
  stub("o-s18", "leases", "What does renewal pending mean?", ["renewal"]),
  stub("o-s19", "leases", "How do vacant suites appear on Properties?", [
    "vacant",
  ]),
  stub("o-s20", "operations", "Where is the maintenance cost report?", [
    "maintenance",
  ]),
  stub("o-s21", "operations", "How do tenant requests reach me?", ["request"]),
  stub("o-s22", "operations", "Who schedules vendors after I approve?", [
    "vendor",
  ]),
  stub("o-s23", "reports", "How do I read NOI margin?", ["margin"]),
  stub("o-s24", "reports", "What does prior-period trend mean on NOI?", [
    "trend",
  ]),
  stub("o-s25", "reports", "Where are management agreements and leases?", [
    "contracts",
  ]),
  stub("o-s26", "account", "How do I update my contact email?", ["profile"]),
  stub("o-s27", "account", "Who can see my statements besides me?", [
    "privacy",
  ]),
  stub("o-s28", "account", "How do I sign out securely?", ["sign out"]),
];

const TENANT_FAQ: FaqArticle[] = [
  answered(
    "t-pay",
    "money",
    "How do I pay my rent invoice?",
    "Open Invoices, select the balance due, and follow the pay flow for that property. Status updates when payment is applied—overdue means the invoice past due with an unpaid balance.",
    ["pay", "invoice"]
  ),
  answered(
    "t-request",
    "operations",
    "How do maintenance requests work?",
    "Submit a request from your portal. Harborline reviews it; if owner approval is required, the owner decides and management coordinates vendors.",
    ["request", "maintenance"]
  ),
  answered(
    "t-lease",
    "leases",
    "Where do I see my lease terms?",
    "Use the Lease area to view your active agreement summary and any lease document tools your property provides.",
    ["lease"]
  ),
  stub("t-s1", "getting_started", "How do I update my contact information?", [
    "profile",
  ]),
  stub("t-s2", "getting_started", "Who do I message about billing questions?", [
    "contact",
  ]),
  stub("t-s3", "money", "Why is my invoice marked partial?", ["partial"]),
  stub("t-s4", "money", "What fees appear on my invoice besides base rent?", [
    "cam",
  ]),
  stub("t-s5", "money", "How do I dispute an invoice line?", ["dispute"]),
  stub("t-s6", "money", "When do late fees apply?", ["late"]),
  stub("t-s7", "leases", "When does my lease renew?", ["renewal"]),
  stub("t-s8", "leases", "Can I request a suite transfer?", ["suite"]),
  stub("t-s9", "operations", "How fast are emergencies handled?", [
    "emergency",
  ]),
  stub("t-s10", "operations", "Can I attach photos to a request?", ["photos"]),
  stub("t-s11", "operations", "Who will visit my suite for repairs?", [
    "vendor",
  ]),
  stub("t-s12", "account", "How do notifications work?", ["notifications"]),
  stub("t-s13", "account", "How do I sign out?", ["sign out"]),
  stub("t-s14", "money", "Where do I download a paid invoice receipt?", [
    "pdf",
  ]),
  stub("t-s15", "getting_started", "What properties appear in my portal?", [
    "property",
  ]),
  stub("t-s16", "leases", "What does available inventory mean?", [
    "available",
  ]),
  stub("t-s17", "approvals", "Why is my request waiting on the owner?", [
    "owner",
  ]),
  stub("t-s18", "reports", "Can I see building operating expenses?", [
    "opex",
  ]),
];

const EMPLOYEE_FAQ: FaqArticle[] = [
  answered(
    "e-complete",
    "operations",
    "How do I complete a work order?",
    "Open your assignments, mark completion with notes and actual cost when required. Some jobs then wait on owner approval before they are fully closed.",
    ["complete", "wo"]
  ),
  answered(
    "e-owner-approval",
    "approvals",
    "What does waiting on owner approval mean for me?",
    "The spend or completion sits with the owner. Harborline management sees the decision and will give you next steps—do not assume you should restart work until instructed.",
    ["pending", "owner"]
  ),
  answered(
    "e-decline",
    "approvals",
    "What if an owner declines my work?",
    "Management receives the decline reason and coordinates rework or cancellation. Check with Harborline before returning to the site.",
    ["reject", "decline"]
  ),
  stub("e-s1", "getting_started", "How are jobs assigned to me?", ["assign"]),
  stub("e-s2", "getting_started", "Where is today’s schedule?", ["schedule"]),
  stub("e-s3", "operations", "How do I add vendor notes?", ["notes"]),
  stub("e-s4", "operations", "What if parts are delayed?", ["delay"]),
  stub("e-s5", "operations", "How do emergency tickets jump the queue?", [
    "emergency",
  ]),
  stub("e-s6", "operations", "Can I split a work order across days?", [
    "schedule",
  ]),
  stub("e-s7", "money", "Where do I enter actual cost?", ["cost"]),
  stub("e-s8", "money", "Who approves overtime materials?", ["materials"]),
  stub("e-s9", "leases", "How do I know which suite to access?", ["suite"]),
  stub("e-s10", "account", "How do I update my availability?", [
    "availability",
  ]),
  stub("e-s11", "account", "How do I sign out?", ["sign out"]),
  stub("e-s12", "approvals", "How long do owner decisions usually take?", [
    "sla",
  ]),
  stub("e-s13", "reports", "Can I see my completion history?", ["history"]),
  stub("e-s14", "getting_started", "Who is my Harborline contact?", [
    "contact",
  ]),
  stub("e-s15", "operations", "What statuses will I see on assignments?", [
    "status",
  ]),
  stub("e-s16", "money", "When is cost visible to the owner?", ["threshold"]),
  stub("e-s17", "leases", "What if the suite is vacant?", ["vacant"]),
  stub("e-s18", "approvals", "Do I message the owner directly?", ["message"]),
];

const ACCOUNTING_FAQ: FaqArticle[] = [
  answered(
    "c-fee",
    "money",
    "What is company fee revenue vs owner remittance?",
    "Fee revenue is Harborline’s share of collections under management agreements. Remittance is what is due to the owner after expenses and fee. Do not treat remittance as company income.",
    ["fee", "remittance"]
  ),
  answered(
    "c-period",
    "reports",
    "How should I pick a reporting period?",
    "Align filters to the statement or calendar window you are reconciling. Mixing all-time and monthly views will disagree—label which window you used.",
    ["period", "ytd"]
  ),
  answered(
    "c-opex",
    "reports",
    "What is included in OpEx views?",
    "Operating cost entries for properties in the selected period. Management fee is typically shown as Harborline revenue, not property OpEx, depending on the report.",
    ["opex", "expense"]
  ),
  stub("c-s1", "getting_started", "Which dashboard tiles are company-level?", [
    "dashboard",
  ]),
  stub("c-s2", "money", "How do I reconcile statements to the GL?", [
    "reconcile",
  ]),
  stub("c-s3", "money", "Where are management fee components?", ["fee"]),
  stub("c-s4", "money", "How is CAM recovered vs paid?", ["cam"]),
  stub("c-s5", "reports", "How do I use Property P&L?", ["pnl"]),
  stub("c-s6", "reports", "How do I use Owner Profitability?", [
    "profitability",
  ]),
  stub("c-s7", "reports", "Can I filter OpEx by category?", ["category"]),
  stub("c-s8", "reports", "Why don’t NOI screens match statement periods?", [
    "noi",
  ]),
  stub("c-s9", "leases", "Do leases affect accrual timing?", ["accrual"]),
  stub("c-s10", "operations", "How are vendor costs posted?", ["vendor"]),
  stub("c-s11", "approvals", "Do unapproved costs hit P&L?", ["approval"]),
  stub("c-s12", "account", "Who can see accounting reports?", ["access"]),
  stub("c-s13", "account", "How do I sign out?", ["sign out"]),
  stub("c-s14", "money", "What is remittance due timing?", ["timing"]),
  stub("c-s15", "reports", "How do pie charts allocate fee revenue?", ["pie"]),
  stub("c-s16", "reports", "How do monthly rent bars work?", ["rent"]),
  stub("c-s17", "getting_started", "What’s the difference vs Admin profitability?", [
    "admin",
  ]),
  stub("c-s18", "money", "How are voids handled?", ["void"]),
  stub("c-s19", "operations", "Where do I see cost entry audit trails?", [
    "audit",
  ]),
  stub("c-s20", "leases", "How does occupancy affect fee forecasts?", [
    "occupancy",
  ]),
];

export const FAQ_BY_ROLE: Record<HelpRole, FaqArticle[]> = {
  owner: OWNER_FAQ,
  tenant: TENANT_FAQ,
  employee: EMPLOYEE_FAQ,
  accounting: ACCOUNTING_FAQ,
};

export const HELP_INTRO: Record<HelpRole, { title: string; blurb: string }> = {
  owner: {
    title: "Owner Help Center",
    blurb:
      "Guidance for remittances, NOI, approvals, and working with Harborline as your property manager.",
  },
  tenant: {
    title: "Tenant Help Center",
    blurb:
      "Pay invoices, understand your lease, and request maintenance through Harborline.",
  },
  employee: {
    title: "Field Employee Help Center",
    blurb:
      "Complete assignments, record costs, and follow Harborline when owners must approve work.",
  },
  accounting: {
    title: "Accounting Help Center",
    blurb:
      "Reconcile fee revenue, owner remittances, OpEx, and property performance reports.",
  },
};

export function faqCategoryCounts(articles: FaqArticle[]) {
  const counts: Partial<Record<FaqCategoryId, number>> = {};
  for (const a of articles) {
    counts[a.category] = (counts[a.category] ?? 0) + 1;
  }
  return counts;
}
