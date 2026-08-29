export type CardStatus = "unseen" | "learning" | "review" | "mastered";

export interface CardProgress {
  status: CardStatus;
  intervalDays: number;
  ease: number;
  dueDay: number | null;
  successStreak: number;
  lapses: number;
  encounters: number;
  lastReviewedDay: number | null;
  lastHelpDay: number | null;
}

export interface ComicProgress {
  views: number;
  completions: number;
  lastViewedDay: number | null;
  lastCompletedDay: number | null;
}

export interface ActiveSession {
  comicId: string;
  startedDay: number;
  eligibleCardIds: string[];
  clickedCardIds: string[];
}

export interface ReviewEvent {
  comicId: string;
  cardId: string;
  day: number;
  event: "help" | "independent-success";
}

export interface SrsState {
  schemaVersion: 2;
  studyDay: number;
  cards: Record<string, CardProgress>;
  comics: Record<string, ComicProgress>;
  activeSession: ActiveSession | null;
  /** Progress snapshot before the first grade for each card on the current day. */
  dayBaselines: Record<string, CardProgress>;
  recentComicIds: string[];
  history: ReviewEvent[];
}

export interface ComicLike {
  id: string;
  cardIds: readonly string[];
}

export interface RankedComic<T extends ComicLike> {
  comic: T;
  overlapCardIds: string[];
  overlapCount: number;
  urgency: number;
  isRecent: boolean;
  views: number;
  unseenCount: number;
}

export interface NextComicResult<T extends ComicLike> {
  comic: T;
  state: SrsState;
  dueCardIds: string[];
  overlapCardIds: string[];
  advancedDays: number;
  reason: "due" | "new" | "revisit";
}

const MAX_HISTORY = 500;

export const DEFAULT_CARD_PROGRESS: Readonly<CardProgress> = {
  status: "unseen",
  intervalDays: 0,
  ease: 2.3,
  dueDay: null,
  successStreak: 0,
  lapses: 0,
  encounters: 0,
  lastReviewedDay: null,
  lastHelpDay: null,
};

const DEFAULT_COMIC_PROGRESS: Readonly<ComicProgress> = {
  views: 0,
  completions: 0,
  lastViewedDay: null,
  lastCompletedDay: null,
};

export function createSrsState(): SrsState {
  return {
    schemaVersion: 2,
    studyDay: 1,
    cards: {},
    comics: {},
    activeSession: null,
    dayBaselines: {},
    recentComicIds: [],
    history: [],
  };
}

export function getCardProgress(
  state: SrsState,
  cardId: string,
): CardProgress {
  return state.cards[cardId] ?? { ...DEFAULT_CARD_PROGRESS };
}

export function getComicProgress(
  state: SrsState,
  comicId: string,
): ComicProgress {
  return state.comics[comicId] ?? { ...DEFAULT_COMIC_PROGRESS };
}

export function getDueCardIds(
  state: SrsState,
  allowedCardIds?: Iterable<string>,
): string[] {
  const allowed = allowedCardIds ? new Set(allowedCardIds) : null;
  return Object.entries(state.cards)
    .filter(([cardId, progress]) =>
      (!allowed || allowed.has(cardId)) &&
      progress.dueDay !== null &&
      progress.dueDay <= state.studyDay,
    )
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([cardId]) => cardId);
}

export function getLearnedTodayCardIds(state: SrsState): string[] {
  return Object.entries(state.cards)
    .filter(([, progress]) => progress.lastHelpDay === state.studyDay)
    .map(([cardId]) => cardId);
}

export function startComic<T extends ComicLike>(
  state: SrsState,
  comic: T,
): SrsState {
  if (state.activeSession?.comicId === comic.id) return state;

  const eligibleCardIds = [...new Set(comic.cardIds)].filter((cardId) => {
    const progress = getCardProgress(state, cardId);
    return (
      progress.status === "unseen" ||
      progress.dueDay === null ||
      progress.dueDay <= state.studyDay
    );
  });
  const comicProgress = getComicProgress(state, comic.id);

  return {
    ...state,
    comics: {
      ...state.comics,
      [comic.id]: {
        ...comicProgress,
        views: comicProgress.views + 1,
        lastViewedDay: state.studyDay,
      },
    },
    activeSession: {
      comicId: comic.id,
      startedDay: state.studyDay,
      eligibleCardIds,
      clickedCardIds: [],
    },
  };
}

export function recordCardHelp(state: SrsState, cardId: string): SrsState {
  if (!state.activeSession) return state;
  if (state.activeSession.clickedCardIds.includes(cardId)) return state;

  const activeSession = {
    ...state.activeSession,
    clickedCardIds: [...state.activeSession.clickedCardIds, cardId],
  };
  const current = getCardProgress(state, cardId);

  // A help event elsewhere on the same simulated day already owns the grade.
  if (current.lastHelpDay === state.studyDay) {
    return { ...state, activeSession };
  }

  const baselineKey = `${state.studyDay}:${cardId}`;
  const previous = state.dayBaselines[baselineKey] ?? current;
  const previouslySeen =
    previous.status !== "unseen" || previous.encounters > 0;
  const next: CardProgress = {
    ...previous,
    status: "learning",
    intervalDays: 1,
    dueDay: state.studyDay + 1,
    ease: Math.max(1.3, previous.ease - (previouslySeen ? 0.2 : 0)),
    successStreak: 0,
    lapses: previous.lapses + (previouslySeen ? 1 : 0),
    encounters: previous.encounters + 1,
    lastHelpDay: state.studyDay,
    lastReviewedDay: state.studyDay,
  };
  const event: ReviewEvent = {
    comicId: activeSession.comicId,
    cardId,
    day: state.studyDay,
    event: "help",
  };

  return {
    ...state,
    activeSession,
    cards: { ...state.cards, [cardId]: next },
    dayBaselines: {
      ...state.dayBaselines,
      [baselineKey]: previous,
    },
    history: [
      ...state.history.filter(
        (entry) =>
          !(
            entry.cardId === cardId &&
            entry.day === state.studyDay &&
            entry.event === "independent-success"
          ),
      ),
      event,
    ].slice(-MAX_HISTORY),
  };
}

function recordIndependentSuccess(
  state: SrsState,
  cardId: string,
): SrsState {
  const previous = getCardProgress(state, cardId);
  if (previous.lastHelpDay === state.studyDay) return state;

  let status: CardStatus;
  let intervalDays: number;
  let ease = previous.ease;
  let successStreak: number;

  if (previous.status === "unseen") {
    status = "mastered";
    intervalDays = 14;
    ease = 2.5;
    successStreak = 1;
  } else if (previous.status === "learning") {
    status = "review";
    intervalDays = 3;
    successStreak = 1;
  } else {
    ease = Math.min(3, previous.ease + 0.05);
    intervalDays = Math.min(
      365,
      Math.max(
        previous.intervalDays + 1,
        Math.round(previous.intervalDays * ease * 1.15),
      ),
    );
    successStreak = previous.successStreak + 1;
    status = intervalDays >= 14 ? "mastered" : "review";
  }

  const next: CardProgress = {
    ...previous,
    status,
    intervalDays,
    ease,
    successStreak,
    dueDay: state.studyDay + intervalDays,
    encounters: previous.encounters + 1,
    lastReviewedDay: state.studyDay,
  };
  const event: ReviewEvent = {
    comicId: state.activeSession?.comicId ?? "unknown",
    cardId,
    day: state.studyDay,
    event: "independent-success",
  };

  return {
    ...state,
    cards: { ...state.cards, [cardId]: next },
    dayBaselines: {
      ...state.dayBaselines,
      [`${state.studyDay}:${cardId}`]:
        state.dayBaselines[`${state.studyDay}:${cardId}`] ?? previous,
    },
    history: [...state.history, event].slice(-MAX_HISTORY),
  };
}

export function completeComic(state: SrsState): SrsState {
  const session = state.activeSession;
  if (!session) return state;

  const clicked = new Set(session.clickedCardIds);
  let next = state;
  for (const cardId of session.eligibleCardIds) {
    if (!clicked.has(cardId)) next = recordIndependentSuccess(next, cardId);
  }

  const comicProgress = getComicProgress(next, session.comicId);
  return {
    ...next,
    comics: {
      ...next.comics,
      [session.comicId]: {
        ...comicProgress,
        completions: comicProgress.completions + 1,
        lastCompletedDay: state.studyDay,
      },
    },
    activeSession: null,
    recentComicIds: [
      session.comicId,
      ...next.recentComicIds.filter((id) => id !== session.comicId),
    ].slice(0, 2),
  };
}

export function rankComics<T extends ComicLike>(
  comics: readonly T[],
  state: SrsState,
  targetCardIds: readonly string[] = getDueCardIds(state),
): RankedComic<T>[] {
  const targets = new Set(targetCardIds);
  const recent = new Set(state.recentComicIds.slice(0, 2));

  return comics
    .map((comic, index) => {
      const uniqueCardIds = [...new Set(comic.cardIds)];
      const overlapCardIds = uniqueCardIds.filter((id) => targets.has(id));
      const urgency = overlapCardIds.reduce((sum, cardId) => {
        const progress = getCardProgress(state, cardId);
        const overdue = Math.max(0, state.studyDay - (progress.dueDay ?? state.studyDay));
        return sum + 1 + Math.min(3, overdue) + (progress.status === "learning" ? 2 : 0);
      }, 0);
      const unseenCount = uniqueCardIds.filter(
        (id) => getCardProgress(state, id).status === "unseen",
      ).length;
      return {
        comic,
        overlapCardIds,
        overlapCount: overlapCardIds.length,
        urgency,
        isRecent: recent.has(comic.id),
        views: getComicProgress(state, comic.id).views,
        unseenCount,
        index,
      };
    })
    .sort((a, b) =>
      b.overlapCount - a.overlapCount ||
      b.urgency - a.urgency ||
      Number(a.isRecent) - Number(b.isRecent) ||
      a.views - b.views ||
      a.index - b.index,
    )
    .map((ranked) => ({
      comic: ranked.comic,
      overlapCardIds: ranked.overlapCardIds,
      overlapCount: ranked.overlapCount,
      urgency: ranked.urgency,
      isRecent: ranked.isRecent,
      views: ranked.views,
      unseenCount: ranked.unseenCount,
    }));
}

export function advanceSimulationDay(
  state: SrsState,
  days = 1,
): SrsState {
  return {
    ...state,
    studyDay: Math.max(1, state.studyDay + Math.max(0, Math.floor(days))),
    activeSession: null,
    dayBaselines: {},
  };
}

export function selectNextComic<T extends ComicLike>(
  comics: readonly T[],
  state: SrsState,
): NextComicResult<T> {
  if (comics.length === 0) {
    throw new Error("Cannot select a comic from an empty curriculum.");
  }
  const curriculumCardIds = new Set(
    comics.flatMap((comic) => [...comic.cardIds]),
  );

  if (state.activeSession) {
    const session = state.activeSession;
    const activeComic = comics.find(
      (comic) => comic.id === session.comicId,
    );
    if (activeComic) {
      const activeCardIds = new Set(activeComic.cardIds);
      const resumedState: SrsState = {
        ...state,
        activeSession: {
          ...session,
          eligibleCardIds: [...new Set(session.eligibleCardIds)].filter((id) =>
            activeCardIds.has(id),
          ),
          clickedCardIds: [...new Set(session.clickedCardIds)].filter((id) =>
            activeCardIds.has(id),
          ),
        },
      };
      const dueCardIds = getDueCardIds(resumedState, curriculumCardIds);
      return {
        comic: activeComic,
        state: resumedState,
        dueCardIds,
        overlapCardIds: activeComic.cardIds.filter((id) =>
          resumedState.activeSession?.eligibleCardIds.includes(id),
        ),
        advancedDays: 0,
        reason: dueCardIds.length > 0 ? "due" : "new",
      };
    }
  }

  let workingState: SrsState = { ...state, activeSession: null };
  let dueCardIds = getDueCardIds(workingState, curriculumCardIds);
  let advancedDays = 0;

  if (dueCardIds.length === 0) {
    const newCandidates = rankComics(comics, workingState, [])
      .filter((ranked) => ranked.unseenCount > 0)
      .sort((a, b) =>
        Number(a.views > 0) - Number(b.views > 0) ||
        a.views - b.views ||
        comics.indexOf(a.comic) - comics.indexOf(b.comic),
      );
    const nextNew = newCandidates[0];
    if (nextNew) {
      const overlapCardIds = nextNew.comic.cardIds.filter(
        (id) => getCardProgress(workingState, id).status === "unseen",
      );
      workingState = startComic(workingState, nextNew.comic);
      return {
        comic: nextNew.comic,
        state: workingState,
        dueCardIds: [],
        overlapCardIds,
        advancedDays: 0,
        reason: "new",
      };
    }

    const earliestDue = Object.entries(workingState.cards)
      .filter(([cardId]) => curriculumCardIds.has(cardId))
      .map(([, progress]) => progress.dueDay)
      .filter((day): day is number => day !== null && day > workingState.studyDay)
      .sort((a, b) => a - b)[0];
    if (earliestDue !== undefined) {
      advancedDays = earliestDue - workingState.studyDay;
      workingState = advanceSimulationDay(workingState, advancedDays);
      dueCardIds = getDueCardIds(workingState, curriculumCardIds);
    }
  }

  const ranked = rankComics(comics, workingState, dueCardIds);
  const choice = ranked[0];
  workingState = startComic(workingState, choice.comic);
  return {
    comic: choice.comic,
    state: workingState,
    dueCardIds,
    overlapCardIds: choice.overlapCardIds,
    advancedDays,
    reason: dueCardIds.length > 0 ? "due" : "revisit",
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function nullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function hydrateSrsState(value: unknown): SrsState {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!isRecord(parsed) || parsed.schemaVersion !== 2) return createSrsState();

    const cards: Record<string, CardProgress> = {};
    if (isRecord(parsed.cards)) {
      for (const [cardId, raw] of Object.entries(parsed.cards)) {
        if (!isRecord(raw)) continue;
        const status: CardStatus =
          raw.status === "learning" ||
          raw.status === "review" ||
          raw.status === "mastered"
            ? raw.status
            : "unseen";
        cards[cardId] = {
          status,
          intervalDays: Math.max(0, numberOr(raw.intervalDays, 0)),
          ease: Math.min(3, Math.max(1.3, numberOr(raw.ease, 2.3))),
          dueDay: nullableNumber(raw.dueDay),
          successStreak: Math.max(0, numberOr(raw.successStreak, 0)),
          lapses: Math.max(0, numberOr(raw.lapses, 0)),
          encounters: Math.max(0, numberOr(raw.encounters, 0)),
          lastReviewedDay: nullableNumber(raw.lastReviewedDay),
          lastHelpDay: nullableNumber(raw.lastHelpDay),
        };
      }
    }

    const dayBaselines: Record<string, CardProgress> = {};
    if (isRecord(parsed.dayBaselines)) {
      for (const [baselineKey, raw] of Object.entries(parsed.dayBaselines)) {
        if (!isRecord(raw)) continue;
        const status: CardStatus =
          raw.status === "learning" ||
          raw.status === "review" ||
          raw.status === "mastered"
            ? raw.status
            : "unseen";
        dayBaselines[baselineKey] = {
          status,
          intervalDays: Math.max(0, numberOr(raw.intervalDays, 0)),
          ease: Math.min(3, Math.max(1.3, numberOr(raw.ease, 2.3))),
          dueDay: nullableNumber(raw.dueDay),
          successStreak: Math.max(0, numberOr(raw.successStreak, 0)),
          lapses: Math.max(0, numberOr(raw.lapses, 0)),
          encounters: Math.max(0, numberOr(raw.encounters, 0)),
          lastReviewedDay: nullableNumber(raw.lastReviewedDay),
          lastHelpDay: nullableNumber(raw.lastHelpDay),
        };
      }
    }

    const comics: Record<string, ComicProgress> = {};
    if (isRecord(parsed.comics)) {
      for (const [comicId, raw] of Object.entries(parsed.comics)) {
        if (!isRecord(raw)) continue;
        comics[comicId] = {
          views: Math.max(0, numberOr(raw.views, 0)),
          completions: Math.max(0, numberOr(raw.completions, 0)),
          lastViewedDay: nullableNumber(raw.lastViewedDay),
          lastCompletedDay: nullableNumber(raw.lastCompletedDay),
        };
      }
    }

    let activeSession: ActiveSession | null = null;
    if (isRecord(parsed.activeSession) && typeof parsed.activeSession.comicId === "string") {
      activeSession = {
        comicId: parsed.activeSession.comicId,
        startedDay: Math.max(1, numberOr(parsed.activeSession.startedDay, 1)),
        eligibleCardIds: Array.isArray(parsed.activeSession.eligibleCardIds)
          ? parsed.activeSession.eligibleCardIds.filter(
              (id): id is string => typeof id === "string",
            )
          : [],
        clickedCardIds: Array.isArray(parsed.activeSession.clickedCardIds)
          ? parsed.activeSession.clickedCardIds.filter(
              (id): id is string => typeof id === "string",
            )
          : [],
      };
    }

    const history: ReviewEvent[] = Array.isArray(parsed.history)
      ? parsed.history
          .filter(
            (event): event is ReviewEvent =>
              isRecord(event) &&
              typeof event.comicId === "string" &&
              typeof event.cardId === "string" &&
              typeof event.day === "number" &&
              (event.event === "help" || event.event === "independent-success"),
          )
          .slice(-MAX_HISTORY)
      : [];

    return {
      schemaVersion: 2,
      studyDay: Math.max(1, numberOr(parsed.studyDay, 1)),
      cards,
      comics,
      activeSession,
      dayBaselines,
      recentComicIds: Array.isArray(parsed.recentComicIds)
        ? parsed.recentComicIds
            .filter((id): id is string => typeof id === "string")
            .slice(0, 2)
        : [],
      history,
    };
  } catch {
    return createSrsState();
  }
}

export function serializeSrsState(state: SrsState): string {
  return JSON.stringify(state);
}
