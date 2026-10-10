import type { AgencyRecord } from "./types";

export const AGENCY_RECORDS: AgencyRecord[] = [
  {
    id: "nadra",
    name: "NADRA",
    fullName: "National Database & Registration Authority",
    officialDomain: "nadra.gov.pk",
  },
  {
    id: "dgip",
    name: "DGI&P",
    fullName: "Directorate General of Immigration & Passports, Ministry of Interior",
    officialDomain: "dgip.gov.pk",
  },
  {
    id: "ict-excise",
    name: "Islamabad Excise",
    fullName: "Excise & Taxation Department, Islamabad Capital Territory",
    officialDomain: "islamabadexcise.gov.pk",
  },
  {
    id: "ict-admin",
    name: "ICT Administration",
    fullName: "Islamabad Capital Territory Administration",
    officialDomain: "ictadministration.gov.pk",
  },
  {
    id: "fbr",
    name: "FBR",
    fullName: "Federal Board of Revenue",
    officialDomain: "fbr.gov.pk",
  },
  {
    id: "ict-police",
    name: "ICT Police",
    fullName: "Islamabad Capital Territory Police",
    officialDomain: "islamabadpolice.gov.pk",
  },
];

export function getAgency(id: string): AgencyRecord | undefined {
  return AGENCY_RECORDS.find((a) => a.id === id);
}
