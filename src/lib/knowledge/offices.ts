import type { ActionRecord, OfficeRecord } from "./types";

const H9_ADDRESS = "Adjacent to HEC Building, Service Road, Sector H-9, Islamabad";

export const OFFICES: OfficeRecord[] = [
  {
    id: "vehicle-transfer.ict.office.h9",
    serviceId: "vehicle-transfer",
    jurisdictionId: "ict",
    name: {
      en: "Director (Excise & Taxation), Islamabad",
      ur: "ڈائریکٹر (ایکسائز اینڈ ٹیکسیشن)، اسلام آباد",
      roman: "Director (Excise & Taxation), Islamabad",
    },
    address: H9_ADDRESS,
    city: "Islamabad",
    hours: {
      en: "Monday – Friday, 08:00 AM – 01:30 PM",
      ur: "پیر تا جمعہ، صبح 08:00 تا دوپہر 01:30",
      roman: "Peer se Jumma, subah 08:00 se dopehar 01:30",
    },
    phone: null,
    email: null,
    sourceId: "ict-admin.vehicle-transfer",
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    lastVerifiedAt: null,
    basis:
      "Address and timings on the official ICT Administration vehicle transfer page, read 7 Oct 2026. No phone number is listed there.",
    notes:
      "Temporary extended hours announced in April 2026 for motorcycle transfers were time-limited and are not shown here.",
  },
];

/** Directions are derived from a verified address — Raasta does not invent coordinates. */
export function directionsUrl(office: OfficeRecord): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${office.address}`)}`;
}

type A = Pick<
  ActionRecord,
  "kind" | "label" | "url" | "sourceId" | "verificationStatus" | "basis"
> & {
  key: string;
  serviceId: string;
  jurisdictionId: ActionRecord["jurisdictionId"];
  lastCheckedAt?: string | null;
};

function action(a: A): ActionRecord {
  return {
    id: `${a.serviceId}.${a.jurisdictionId}.action.${a.key}`,
    serviceId: a.serviceId,
    jurisdictionId: a.jurisdictionId,
    kind: a.kind,
    label: a.label,
    url: a.url,
    sourceId: a.sourceId,
    verificationStatus: a.verificationStatus,
    lastCheckedAt: a.lastCheckedAt ?? null,
    lastVerifiedAt: null,
    basis: a.basis,
  };
}

export const ACTIONS: ActionRecord[] = [
  // ---- Vehicle transfer (ICT) -----------------------------------------------
  action({
    key: "excise-site",
    serviceId: "vehicle-transfer",
    jurisdictionId: "ict",
    kind: "open_portal",
    label: {
      en: "Open Islamabad Excise",
      ur: "اسلام آباد ایکسائز کھولیں",
      roman: "Islamabad Excise kholein",
    },
    url: "https://islamabadexcise.gov.pk",
    sourceId: "ict-excise.site",
    verificationStatus: "official_source",
    basis:
      "Official Excise site, which offers online vehicle services, a fee calculator and token tax services.",
  }),
  action({
    key: "service-page",
    serviceId: "vehicle-transfer",
    jurisdictionId: "ict",
    kind: "open_page",
    label: {
      en: "Read the official transfer page",
      ur: "سرکاری ٹرانسفر صفحہ پڑھیں",
      roman: "Official transfer page parhein",
    },
    url: "https://ictadministration.gov.pk/vehicle-transfer/",
    sourceId: "ict-admin.vehicle-transfer",
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    basis: "Official ICT Administration service page.",
  }),
  action({
    key: "transfer-form",
    serviceId: "vehicle-transfer",
    jurisdictionId: "ict",
    kind: "download_form",
    label: {
      en: "Download the official transfer form",
      ur: "سرکاری ٹرانسفر فارم ڈاؤن لوڈ کریں",
      roman: "Official transfer form download karein",
    },
    url: "https://ictadministration.gov.pk/wordpress/wp-content/uploads/Transfer-of-Ownership-Form.doc",
    sourceId: "ict-admin.transfer-form",
    verificationStatus: "official_source",
    basis: "Linked from the official ICT Administration page.",
  }),
  action({
    key: "office",
    serviceId: "vehicle-transfer",
    jurisdictionId: "ict",
    kind: "find_office",
    label: {
      en: "Get directions to the office",
      ur: "دفتر کے لیے راستہ دیکھیں",
      roman: "Office ka raasta dekhein",
    },
    url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(H9_ADDRESS)}`,
    sourceId: "ict-admin.vehicle-transfer",
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    basis: "Map search built from the address on the official ICT Administration page.",
  }),

  // ---- CNIC ----------------------------------------------------------------
  action({
    key: "nadra-site",
    serviceId: "cnic",
    jurisdictionId: "federal",
    kind: "open_portal",
    label: { en: "Open NADRA", ur: "نادرا کھولیں", roman: "NADRA kholein" },
    url: "https://www.nadra.gov.pk",
    sourceId: "nadra.site",
    verificationStatus: "official_source",
    lastCheckedAt: "2026-08-30",
    basis: "Official NADRA site, where the PakID app and the fee structure are published.",
  }),
  action({
    key: "helpline",
    serviceId: "cnic",
    jurisdictionId: "federal",
    kind: "call",
    label: {
      en: "Call NADRA 051-111-786-100",
      ur: "نادرا کو کال کریں 051-111-786-100",
      roman: "NADRA ko call karein 051-111-786-100",
    },
    url: "tel:+9251111786100",
    sourceId: "nadra.helpline",
    verificationStatus: "official_source",
    lastCheckedAt: "2026-08-30",
    basis: "NADRA helpline from the 30 Aug 2026 research pass.",
  }),

  // ---- Passport ------------------------------------------------------------
  action({
    key: "online-renewal",
    serviceId: "passport",
    jurisdictionId: "federal",
    kind: "open_portal",
    label: {
      en: "Open DGI&P online renewal",
      ur: "ڈی جی آئی اینڈ پی آن لائن تجدید کھولیں",
      roman: "DGI&P online renewal kholein",
    },
    url: "https://onlinemrp.dgip.gov.pk",
    sourceId: "dgip.online-mrp",
    verificationStatus: "official_source",
    basis: "Online renewal portal named on the official DGI&P FAQ.",
  }),
  action({
    key: "fees-page",
    serviceId: "passport",
    jurisdictionId: "federal",
    kind: "open_page",
    label: {
      en: "View official fee schedule",
      ur: "سرکاری فیس شیڈول دیکھیں",
      roman: "Official fee schedule dekhein",
    },
    url: "https://dgip.gov.pk/passport/ordinary-passport.php",
    sourceId: "dgip.ordinary-passport",
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    basis: "Official DGI&P ordinary-passport page.",
  }),
  action({
    key: "helpline",
    serviceId: "passport",
    jurisdictionId: "federal",
    kind: "call",
    label: {
      en: "Call DGI&P 051-111-344-777",
      ur: "ڈی جی آئی اینڈ پی کو کال کریں 051-111-344-777",
      roman: "DGI&P ko call karein 051-111-344-777",
    },
    url: "tel:+9251111344777",
    sourceId: "dgip.helpline",
    verificationStatus: "needs_confirmation",
    lastCheckedAt: "2026-08-30",
    basis: "Number not re-confirmed since the 30 Aug 2026 research pass.",
  }),

  // ---- Legacy services: open the official site only -----------------------------
  ...(
    [
      ["birth-certificate", "federal", "nadra.site", "https://www.nadra.gov.pk", "Open NADRA"],
      ["ntn-tax-filing", "federal", "fbr.site", "https://www.fbr.gov.pk", "Open FBR"],
      [
        "police-character-certificate",
        "ict",
        "ict-police.site",
        "https://islamabadpolice.gov.pk",
        "Open Islamabad Police",
      ],
      [
        "domicile",
        "ict",
        "ict-admin.site",
        "https://ictadministration.gov.pk",
        "Open ICT Administration",
      ],
    ] as const
  ).map(([serviceId, jurisdictionId, sourceId, url, label]) =>
    action({
      key: "site",
      serviceId,
      jurisdictionId,
      kind: "open_portal",
      label: { en: label },
      url,
      sourceId,
      verificationStatus: "official_source",
      lastCheckedAt: "2026-08-30",
      basis: "Official agency site; reachability checked 30 Aug 2026.",
    }),
  ),
];
