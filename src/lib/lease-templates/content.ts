import {
  leaseTypeLabel,
  type LeaseTemplateData,
  type LeaseTemplateType,
} from "./types";

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function costRecoveryArticle(type: LeaseTemplateType, data: LeaseTemplateData) {
  const typeLabel = leaseTypeLabel(type);
  switch (type) {
    case "nnn":
      return {
        heading: "ARTICLE 5 - ADDITIONAL RENT; TRIPLE NET CHARGES",
        paragraphs: [
          `This Lease is a ${typeLabel} lease. In addition to Base Rent, Tenant shall pay, as Additional Rent, Tenant's Proportionate Share of (a) real property taxes and assessments levied against the Building and Project, (b) premiums for property and liability insurance maintained by Owner with respect to the Building and Project, and (c) common area maintenance and other operating expenses of the Building and Project (collectively, "Operating Expenses").`,
          `Pending annual reconciliation, Tenant shall pay estimated Operating Expenses of ${money(data.camMonthly)} per month, payable together with Base Rent to Property Manager on behalf of Owner. Within a reasonable time after each Expense Year, Owner (or Property Manager on Owner's behalf) shall furnish a statement of actual Operating Expenses, and the parties shall promptly settle any overpayment or underpayment.`,
          "Base Rent does not include the Operating Expense categories assigned to Tenant under this Article, except as this Lease expressly provides otherwise.",
        ],
      };
    case "modified_gross":
      return {
        heading: "ARTICLE 5 - ADDITIONAL RENT; MODIFIED GROSS CHARGES",
        paragraphs: [
          `This Lease is a ${typeLabel} lease. In addition to Base Rent, Tenant shall pay, as Additional Rent, Tenant's share of those Operating Expenses expressly identified as Tenant's responsibility in this Lease (including any CAM schedule or exhibit). Owner shall remain responsible for Operating Expenses not expressly passed through to Tenant.`,
          `Tenant shall pay estimated pass-through charges of ${money(data.camMonthly)} per month, subject to the categories, exclusions, and any caps set forth in the applicable exhibit. Such estimated amounts shall be reconciled against actual charges in the manner provided in this Lease.`,
          "Except for pass-through items identified herein, Owner shall bear standard building operating costs not assigned to Tenant.",
        ],
      };
    case "full_service":
      return {
        heading: "ARTICLE 5 - OPERATING EXPENSES; FULL SERVICE",
        paragraphs: [
          `This Lease is a ${typeLabel} lease. Base Rent is inclusive of Owner's standard operating expenses for the Building customarily included in full-service commercial leases, except for separately metered utilities serving the Premises, after-hours HVAC, and other items expressly excluded in this Lease or an exhibit.`,
          data.camMonthly > 0
            ? `Any separately stated additional rent or CAM amount of ${money(data.camMonthly)} per month shall be due only if an exhibit or amendment identifies such amount as Tenant's obligation.`
            : "No separate CAM charge is stated for this Lease; Tenant's monetary obligations under this Article are limited to excluded items expressly assigned to Tenant.",
          "Owner shall maintain the common areas and structural portions of the Building in a commercially reasonable manner consistent with a full-service commercial lease, which maintenance may be performed by Property Manager on Owner's behalf.",
        ],
      };
    case "percentage_rent":
      return {
        heading: "ARTICLE 5 - PERCENTAGE RENT; ADDITIONAL CHARGES",
        paragraphs: [
          `This Lease is a ${typeLabel} lease. In addition to Base Rent, Tenant shall pay Percentage Rent equal to the applicable percentage of Tenant's Gross Sales for each Measurement Period, subject to any natural or stated breakpoint set forth in an exhibit to this Lease.`,
          data.percentageRentRate != null
            ? `The Percentage Rent rate is ${data.percentageRentRate}% of Gross Sales. Tenant shall report Gross Sales and pay Percentage Rent at the times and in the manner required by this Lease, and Owner (or Property Manager on Owner's behalf) may audit Tenant's books and records as provided herein.`
            : "The Percentage Rent rate, breakpoint, reporting periods, and audit rights shall be as set forth in the Percentage Rent exhibit to this Lease.",
          data.camMonthly > 0
            ? `Tenant shall also pay any CAM or other Additional Rent of ${money(data.camMonthly)} per month to the extent this Lease or an exhibit identifies such amounts as Tenant's obligation in addition to Percentage Rent.`
            : "Except for Percentage Rent and Base Rent, Tenant shall have no CAM obligation under this Article unless an exhibit expressly provides otherwise.",
        ],
      };
  }
}

export function buildLeaseTemplateSections(data: LeaseTemplateData) {
  const typeLabel = leaseTypeLabel(data.leaseType);
  const premises = data.unitCode
    ? `${data.propertyName}, Suite/Unit ${data.unitCode}`
    : data.propertyName;
  const ownerName = data.ownerCompany || "the Owner named herein";
  const tenantName = data.tenantCompany || "the Tenant named herein";
  const ownerNotice = [
    data.ownerCompany,
    data.ownerContact ? `Attention: ${data.ownerContact}` : null,
    data.ownerEmail,
    data.ownerMailingAddress,
  ]
    .filter(Boolean)
    .join("; ");
  const tenantNotice = [
    data.tenantCompany,
    data.tenantContact ? `Attention: ${data.tenantContact}` : null,
    data.tenantEmail,
  ]
    .filter(Boolean)
    .join("; ");

  const costArticle = costRecoveryArticle(data.leaseType, data);

  return [
    {
      heading: "COMMERCIAL LEASE AGREEMENT",
      paragraphs: [
        `THIS COMMERCIAL LEASE AGREEMENT (this "Lease") is entered into as of the Commencement Date set forth below, by and between ${ownerName} ("Owner") and ${tenantName} ("Tenant").`,
        "Harborline Commercial Management is appointed as Property Manager under this Lease as more particularly set forth in Article 1.",
        `This Lease is executed as a ${typeLabel} lease. Owner and Tenant agree as follows:`,
      ],
    },
    {
      heading: "ARTICLE 1 - PARTIES; PROPERTY MANAGER",
      paragraphs: [
        `1.1 Owner. ${ownerNotice || ownerName}. Owner is the owner of the Property and a party to this Lease.`,
        `1.2 Tenant. ${tenantNotice || tenantName}.`,
        '1.3 Property Manager. Harborline Commercial Management ("Property Manager") is engaged by Owner as the property manager for the Building and Project.',
        "1.4 Authority of Property Manager. Owner hereby authorizes Property Manager to hold, administer, and enforce this Lease on Owner's behalf, including without limitation to: (a) prepare, hold, and maintain original and counterpart originals of this Lease and related instruments; (b) collect Rent and other sums due under this Lease and issue receipts therefor; (c) deliver notices, statements, and demands; (d) grant consents and approvals where this Lease permits Owner to do so; (e) enter the Premises as provided herein; and (f) otherwise exercise Owner's day-to-day rights and remedies under this Lease as Owner's agent. Payment of Rent to Property Manager shall constitute payment to Owner. Tenant may rely on written directions from Property Manager concerning administration of this Lease unless and until Owner delivers written notice revoking such authority.",
        "1.5 Notices. All notices under this Lease shall be in writing and delivered by personal delivery, overnight courier, or certified mail to Owner and Tenant at the addresses set forth above, with a copy to Property Manager at Harborline Commercial Management, or to such other address as a party may designate by notice.",
      ],
    },
    {
      heading: "ARTICLE 2 - PREMISES",
      paragraphs: [
        `2.1 Premises. Owner hereby leases to Tenant, and Tenant hereby leases from Owner, the premises located at ${premises} (the "Premises"), together with the non-exclusive right to use the common areas of the Building in common with other tenants.`,
        "2.2 Use. Tenant shall use the Premises solely for lawful commercial purposes consistent with applicable law, Building rules and regulations, and any exclusive-use restrictions set forth in an exhibit to this Lease. Tenant shall not commit waste or create a nuisance.",
      ],
    },
    {
      heading: "ARTICLE 3 - TERM",
      paragraphs: [
        `3.1 Term. The term of this Lease (the "Term") shall commence on ${data.startDate} (the "Commencement Date") and shall expire on ${data.endDate} (the "Expiration Date"), unless sooner terminated in accordance with this Lease.`,
        "3.2 Surrender. Upon expiration or earlier termination, Tenant shall surrender the Premises in the condition required by this Lease, ordinary wear and tear excepted, and shall remove Tenant's personal property as Owner or Property Manager may require.",
      ],
    },
    {
      heading: "ARTICLE 4 - BASE RENT",
      paragraphs: [
        `4.1 Base Rent. Tenant shall pay Base Rent in the amount of ${money(data.baseRentMonthly)} per month during the Term.`,
        `4.2 Payment. Base Rent shall be due and payable in advance on day ${data.billingDay} of each calendar month, without notice, demand, deduction, or setoff, except as this Lease expressly permits. Base Rent shall be paid to Property Manager on behalf of Owner (or as Owner or Property Manager may otherwise direct in writing). Base Rent for any partial month shall be prorated on a daily basis.`,
      ],
    },
    costArticle,
    {
      heading: "ARTICLE 6 - SECURITY DEPOSIT",
      paragraphs: [
        `6.1 Deposit. Upon execution of this Lease (or as otherwise agreed), Tenant shall deposit with Property Manager, on behalf of Owner, the sum of ${money(data.securityDepositRequired)} as a security deposit (the "Security Deposit").`,
        "6.2 Application. The Security Deposit secures Tenant's performance of this Lease and is not an advance payment of Rent. Owner (or Property Manager on Owner's behalf) may apply the Security Deposit to cure any default by Tenant. Upon surrender of the Premises and satisfaction of Tenant's obligations, any unused portion of the Security Deposit shall be returned in accordance with this Lease and applicable law.",
      ],
    },
    {
      heading: "ARTICLE 7 - LATE CHARGES",
      paragraphs: [
        `7.1 Grace Period. If any installment of Rent is not paid when due, Tenant shall have a grace period of ${data.graceDays} day(s) after the due date before a late charge accrues.`,
        `7.2 Late Fee. If Rent remains unpaid after the grace period, Tenant shall pay a late charge equal to ${data.lateFeePercent}% of the delinquent Base Rent (or the maximum amount permitted by applicable law, if less), plus any costs of collection to the extent permitted by law.`,
      ],
    },
    {
      heading: "ARTICLE 8 - MAINTENANCE, REPAIRS, AND ALTERATIONS",
      paragraphs: [
        "8.1 Tenant's Obligations. Tenant shall, at Tenant's sole cost, keep the Premises in good order, condition, and repair, ordinary wear and tear excepted, and shall promptly repair any damage caused by Tenant or Tenant's agents, employees, contractors, or invitees.",
        "8.2 Alterations. Tenant shall not make material alterations, additions, or improvements to the Premises without Owner's prior written consent (which may be granted or withheld by Property Manager on Owner's behalf), except as this Lease expressly permits. Approved alterations shall be performed in a good and workmanlike manner and in compliance with applicable law.",
        "8.3 Owner's Obligations. Except as otherwise allocated under Article 5 of this Lease, Owner shall maintain the structural portions of the Building and the common areas in a commercially reasonable condition, which maintenance may be performed by Property Manager.",
      ],
    },
    {
      heading: "ARTICLE 9 - INSURANCE AND INDEMNITY",
      paragraphs: [
        "9.1 Tenant Insurance. Tenant shall maintain commercial general liability insurance and such other coverages as Owner may reasonably require, in amounts and with carriers reasonably acceptable to Owner, naming Owner and Property Manager as additional insureds as to liability arising from Tenant's use of the Premises.",
        "9.2 Indemnity. To the fullest extent permitted by law, Tenant shall indemnify, defend, and hold Owner and Property Manager harmless from and against claims, damages, losses, and expenses arising from Tenant's use or occupancy of the Premises or Tenant's breach of this Lease, except to the extent caused by Owner's or Property Manager's gross negligence or willful misconduct.",
      ],
    },
    {
      heading: "ARTICLE 10 - DEFAULT AND REMEDIES",
      paragraphs: [
        "10.1 Events of Default. The following shall constitute events of default: (a) failure to pay Rent when due, after any applicable notice and cure period; (b) failure to perform any non-monetary obligation after written notice and a commercially reasonable cure period; (c) abandonment of the Premises; and (d) any other event this Lease designates as a default.",
        "10.2 Remedies. Upon an event of default, Owner (or Property Manager on Owner's behalf) may exercise any remedy available at law or in equity, including termination of this Lease, recovery of possession, and recovery of damages, without limiting any other right or remedy. Waiver of one default shall not constitute waiver of any subsequent default.",
      ],
    },
    {
      heading: "ARTICLE 11 - MISCELLANEOUS",
      paragraphs: [
        "11.1 Entire Agreement. This Lease, including any exhibits and amendments, constitutes the entire agreement between Owner and Tenant concerning the Premises and supersedes all prior negotiations and agreements relating thereto.",
        "11.2 Amendments. No amendment of this Lease shall be binding unless executed in writing by Owner and Tenant. Property Manager may execute amendments on Owner's behalf if authorized in writing by Owner.",
        "11.3 Governing Law. This Lease shall be governed by the laws of the State in which the Premises are located, without regard to conflicts-of-law principles.",
        "11.4 Counterparts. This Lease may be executed in counterparts, each of which shall be deemed an original, and all of which together shall constitute one and the same instrument.",
      ],
    },
    {
      heading: "IN WITNESS WHEREOF",
      paragraphs: [
        "the parties have executed this Lease as of the Commencement Date first written above.",
        "",
        "OWNER:",
        `${ownerName}`,
        "By: _________________________________ Date: ______________",
        "Name/Title: __________________________",
        "",
        "TENANT:",
        `${tenantName}`,
        "By: _________________________________ Date: ______________",
        "Name/Title: __________________________",
        "",
        "ACKNOWLEDGED AS TO PROPERTY MANAGER AUTHORITY:",
        "Harborline Commercial Management, Property Manager",
        "By: _________________________________ Date: ______________",
        "Name/Title: __________________________",
      ],
    },
  ];
}
