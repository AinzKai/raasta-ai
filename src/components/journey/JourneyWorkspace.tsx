import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MutableRefObject,
  type ReactNode,
} from "react";

import {
  AutosaveGate,
  EMPTY_STATE,
  type JourneyInput,
  type JourneyState,
  type SavedJourney,
} from "@/lib/journey";
import { KNOWLEDGE_VERSION } from "@/lib/knowledge";
import { toSaved } from "@/hooks/useJourneys";
import { DocumentChecker } from "./DocumentChecker";
import { JourneyView, type SaveStatus } from "./JourneyView";

type Props = {
  initialInput: JourneyInput;
  /** When this changes (same service), the journey keeps its progress and adopts the new answers. */
  externalInput?: JourneyInput;
  initialState?: JourneyState;
  /** A previously saved record (resumes + autosaves into it). */
  saved?: SavedJourney | null;
  focus?: "journey" | "fees" | "documents";
  banner?: ReactNode;
  footer?: ReactNode;
  /** Persist: returns where it was saved. If omitted, the journey cannot be saved. */
  persist?: (saved: SavedJourney) => Promise<"saved-local" | "saved-account">;
  /** Save automatically on every change (demo mode). */
  autosave?: boolean;
  onRestart?: () => void;
  /**
   * Lets the parent write any change still waiting on the autosave debounce
   * right now (e.g. before it copies the saved record somewhere else).
   */
  flushRef?: MutableRefObject<(() => void) | null>;
};

/**
 * Owns the editable state of one journey and its save lifecycle. Once a
 * journey has been saved, every change is saved again (debounced).
 */
export function JourneyWorkspace({
  initialInput,
  externalInput,
  initialState,
  saved: initialSaved = null,
  focus,
  banner,
  footer,
  persist,
  autosave,
  onRestart,
  flushRef,
}: Props) {
  const [input, setInput] = useState(initialInput);
  const [state, setState] = useState<JourneyState>(initialState ?? EMPTY_STATE);
  const [saved, setSaved] = useState<SavedJourney | null>(initialSaved);
  const [status, setStatus] = useState<SaveStatus>(initialSaved ? "saved-local" : "unsaved");
  // What is already persisted (or what the journey started with). Autosave only
  // fires when the content differs, so a re-run effect can never write an
  // untouched record. See AutosaveGate.
  const gate = useRef<AutosaveGate | null>(null);
  if (!gate.current) gate.current = new AutosaveGate(initialInput, initialState ?? EMPTY_STATE);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (externalInput) setInput(externalInput);
  }, [externalInput]);

  const doSave = useCallback(async () => {
    if (!persist) return;
    setStatus("saving");
    try {
      const next = toSaved(input, state, saved ?? undefined);
      const where = await persist(next);
      gate.current?.markPersisted(input, state);
      setSaved(next);
      setStatus(where);
    } catch {
      setStatus("error");
    }
  }, [persist, input, state, saved]);

  const latest = useRef({ doSave, input, state });
  latest.current = { doSave, input, state };
  useEffect(() => {
    if (!flushRef) return;
    flushRef.current = () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      timer.current = null;
      const cur = latest.current;
      if (gate.current?.isDirty(cur.input, cur.state)) void cur.doSave();
    };
    return () => {
      flushRef.current = null;
    };
  }, [flushRef]);

  // Once saved (or in autosave mode) keep the record current.
  useEffect(() => {
    if (!persist || (!saved && !autosave)) return;
    if (!gate.current?.isDirty(input, state)) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void doSave(), 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, state]);

  return (
    <JourneyView
      input={input}
      state={state}
      onInputChange={setInput}
      onStateChange={setState}
      saveStatus={status}
      {...(persist ? { onSave: () => void doSave() } : {})}
      onRestart={() => {
        setState(EMPTY_STATE);
        onRestart?.();
      }}
      knowledgeStale={!!saved && saved.knowledgeVersion !== KNOWLEDGE_VERSION}
      {...(focus ? { focus } : {})}
      banner={banner}
      footer={footer}
      extras={<DocumentChecker serviceSlug={input.serviceId} />}
    />
  );
}
