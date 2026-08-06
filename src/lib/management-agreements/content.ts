import {
  HARBORLINE_MANAGER,
  type ManagementAgreementTemplateData,
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

export function buildManagementAgreementSections(
  data: ManagementAgreementTemplateData
) {
  const ownerName = data.ownerCompany || "the Owner named herein";
  const managerName = data.managerName || HARBORLINE_MANAGER.name;
  const ownerNotice = [
    data.ownerCompany,
    data.ownerContact ? `Attention: ${data.ownerContact}` : null,
    data.ownerEmail,
    data.ownerPhone,
    data.ownerMailingAddress,
  ]
    .filter(Boolean)
    .join("; ");

  const initialEnd =
    data.endDate ??
    (() => {
      const start = new Date(`${data.startDate}T12:00:00`);
      if (Number.isNaN(start.getTime())) return null;
      start.setFullYear(start.getFullYear() + 1);
      return start.toISOString().slice(0, 10);
    })();

  return [
    {
      heading: "ARTICLE 1 - APPOINTMENT AND AGENCY",
      paragraphs: [
        `Owner hereby appoints ${managerName} ("Manager" or "Property Manager") as Owner's exclusive property manager and agent for the Property, and Manager accepts such appointment, subject to the terms of this Agreement.`,
        "Manager shall act as Owner's agent for day-to-day management, leasing administration, rent collection, vendor coordination, and reporting. Manager is not a partner, joint venturer, or guarantor of Tenant performance.",
        "Manager shall perform services in a commercially reasonable manner consistent with prevailing practices for comparable commercial properties in the Chicago metropolitan area.",
      ],
    },
    {
      heading: "ARTICLE 2 - PARTIES AND PROPERTY",
      paragraphs: [
        `2.1 Owner. ${ownerNotice || ownerName}.`,
        `2.2 Manager. ${managerName} ("${HARBORLINE_MANAGER.label}").`,
        `2.3 Property. ${data.propertyName}, ${data.propertyAddress} (the "Property"). Property type: ${data.propertyType}${
          data.propertySquareFeet != null
            ? `; approximately ${data.propertySquareFeet.toLocaleString("en-US")} rentable square feet`
            : ""
        }.`,
      ],
    },
    {
      heading: "ARTICLE 3 - TERM",
      paragraphs: [
        `3.1 Initial Term. This Agreement begins on ${formatDate(data.startDate)} (the "Commencement Date") and continues for an initial term of one (1) year${
          initialEnd ? `, ending ${formatDate(initialEnd)}` : ""
        }, unless earlier terminated.`,
        "3.2 Automatic Renewal. Thereafter, this Agreement shall automatically renew on a year-to-year basis for successive one-year periods on the same terms, unless either party gives written notice of non-renewal at least thirty (30) days before the end of the then-current annual period.",
        `3.3 Status. Agreement status on the Commencement Date: ${data.status.replaceAll("_", " ")}.`,
        "3.4 Early Termination. Either party may terminate early under Article 12, which ends the then-current annual period and any further automatic renewal.",
      ],
    },
    {
      heading: "ARTICLE 4 - MANAGEMENT SERVICES",
      paragraphs: [
        "Manager shall provide day-to-day operations, tenant relations, and coordination of maintenance and service vendors for the Property.",
        "Manager shall administer leasing activities as Owner's agent, including marketing vacant space as directed, lease documentation support, and enforcement of lease terms consistent with Owner-approved leasing parameters.",
        "Manager shall invoice and collect Base Rent, Additional Rent (including CAM and other pass-throughs), and other amounts due under Tenant leases, and pursue customary collection procedures.",
        "Manager shall receive maintenance requests; dispatch vendors or employees; track work orders; and recommend capital or extraordinary work requiring Owner approval under Article 6.",
        "Manager shall maintain management records and prepare periodic owner statements showing receipts, disbursements, fees, and amounts due Owner or due from Owner.",
      ],
    },
    {
      heading: "ARTICLE 5 - MANAGEMENT FEE AND COMPENSATION",
      paragraphs: [
        `As compensation for base management services, Owner shall pay Manager a management fee equal to ${data.feePercent}% of collections attributable to the Property, calculated under Manager's then-current commercial fee methodology used in the Harborline system for the Property.`,
        "Fees are earned when corresponding collections are received and may be deducted from Owner funds held by Manager before remittance, or invoiced if Owner funds are insufficient.",
        "Unless included in the base fee, leasing commissions, construction or project management, litigation support beyond ordinary enforcement, and certain emergency premiums may be billed separately at agreed rates or with Owner approval.",
        "Ordinary operating expenses of the Property are Owner's cost and may be paid from Property collections. Manager is not required to advance funds.",
      ],
    },
    {
      heading: "ARTICLE 6 - AUTHORITY AND APPROVAL THRESHOLD",
      paragraphs: [
        "6.1 Ordinary Authority. Manager may, without prior Owner approval: (a) enter routine service contracts within normal operating practice; (b) authorize repairs and maintenance in the ordinary course; (c) pursue ordinary lease administration and collections; and (d) pay Property expenses from available Owner or Property funds.",
        `6.2 Approval Threshold. (a) Default Formula. Unless Owner requests a different amount in writing (including through the Harborline portal), Manager's automatic Owner-approval threshold for any single expenditure, contract, or work order is ten percent (10%) of the then-current aggregate monthly Base Rent payable under all active Tenant leases at the Property (the "Default Threshold"). Based on current active-lease Base Rent of ${money(data.aggregateMonthlyBaseRent)} per month, the Default Threshold is ${money(data.approvalThresholdAmount)}.`,
        "(b) Owner-Requested Change. Owner may at any time request a higher or lower fixed approval threshold by written notice to Manager. Once accepted and recorded for the Property in Harborline's management records, that Owner-requested amount replaces the Default Threshold until Owner further revises it in writing.",
        "(c) Application. Manager shall obtain Owner's prior written approval before committing Owner to any single item expected to exceed the applicable threshold then in effect.",
        "(d) Emergency Exception. Manager may exceed the applicable threshold to address an imminent threat to life, safety, or material Property damage, and shall notify Owner promptly thereafter.",
      ],
    },
    {
      heading: "ARTICLE 7 - TRUST FUNDS AND OWNER REMITTANCES",
      paragraphs: [
        "Rent and other Property receipts collected by Manager are held in a fiduciary or agency capacity for Owner and are not Manager's property, except earned fees properly deducted.",
        "Owner shall maintain, or authorize Manager to retain, a reasonable operating reserve for the Property.",
        "After payment of authorized expenses and Manager's fees, Manager shall remit net proceeds to Owner with the periodic statement on Manager's ordinary statement cycle, or as otherwise agreed.",
        "If collections are insufficient, Owner shall fund approved expenses and obligations upon Manager's request.",
      ],
    },
    {
      heading: "ARTICLE 8 - INSURANCE AND RISK; INJURY LIABILITY",
      paragraphs: [
        "8.1 Owner Insurance. Owner shall maintain commercially reasonable property and liability insurance on the Property and name Manager as an additional insured or interest where customary.",
        "8.2 Manager Insurance. Manager shall maintain commercial general liability and errors-and-omissions or professional liability coverage appropriate to its management business.",
        "8.3 No Rent Guarantee. Manager does not guarantee occupancy, Tenant credit, or collection of Rent.",
        "8.4 Injury and Premises Liability. Owner acknowledges that Owner, as property owner, retains primary responsibility for the condition of the Property and for liability arising from bodily injury, personal injury, or property damage occurring on or about the Property, except to the extent caused by Manager's gross negligence or willful misconduct.",
        "8.5 Claims Notice. Each party shall promptly notify the other of any claim, demand, lawsuit, or occurrence involving bodily injury or property damage at the Property of which it becomes aware and that may affect the other party.",
      ],
    },
    {
      heading: "ARTICLE 9 - OWNER OBLIGATIONS",
      paragraphs: [
        "Owner shall: (a) provide accurate ownership, insurance, and Property information; (b) respond timely to approval requests; (c) fund reserves and approved costs when collections are insufficient; (d) not interfere with Manager's authorized day-to-day administration; and (e) disclose known environmental, structural, or legal issues affecting management of the Property.",
      ],
    },
    {
      heading: "ARTICLE 10 - RECORDS AND AUDIT",
      paragraphs: [
        "Manager shall keep books and records for the Property and make them available to Owner upon reasonable notice. Owner may audit Property accounts once per calendar year at Owner's expense, unless a material error is found favoring Owner.",
      ],
    },
    {
      heading: "ARTICLE 11 - INDEMNITY; LIABILITY FOR INJURY",
      paragraphs: [
        `11.1 Owner Indemnity. Owner shall indemnify, defend, and hold harmless Manager and its officers, employees, and agents from and against any and all claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or relating to: (a) Owner's ownership of the Property; (b) the condition of the Property; (c) bodily injury, personal injury, death, or property damage occurring on or about the Property; and (d) Owner's decisions, instructions, or failure to fund or approve required work; except to the extent caused by Manager's gross negligence or willful misconduct.`,
        "11.2 Manager Indemnity. Manager shall indemnify, defend, and hold harmless Owner from and against claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of Manager's gross negligence or willful misconduct in performing services under this Agreement, including to the extent such conduct causes bodily injury, personal injury, death, or property damage.",
        "11.3 No Limitation for Willful Misconduct. Nothing in this Agreement limits either party's liability for its own fraud or willful misconduct.",
        "11.4 Insurance Primary. The insurance required under Article 8 is intended as the primary source of recovery for third-party injury and damage claims to the extent of available coverage; indemnity under this Article applies to uninsured or underinsured exposure as between the parties.",
      ],
    },
    {
      heading: "ARTICLE 12 - TERMINATION",
      paragraphs: [
        "12.1 Termination for Convenience. Either party may terminate this Agreement on thirty (30) days' prior written notice.",
        "12.2 Termination for Cause. Either party may terminate for material breach if uncured fifteen (15) days after written notice, or immediately for fraud, willful misconduct, or loss of required licensing.",
        "12.3 Transition. Upon termination, Manager shall deliver to Owner (or Owner's designee) keys, access credentials, contracts, Tenant files, ledgers, and remaining Owner funds, less amounts properly due Manager, within a commercially reasonable transition period.",
      ],
    },
    {
      heading: "ARTICLE 13 - GENERAL",
      paragraphs: [
        "13.1 Notices. Notices under this Agreement shall be in writing to the contacts set forth above (and via the Harborline portal where the parties so elect).",
        "13.2 Governing Law. This Agreement is governed by the laws of the State of Illinois, without regard to conflicts principles.",
        "13.3 Entire Agreement. This Agreement is the entire agreement regarding management of the Property and supersedes prior management arrangements for the Property.",
        data.notes
          ? `13.4 Special Terms. ${data.notes}`
          : "13.4 Special Terms. None stated.",
      ],
    },
    {
      heading: "SIGNATURES",
      paragraphs: [
        `OWNER: ${ownerName}`,
        data.ownerContact
          ? `By: ________________________________  Name: ${data.ownerContact}  Title: ________________  Date: __________`
          : "By: ________________________________  Name: ________________  Title: ________________  Date: __________",
        "",
        `MANAGER: ${managerName}`,
        "By: ________________________________  Name: ________________  Title: Authorized Representative  Date: __________",
      ],
    },
  ];
}
