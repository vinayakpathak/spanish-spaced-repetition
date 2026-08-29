export type CardStatus = "unseen" | "learning" | "review" | "mastered";

export interface CardExposure {
  /** Monotonic local identifier tying this observation to one comic session. */
  sessionId: number;
  comicId: string;
  displayedAtMs: number;
  /** Every reveal is retained, although the score uses one binary lapse. */
  openedAtMs: number[];
  /** Null while the learner is still working through the comic. */
  completedAtMs: number | null;
}

export interface CardHistory {
  exposures: CardExposure[];
  /** Weak aggregate imported from schema 3's capped, day-level event log. */
  legacyEvidence?: {
    displayCount: number;
    openCount: number;
  };
}

export interface ComicProgress {
  views: number;
  completions: number;
  lastViewedAtMs: number | null;
  lastCompletedAtMs: number | null;
}

export interface ActiveSession {
  sessionId: number;
  comicId: string;
  startedAtMs: number;
  cardIds: string[];
  /** De-duplicated summary; the exposure retains every open timestamp. */
  openedCardIds: string[];
}

export interface SrsState {
  schemaVersion: 4;
  nextSessionId: number;
  cards: Record<string, CardHistory>;
  comics: Record<string, ComicProgress>;
  activeSession: ActiveSession | null;
  lastCompletedComicId: string | null;
  /** Schema 3 stored at most 500 day-level events, which cannot be recovered. */
  historyCompleteness: "complete" | "legacy-bounded";
}

export interface ComicLike {
  id: string;
  cardIds: readonly string[];
  importance?: number | { score: number };
}

export interface SchedulerConfig {
  evidenceHalfLifeDays: number;
  untouchedPriorityIndex: number;
  priorEvidenceWeight: number;
  successStabilityGrowth: number;
  lapseStabilityMultiplier: number;
  minStabilityDays: number;
  maxLapseStabilityDays: number;
  maxStabilityDays: number;
  cardPriorityWeight: number;
  comicImportanceWeight: number;
}

export interface CardPriorityDiagnostics {
  cardId: string;
  /** Scheduling index in [0, 1], not a calibrated recall probability. */
  priorityIndex: number;
  /** Recency-weighted index of how often this card needed to be opened. */
  helpNeedIndex: number;
  /** Forgetting-curve index derived from time and learned stability. */
  forgettingRiskIndex: number;
  recentDisplayWeight: number;
  recentOpenWeight: number;
  stabilityDays: number | null;
  displayCount: number;
  completedDisplayCount: number;
  openCount: number;
  lastDisplayedAtMs: number | null;
  lastOpenedAtMs: number | null;
  lastObservedAtMs: number | null;
  status: CardStatus;
}

export interface RankedComic<T extends ComicLike> {
  comic: T;
  score: number;
  cardPrioritySum: number;
  normalizedCardPriority: number;
  importanceScore: number;
  normalizedImportance: number;
  cardPriorities: CardPriorityDiagnostics[];
}

export interface NextComicResult<T extends ComicLike> {
  comic: T;
  state: SrsState;
  ranking: RankedComic<T>;
  /** Exact SRS card IDs, ordered from highest to lowest current priority. */
  overlapCardIds: string[];
  reason: "priority" | "resume";
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_SCHEDULER_CONFIG: Readonly<SchedulerConfig> = {
  evidenceHalfLifeDays: 14,
  untouchedPriorityIndex: 0.35,
  priorEvidenceWeight: 1,
  successStabilityGrowth: 1.5,
  lapseStabilityMultiplier: 0.4,
  minStabilityDays: 0.25,
  maxLapseStabilityDays: 1,
  maxStabilityDays: 365,
  cardPriorityWeight: 0.8,
  comicImportanceWeight: 0.2,
};

const DEFAULT_COMIC_PROGRESS: Readonly<ComicProgress> = {
  views: 0,
  completions: 0,
  lastViewedAtMs: null,
  lastCompletedAtMs: null,
};

interface PriorityObservation {
  atMs: number;
  opened: boolean;
  order: number;
}

export function createSrsState(): SrsState {
  return {
    schemaVersion: 4,
    nextSessionId: 1,
    cards: {},
    comics: {},
    activeSession: null,
    lastCompletedComicId: null,
    historyCompleteness: "complete",
  };
}

function finiteTimestamp(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite, non-negative timestamp.`);
  }
  return value;
}

function uniqueStrings(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function configWithDefaults(
  partial?: Partial<SchedulerConfig>,
): SchedulerConfig {
  const config = { ...DEFAULT_SCHEDULER_CONFIG, ...partial };
  const positiveKeys: readonly (keyof SchedulerConfig)[] = [
    "evidenceHalfLifeDays",
    "priorEvidenceWeight",
    "successStabilityGrowth",
    "lapseStabilityMultiplier",
    "minStabilityDays",
    "maxLapseStabilityDays",
    "maxStabilityDays",
  ];
  for (const key of positiveKeys) {
    if (!Number.isFinite(config[key]) || config[key] <= 0) {
      throw new RangeError(`${key} must be greater than zero.`);
    }
  }
  for (const key of [
    "untouchedPriorityIndex",
    "cardPriorityWeight",
    "comicImportanceWeight",
  ] as const) {
    if (!Number.isFinite(config[key]) || config[key] < 0) {
      throw new RangeError(`${key} must be a finite, non-negative number.`);
    }
  }
  if (config.untouchedPriorityIndex > 1) {
    throw new RangeError("untouchedPriorityIndex cannot exceed one.");
  }
  if (config.maxLapseStabilityDays < config.minStabilityDays) {
    throw new RangeError(
      "maxLapseStabilityDays cannot be below minStabilityDays.",
    );
  }
  if (config.maxStabilityDays < config.maxLapseStabilityDays) {
    throw new RangeError(
      "maxStabilityDays cannot be below maxLapseStabilityDays.",
    );
  }
  if (config.cardPriorityWeight + config.comicImportanceWeight <= 0) {
    throw new RangeError("At least one comic score weight must be positive.");
  }
  return config;
}

export function getCardHistory(
  state: SrsState,
  cardId: string,
): CardHistory {
  return state.cards[cardId] ?? { exposures: [] };
}

export function getComicProgress(
  state: SrsState,
  comicId: string,
): ComicProgress {
  return state.comics[comicId] ?? { ...DEFAULT_COMIC_PROGRESS };
}

function observationsFor(history: CardHistory): PriorityObservation[] {
  const observations: PriorityObservation[] = [];
  let order = 0;
  for (const exposure of history.exposures) {
    if (exposure.openedAtMs.length > 0) {
      // Repeated toggles stay auditable but form one binary lapse. The latest
      // reveal carries its recency signal.
      observations.push({
        atMs: exposure.openedAtMs[exposure.openedAtMs.length - 1],
        opened: true,
        order,
      });
    } else if (exposure.completedAtMs !== null) {
      observations.push({
        atMs: exposure.completedAtMs,
        opened: false,
        order,
      });
    }
    order += 1;
  }
  return observations.sort(
    (left, right) => left.atMs - right.atMs || left.order - right.order,
  );
}

/** Score one exact SRS card from its timestamped binary exposure history. */
export function scoreCardPriority(
  state: SrsState,
  cardId: string,
  nowMs: number,
  partialConfig?: Partial<SchedulerConfig>,
): CardPriorityDiagnostics {
  const now = finiteTimestamp(nowMs, "nowMs");
  const config = configWithDefaults(partialConfig);
  const history = getCardHistory(state, cardId);
  const observations = observationsFor(history);

  const legacyDisplayCount = history.legacyEvidence?.displayCount ?? 0;
  const legacyOpenCount = history.legacyEvidence?.openCount ?? 0;
  // The old log was capped and had simulated-day rather than wall-clock
  // timestamps. Preserve its observed ratio as at most four weak samples;
  // never invent precise timestamps or let incomplete legacy data dominate.
  const legacyEvidenceWeight = Math.min(4, legacyDisplayCount * 0.25);
  const legacyOpenShare =
    legacyDisplayCount > 0 ? legacyOpenCount / legacyDisplayCount : 0;
  let recentOpenWeight = legacyEvidenceWeight * legacyOpenShare;
  let recentSuccessWeight = legacyEvidenceWeight * (1 - legacyOpenShare);
  for (const observation of observations) {
    const ageDays = Math.max(0, now - observation.atMs) / DAY_MS;
    const weight = 2 ** (-ageDays / config.evidenceHalfLifeDays);
    if (observation.opened) recentOpenWeight += weight;
    else recentSuccessWeight += weight;
  }
  const recentDisplayWeight = recentOpenWeight + recentSuccessWeight;
  const helpNeedIndex =
    (config.priorEvidenceWeight * config.untouchedPriorityIndex +
      recentOpenWeight) /
    (config.priorEvidenceWeight + recentDisplayWeight);

  let stabilityDays: number | null =
    legacyDisplayCount === 0
      ? null
      : legacyOpenCount > legacyDisplayCount - legacyOpenCount
        ? config.lapseStabilityMultiplier
        : 1;
  let previousAtMs: number | null = null;
  for (const observation of observations) {
    if (observation.opened) {
      const previousStability = stabilityDays ?? 1;
      stabilityDays = Math.max(
        config.minStabilityDays,
        Math.min(
          config.maxLapseStabilityDays,
          config.lapseStabilityMultiplier * previousStability,
        ),
      );
    } else if (stabilityDays === null) {
      stabilityDays = 1;
    } else if (previousAtMs === null) {
      // There is no trustworthy interval from aggregate legacy evidence to
      // the first timestamped success, so it earns no spacing growth.
      stabilityDays = Math.max(1, stabilityDays);
    } else {
      const gapDays = Math.max(0, observation.atMs - previousAtMs) / DAY_MS;
      const retrievability = 2 ** (-gapDays / stabilityDays);
      stabilityDays = Math.min(
        config.maxStabilityDays,
        stabilityDays *
          (1 + config.successStabilityGrowth * (1 - retrievability)),
      );
    }
    previousAtMs = observation.atMs;
  }

  const lastObservedAtMs = observations.at(-1)?.atMs ?? null;
  const forgettingRiskIndex =
    stabilityDays === null || lastObservedAtMs === null
      ? 0
      : 1 -
        2 **
          (-Math.max(0, now - lastObservedAtMs) /
            DAY_MS /
            stabilityDays);
  const hasEvidence = observations.length > 0 || legacyDisplayCount > 0;
  const priorityIndex =
    !hasEvidence
      ? config.untouchedPriorityIndex
      : 1 - (1 - helpNeedIndex) * (1 - forgettingRiskIndex);

  const openedTimestamps = history.exposures.flatMap(
    (exposure) => exposure.openedAtMs,
  );
  const completedDisplayCount =
    legacyDisplayCount +
    history.exposures.filter((exposure) => exposure.completedAtMs !== null)
      .length;
  const lastDisplayedAtMs = history.exposures.reduce<number | null>(
    (latest, exposure) =>
      latest === null
        ? exposure.displayedAtMs
        : Math.max(latest, exposure.displayedAtMs),
    null,
  );
  const lastOpenedAtMs = openedTimestamps.reduce<number | null>(
    (latest, openedAtMs) =>
      latest === null ? openedAtMs : Math.max(latest, openedAtMs),
    null,
  );
  const latestObservation = observations.at(-1);
  const status: CardStatus =
    !hasEvidence
      ? "unseen"
      : latestObservation?.opened ||
          (latestObservation === undefined &&
            legacyOpenCount > legacyDisplayCount - legacyOpenCount)
        ? "learning"
        : priorityIndex < 0.2
          ? "mastered"
          : "review";

  return {
    cardId,
    priorityIndex,
    helpNeedIndex,
    forgettingRiskIndex,
    recentDisplayWeight,
    recentOpenWeight,
    stabilityDays,
    displayCount: legacyDisplayCount + history.exposures.length,
    completedDisplayCount,
    openCount: legacyOpenCount + openedTimestamps.length,
    lastDisplayedAtMs,
    lastOpenedAtMs,
    lastObservedAtMs,
    status,
  };
}

export function getCardProgress(
  state: SrsState,
  cardId: string,
  nowMs: number,
  partialConfig?: Partial<SchedulerConfig>,
): CardPriorityDiagnostics {
  return scoreCardPriority(state, cardId, nowMs, partialConfig);
}

export function getRecentlyOpenedCardIds(
  state: SrsState,
  nowMs: number,
  windowMs = DAY_MS,
): string[] {
  const now = finiteTimestamp(nowMs, "nowMs");
  if (!Number.isFinite(windowMs) || windowMs < 0) {
    throw new RangeError("windowMs must be a finite, non-negative duration.");
  }
  const since = now - windowMs;
  return Object.entries(state.cards)
    .filter(([, history]) =>
      history.exposures.some((exposure) =>
        exposure.openedAtMs.some(
          (openedAtMs) => openedAtMs >= since && openedAtMs <= now,
        ),
      ),
    )
    .map(([cardId]) => cardId)
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Remove histories for exact card IDs that left the active curriculum. A
 * retained shared card keeps its evidence even if one source comic vanished.
 */
export function reconcileSrsState<T extends ComicLike>(
  state: SrsState,
  comics: readonly T[],
  nowMs: number,
): SrsState {
  const now = finiteTimestamp(nowMs, "nowMs");
  const comicById = new Map(comics.map((comic) => [comic.id, comic]));
  const allowedComicIds = new Set(comicById.keys());
  const allowedCardIds = new Set(
    comics.flatMap((comic) => uniqueStrings(comic.cardIds)),
  );
  const oldSession = state.activeSession;
  const activeComic = oldSession ? comicById.get(oldSession.comicId) : null;
  const activeCardIds = new Set(
    activeComic ? uniqueStrings(activeComic.cardIds) : [],
  );
  const activeSession =
    oldSession && activeComic
      ? {
          ...oldSession,
          cardIds: [...activeCardIds],
          openedCardIds: oldSession.openedCardIds.filter((cardId) =>
            activeCardIds.has(cardId),
          ),
        }
      : null;

  const cards: Record<string, CardHistory> = {};
  for (const [cardId, history] of Object.entries(state.cards)) {
    if (!allowedCardIds.has(cardId)) continue;
    const exposures = history.exposures.flatMap((exposure) => {
      if (exposure.completedAtMs !== null) return [exposure];
      if (
        activeSession !== null &&
        exposure.sessionId === activeSession.sessionId &&
        activeCardIds.has(cardId)
      ) {
        return [exposure];
      }
      // A reveal remains valid difficulty evidence even if its session or
      // comic disappeared. An unopened pending display has no outcome.
      const lastOpen = exposure.openedAtMs.at(-1);
      return lastOpen === undefined
        ? []
        : [{ ...exposure, completedAtMs: lastOpen }];
    });
    if (exposures.length > 0 || history.legacyEvidence) {
      cards[cardId] = { ...history, exposures };
    }
  }
  if (activeSession) {
    for (const cardId of activeSession.cardIds) {
      const history = cards[cardId] ?? { exposures: [] };
      const hasCurrentExposure = history.exposures.some(
        (exposure) => exposure.sessionId === activeSession.sessionId,
      );
      if (!hasCurrentExposure) {
        cards[cardId] = {
          ...history,
          exposures: [
            ...history.exposures,
            {
              sessionId: activeSession.sessionId,
              comicId: activeSession.comicId,
              displayedAtMs: now,
              openedAtMs: [],
              completedAtMs: null,
            },
          ],
        };
      }
    }
  }
  const comicsProgress = Object.fromEntries(
    Object.entries(state.comics).filter(([comicId]) =>
      allowedComicIds.has(comicId),
    ),
  );

  return {
    ...state,
    cards,
    comics: comicsProgress,
    activeSession,
    lastCompletedComicId:
      state.lastCompletedComicId &&
      allowedComicIds.has(state.lastCompletedComicId)
        ? state.lastCompletedComicId
        : null,
  };
}

export function startComic<T extends ComicLike>(
  state: SrsState,
  comic: T,
  nowMs: number,
): SrsState {
  const now = finiteTimestamp(nowMs, "nowMs");
  if (state.activeSession?.comicId === comic.id) return state;
  if (state.activeSession) {
    throw new Error("Complete the active comic before starting another one.");
  }

  const cardIds = uniqueStrings(comic.cardIds);
  const sessionId = state.nextSessionId;
  const cards = { ...state.cards };
  for (const cardId of cardIds) {
    const history = getCardHistory(state, cardId);
    cards[cardId] = {
      ...history,
      exposures: [
        ...history.exposures,
        {
          sessionId,
          comicId: comic.id,
          displayedAtMs: now,
          openedAtMs: [],
          completedAtMs: null,
        },
      ],
    };
  }
  const comicProgress = getComicProgress(state, comic.id);

  return {
    ...state,
    nextSessionId: sessionId + 1,
    cards,
    comics: {
      ...state.comics,
      [comic.id]: {
        ...comicProgress,
        views: comicProgress.views + 1,
        lastViewedAtMs: now,
      },
    },
    activeSession: {
      sessionId,
      comicId: comic.id,
      startedAtMs: now,
      cardIds,
      openedCardIds: [],
    },
  };
}

export function recordCardOpen(
  state: SrsState,
  cardId: string,
  nowMs: number,
): SrsState {
  const now = finiteTimestamp(nowMs, "nowMs");
  const session = state.activeSession;
  if (!session || !session.cardIds.includes(cardId)) return state;
  const history = state.cards[cardId];
  if (!history) return state;
  const exposureIndex = history.exposures.findIndex(
    (exposure) =>
      exposure.sessionId === session.sessionId &&
      exposure.completedAtMs === null,
  );
  if (exposureIndex < 0) return state;
  const exposure = history.exposures[exposureIndex];
  const lastOpen = exposure.openedAtMs.at(-1) ?? exposure.displayedAtMs;
  const openedAtMs = Math.max(now, exposure.displayedAtMs, lastOpen);
  const exposures = [...history.exposures];
  exposures[exposureIndex] = {
    ...exposure,
    openedAtMs: [...exposure.openedAtMs, openedAtMs],
  };

  return {
    ...state,
    cards: { ...state.cards, [cardId]: { ...history, exposures } },
    activeSession: {
      ...session,
      openedCardIds: session.openedCardIds.includes(cardId)
        ? session.openedCardIds
        : [...session.openedCardIds, cardId],
    },
  };
}

/** Backward-friendly name for the UI action that reveals an exact card. */
export const recordCardHelp = recordCardOpen;

export function completeComic(state: SrsState, nowMs: number): SrsState {
  const now = finiteTimestamp(nowMs, "nowMs");
  const session = state.activeSession;
  if (!session) return state;

  const cards = { ...state.cards };
  for (const cardId of session.cardIds) {
    const history = state.cards[cardId];
    if (!history) continue;
    const exposureIndex = history.exposures.findIndex(
      (exposure) =>
        exposure.sessionId === session.sessionId &&
        exposure.completedAtMs === null,
    );
    if (exposureIndex < 0) continue;
    const exposure = history.exposures[exposureIndex];
    const lastOpen = exposure.openedAtMs.at(-1) ?? exposure.displayedAtMs;
    const exposures = [...history.exposures];
    exposures[exposureIndex] = {
      ...exposure,
      completedAtMs: Math.max(now, exposure.displayedAtMs, lastOpen),
    };
    cards[cardId] = { ...history, exposures };
  }
  const comicProgress = getComicProgress(state, session.comicId);

  return {
    ...state,
    cards,
    comics: {
      ...state.comics,
      [session.comicId]: {
        ...comicProgress,
        completions: comicProgress.completions + 1,
        lastCompletedAtMs: Math.max(now, session.startedAtMs),
      },
    },
    activeSession: null,
    lastCompletedComicId: session.comicId,
  };
}

function comicImportance(comic: ComicLike): number {
  const raw =
    typeof comic.importance === "number"
      ? comic.importance
      : comic.importance?.score ?? 0;
  return Number.isFinite(raw) ? Math.max(0, raw) : 0;
}

export function rankComics<T extends ComicLike>(
  comics: readonly T[],
  state: SrsState,
  nowMs: number,
  partialConfig?: Partial<SchedulerConfig>,
): RankedComic<T>[] {
  const now = finiteTimestamp(nowMs, "nowMs");
  const config = configWithDefaults(partialConfig);
  const unnormalized = comics.map((comic) => {
    const cardPriorities = uniqueStrings(comic.cardIds)
      .map((cardId) => scoreCardPriority(state, cardId, now, config))
      .sort(
        (left, right) =>
          right.priorityIndex - left.priorityIndex ||
          left.cardId.localeCompare(right.cardId),
      );
    return {
      comic,
      cardPriorities,
      cardPrioritySum: cardPriorities.reduce(
        (sum, card) => sum + card.priorityIndex,
        0,
      ),
      importanceScore: comicImportance(comic),
    };
  });
  const maxCardPriority = Math.max(
    0,
    ...unnormalized.map((comic) => comic.cardPrioritySum),
  );
  const maxImportance = Math.max(
    0,
    ...unnormalized.map((comic) => comic.importanceScore),
  );
  const totalScoreWeight =
    config.cardPriorityWeight + config.comicImportanceWeight;

  return unnormalized
    .map((comic) => {
      const normalizedCardPriority =
        maxCardPriority > 0 ? comic.cardPrioritySum / maxCardPriority : 0;
      const normalizedImportance =
        maxImportance > 0 ? comic.importanceScore / maxImportance : 0;
      const score =
        (config.cardPriorityWeight * normalizedCardPriority +
          config.comicImportanceWeight * normalizedImportance) /
        totalScoreWeight;
      return {
        ...comic,
        score,
        normalizedCardPriority,
        normalizedImportance,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.cardPrioritySum - left.cardPrioritySum ||
        right.importanceScore - left.importanceScore ||
        left.comic.id.localeCompare(right.comic.id),
    );
}

function abandonMissingActiveSession(state: SrsState): SrsState {
  const session = state.activeSession;
  if (!session) return state;
  const cards: Record<string, CardHistory> = {};
  for (const [cardId, history] of Object.entries(state.cards)) {
    const exposures = history.exposures.flatMap((exposure) => {
      if (
        exposure.completedAtMs !== null ||
        exposure.sessionId !== session.sessionId
      ) {
        return [exposure];
      }
      const lastOpen = exposure.openedAtMs.at(-1);
      return lastOpen === undefined
        ? []
        : [{ ...exposure, completedAtMs: lastOpen }];
    });
    if (exposures.length > 0 || history.legacyEvidence) {
      cards[cardId] = { ...history, exposures };
    }
  }
  return { ...state, cards, activeSession: null };
}

export function selectNextComic<T extends ComicLike>(
  comics: readonly T[],
  state: SrsState,
  nowMs: number,
  partialConfig?: Partial<SchedulerConfig>,
): NextComicResult<T> {
  const now = finiteTimestamp(nowMs, "nowMs");
  if (comics.length === 0) {
    throw new Error("Cannot select a comic from an empty curriculum.");
  }

  if (state.activeSession) {
    const activeComic = comics.find(
      (comic) => comic.id === state.activeSession?.comicId,
    );
    if (activeComic) {
      const ranking = rankComics(comics, state, now, partialConfig).find(
        (candidate) => candidate.comic.id === activeComic.id,
      );
      if (!ranking) throw new Error("The active comic could not be ranked.");
      return {
        comic: activeComic,
        state,
        ranking,
        overlapCardIds: ranking.cardPriorities.map((card) => card.cardId),
        reason: "resume",
      };
    }
  }

  const workingState = abandonMissingActiveSession(state);
  const eligibleComics =
    comics.length > 1 && workingState.lastCompletedComicId
      ? comics.filter(
          (comic) => comic.id !== workingState.lastCompletedComicId,
        )
      : comics;
  const ranked = rankComics(
    eligibleComics.length > 0 ? eligibleComics : comics,
    workingState,
    now,
    partialConfig,
  );
  const choice = ranked[0];
  const nextState = startComic(workingState, choice.comic, now);
  return {
    comic: choice.comic,
    state: nextState,
    ranking: choice,
    overlapCardIds: choice.cardPriorities.map((card) => card.cardId),
    reason: "priority",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function nonNegativeInteger(value: unknown, fallback: number): number {
  return typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= 0
    ? value
    : fallback;
}

function parseExposure(value: unknown): CardExposure | null {
  if (!isRecord(value) || typeof value.comicId !== "string") return null;
  const sessionId = nonNegativeInteger(value.sessionId, 0);
  const displayedAtMs = finiteNumber(value.displayedAtMs);
  if (sessionId < 1 || displayedAtMs === null) return null;
  const openedAtMs = Array.isArray(value.openedAtMs)
    ? value.openedAtMs
        .map(finiteNumber)
        .filter((timestamp): timestamp is number => timestamp !== null)
        .map((timestamp) => Math.max(displayedAtMs, timestamp))
        .sort((left, right) => left - right)
    : [];
  const rawCompletedAtMs =
    value.completedAtMs === null ? null : finiteNumber(value.completedAtMs);
  if (value.completedAtMs !== null && rawCompletedAtMs === null) return null;
  return {
    sessionId,
    comicId: value.comicId,
    displayedAtMs,
    openedAtMs,
    completedAtMs:
      rawCompletedAtMs === null
        ? null
        : Math.max(
            displayedAtMs,
            openedAtMs.at(-1) ?? displayedAtMs,
            rawCompletedAtMs,
          ),
  };
}

function hydrateSchemaFour(parsed: Record<string, unknown>): SrsState {
  let activeSession: ActiveSession | null = null;
  if (
    isRecord(parsed.activeSession) &&
    typeof parsed.activeSession.comicId === "string"
  ) {
    const sessionId = nonNegativeInteger(parsed.activeSession.sessionId, 0);
    const startedAtMs = finiteNumber(parsed.activeSession.startedAtMs);
    if (sessionId >= 1 && startedAtMs !== null) {
      const cardIds = Array.isArray(parsed.activeSession.cardIds)
        ? uniqueStrings(
            parsed.activeSession.cardIds.filter(
              (id): id is string => typeof id === "string",
            ),
          )
        : [];
      activeSession = {
        sessionId,
        comicId: parsed.activeSession.comicId,
        startedAtMs,
        cardIds,
        openedCardIds: Array.isArray(parsed.activeSession.openedCardIds)
          ? uniqueStrings(
              parsed.activeSession.openedCardIds.filter(
                (id): id is string =>
                  typeof id === "string" && cardIds.includes(id),
              ),
            )
          : [],
      };
    }
  }

  const cards: Record<string, CardHistory> = {};
  let greatestSessionId = activeSession?.sessionId ?? 0;
  if (isRecord(parsed.cards)) {
    for (const [cardId, rawHistory] of Object.entries(parsed.cards)) {
      if (!isRecord(rawHistory) || !Array.isArray(rawHistory.exposures)) continue;
      const exposures = rawHistory.exposures
        .map(parseExposure)
        .filter((exposure): exposure is CardExposure => exposure !== null)
        .flatMap((exposure) => {
          if (exposure.completedAtMs !== null) return [exposure];
          if (
            activeSession !== null &&
            exposure.sessionId === activeSession.sessionId &&
            exposure.comicId === activeSession.comicId &&
            activeSession.cardIds.includes(cardId)
          ) {
            return [exposure];
          }
          const lastOpen = exposure.openedAtMs.at(-1);
          return lastOpen === undefined
            ? []
            : [{ ...exposure, completedAtMs: lastOpen }];
        });
      for (const exposure of exposures) {
        greatestSessionId = Math.max(greatestSessionId, exposure.sessionId);
      }
      let legacyEvidence: CardHistory["legacyEvidence"];
      if (isRecord(rawHistory.legacyEvidence)) {
        const displayCount = nonNegativeInteger(
          rawHistory.legacyEvidence.displayCount,
          0,
        );
        const openCount = Math.min(
          displayCount,
          nonNegativeInteger(rawHistory.legacyEvidence.openCount, 0),
        );
        if (displayCount > 0) legacyEvidence = { displayCount, openCount };
      }
      if (exposures.length > 0 || legacyEvidence) {
        cards[cardId] = { exposures, legacyEvidence };
      }
    }
  }

  const comics: Record<string, ComicProgress> = {};
  if (isRecord(parsed.comics)) {
    for (const [comicId, rawProgress] of Object.entries(parsed.comics)) {
      if (!isRecord(rawProgress)) continue;
      comics[comicId] = {
        views: nonNegativeInteger(rawProgress.views, 0),
        completions: nonNegativeInteger(rawProgress.completions, 0),
        lastViewedAtMs:
          rawProgress.lastViewedAtMs === null
            ? null
            : finiteNumber(rawProgress.lastViewedAtMs),
        lastCompletedAtMs:
          rawProgress.lastCompletedAtMs === null
            ? null
            : finiteNumber(rawProgress.lastCompletedAtMs),
      };
    }
  }

  return {
    schemaVersion: 4,
    nextSessionId: Math.max(
      greatestSessionId + 1,
      nonNegativeInteger(parsed.nextSessionId, 1),
    ),
    cards,
    comics,
    activeSession,
    lastCompletedComicId:
      typeof parsed.lastCompletedComicId === "string"
        ? parsed.lastCompletedComicId
        : null,
    historyCompleteness:
      parsed.historyCompleteness === "legacy-bounded"
        ? "legacy-bounded"
        : "complete",
  };
}

interface LegacyEvent {
  comicId: string;
  cardId: string;
  day: number;
  event: "help" | "independent-success";
  order: number;
}

function migrateSchemaThree(
  parsed: Record<string, unknown>,
  nowMs: number,
): SrsState {
  const legacyEvents: LegacyEvent[] = Array.isArray(parsed.history)
    ? parsed.history
        .map((value, order): LegacyEvent | null => {
          if (
            !isRecord(value) ||
            typeof value.comicId !== "string" ||
            typeof value.cardId !== "string" ||
            typeof value.day !== "number" ||
            !Number.isFinite(value.day) ||
            (value.event !== "help" && value.event !== "independent-success")
          ) {
            return null;
          }
          return {
            comicId: value.comicId,
            cardId: value.cardId,
            day: Math.max(1, Math.floor(value.day)),
            event: value.event,
            order,
          };
        })
        .filter((event): event is LegacyEvent => event !== null)
    : [];

  const cards: Record<string, CardHistory> = {};
  const outcomeByExposure = new Map<
    string,
    { cardId: string; opened: boolean }
  >();
  for (const event of legacyEvents) {
    const key = `${event.day}\u0000${event.comicId}\u0000${event.cardId}`;
    const existing = outcomeByExposure.get(key);
    outcomeByExposure.set(key, {
      cardId: event.cardId,
      opened: event.event === "help" || existing?.opened === true,
    });
  }
  for (const { cardId, opened } of outcomeByExposure.values()) {
    const history = cards[cardId] ?? {
      exposures: [],
      legacyEvidence: { displayCount: 0, openCount: 0 },
    };
    const legacyEvidence = history.legacyEvidence ?? {
      displayCount: 0,
      openCount: 0,
    };
    cards[cardId] = {
      exposures: [],
      legacyEvidence: {
        displayCount: legacyEvidence.displayCount + 1,
        openCount: legacyEvidence.openCount + Number(opened),
      },
    };
  }
  if (isRecord(parsed.cards)) {
    for (const [cardId, progress] of Object.entries(parsed.cards)) {
      if (!isRecord(progress)) continue;
      // These aggregates outlive the capped event tail, but lack timestamps.
      // Preserve only bounded counts and let scoring cap their influence.
      const encounters = Math.min(
        1_000_000,
        nonNegativeInteger(progress.encounters, 0),
      );
      const lapses = Math.min(
        encounters,
        nonNegativeInteger(progress.lapses, 0) +
          Number(finiteNumber(progress.lastHelpDay) !== null),
      );
      const current = cards[cardId]?.legacyEvidence;
      const displayCount = Math.max(current?.displayCount ?? 0, encounters);
      const openCount = Math.min(
        displayCount,
        Math.max(current?.openCount ?? 0, lapses),
      );
      if (displayCount > 0) {
        cards[cardId] = {
          exposures: [],
          legacyEvidence: { displayCount, openCount },
        };
      }
    }
  }

  const comics: Record<string, ComicProgress> = {};
  if (isRecord(parsed.comics)) {
    for (const [comicId, value] of Object.entries(parsed.comics)) {
      if (!isRecord(value)) continue;
      comics[comicId] = {
        views: nonNegativeInteger(value.views, 0),
        completions: nonNegativeInteger(value.completions, 0),
        // Schema 3 had simulated day numbers, not trustworthy wall-clock time.
        lastViewedAtMs: null,
        lastCompletedAtMs: null,
      };
    }
  }

  // Restart an active legacy comic at the actual migration instant. Its past
  // help choices are already represented by the bounded aggregate above.
  let activeSession: ActiveSession | null = null;
  let nextSessionId = 1;
  if (
    isRecord(parsed.activeSession) &&
    typeof parsed.activeSession.comicId === "string"
  ) {
    const legacyActive = parsed.activeSession;
    const legacyComicId = legacyActive.comicId as string;
    const eligibleCardIds = Array.isArray(legacyActive.eligibleCardIds)
      ? legacyActive.eligibleCardIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    const clickedCardIds = Array.isArray(legacyActive.clickedCardIds)
      ? legacyActive.clickedCardIds.filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    const cardIds = uniqueStrings([...eligibleCardIds, ...clickedCardIds]);
    const sessionId = nextSessionId;
    nextSessionId += 1;
    for (const cardId of cardIds) {
      const history = cards[cardId] ?? { exposures: [] };
      cards[cardId] = {
        ...history,
        exposures: [
          ...history.exposures,
          {
            sessionId,
            comicId: legacyComicId,
            displayedAtMs: nowMs,
            openedAtMs: [],
            completedAtMs: null,
          },
        ],
      };
    }
    activeSession = {
      sessionId,
      comicId: legacyComicId,
      startedAtMs: nowMs,
      cardIds,
      openedCardIds: [],
    };
  }

  return {
    schemaVersion: 4,
    nextSessionId,
    cards,
    comics,
    activeSession,
    lastCompletedComicId: Array.isArray(parsed.recentComicIds)
      ? parsed.recentComicIds.find(
          (comicId): comicId is string => typeof comicId === "string",
        ) ?? null
      : null,
    historyCompleteness: "legacy-bounded",
  };
}

export function hydrateSrsState(value: unknown, nowMs: number): SrsState {
  const now = finiteTimestamp(nowMs, "nowMs");
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!isRecord(parsed)) return createSrsState();
    if (parsed.schemaVersion === 4) return hydrateSchemaFour(parsed);
    if (parsed.schemaVersion === 3) return migrateSchemaThree(parsed, now);
    return createSrsState();
  } catch {
    return createSrsState();
  }
}

export function serializeSrsState(state: SrsState): string {
  return JSON.stringify(state);
}
