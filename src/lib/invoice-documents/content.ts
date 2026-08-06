import {
  formatInvoiceDisplayDate,
  formatInvoiceLineDescription,
  formatInvoiceMoney,
  type InvoiceDocumentData,
} from "./types";

export function buildInvoiceDocumentSections(data: InvoiceDocumentData) {
  const billTo = [
    data.tenantCompany,
    data.tenantContact ? `Attn: ${data.tenantContact}` : null,
    data.tenantEmail,
  ]
    .filter(Boolean)
    .join("\n");

  const propertyBlock = [data.propertyName, data.propertyAddress]
    .filter(Boolean)
    .join("\n");

  return {
    title: "INVOICE",
    meta: [
      `Invoice Number: ${data.invoiceNumber}`,
      `Issue Date: ${formatInvoiceDisplayDate(data.issueDate)}`,
      `Due Date: ${formatInvoiceDisplayDate(data.dueDate)}`,
      `Status: ${data.status.replaceAll("_", " ")}`,
    ],
    from: [
      "Harborline Commercial Management",
      "As agent for the Property Owner",
      "Chicago, IL",
    ],
    billTo: billTo || data.tenantCompany,
    property: propertyBlock || data.propertyName,
    lines: data.lines.map((line) => ({
      description: formatInvoiceLineDescription(line.description),
      amountLabel: formatInvoiceMoney(line.amount),
    })),
    totals: [
      `Total: ${formatInvoiceMoney(data.total)}`,
      `Amount Paid: ${formatInvoiceMoney(data.amountPaid)}`,
      `Balance Due: ${formatInvoiceMoney(data.balanceDue)}`,
    ],
    disputeReason: data.disputeReason,
    footer:
      "Remit payment through the Harborline Tenant Portal. Collections are received by Harborline Commercial Management as agent for the Owner.",
  };
}
