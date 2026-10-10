import type { SourceKind, SourceRecord } from "./types";

/**
 * Source registry.
 *
 * `lastCheckedAt` is set ONLY where a person or tool actually read the source
 * on that date. `lastVerifiedAt` is a human confirmation and is left null
 * unless a dated human check exists — automation never sets it. A reachable
 * page is not a verified page.
 *
 * Priority (lower wins in a conflict): notification 1 → service page 2 →
 * form 3 → FAQ/home/portal/helpline 4.
 */

const PRIORITY: Record<SourceKind, 1 | 2 | 3 | 4> = {
  notification: 1,
  service_page: 2,
  form: 3,
  faq: 4,
  portal: 4,
  home: 4,
  helpline: 4,
};

type SourceInput = Omit<SourceRecord, "priority" | "official" | "lastVerifiedAt"> & {
  official?: boolean;
  lastVerifiedAt?: string | null;
};

function source(input: SourceInput): SourceRecord {
  return {
    official: true,
    lastVerifiedAt: null,
    ...input,
    priority: PRIORITY[input.kind],
  };
}

const RESEARCH_PASS = "2026-08-30";
const OWNER_BRIEF = "Supplied in the project owner's brief (Oct 2026) as current official data.";

export const SOURCES: SourceRecord[] = [
  // ---- NADRA -------------------------------------------------------------
  source({
    id: "nadra.site",
    title: "NADRA — Official site",
    url: "https://www.nadra.gov.pk",
    agencyId: "nadra",
    jurisdictionId: "federal",
    kind: "home",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: RESEARCH_PASS,
    basis:
      "Official NADRA domain; reachability checked in the Raasta research pass of 30 Aug 2026.",
  }),
  source({
    id: "nadra.fee-structure",
    title: "NADRA — Fee structure",
    url: "https://www.nadra.gov.pk",
    agencyId: "nadra",
    jurisdictionId: "federal",
    kind: "service_page",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: null,
    basis: `${OWNER_BRIEF} Amounts also match news reports of NADRA's fee notification, read 7 Oct 2026 (corroboration only).`,
    notes:
      "NADRA's own pages block automated checking, so Raasta cannot re-read this page itself. A direct deep link to the fee page is not on file.",
  }),
  source({
    id: "nadra.helpline",
    title: "NADRA helpline 051-111-786-100",
    url: "tel:+9251111786100",
    agencyId: "nadra",
    jurisdictionId: "federal",
    kind: "helpline",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: RESEARCH_PASS,
    basis: "Helpline number carried from the Raasta research pass of 30 Aug 2026.",
  }),

  // ---- DGI&P -------------------------------------------------------------
  source({
    id: "dgip.ordinary-passport",
    title: "DGI&P — Ordinary passport (fees & processing time)",
    url: "https://dgip.gov.pk/passport/ordinary-passport.php",
    agencyId: "dgip",
    jurisdictionId: "federal",
    kind: "service_page",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    basis:
      "Official DGI&P page. Normal/urgent MRP fees effective 07-03-2024 and fast-track fees effective 08-05-2024 were read on 7 Oct 2026 (36-page rows); full matrix supplied in the owner's brief.",
  }),
  source({
    id: "dgip.faq",
    title: "DGI&P — Passport FAQ",
    url: "https://dgip.gov.pk/faq/faq.php",
    agencyId: "dgip",
    jurisdictionId: "federal",
    kind: "faq",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    basis: "Official DGI&P FAQ, read 7 Oct 2026.",
  }),
  source({
    id: "dgip.online-mrp",
    title: "DGI&P — Online passport renewal portal",
    url: "https://onlinemrp.dgip.gov.pk",
    agencyId: "dgip",
    jurisdictionId: "federal",
    kind: "portal",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: null,
    basis:
      "Named as the online renewal portal on the official DGI&P FAQ page (read 7 Oct 2026); portal itself not opened by Raasta.",
  }),
  source({
    id: "dgip.helpline",
    title: "DGI&P helpline",
    url: "tel:+9251111344777",
    agencyId: "dgip",
    jurisdictionId: "federal",
    kind: "helpline",
    sourceId: null,
    verificationStatus: "needs_confirmation",
    lastCheckedAt: RESEARCH_PASS,
    basis: "Number carried from the 30 Aug 2026 research pass; not re-confirmed since.",
    notes: "Confirm the number on dgip.gov.pk before relying on it.",
  }),

  // ---- Islamabad Excise & ICT Administration ---------------------------------
  source({
    id: "ict-excise.site",
    title: "Islamabad Excise & Taxation — Official site",
    url: "https://islamabadexcise.gov.pk",
    agencyId: "ict-excise",
    jurisdictionId: "ict",
    kind: "home",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: null,
    basis: `${OWNER_BRIEF} The site disallows automated access, so Raasta cannot re-read it.`,
    notes:
      "Provides online vehicle services, a fee calculator, token tax services and contact details.",
  }),
  source({
    id: "ict-excise.transfer-fee-notification",
    title: "ICT — Revised vehicle transfer fees (effective 14 Apr 2025)",
    url: "https://islamabadexcise.gov.pk",
    agencyId: "ict-excise",
    jurisdictionId: "ict",
    kind: "notification",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: null,
    effectiveFrom: "2025-04-14",
    basis: `${OWNER_BRIEF} Amounts also match multiple news reports of the notification dated 11 Apr 2025, read 7 Oct 2026 (corroboration only).`,
    notes: "A direct link to the notification PDF is not on file; the link opens the Excise site.",
  }),
  source({
    id: "ict-admin.vehicle-transfer",
    title: "ICT Administration — Vehicle transfer service page",
    url: "https://ictadministration.gov.pk/vehicle-transfer/",
    agencyId: "ict-admin",
    jurisdictionId: "ict",
    kind: "service_page",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: "2026-10-07",
    basis: "Official ICT Administration page, read in full on 7 Oct 2026.",
    notes:
      "This page still lists an older fee range (PKR 1,200–3,000). Raasta does NOT use that line: the newer notification effective 14 Apr 2025 supersedes it.",
  }),
  source({
    id: "ict-admin.transfer-form",
    title: "ICT Administration — Transfer of Ownership form (.doc)",
    url: "https://ictadministration.gov.pk/wordpress/wp-content/uploads/Transfer-of-Ownership-Form.doc",
    agencyId: "ict-admin",
    jurisdictionId: "ict",
    kind: "form",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: null,
    basis:
      "Linked from the official ICT Administration vehicle transfer page (read 7 Oct 2026); the file itself was not opened.",
    notes: "The page asks for legal-size paper when printing.",
  }),

  // ---- Other agencies (carried from the 30 Aug 2026 research pass) --------------
  source({
    id: "fbr.site",
    title: "FBR — Official site",
    url: "https://www.fbr.gov.pk",
    agencyId: "fbr",
    jurisdictionId: "federal",
    kind: "home",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: RESEARCH_PASS,
    basis: "Official FBR domain; reachability checked 30 Aug 2026.",
  }),
  source({
    id: "ict-police.site",
    title: "Islamabad Police — Official site",
    url: "https://islamabadpolice.gov.pk",
    agencyId: "ict-police",
    jurisdictionId: "ict",
    kind: "home",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: RESEARCH_PASS,
    basis: "Official Islamabad Police domain; reachability checked 30 Aug 2026.",
  }),
  source({
    id: "ict-admin.site",
    title: "ICT Administration — Official site",
    url: "https://ictadministration.gov.pk",
    agencyId: "ict-admin",
    jurisdictionId: "ict",
    kind: "home",
    sourceId: null,
    verificationStatus: "official_source",
    lastCheckedAt: RESEARCH_PASS,
    basis: "Official ICT Administration domain; reachability checked 30 Aug 2026.",
  }),
];

const BY_ID = new Map(SOURCES.map((s) => [s.id, s]));

export function getSource(id: string | null | undefined): SourceRecord | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** When two sources disagree: lower priority number wins; ties go to the later effective date. */
export function preferSource(a: SourceRecord, b: SourceRecord): SourceRecord {
  if (a.priority !== b.priority) return a.priority < b.priority ? a : b;
  return (a.effectiveFrom ?? "") >= (b.effectiveFrom ?? "") ? a : b;
}
