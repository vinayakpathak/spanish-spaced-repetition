"use client";

/* eslint-disable @next/next/no-img-element, jsx-a11y/no-noninteractive-tabindex */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type Comic,
  type LearningCard,
  type RevealRegion,
} from "../lib/content";
import {
  canPersistCorpusProgress,
  loadComicBundle,
  loadCorpusManifest,
  REVIEWED_CARD_BY_ID,
  REVIEWED_COMICS,
  REVIEWED_COMIC_BY_ID,
  REVIEWED_CORPUS_MANIFEST,
  type CorpusComicBundle,
  type CorpusManifest,
} from "../lib/corpus";
import {
  completeComic,
  createSrsState,
  getCardProgress,
  getDueCardIds,
  getLearnedTodayCardIds,
  hydrateSrsState,
  reconcileSrsState,
  recordCardHelp,
  selectNextComic,
  serializeSrsState,
  type CardProgress,
  type SrsState,
} from "../lib/srs";
import {
  createBrowserProgressStore,
  type OpenedByComic,
  type ProgressStore,
} from "../lib/progress-store";

const KIND_GROUPS: readonly {
  kind: LearningCard["kind"];
  label: string;
  description: string;
}[] = [
  {
    kind: "word",
    label: "Word meaning",
    description: "What this individual word means here",
  },
  {
    kind: "phrase",
    label: "Reusable expression",
    description: "A common pattern or fixed expression used beyond this sentence",
  },
  {
    kind: "grammar",
    label: "Grammar lesson",
    description: "A reusable pattern behind this form",
  },
  {
    kind: "concept",
    label: "Idea or context",
    description: "Cultural, technical, or contextual knowledge",
  },
];

type LibraryFilter = "today" | "next" | "mastered" | "all";

interface Summary {
  completedTitle: string;
  helpCardCount: number;
  masteredCount: number;
  nextComic: Comic;
  overlapCardIds: string[];
  advancedDays: number;
  reason: "due" | "new" | "revisit";
}

const initialSelection = selectNextComic(
  REVIEWED_CORPUS_MANIFEST.comics,
  createSrsState(),
);

const DEGRADED_CORPUS_WARNING =
  "The full comic collection is temporarily unavailable. Your existing saved progress is preserved; changes in this fallback session will not be saved.";

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function statusLabel(progress: CardProgress, studyDay: number): string {
  if (progress.lastHelpDay === studyDay) return "learned today";
  if (progress.status === "unseen") return "new";
  if (progress.dueDay !== null && progress.dueDay <= studyDay) return "due now";
  if (progress.dueDay !== null) {
    const days = progress.dueDay - studyDay;
    return days === 1 ? "tomorrow" : `in ${days} days`;
  }
  return progress.status === "mastered" ? "mastered" : "in progress";
}

function formatImportanceScore(score: number): string {
  return new Intl.NumberFormat("en", {
    style: "percent",
    minimumFractionDigits: 3,
    maximumFractionDigits: 4,
  }).format(score);
}

export default function Home() {
  const [srs, setSrs] = useState<SrsState>(initialSelection.state);
  const [currentComicId, setCurrentComicId] = useState(initialSelection.comic.id);
  const [corpusManifest, setCorpusManifest] = useState<CorpusManifest>(
    REVIEWED_CORPUS_MANIFEST,
  );
  const [comicsById, setComicsById] = useState<ReadonlyMap<string, Comic>>(
    () => new Map(REVIEWED_COMIC_BY_ID),
  );
  const [cardsById, setCardsById] = useState<
    ReadonlyMap<string, LearningCard>
  >(() => new Map(REVIEWED_CARD_BY_ID));
  const [openedByComic, setOpenedByComic] = useState<OpenedByComic>({});
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showPins, setShowPins] = useState(true);
  const [comicZoomed, setComicZoomed] = useState(false);
  const [showTitleText, setShowTitleText] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showRankings, setShowRankings] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("today");
  const [libraryLimit, setLibraryLimit] = useState(200);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [comicLoading, setComicLoading] = useState(false);
  const progressStoreRef = useRef<ProgressStore | null>(null);
  const persistenceEnabledRef = useRef(false);
  const revealPanelRef = useRef<HTMLElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const libraryRef = useRef<HTMLElement>(null);
  const rankingsRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const resetRef = useRef<HTMLElement>(null);

  const curriculumCardIds = useMemo(
    () => unique(corpusManifest.comics.flatMap((comic) => comic.cardIds)),
    [corpusManifest],
  );
  const curriculumCardIdSet = useMemo(
    () => new Set(curriculumCardIds),
    [curriculumCardIds],
  );
  const currentComic =
    comicsById.get(currentComicId) ?? REVIEWED_COMICS[0];
  const lookupCard = (cardId: string): LearningCard | null =>
    cardsById.get(cardId) ?? null;
  const openedRegionIds = openedByComic[currentComic.id] ?? [];
  const selectedRegion =
    currentComic.regions.find((region) => region.id === selectedRegionId) ?? null;
  const selectedWord =
    selectedRegion?.words.find((word) => word.id === selectedWordId) ?? null;
  const candidateCards = selectedWord
    ? unique(selectedWord.cardIds)
        .map((id) => lookupCard(id))
        .filter((card): card is LearningCard => card !== null)
    : [];
  const selectedWordSchedulableCardCount = candidateCards.filter(
    (card) => card.schedulable !== false,
  ).length;
  const dueCardIds = getDueCardIds(srs, curriculumCardIds);
  const learnedTodayIds = getLearnedTodayCardIds(srs).filter((cardId) =>
    curriculumCardIdSet.has(cardId),
  );
  const activeSession = srs.activeSession;
  const clickedCardIds = activeSession?.clickedCardIds ?? [];
  const eligibleCardIds = activeSession?.eligibleCardIds ?? [];
  const selectedWordLearnedTodayCount = selectedWord
    ? unique(selectedWord.cardIds).filter((cardId) =>
        learnedTodayIds.includes(cardId),
      ).length
    : 0;
  const currentIndex = corpusManifest.comics.findIndex(
    (comic) => comic.id === currentComic.id,
  );
  const currentManifestEntry = corpusManifest.comics[currentIndex];
  const currentDueCount = unique(currentComic.cardIds).filter((cardId) =>
    dueCardIds.includes(cardId),
  ).length;
  const currentNewCount = unique(currentComic.cardIds).filter(
    (cardId) => getCardProgress(srs, cardId).status === "unseen",
  ).length;
  const masteredCount = curriculumCardIds.filter(
    (cardId) => getCardProgress(srs, cardId).status === "mastered",
  ).length;
  const rankedComics = useMemo(
    () =>
      [...corpusManifest.comics].sort(
        (first, second) =>
          first.importance.rank - second.importance.rank ||
          first.id.localeCompare(second.id),
      ),
    [corpusManifest],
  );

  const cacheCards = useCallback((cards: readonly LearningCard[]) => {
    setCardsById((current) => {
      const next = new Map(current);
      for (const card of cards) {
        // The reviewed seed is initialized first and remains authoritative for
        // any shared target also emitted by generated corpus data.
        if (!next.has(card.id)) next.set(card.id, card);
      }
      return next;
    });
  }, []);

  const cacheBundle = useCallback((bundle: CorpusComicBundle) => {
    setComicsById((current) => {
      const next = new Map(current);
      next.set(bundle.comic.id, bundle.comic);
      return next;
    });
    cacheCards(bundle.cards);
  }, [cacheCards]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const progressStore = createBrowserProgressStore();
      progressStoreRef.current = progressStore;
      const [storedProgress, manifestLoad] = await Promise.all([
        progressStore.load(),
        loadCorpusManifest(),
      ]);
      const persistedState = hydrateSrsState(storedProgress.serializedSrs);
      let persistenceEnabled = canPersistCorpusProgress(manifestLoad);
      let manifest = manifestLoad.manifest;
      let restored = reconcileSrsState(
        persistedState,
        manifest.comics,
      );
      const restoredOpened = storedProgress.openedByComic;
      let selected = selectNextComic(manifest.comics, restored);
      let bundle: CorpusComicBundle;

      try {
        bundle = await loadComicBundle(selected.comic);
      } catch {
        // A stale or partially deployed generated corpus must never strand the
        // learner or overwrite their complete saved state. Resume against the
        // checked-in reviewed curriculum without persisting this reduced view.
        persistenceEnabled = canPersistCorpusProgress(manifestLoad, true);
        manifest = REVIEWED_CORPUS_MANIFEST;
        restored = reconcileSrsState(persistedState, manifest.comics);
        selected = selectNextComic(manifest.comics, restored);
        bundle = await loadComicBundle(selected.comic);
      }
      if (cancelled) return;

      cacheCards(manifest.cardCatalog);
      cacheBundle(bundle);
      persistenceEnabledRef.current = persistenceEnabled;
      let persistenceWarning = persistenceEnabled
        ? storedProgress.warning
        : DEGRADED_CORPUS_WARNING;
      if (persistenceEnabled) {
        try {
          await progressStore.save({
            serializedSrs: serializeSrsState(selected.state),
            openedByComic: restoredOpened,
          });
          persistenceWarning = null;
        } catch {
          persistenceWarning =
            persistenceWarning ??
            "Progress could not be saved. Changes will last only until this tab closes.";
        }
      }
      if (cancelled) return;
      queueMicrotask(() => {
        if (cancelled) return;
        setCorpusManifest(manifest);
        setSrs(selected.state);
        setCurrentComicId(selected.comic.id);
        setOpenedByComic(restoredOpened);
        setStorageWarning(persistenceWarning);
        setHydrated(true);
      });
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [cacheBundle, cacheCards]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (!selectedCardId) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .getElementById(`flashcard-${encodeURIComponent(selectedCardId)}`)
        ?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "nearest",
        });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedCardId]);

  function commit(nextState: SrsState, nextOpened = openedByComic) {
    setSrs(nextState);
    setOpenedByComic(nextOpened);
    const progressStore = progressStoreRef.current;
    if (!hydrated || !progressStore || !persistenceEnabledRef.current) return;
    void progressStore
      .save({
        serializedSrs: serializeSrsState(nextState),
        openedByComic: nextOpened,
      })
      .then(() => setStorageWarning(null))
      .catch(() =>
        setStorageWarning(
          "Progress could not be saved. Changes will last only until this tab closes.",
        ),
      );
  }

  function openWord(region: RevealRegion, wordId: string) {
    setSelectedRegionId(region.id);
    setSelectedWordId(wordId);
    setSelectedCardId(null);
    if (!openedRegionIds.includes(region.id)) {
      const nextOpened = {
        ...openedByComic,
        [currentComic.id]: [...openedRegionIds, region.id],
      };
      commit(srs, nextOpened);
      setToast("Word opened · no cards added");
    }
    if (window.matchMedia("(max-width: 900px)").matches) {
      window.requestAnimationFrame(() => {
        revealPanelRef.current?.scrollIntoView({
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "auto"
            : "smooth",
          block: "start",
        });
      });
    }
  }

  function learnCard(cardId: string) {
    if (selectedCardId === cardId) {
      setSelectedCardId(null);
      return;
    }
    setSelectedCardId(cardId);
    const card = lookupCard(cardId);
    if (card?.schedulable === false) {
      setToast("Preview only · this meaning still needs review");
      return;
    }
    const wasAlreadyLearnedToday = learnedTodayIds.includes(cardId);
    const nextState = recordCardHelp(srs, cardId);
    commit(nextState);
    setToast(
      wasAlreadyLearnedToday
        ? "This card was already learned today"
        : "1 card learned today · saved for review",
    );
  }

  function closeRegion() {
    setSelectedRegionId(null);
    setSelectedWordId(null);
    setSelectedCardId(null);
  }

  async function finishComic() {
    const sessionBefore = srs.activeSession;
    if (!sessionBefore || comicLoading) return;

    const clicked = new Set(sessionBefore.clickedCardIds);
    const independentlyUnderstood = sessionBefore.eligibleCardIds.filter(
      (cardId) =>
        !clicked.has(cardId) &&
        getCardProgress(srs, cardId).lastHelpDay !== srs.studyDay,
    ).length;
    const completed = completeComic(srs);
    const next = selectNextComic(corpusManifest.comics, completed);
    setComicLoading(true);
    let nextBundle: CorpusComicBundle;
    try {
      nextBundle = await loadComicBundle(next.comic);
    } catch {
      setToast("That comic could not be loaded. Your current progress is safe.");
      setComicLoading(false);
      return;
    }
    const nextOpened = { ...openedByComic, [next.comic.id]: [] };

    cacheBundle(nextBundle);
    setSummary({
      completedTitle: currentComic.titleEs,
      helpCardCount: clicked.size,
      masteredCount: independentlyUnderstood,
      nextComic: nextBundle.comic,
      overlapCardIds: next.overlapCardIds,
      advancedDays: next.advancedDays,
      reason: next.reason,
    });
    setCurrentComicId(next.comic.id);
    closeRegion();
    setShowTitleText(false);
    setComicZoomed(false);
    commit(next.state, nextOpened);
    setComicLoading(false);
  }

  async function resetProgress() {
    if (comicLoading) return;
    const fresh = selectNextComic(
      corpusManifest.comics,
      createSrsState(),
    );
    setComicLoading(true);
    let freshBundle: CorpusComicBundle;
    try {
      freshBundle = await loadComicBundle(fresh.comic);
    } catch {
      setToast("That comic could not be loaded. Your current progress is safe.");
      setComicLoading(false);
      return;
    }
    const nextOpened: OpenedByComic = {};
    cacheBundle(freshBundle);
    setCurrentComicId(fresh.comic.id);
    closeRegion();
    setComicZoomed(false);
    setSummary(null);
    setShowLibrary(false);
    setShowRankings(false);
    setShowAbout(false);
    setShowReset(false);
    setSrs(fresh.state);
    setOpenedByComic(nextOpened);
    try {
      const progressStore =
        progressStoreRef.current ?? createBrowserProgressStore();
      progressStoreRef.current = progressStore;
      await progressStore.clear();
      setStorageWarning(
        persistenceEnabledRef.current ? null : DEGRADED_CORPUS_WARNING,
      );
      setToast("Your progress has been reset");
    } catch {
      setStorageWarning(
        "Progress was reset in this tab, but saved progress could not be cleared. A reload may restore it.",
      );
    }
    setComicLoading(false);
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.key === "Escape") {
        setSummary(null);
        setShowLibrary(false);
        setShowRankings(false);
        setShowAbout(false);
        setShowReset(false);
        closeRegion();
        return;
      }
      if (summary || showLibrary || showRankings || showAbout || showReset) return;
      const regionIndex = Number(event.key) - 1;
      if (Number.isInteger(regionIndex) && currentComic.regions[regionIndex]) {
        const region = currentComic.regions[regionIndex];
        const firstWord = region.words[0];
        if (firstWord) openWord(region, firstWord.id);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // openWord intentionally uses the current render's state snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentComic, summary, showLibrary, showRankings, showAbout, showReset, srs, openedByComic]);

  useEffect(() => {
    const dialog = showReset
      ? resetRef.current
      : summary
        ? summaryRef.current
        : showLibrary
          ? libraryRef.current
          : showRankings
            ? rankingsRef.current
          : showAbout
            ? aboutRef.current
            : null;
    if (!dialog) return;

    const previousFocus = document.activeElement as HTMLElement | null;
    const background = document.querySelectorAll<HTMLElement>(
      ".topbar, .learning-layout, .action-bar",
    );
    background.forEach((element) => element.setAttribute("inert", ""));

    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);

    window.requestAnimationFrame(() => focusable()[0]?.focus());
    function trapFocus(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    dialog.addEventListener("keydown", trapFocus);
    return () => {
      dialog.removeEventListener("keydown", trapFocus);
      background.forEach((element) => element.removeAttribute("inert"));
      previousFocus?.focus();
    };
  }, [summary, showLibrary, showRankings, showAbout, showReset]);

  const libraryCards = useMemo(() => {
    const filtered = [...cardsById.values()].filter((card) => {
      if (card.schedulable === false) return false;
      const progress = getCardProgress(srs, card.id);
      if (libraryFilter === "today") return progress.lastHelpDay === srs.studyDay;
      if (libraryFilter === "next") return progress.dueDay !== null;
      if (libraryFilter === "mastered") return progress.status === "mastered";
      return progress.status !== "unseen";
    });
    return [...filtered].sort((a, b) => {
      const first = getCardProgress(srs, a.id);
      const second = getCardProgress(srs, b.id);
      return (
        (first.dueDay ?? Number.MAX_SAFE_INTEGER) -
          (second.dueDay ?? Number.MAX_SAFE_INTEGER) ||
        a.promptEs.localeCompare(b.promptEs, "es")
      );
    });
  }, [cardsById, libraryFilter, srs]);

  const targetCards = unique(eligibleCardIds)
    .map((id) => lookupCard(id))
    .filter((card): card is LearningCard => card !== null);
  const targetWidth = Math.min(760, Math.max(320, currentComic.image.width));

  return (
    <main className="app-shell" data-ready={hydrated ? "true" : "false"}>
      <header className="topbar">
        <button className="brand brand-button" onClick={() => setShowAbout(true)} aria-label="About Tira">
          <span className="brand-mark">t</span>
          <span>tira</span>
        </button>
        <div className="session-note">
          <span className="pulse-dot" /> session · day {srs.studyDay}
        </div>
        <nav className="top-actions" aria-label="Main navigation">
          <button className="text-nav active" aria-current="page">Learn</button>
          <button className="text-nav" onClick={() => setShowLibrary(true)}>My cards</button>
          <button
            className="text-nav importance-nav"
            onClick={() => setShowRankings(true)}
            disabled={!hydrated}
          >
            Rankings
          </button>
          <div className="top-stat"><strong>{dueCardIds.length}</strong> to review</div>
          <button
            className="avatar"
            onClick={() => setShowLibrary(true)}
            aria-label={`Open your cards. ${learnedTodayIds.length} ${learnedTodayIds.length === 1 ? "card" : "cards"} learned today`}
            title={`${learnedTodayIds.length} learned today`}
          >
            {learnedTodayIds.length}
          </button>
        </nav>
      </header>

      <section className="learning-layout" id="top">
        <aside className="lesson-rail">
          <div className="eyebrow">
            COMIC {Math.max(0, currentIndex) + 1} OF {corpusManifest.comics.length}
          </div>
          <h1>First,<br />just look.</h1>
          <p>
            Tap a Spanish word in the comic only when you need help. Then
            choose the exact card you want to reveal.
          </p>

          <div className="rail-progress" aria-label="Comic progress">
            <div className="progress-copy">
              <span>Explored</span>
              <strong>{openedRegionIds.length} / {currentComic.regions.length}</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${(openedRegionIds.length / currentComic.regions.length) * 100}%` }} />
            </div>
          </div>

          <div className="target-summary">
            <div className="target-label">WHY THIS COMIC</div>
            {currentDueCount > 0 ? (
              <div className="target-row"><span className="target-dot due" /> <strong>{currentDueCount}</strong> review matches</div>
            ) : null}
            {currentNewCount > 0 ? (
              <div className="target-row"><span className="target-dot new" /> <strong>{currentNewCount}</strong> new cards</div>
            ) : null}
            {currentDueCount === 0 && currentNewCount === 0 ? (
              <div className="target-row"><span className="target-dot revisit" /> a consolidation pass</div>
            ) : null}
          </div>

          <div className="target-peek">
            {targetCards.slice(0, 3).map((card) => (
              <span key={card.id} lang="es">{card.promptEs}</span>
            ))}
            {targetCards.length > 3 ? <em>+{targetCards.length - 3}</em> : null}
          </div>

          <div className="tiny-tip">
            <span>?</span>
            <p>Opening a word adds 0 cards. A card is learned only when you choose it from the sidebar.</p>
          </div>
        </aside>

        <article className="comic-stage">
          <div className="comic-heading">
            <div>
              <div className="comic-number">xkcd · {currentComic.xkcdNumber}</div>
              <h2 lang="es">{currentComic.titleEs}</h2>
              {currentComic.title !== currentComic.titleEs ? (
                <span className="original-title">{currentComic.title}</span>
              ) : null}
              {currentManifestEntry?.reviewStatus === "needs-review" ? (
                <span
                  className="review-status"
                  title="Words and meanings on this comic were extracted automatically and may contain mistakes."
                >
                  Machine-extracted · needs review
                </span>
              ) : null}
              {hydrated && currentManifestEntry?.importance ? (
                <button
                  className="importance-badge"
                  type="button"
                  onClick={() => setShowRankings(true)}
                  aria-label={`Comic importance ${formatImportanceScore(currentManifestEntry.importance.score)}, rank ${currentManifestEntry.importance.rank} of ${corpusManifest.comics.length}. This PageRank-style recursive score is provisional because generated contextual senses remain unreviewed; unresolved previews are excluded. Open comic rankings.`}
                  title="PageRank-style recursive importance. Generated contextual senses remain unreviewed, unresolved previews are excluded, and analytics grouping never merges SRS progress."
                >
                  <span>IMPORTANCE</span>
                  <strong>{formatImportanceScore(currentManifestEntry.importance.score)}</strong>
                  <small>#{currentManifestEntry.importance.rank} / {corpusManifest.comics.length}</small>
                </button>
              ) : null}
            </div>
            <div className="comic-tools">
              <button
                className={`tool-button ${showPins ? "is-active" : ""}`}
                onClick={() => setShowPins((visible) => !visible)}
                aria-pressed={showPins}
                aria-label={showPins ? "Hide clickable word markers" : "Show clickable word markers"}
              >
                <span className="pin-mini" aria-hidden="true">Aa</span>{showPins ? "Hide words" : "Show words"}
              </button>
              <button
                className={`tool-button ${comicZoomed ? "is-active" : ""}`}
                onClick={() => setComicZoomed((zoomed) => !zoomed)}
                aria-pressed={comicZoomed}
              >
                {comicZoomed ? "Fit image" : "Zoom words"}
              </button>
              <button
                className={`icon-button ${showTitleText ? "is-active" : ""}`}
                onClick={() => setShowTitleText((visible) => !visible)}
                aria-label="Show xkcd title text"
                aria-pressed={showTitleText}
              >
                i
              </button>
            </div>
          </div>

          {showTitleText ? (
            <div className="title-text" role="note">
              <span>SPANISH TITLE TEXT</span>
              <p lang="es">{currentComic.titleText.es}</p>
              {currentComic.titleText.en ? (
                <small>English: {currentComic.titleText.en}</small>
              ) : (
                <small>English title-text translation has not been reviewed yet.</small>
              )}
              {currentComic.titleText.noteEn ? <small>{currentComic.titleText.noteEn}</small> : null}
            </div>
          ) : null}

          <div className={`comic-paper ${comicZoomed ? "is-zoomed" : ""}`}>
            <div
              className={`comic-image-wrap ${showPins ? "show-pins" : "hide-pins"}`}
              style={{
                width: comicZoomed
                  ? `${Math.min(1200, Math.max(720, targetWidth * 1.65))}px`
                  : `min(100%, ${targetWidth}px)`,
                maxWidth: comicZoomed ? "none" : "100%",
                aspectRatio: `${currentComic.image.width} / ${currentComic.image.height}`,
              }}
            >
              <img
                key={currentComic.id}
                src={currentComic.image.src}
                width={currentComic.image.width}
                height={currentComic.image.height}
                alt={currentComic.image.altEn}
              />
              {currentComic.regions.flatMap((region) =>
                region.words.flatMap((word) => {
                  const isSelected =
                    selectedRegionId === region.id && selectedWordId === word.id;
                  return word.bounds.map((bounds, fragmentIndex) => {
                    const hotspotStyle = {
                      left: `${bounds.x}%`,
                      top: `${bounds.y}%`,
                      width: `${bounds.width}%`,
                      height: `${bounds.height}%`,
                    };
                    const hotspotClass = `word-hotspot ${isSelected ? "is-selected" : ""}`;
                    if (fragmentIndex > 0) {
                      return (
                        <span
                          key={`${word.id}-fragment-${fragmentIndex + 1}`}
                          className={`${hotspotClass} is-continuation`}
                          data-word-id={word.id}
                          data-word-fragment={fragmentIndex + 1}
                          lang="es"
                          style={hotspotStyle}
                          aria-hidden="true"
                          title={`Show cards for “${word.text}”`}
                          onClick={() => openWord(region, word.id)}
                        />
                      );
                    }
                    return (
                      <button
                        key={`${word.id}-fragment-1`}
                        type="button"
                        className={hotspotClass}
                        data-word-id={word.id}
                        data-word-fragment="1"
                        lang="es"
                        style={hotspotStyle}
                        aria-label={`Open cards for Spanish word: ${word.text}. Opening adds no cards.`}
                        aria-pressed={isSelected}
                        title={`Show cards for “${word.text}”`}
                        onClick={() => openWord(region, word.id)}
                      />
                    );
                  });
                }),
              )}
            </div>
          </div>

          <div className="comic-footer">
            <div>
              <a href={currentComic.source.translationPageUrl} target="_blank" rel="noreferrer">
                “{currentComic.titleEs}” · Spanish edition ↗
              </a>
              <span> by {currentComic.source.translationCredit}</span>
            </div>
            <div>
              <a href={currentComic.source.originalPageUrl} target="_blank" rel="noreferrer">Original xkcd #{currentComic.xkcdNumber}</a>
              <span> · Randall Munroe · </span>
              <a href={currentComic.source.licenseUrl} target="_blank" rel="noreferrer">CC BY-NC 2.5</a>
            </div>
          </div>
        </article>

        <aside ref={revealPanelRef} className={`reveal-panel ${selectedRegion ? "has-selection" : ""}`}>
          {selectedRegion ? (
            <div className="reveal-scroll">
              <div className="reveal-meta">
                <span>DISCOVERY {openedRegionIds.indexOf(selectedRegion.id) + 1}</span>
                <button onClick={closeRegion} aria-label="Close explanation">×</button>
              </div>

              <div className="selected-word-kicker">SELECTED SPANISH WORD</div>
              <div className="phrase-original" lang="es">“{selectedWord?.text ?? selectedRegion.labelEs}”</div>
              <div className={`zero-card-callout ${selectedWordLearnedTodayCount > 0 ? "has-learned" : ""}`} role="status">
                <strong>
                  {selectedWordLearnedTodayCount > 0
                    ? `${selectedWordLearnedTodayCount} related ${selectedWordLearnedTodayCount === 1 ? "card" : "cards"} learned today`
                    : selectedWordSchedulableCardCount > 0
                      ? "Word opened · no cards selected"
                      : "Translation draft · preview only"}
                </strong>
                <span>
                  {selectedWordLearnedTodayCount > 0
                    ? "These may include shared cards learned elsewhere today; only explicit card choices are scheduled."
                    : selectedWordSchedulableCardCount > 0
                      ? "Choose a card below. Opening the word alone changes nothing."
                      : "No reviewed-safe English match is available yet, so this word cannot enter spaced repetition."}
                </span>
              </div>

              {selectedWord ? (
                <section className="candidate-section" aria-labelledby="candidate-title">
                  <div className="cards-heading">
                    <span>CHOOSE A FLASHCARD</span>
                    <strong>
                      {selectedWordSchedulableCardCount > 0
                        ? `${candidateCards.filter((card) => learnedTodayIds.includes(card.id)).length} / ${selectedWordSchedulableCardCount} review cards learned today`
                        : "Preview only"}
                    </strong>
                  </div>
                  <h4 id="candidate-title">
                    Cards related to <span lang="es">“{selectedWord.text}”</span>
                  </h4>
                  <p className="cards-instruction">
                    Previewing this list adds nothing. Select only a card whose answer you want to see.
                  </p>

                  <div className="candidate-groups">
                    {KIND_GROUPS.map((group) => {
                      const groupCards = candidateCards.filter((card) => card.kind === group.kind);
                      if (groupCards.length === 0) return null;
                      const hasProvisionalCards = groupCards.some(
                        (card) => card.reviewStatus === "needs-review",
                      );
                      return (
                        <section className="card-kind-group" key={group.kind} aria-label={group.label}>
                          <div className="card-kind-heading">
                            <span className={`kind-badge kind-${group.kind}`}>{group.label}</span>
                            <small>
                              {group.kind === "word" && hasProvisionalCards
                                ? "Machine-extracted dictionary candidates; contextual senses still need review"
                                : group.description}
                            </small>
                          </div>
                          <div className="candidate-list">
                            {groupCards.map((card) => {
                              const isSelected = selectedCardId === card.id;
                              const isLearned = learnedTodayIds.includes(card.id);
                              const isProvisional = card.reviewStatus === "needs-review";
                              const isSchedulable = card.schedulable !== false;
                              const candidateId = `candidate-${encodeURIComponent(card.id)}`;
                              const frontId = `${candidateId}-front`;
                              const answerId = `${candidateId}-answer`;
                              const patternId = `${candidateId}-pattern`;
                              const howItWorksId = `${candidateId}-how-it-works`;
                              const generalExampleId = `${candidateId}-general-example`;
                              const comicApplicationId = `${candidateId}-in-this-comic`;
                              const matchingApplications =
                                selectedRegion?.applications.filter(
                                  (application) =>
                                    application.cardId === card.id &&
                                    application.participantWordIds.includes(selectedWord.id),
                                ) ?? [];
                              const hasSupportingContent = Boolean(
                                card.noteEn ||
                                card.example ||
                                matchingApplications.length > 0,
                              );
                              const isCompactWordCard =
                                card.kind === "word" && !hasSupportingContent;
                              return (
                                <article
                                  key={card.id}
                                  id={`flashcard-${encodeURIComponent(card.id)}`}
                                  className={`candidate-card ${isSelected ? "active" : ""} ${isLearned ? "is-learned" : ""} ${isProvisional ? "is-provisional" : ""} ${!isSchedulable ? "is-preview-only" : ""} ${isCompactWordCard ? "compact-word-card" : ""}`}
                                >
                                  <button
                                    type="button"
                                    className="candidate-trigger"
                                    onClick={() => learnCard(card.id)}
                                    aria-expanded={isSelected}
                                    aria-controls={isSelected ? answerId : undefined}
                                    aria-labelledby={frontId}
                                    aria-describedby={`${candidateId}-status`}
                                  >
                                    <span className="candidate-state" aria-hidden="true">{isLearned ? "✓" : "→"}</span>
                                    <span className="candidate-copy">
                                      {card.questionEn ? (
                                        <strong id={frontId} className="candidate-question">
                                          {card.questionEn}
                                        </strong>
                                      ) : (
                                        <strong id={frontId} className="candidate-prompt" lang="es">
                                          {card.promptEs}
                                        </strong>
                                      )}
                                      {isProvisional ? (
                                        <span className="candidate-review-flag">
                                          Needs human review
                                        </span>
                                      ) : null}
                                      <small id={`${candidateId}-status`}>
                                        {!isSchedulable
                                          ? isSelected
                                            ? "Preview shown · not added to review"
                                            : "Preview only · not ready for review"
                                          : isSelected
                                          ? card.kind === "word"
                                            ? isProvisional
                                              ? "Dictionary candidate shown · tap to close"
                                              : "Meaning shown · tap to close"
                                            : "Answer shown · tap to close"
                                          : isLearned
                                            ? card.kind === "word"
                                              ? "Learned today · show meaning"
                                              : "Learned today · show answer"
                                            : card.kind === "word"
                                              ? isProvisional
                                                ? "Reveal candidate + add to review"
                                                : "Reveal meaning + add to review"
                                              : "Reveal answer + add to review"}
                                      </small>
                                    </span>
                                  </button>

                                  {isSelected ? (
                                    <div
                                      id={answerId}
                                      className="candidate-reveal"
                                      role="region"
                                      aria-labelledby={frontId}
                                    >
                                      <div className="candidate-answer-label">
                                        {card.kind === "word"
                                          ? isProvisional
                                            ? "PROVISIONAL DICTIONARY MATCH"
                                            : "MEANING HERE"
                                          : "SHORT ANSWER"}
                                      </div>
                                      <div className="candidate-answer">{card.answerEn}</div>

                                      {isProvisional ? (
                                        <p className="candidate-provisional-note">
                                          {isSchedulable
                                            ? "This is a machine-extracted dictionary match. Its meaning in this exact comic has not been reviewed yet."
                                            : "No safe English match is available yet. This preview is not added to spaced repetition."}
                                        </p>
                                      ) : null}

                                      {card.questionEn ? (
                                        <section
                                          className={`candidate-pattern ${card.kind === "phrase" ? "is-expression" : ""}`}
                                          aria-labelledby={patternId}
                                        >
                                          <h5 id={patternId}>
                                            {card.kind === "phrase"
                                              ? "SPANISH EXPRESSION"
                                              : "SPANISH PATTERN"}
                                          </h5>
                                          <p lang="es">{card.promptEs}</p>
                                        </section>
                                      ) : null}

                                      {card.noteEn ? (
                                        <section
                                          className="candidate-explanation"
                                          aria-labelledby={howItWorksId}
                                        >
                                          <h5 id={howItWorksId}>HOW IT WORKS</h5>
                                          <p>{card.noteEn}</p>
                                        </section>
                                      ) : null}

                                      {card.example ? (
                                        <section
                                          className="candidate-general-example"
                                          aria-labelledby={generalExampleId}
                                        >
                                          <h5 id={generalExampleId}>GENERAL EXAMPLE</h5>
                                          <p className="candidate-example-es" lang="es">
                                            {card.example.es}
                                          </p>
                                          <p className="candidate-example-en">{card.example.en}</p>
                                        </section>
                                      ) : null}

                                      {matchingApplications.length > 0 ? (
                                        <section
                                          className="candidate-applications"
                                          aria-labelledby={comicApplicationId}
                                        >
                                          <h5 id={comicApplicationId}>IN THIS COMIC</h5>
                                          {matchingApplications.map((application) => (
                                            <div className="candidate-application" key={application.id}>
                                              <strong lang="es">{application.exampleEs}</strong>
                                              <p>{application.explanationEn}</p>
                                            </div>
                                          ))}
                                        </section>
                                      ) : null}

                                      {card.kind !== "word" ? (
                                        <div className="candidate-tags">
                                          {card.tags.map((tag) => <span key={tag}>{tag}</span>)}
                                        </div>
                                      ) : null}
                                      {isSchedulable ? (
                                        <div className="candidate-memory"><span>✓</span> Returns on day {srs.studyDay + 1}</div>
                                      ) : (
                                        <div className="candidate-memory is-preview"><span>○</span> Not scheduled · translation needs review</div>
                                      )}
                                    </div>
                                  ) : null}
                                </article>
                              );
                            })}
                          </div>
                        </section>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <div className="choose-word-prompt"><span>↖</span> Choose a highlighted word directly in the comic. This still adds 0 cards.</div>
              )}

            </div>
          ) : (
            <div className="empty-reveal">
              <div className="empty-glyph">1</div>
              <h3>Let the comic speak first.</h3>
              <p>
                Choose a word whenever you need help. Tap any marked Spanish word in the picture; its word meaning, reusable expression, grammar, and necessary context cards will appear here.
              </p>
              <div className="gesture-line"><span>↖</span> try any highlighted Spanish word</div>
              <div className="today-mini">
                <span>TODAY</span>
                <strong>{learnedTodayIds.length}</strong>
                <p>{learnedTodayIds.length === 1 ? "card learned" : "cards learned"}</p>
              </div>
            </div>
          )}
        </aside>
      </section>

      <footer className="action-bar">
        <div className="action-hint">
          <span className="keycap">1–{currentComic.regions.length}</span>
          <span>shortcuts to each text group’s first word</span>
        </div>
        <button className="finish-button" onClick={finishComic} disabled={comicLoading}>
          {comicLoading ? "Loading the next comic…" : "I understand this comic"} <span>→</span>
        </button>
        <div className="review-preview">
          <strong>{clickedCardIds.length}</strong> help cards this comic · <strong>{eligibleCardIds.filter((cardId) => !clickedCardIds.includes(cardId)).length}</strong> understood independently
        </div>
      </footer>

      {summary ? (
        <div className="modal-backdrop" role="presentation">
          <section ref={summaryRef} className="summary-modal" role="dialog" aria-modal="true" aria-labelledby="summary-title">
            <div className="success-orbit"><span>✓</span></div>
            <div className="summary-eyebrow">COMIC UNDERSTOOD</div>
            <h2 id="summary-title" lang="es">{summary.completedTitle}</h2>
            <p>The comic did its job. Your next one comes from your review schedule, not from chance.</p>

            <div className="grade-grid">
              <div><strong>{summary.helpCardCount}</strong><span>help used this comic</span><small>return soon</small></div>
              <div><strong>{summary.masteredCount}</strong><span>understood unaided</span><small>graduated</small></div>
            </div>

            {summary.advancedDays > 0 ? (
              <div className="time-jump">The simulation advanced <strong>{summary.advancedDays} days</strong> to your next review.</div>
            ) : null}

            <div className="next-comic-card">
              <img src={summary.nextComic.image.src} alt="" />
              <div>
                <span>UP NEXT</span>
                <strong lang="es">{summary.nextComic.titleEs}</strong>
                <p>
                  {summary.reason === "due"
                    ? `${summary.overlapCardIds.length} matches with your review set`
                    : "opens a new part of the Spanish curriculum"}
                </p>
              </div>
            </div>
            {summary.overlapCardIds.length > 0 ? (
              <div className="overlap-chips">
                {summary.overlapCardIds.slice(0, 4).map((id) => {
                  const card = cardsById.get(id);
                  return card ? <span key={id} lang="es">{card.promptEs}</span> : null;
                })}
              </div>
            ) : null}
            <button className="primary-wide" onClick={() => setSummary(null)}>Continue to the next comic <span>→</span></button>
            <button className="secondary-link" onClick={() => { setSummary(null); setShowLibrary(true); }}>View my cards</button>
          </section>
        </div>
      ) : null}

      {showLibrary ? (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLibrary(false); }}>
          <aside ref={libraryRef} className="memory-drawer" role="dialog" aria-modal="true" aria-labelledby="memory-title">
            <div className="drawer-header">
              <div><span>YOUR MEMORY</span><h2 id="memory-title">My cards</h2></div>
              <button onClick={() => setShowLibrary(false)} aria-label="Close cards">×</button>
            </div>
            <div className="memory-overview">
              <div><strong>{learnedTodayIds.length}</strong><span>today</span></div>
              <div><strong>{dueCardIds.length}</strong><span>due now</span></div>
              <div><strong>{masteredCount}</strong><span>mastered</span></div>
            </div>
            <div className="memory-tabs" aria-label="Card filters">
              {([
                ["today", "Today"],
                ["next", "Upcoming"],
                ["mastered", "Mastered"],
                ["all", "All"],
              ] as const).map(([filter, label]) => (
                <button
                  key={filter}
                  className={libraryFilter === filter ? "active" : ""}
                  onClick={() => {
                    setLibraryFilter(filter);
                    setLibraryLimit(200);
                  }}
                  aria-pressed={libraryFilter === filter}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="memory-list">
              {libraryCards.length > 0 ? (
                <>
                  {libraryCards.slice(0, libraryLimit).map((card) => {
                    const progress = getCardProgress(srs, card.id);
                    return (
                      <article className="memory-row" key={card.id}>
                        <span className={`memory-kind kind-${card.kind}`}>{card.kind === "word" ? "A" : card.kind === "phrase" ? "“”" : card.kind === "grammar" ? "≋" : "✦"}</span>
                        <div><strong lang="es">{card.promptEs}</strong><p>{card.answerEn}</p></div>
                        <span className={`status-pill status-${progress.status}`}>{statusLabel(progress, srs.studyDay)}</span>
                      </article>
                    );
                  })}
                  {libraryCards.length > libraryLimit ? (
                    <button
                      className="library-more"
                      onClick={() => setLibraryLimit((limit) => limit + 200)}
                    >
                      Show 200 more · {libraryCards.length - libraryLimit} remaining
                    </button>
                  ) : null}
                </>
              ) : (
                <div className="empty-list"><span>○</span><h3>Nothing here yet.</h3><p>Open a word in the comic, then reveal a specific card to add it here.</p></div>
              )}
            </div>
            <div className="drawer-footer">
              <button onClick={() => { setShowLibrary(false); setShowAbout(true); }}>How it works</button>
              <button className="danger-link" onClick={() => setShowReset(true)}>Reset progress</button>
            </div>
          </aside>
        </div>
      ) : null}

      {showRankings ? (
        <div
          className="drawer-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowRankings(false);
          }}
        >
          <aside
            ref={rankingsRef}
            className="memory-drawer rankings-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rankings-title"
            aria-describedby="rankings-description"
          >
            <div className="drawer-header rankings-header">
              <div>
                <span>COMIC–TARGET GRAPH</span>
                <h2 id="rankings-title">Comic importance</h2>
              </div>
              <button onClick={() => setShowRankings(false)} aria-label="Close comic rankings">×</button>
            </div>
            <div className="rankings-intro" id="rankings-description">
              <p>
                This PageRank-style recursive importance uses damped two-way comic–target centrality: comics raise their linked targets, and targets raise every linked comic. An 85% linked influence plus a 15% baseline/reset keeps disconnected and zero-target comics from vanishing. The calculation repeats until stable; comic scores below sum to 100%.
              </p>
              <p className="rankings-caveat">
                <strong>Current limitation:</strong> word targets are grouped for analytics when their normalized Spanish prompt and English answer match across reviewed and generated schedulable cards. Higher-level targets use exact card IDs. Generated contextual senses remain unreviewed, so these scores are provisional; unresolved preview cards are excluded. Analytics grouping never merges SRS card IDs or progress.
              </p>
              <div className="rankings-model" aria-label="Importance model details">
                <span>{Math.round(corpusManifest.importanceModel.damping * 100)}% linked influence</span>
                <span>{Math.round((1 - corpusManifest.importanceModel.damping) * 100)}% baseline/reset</span>
                <span>{corpusManifest.importanceModel.cardNodeCount.toLocaleString("en")} targets</span>
                <span>{corpusManifest.importanceModel.edgeCount.toLocaleString("en")} links</span>
                <span>{corpusManifest.importanceModel.iterations} iterations</span>
              </div>
            </div>
            <div className="rankings-columns" aria-hidden="true">
              <span>Rank &amp; comic</span>
              <span>Importance</span>
              <span>Connected targets</span>
            </div>
            {/* A named, independently scrolling region must be keyboard-focusable. */}
            <div
              className="rankings-list-region"
              role="region"
              tabIndex={0}
              aria-label="Comic importance rankings; scroll to view all comics"
            >
              <ol className="rankings-list">
                {rankedComics.map((comic) => {
                  const isCurrent = comic.id === currentComic.id;
                  return (
                    <li
                      className={isCurrent ? "is-current" : undefined}
                      key={comic.id}
                      aria-current={isCurrent ? "true" : undefined}
                    >
                      <span className="ranking-number">#{comic.importance.rank}</span>
                      <div className="ranking-comic">
                        <strong lang="es">{comic.titleEs}</strong>
                        <span>xkcd · {comic.xkcdNumber}{isCurrent ? " · reading now" : ""}</span>
                      </div>
                      <strong className="ranking-score">
                        {formatImportanceScore(comic.importance.score)}
                      </strong>
                      <div
                        className="ranking-card-counts"
                        role="group"
                        aria-label={`${comic.importance.cardCount} connected targets; ${comic.importance.sharedCardCount} cross-comic targets`}
                      >
                        <strong aria-hidden="true">{comic.importance.cardCount}</strong>
                        <span className="ranking-card-label" aria-hidden="true">targets</span>
                        <span className="ranking-shared-count" aria-hidden="true">
                          {comic.importance.sharedCardCount} cross-comic
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
            <div className="rankings-footnote">
              “Cross-comic” means one analytics target connects to more than one comic. Word targets use normalized Spanish-prompt + English-answer matching; higher-level targets use exact IDs. This grouping never merges occurrence-specific SRS cards.
            </div>
          </aside>
        </div>
      ) : null}

      {showAbout ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAbout(false); }}>
          <section ref={aboutRef} className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <button className="modal-close" onClick={() => setShowAbout(false)} aria-label="Close">×</button>
            <div className="brand about-brand"><span className="brand-mark">t</span><span>tira</span></div>
            <div className="summary-eyebrow">HOW IT WORKS</div>
            <h2 id="about-title">Learn Spanish, one comic at a time.</h2>
            <p>Tira turns the real context of a Spanish comic into a memory session—without a separate quiz.</p>
            <ol className="method-steps">
              <li><span>1</span><div><strong>Read before translating</strong><p>The Spanish artwork and the joke give you a real chance to infer meaning.</p></div></li>
              <li><span>2</span><div><strong>Choose word, then card</strong><p>Click a word directly in the picture. Opening it saves nothing; reveal only the word meaning, reusable expression, grammar lesson, or context card you needed.</p></div></li>
              <li><span>3</span><div><strong>Finish honestly</strong><p>What you understood unaided graduates; what needed help returns soon.</p></div></li>
              <li><span>4</span><div><strong>Let overlap choose</strong><p>Your next comic contains as many of your due cards as possible.</p></div></li>
            </ol>
            <div className="license-note">
              <strong>About comic importance</strong>
              <p>Importance is PageRank-style recursive importance—a damped two-way comic–target centrality calculation. Comics raise linked targets; targets raise every linked comic. Eighty-five percent of influence follows links, while a 15% baseline/reset prevents disconnected and zero-target nodes from vanishing; the process repeats until stable, then comic scores are normalized to sum to 100%. For analytics only, reviewed and generated schedulable word cards share a canonical target when their normalized Spanish prompt and English answer match; higher-level cards use exact IDs. SRS IDs and progress remain separate. Generated contextual senses are unreviewed, so scores are provisional, and unresolved previews are excluded.</p>
              <strong>About the 258-comic corpus</strong>
              <p>Six lessons are fully reviewed. The remaining archive entries are an authoring preview built from image OCR and conservative dictionary matches. They are labeled “needs review”; unresolved previews are never added to spaced repetition, and generated grammar or expression lessons still require human authoring.</p>
              <strong>About the comics</strong>
              <p>Original work by Randall Munroe, published by xkcd under <a href="https://creativecommons.org/licenses/by-nc/2.5/" target="_blank" rel="noreferrer">CC BY-NC 2.5</a>. Spanish translations by <a href="https://es.xkcd.com/" target="_blank" rel="noreferrer">Gabriel Rodríguez Alberich / xkcd en español</a>. Interactive word markers and learning notes are unofficial adaptations. Tira is free, noncommercial, and not affiliated with xkcd.</p>
            </div>
            <button className="primary-wide" onClick={() => setShowAbout(false)}>Back to the comic</button>
          </section>
        </div>
      ) : null}

      {showReset ? (
        <div className="modal-backdrop reset-layer" role="presentation">
          <section ref={resetRef} className="reset-modal" role="alertdialog" aria-modal="true" aria-labelledby="reset-title">
            <div className="warning-glyph">↺</div>
            <h2 id="reset-title">Start over?</h2>
            <p>This removes every card, interval, and history entry saved on this device.</p>
            <div className="reset-actions">
              <button onClick={() => setShowReset(false)}>Cancel</button>
              <button onClick={resetProgress} disabled={comicLoading}>Yes, reset</button>
            </div>
          </section>
        </div>
      ) : null}

      {storageWarning ? (
        <div className="toast" role="alert"><span aria-hidden="true">!</span>{storageWarning}</div>
      ) : toast ? (
        <div className="toast" role="status"><span>✓</span>{toast}</div>
      ) : null}
    </main>
  );
}
