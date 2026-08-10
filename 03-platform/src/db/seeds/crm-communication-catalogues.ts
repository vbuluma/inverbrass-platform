/** Default CRM Communication channel catalogue — BP-004 / IP-08 */

export const crmCommunicationChannels = [
  {
    code: "EMAIL",
    name: "Email",
    requiresConsentOutbound: true,
    displayOrder: 10,
  },
  {
    code: "PHONE",
    name: "Phone",
    requiresConsentOutbound: false,
    displayOrder: 20,
  },
  {
    code: "SMS",
    name: "SMS",
    requiresConsentOutbound: true,
    displayOrder: 30,
  },
  {
    code: "WHATSAPP",
    name: "WhatsApp",
    requiresConsentOutbound: true,
    displayOrder: 40,
  },
  {
    code: "LETTER",
    name: "Letter",
    requiresConsentOutbound: false,
    displayOrder: 50,
  },
  {
    code: "IN_PERSON",
    name: "In-person",
    requiresConsentOutbound: false,
    displayOrder: 60,
  },
] as const;
