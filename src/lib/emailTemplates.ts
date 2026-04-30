export interface EmailTemplateContext {
  documentId: string;
  clientName: string;
  clientCompany: string;
  contactName: string;
  toEmail: string;
  sentAt: string;
  naam?: string;
  factuurnummer?: string;
  factuurdatum?: string;
  vervaldatum?: string;
  bedrag?: string;
  adres?: string;
  email?: string;
  telefoon?: string;
  kvk?: string;
  btw?: string;
}

export function renderEmailTemplate(template: string, context: EmailTemplateContext): string {
  const tokenMap: Record<string, string> = {
    documentId: context.documentId,
    clientName: context.clientName,
    clientCompany: context.clientCompany,
    contactName: context.contactName,
    toEmail: context.toEmail,
    sentAt: context.sentAt,
    naam: context.naam ?? context.clientName ?? "",
    factuurnummer: context.factuurnummer ?? context.documentId ?? "",
    factuurdatum: context.factuurdatum ?? "",
    vervaldatum: context.vervaldatum ?? "",
    bedrag: context.bedrag ?? "",
    adres: context.adres ?? "",
    email: context.email ?? "",
    telefoon: context.telefoon ?? "",
    kvk: context.kvk ?? "",
    btw: context.btw ?? "",
  };
  const rendered = Object.entries(tokenMap).reduce((acc, [key, value]) => {
    const singleBrace = new RegExp(`\\{${key}\\}`, "g");
    const doubleBrace = new RegExp(`\\{\\{${key}\\}\\}`, "g");
    return acc.replace(singleBrace, value).replace(doubleBrace, value);
  }, template);
  // Remove unresolved placeholders so recipients never see {placeholder} tokens.
  return rendered
    .replace(/\{\{[^{}]+\}\}/g, "")
    .replace(/\{[a-zA-Z][a-zA-Z0-9]*\}/g, "");
}
