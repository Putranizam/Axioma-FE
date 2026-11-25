export interface ConversationCheckpoint {
  summary: string;
  goal: string;
  progress: string;
  decisions: string[];
  blockers: string[];
  nextStep: string;
  updatedAt?: string;
}

export interface DecisionJournalItem {
  id: string;
  decision: string;
  reason: string;
  alternatives: string[];
  risks: string[];
  date: string;
}

export interface ChatContextState {
  checkpoint: ConversationCheckpoint | null;
  contextCorrection: string;
  decisions: DecisionJournalItem[];
}

const CONTEXT_STORAGE_PREFIX = "axioma_ctx_";

export function loadChatContextState(chatId?: string | null): ChatContextState {
  if (typeof window === "undefined" || !chatId) {
    return { checkpoint: null, contextCorrection: "", decisions: [] };
  }
  try {
    const raw = window.localStorage.getItem(`${CONTEXT_STORAGE_PREFIX}${chatId}`);
    if (!raw) return { checkpoint: null, contextCorrection: "", decisions: [] };
    const parsed = JSON.parse(raw) as Partial<ChatContextState>;
    const decisions: DecisionJournalItem[] = Array.isArray(parsed.decisions)
      ? parsed.decisions
          .filter(
            (d): d is DecisionJournalItem =>
              Boolean(d && typeof d === "object" && typeof d.decision === "string" && d.decision.trim())
          )
          .map((d, idx) => ({
            id: typeof d.id === "string" && d.id ? d.id : `dec-${idx}`,
            decision: d.decision.trim(),
            reason: typeof d.reason === "string" ? d.reason.trim() : "",
            alternatives: Array.isArray(d.alternatives)
              ? d.alternatives.filter((a): a is string => typeof a === "string" && Boolean(a.trim()))
              : [],
            risks: Array.isArray(d.risks)
              ? d.risks.filter((r): r is string => typeof r === "string" && Boolean(r.trim()))
              : [],
            date: typeof d.date === "string" ? d.date : "",
          }))
      : [];

    return {
      checkpoint:
        parsed.checkpoint && typeof parsed.checkpoint === "object"
          ? {
              summary: typeof parsed.checkpoint.summary === "string" ? parsed.checkpoint.summary : "",
              goal: typeof parsed.checkpoint.goal === "string" ? parsed.checkpoint.goal : "",
              progress: typeof parsed.checkpoint.progress === "string" ? parsed.checkpoint.progress : "",
              decisions: Array.isArray(parsed.checkpoint.decisions)
                ? parsed.checkpoint.decisions.filter((d): d is string => typeof d === "string" && Boolean(d.trim()))
                : [],
              blockers: Array.isArray(parsed.checkpoint.blockers)
                ? parsed.checkpoint.blockers.filter((b): b is string => typeof b === "string" && Boolean(b.trim()))
                : [],
              nextStep: typeof parsed.checkpoint.nextStep === "string" ? parsed.checkpoint.nextStep : "",
              updatedAt: typeof parsed.checkpoint.updatedAt === "string" ? parsed.checkpoint.updatedAt : undefined,
            }
          : null,
      contextCorrection:
        typeof parsed.contextCorrection === "string" ? parsed.contextCorrection : "",
      decisions,
    };
  } catch {
    return { checkpoint: null, contextCorrection: "", decisions: [] };
  }
}

export function saveChatContextState(
  chatId: string | null | undefined,
  state: ChatContextState
): void {
  if (typeof window === "undefined" || !chatId) return;
  try {
    const hasContent = hasActiveChatContext(state);
    if (!hasContent) {
      window.localStorage.removeItem(`${CONTEXT_STORAGE_PREFIX}${chatId}`);
    } else {
      window.localStorage.setItem(
        `${CONTEXT_STORAGE_PREFIX}${chatId}`,
        JSON.stringify(state)
      );
    }
  } catch {
    // Ignore storage quota/privacy mode errors
  }
}

export function hasActiveChatContext(
  state: ChatContextState | null | undefined
): boolean {
  if (!state) return false;
  const hasCorrection = Boolean(state.contextCorrection && state.contextCorrection.trim());
  const hasDecisions = Array.isArray(state.decisions) && state.decisions.length > 0;
  const cp = state.checkpoint;
  const hasCheckpoint = Boolean(
    cp &&
      (cp.summary?.trim() ||
        cp.goal?.trim() ||
        cp.progress?.trim() ||
        cp.nextStep?.trim() ||
        (cp.decisions && cp.decisions.length > 0) ||
        (cp.blockers && cp.blockers.length > 0))
  );
  return hasCheckpoint || hasCorrection || hasDecisions;
}
