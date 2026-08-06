import {
  HARBORLINE_EMPLOYER,
  jobTitleFromSpecialty,
  type EmployeeAgreementTemplateData,
} from "./types";

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

export type AgreementSection = {
  heading: string;
  paragraphs: string[];
};

export function buildEmployeeAgreementSections(
  data: EmployeeAgreementTemplateData
): AgreementSection[] {
  if (data.kind === "contractor") {
    return buildContractorSections(data);
  }
  return buildStaffSections(data);
}

function buildStaffSections(
  data: EmployeeAgreementTemplateData
): AgreementSection[] {
  const employer = HARBORLINE_EMPLOYER.name;
  const start = formatDate(data.startDate);
  const jobTitle = jobTitleFromSpecialty(data.specialtyLabel);
  const specialty =
    data.specialtyLabel && data.specialtyLabel !== "—"
      ? data.specialtyLabel
      : "General Maintenance";

  return [
    {
      heading: "ARTICLE 1 — PARTIES",
      paragraphs: [
        `This Employment Agreement (the "Agreement") is entered into as of ${start} (the "Effective Date") by and between ${employer} ("Employer" or "Company") and ${data.workerName} ("Employee").`,
        `Employee contact for notices: ${data.email}${data.phone ? `; ${data.phone}` : ""}.`,
        `Employer: ${employer}, Chicago, Illinois metropolitan area.`,
      ],
    },
    {
      heading: "ARTICLE 2 — POSITION AND DUTIES",
      paragraphs: [
        `2.1 Position. Employer employs Employee in the full-time, non-exempt position of ${jobTitle}. Primary specialty: ${specialty}.`,
        "2.2 Duties. Employee shall perform commercially reasonable maintenance and repair work on properties managed by Employer, respond to assigned work orders, document labor time accurately, follow safety procedures, and perform related tasks reasonably assigned by Employer.",
        "2.3 Standard of Performance. Employee shall perform services in a professional manner consistent with practices for comparable commercial properties in the Chicago metropolitan area.",
      ],
    },
    {
      heading: "ARTICLE 3 — TERM AND AT-WILL EMPLOYMENT",
      paragraphs: [
        `3.1 Commencement. Employment under this Agreement begins on the Effective Date, ${start}.`,
        "3.2 At-Will Relationship. Employment is at-will. Either party may terminate the employment relationship at any time, with or without cause or advance notice, subject only to applicable law. Nothing in this Agreement creates a contract for a fixed term of employment.",
      ],
    },
    {
      heading: "ARTICLE 4 — COMPENSATION",
      paragraphs: [
        `4.1 Hourly Wage. Employer shall pay Employee at the rate of ${money(data.hourlyRate)} per hour for hours worked in the ${specialty} specialty. This rate is set by Harborline's specialty-based in-house labor schedule for the Employee's assigned job type.`,
        "4.2 Pay Schedule. Wages shall be paid biweekly, subject to required withholdings and deductions.",
        "4.3 Overtime. Employee is non-exempt. Hours worked over forty (40) in a workweek shall be paid at one and one-half (1.5) times the regular hourly rate, or as otherwise required by law.",
        "4.4 Timekeeping. Employee shall record time through Employer's work-order and labor systems as directed.",
      ],
    },
    {
      heading: "ARTICLE 5 — BENEFITS AND PAID TIME OFF",
      paragraphs: [
        "5.1 Paid Time Off. Full-time Employee is eligible for fifteen (15) days of paid time off per calendar year, prorated for the first year of employment, plus Company-observed holidays then in effect.",
        "5.2 Workers' Compensation. Employee is covered by workers' compensation insurance as required by Illinois law.",
        "5.3 Benefit Changes. Employer may modify paid-time-off and holiday policies prospectively upon reasonable notice, subject to applicable law.",
      ],
    },
    {
      heading: "ARTICLE 6 — WORK LOCATION, TOOLS, AND ASSIGNMENTS",
      paragraphs: [
        "6.1 Location. Work is performed primarily at commercial properties in the Chicago metropolitan portfolio managed by Employer and at related support locations.",
        "6.2 Tools and Equipment. Employer will furnish customary tools and personal protective equipment as job duties require. Employee shall care for and return Company property.",
        "6.3 Work Orders. Employee performs assignments routed to Harborline staff under Company work-order rules, including routine work Harborline pays at or below applicable owner approval thresholds. Employee has no authority to bind property owners or approve capital or over-threshold work without manager direction.",
      ],
    },
    {
      heading: "ARTICLE 7 — CONFIDENTIALITY AND CONDUCT",
      paragraphs: [
        "7.1 Confidential Information. Employee shall protect confidential owner, tenant, vendor, and Company information learned in the course of employment and shall not use or disclose such information except as required to perform duties or as required by law.",
        "7.2 Policies. Employee shall comply with Employer's workplace, safety, equal-employment, and systems-use policies as published from time to time.",
      ],
    },
    {
      heading: "ARTICLE 8 — NON-COMPETE AND NON-SOLICITATION",
      paragraphs: [
        "8.1 Non-Compete. During employment and for a period of six (6) months following termination of employment for any reason, Employee shall not, within the Chicago metropolitan area, engage as an employee, contractor, or owner in a competing property-maintenance business that solicits or services commercial properties then under active management by Employer, to the extent enforceable under Illinois law.",
        "8.2 Non-Solicitation of Customers. During the same period, Employee shall not knowingly solicit property owners or tenants with whom Employee had material contact during the twelve (12) months preceding termination for the purpose of diverting maintenance or management work away from Employer.",
        "8.3 Non-Solicitation of Personnel. During the same period, Employee shall not solicit Employer's staff or retained contractors to leave Employer to join a competing concern.",
        "8.4 Reasonableness. The parties intend these restrictions to be reasonable in time, geography, and scope. If a court finds any restriction unenforceable, it shall be modified to the minimum extent necessary to make it enforceable.",
      ],
    },
    {
      heading: "ARTICLE 9 — GOVERNING LAW AND MISCELLANEOUS",
      paragraphs: [
        "9.1 Governing Law. This Agreement is governed by the laws of the State of Illinois, without regard to conflicts-of-law principles. Venue lies in Cook County, Illinois, unless otherwise required by law.",
        "9.2 Entire Agreement. This Agreement constitutes the entire understanding between the parties concerning the subject matter hereof and supersedes prior oral or written employment discussions on that subject.",
        "9.3 Amendments. No amendment is binding unless in a writing signed by Employee and an authorized representative of Employer.",
        "9.4 Counterparts. This Agreement may be executed in counterparts, including electronic signature, each of which is deemed an original.",
      ],
    },
    {
      heading: "ACKNOWLEDGMENT AND SIGNATURES",
      paragraphs: [
        `IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date, ${start}.`,
        "",
        `EMPLOYER: ${employer}`,
        "By: ________________________________",
        "Name / Title: ________________________________",
        "Date: ________________________________",
        "",
        `EMPLOYEE: ${data.workerName}`,
        "Signature: ________________________________",
        "Date: ________________________________",
      ],
    },
  ];
}

function buildContractorSections(
  data: EmployeeAgreementTemplateData
): AgreementSection[] {
  const company = HARBORLINE_EMPLOYER.name;
  const start = formatDate(data.startDate);
  const specialty =
    data.specialtyLabel && data.specialtyLabel !== "—"
      ? data.specialtyLabel
      : "General Maintenance";
  const contractorEntity = data.companyName || data.workerName;

  return [
    {
      heading: "ARTICLE 1 — PARTIES",
      paragraphs: [
        `This Independent Contractor Agreement (the "Agreement") is entered into as of ${start} (the "Effective Date") by and between ${company} ("Company") and ${contractorEntity} ("Contractor"), by its authorized representative ${data.workerName}.`,
        `Contractor notice contact: ${data.email}${data.phone ? `; ${data.phone}` : ""}.`,
        `Company: ${company}, Chicago, Illinois metropolitan area.`,
      ],
    },
    {
      heading: "ARTICLE 2 — ENGAGEMENT AND SCOPE",
      paragraphs: [
        `2.1 Engagement. Company retains Contractor as an independent contractor to perform commercial maintenance and related specialty services, with primary specialty ${specialty}, on properties managed by Company.`,
        "2.2 Relationship. Contractor is an independent contractor and not an employee, partner, or joint venturer of Company. Contractor is responsible for its own taxes, licenses, insurance (other than coverage Company elects to maintain for itself), and benefits.",
        "2.3 Assignments. Work is assigned through Company's work-order process, including owner-approved, emergency, high-priority, and capital-path work that Company routes to retained contractors.",
      ],
    },
    {
      heading: "ARTICLE 3 — TERM",
      paragraphs: [
        `3.1 Commencement. The engagement begins on the Effective Date, ${start}.`,
        "3.2 Duration. The engagement continues on a year-to-year basis until terminated by either party upon thirty (30) days' prior written notice, or immediately for material breach, safety risk, or loss of required insurance/licenses.",
      ],
    },
    {
      heading: "ARTICLE 4 — FEES AND INVOICING",
      paragraphs: [
        `4.1 Rates Depend on Work Performed. Contractor's labor is billed according to the type of work performed on each assignment, not a single flat rate. For work in Contractor's primary specialty of ${specialty}, the schedule rate is ${money(data.hourlyRate)} per hour unless a work order states otherwise.`,
        `4.2 Rate Schedule. Unless a work order states a different negotiated rate, the following Harborline contractor labor schedule applies: ${data.rateSchedule
          .map((r) => `${r.workTypeLabel} ${money(r.hourlyRate)}/hr`)
          .join("; ")}.`,
        "4.3 Invoices. Contractor shall submit itemized invoices tied to work-order references and identify the work type used for billing. Company shall pay undisputed amounts within thirty (30) days of receipt.",
        "4.4 Expenses. Pre-approved materials and third-party costs may be passed through at cost with documentation. No markup applies unless Company agrees in writing.",
      ],
    },
    {
      heading: "ARTICLE 5 — STANDARDS, SAFETY, AND ACCESS",
      paragraphs: [
        "5.1 Standard of Care. Contractor shall perform services in a good and workmanlike manner consistent with commercial property practices in the Chicago metropolitan area.",
        "5.2 Compliance. Contractor shall comply with applicable laws, codes, and site rules, and shall maintain commercially reasonable insurance.",
        "5.3 Coordination. Contractor shall coordinate access and scheduling with Company so as not to unreasonably disrupt tenants.",
      ],
    },
    {
      heading: "ARTICLE 6 — CONFIDENTIALITY",
      paragraphs: [
        "Contractor shall protect confidential owner, tenant, and Company information and shall use such information solely to perform this engagement, except as required by law.",
      ],
    },
    {
      heading: "ARTICLE 7 — NON-COMPETE AND NON-SOLICITATION",
      paragraphs: [
        "7.1 Non-Compete. During the term of this Agreement and for six (6) months thereafter, Contractor shall not knowingly solicit or contract directly with property owners of properties then under active management by Company to provide competing maintenance services that displace Company-managed work, to the extent enforceable under Illinois law.",
        "7.2 Non-Solicitation of Personnel. During the same period, Contractor shall not solicit Company's employees to leave Company to join Contractor.",
        "7.3 Reasonableness. If any restriction is held unenforceable, it shall be reformed to the minimum extent necessary for enforceability.",
      ],
    },
    {
      heading: "ARTICLE 8 — GOVERNING LAW AND MISCELLANEOUS",
      paragraphs: [
        "8.1 Governing Law. This Agreement is governed by the laws of the State of Illinois. Venue lies in Cook County, Illinois, unless otherwise required by law.",
        "8.2 Entire Agreement. This Agreement is the entire understanding concerning this engagement and supersedes prior oral or written discussions on that subject.",
        "8.3 Amendments. Amendments must be in a writing signed by both parties.",
        "8.4 Counterparts. This Agreement may be signed in counterparts, including electronic signature.",
      ],
    },
    {
      heading: "ACKNOWLEDGMENT AND SIGNATURES",
      paragraphs: [
        `IN WITNESS WHEREOF, the parties have executed this Agreement as of the Effective Date, ${start}.`,
        "",
        `COMPANY: ${company}`,
        "By: ________________________________",
        "Name / Title: ________________________________",
        "Date: ________________________________",
        "",
        `CONTRACTOR: ${contractorEntity}`,
        `By (authorized): ${data.workerName}`,
        "Signature: ________________________________",
        "Date: ________________________________",
      ],
    },
  ];
}
