import {
  collectSources,
  defaultJurisdiction,
  getActions,
  getFeesForService,
  getJurisdiction,
  getService,
  isJurisdictionId,
  isTrusted,
  isValidAnswer,
  nextClarifier,
  pick,
  supportsJurisdiction,
  type Answers,
  type JurisdictionId,
  type Lang,
} from "../knowledge";
import type { JourneyInput } from "../journey";
import { RouterOutputSchema, type Focus, type GroundedAnswer, type RouterOutput } from "./schema";

export type RoutingCheck =
  { ok: true; route: RouterOutput; rejected: string[] } | { ok: false; reasons: string[] };

/**
 * Validate a router output (from the model or the fallback) against the
 * knowledge layer. An unknown service is fatal (the model made it up);
 * unknown answer keys/values are simply dropped and reported.
 */
export function validateRouting(raw: unknown): RoutingCheck {
  const parsed = RouterOutputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      reasons: parsed.error.issues.map((i) => `${i.path.join(".") || "root"}: ${i.message}`),
    };
  }
  const route = parsed.data;
  const rejected: string[] = [];

  let serviceId = route.service_id;
  if (serviceId !== null && !getService(serviceId)) {
    return { ok: false, reasons: [`unknown service_id "${serviceId}"`] };
  }
  const service = serviceId ? getService(serviceId) : undefined;

  let jurisdictionId = route.jurisdiction_id;
  if (jurisdictionId !== null && !isJurisdictionId(jurisdictionId)) {
    rejected.push(`unknown jurisdiction_id "${jurisdictionId}"`);
    jurisdictionId = null;
  }

  const answers: Answers = {};
  for (const [key, value] of Object.entries(route.answers)) {
    if (!service) {
      rejected.push(`answer "${key}" given without a service`);
      continue;
    }
    if (isValidAnswer(service, key, value)) answers[key] = value;
    else rejected.push(`answer "${key}=${value}" is not a valid option`);
  }
  if (serviceId && !service) serviceId = null;

  return {
    ok: true,
    route: { ...route, service_id: serviceId, jurisdiction_id: jurisdictionId, answers },
    rejected,
  };
}

const JURISDICTION_ANSWER: Record<string, JurisdictionId | "other"> = {
  ict: "ict",
  punjab: "punjab",
  sindh: "sindh",
  kp: "kp",
  balochistan: "balochistan",
  other: "other",
};

/**
 * Turn a validated route into a grounded answer. Pure and deterministic.
 * Nothing here reads text from the model — only IDs that were validated.
 */
export function resolveAnswer(route: RouterOutput): GroundedAnswer {
  const language: Lang = route.language;

  if (route.topic === "off_topic") return { kind: "off_topic", language };
  if (route.topic === "complaint") return { kind: "complaint", language };

  const service = route.service_id ? getService(route.service_id) : undefined;
  if (!service) {
    if (route.topic === "fee" || route.topic === "documents") {
      return {
        kind: "not_verified",
        language,
        topic: route.topic === "fee" ? "fee" : "documents",
        serviceId: null,
        jurisdictionId: null,
        sourceIds: [],
      };
    }
    return { kind: "choose_service", language };
  }

  const { jurisdiction: jurisdictionAnswer, ...serviceAnswers } = route.answers;

  // ---- Jurisdiction is first-class: ask when it changes the answer. -----------
  let jurisdictionId: JurisdictionId | null = null;
  const stated =
    (route.jurisdiction_id && isJurisdictionId(route.jurisdiction_id)
      ? route.jurisdiction_id
      : null) ??
    (jurisdictionAnswer ? JURISDICTION_ANSWER[jurisdictionAnswer] : undefined) ??
    null;

  if (service.jurisdictionSensitive) {
    if (stated === null) {
      return {
        kind: "clarify",
        language,
        serviceId: service.id,
        clarifierKey: "jurisdiction",
        jurisdictionId: null,
        answers: serviceAnswers,
      };
    }
    if (stated === "other" || !supportsJurisdiction(service, stated)) {
      return {
        kind: "unsupported",
        language,
        serviceId: service.id,
        requestedJurisdiction: stated,
        supported: service.jurisdictions,
        sourceIds: collectSources(getActions(service.id, service.jurisdictions[0] ?? "federal"))
          .map((s) => s.id)
          .slice(0, 2),
      };
    }
    jurisdictionId = stated;
  } else {
    jurisdictionId = defaultJurisdiction(service);
  }

  if (jurisdictionId === null) return { kind: "choose_service", language };

  // ---- Fee / document questions answer only from trusted records. -------------
  if (route.topic === "fee") {
    const fees = getFeesForService(service.id, jurisdictionId);
    const trusted = fees.some((f) => f.amount !== null && isTrusted(f.verificationStatus));
    if (!trusted) {
      return {
        kind: "not_verified",
        language,
        topic: "fee",
        serviceId: service.id,
        jurisdictionId,
        sourceIds: collectSources(getActions(service.id, jurisdictionId)).map((s) => s.id),
      };
    }
  }

  const input: JourneyInput = { serviceId: service.id, jurisdictionId, answers: serviceAnswers };
  const focus: Focus =
    route.topic === "fee" ? "fees" : route.topic === "documents" ? "documents" : "journey";

  // A blocking clarifier that is still open? (Only jurisdiction today, handled above.)
  const blocking = nextClarifier(service, serviceAnswers, { blockingOnly: true });
  if (blocking && blocking.key !== "jurisdiction") {
    return {
      kind: "clarify",
      language,
      serviceId: service.id,
      clarifierKey: blocking.key,
      jurisdictionId,
      answers: serviceAnswers,
    };
  }

  return { kind: "journey", language, input, focus, dropped: [] };
}

export function describeJurisdiction(id: string, lang: Lang): string {
  const j = getJurisdiction(id);
  return j ? pick(j.name, lang) : id;
}
