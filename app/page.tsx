"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CARDS,
  CARD_BY_ID,
  COMICS,
  COMIC_BY_ID,
  type CardId,
  type Comic,
  type LearningCard,
  type RevealRegion,
} from "../lib/content";
import {
  completeComic,
  createSrsState,
  getCardProgress,
  getDueCardIds,
  getLearnedTodayCardIds,
  hydrateSrsState,
  recordCardHelp,
  selectNextComic,
  serializeSrsState,
  type CardProgress,
  type SrsState,
} from "../lib/srs";

const SRS_STORAGE_KEY = "tira:srs:v2";
const UI_STORAGE_KEY = "tira:ui:v2";
const CURRICULUM_CARD_IDS = CARDS.map((card) => card.id);

const KIND_LABELS: Record<LearningCard["kind"], string> = {
  word: "word",
  phrase: "phrase",
  grammar: "grammar",
  concept: "idea",
};

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
    label: "Expression or phrase",
    description: "Meaning created by words used together",
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
type OpenedByComic = Record<string, string[]>;

interface Summary {
  completedTitle: string;
  helpCardCount: number;
  masteredCount: number;
  nextComic: Comic;
  overlapCardIds: string[];
  advancedDays: number;
  reason: "due" | "new" | "revisit";
}

const initialSelection = selectNextComic(COMICS, createSrsState());

function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function lookupCard(cardId: string): LearningCard | null {
  return (CARD_BY_ID.get(cardId as CardId) as LearningCard | undefined) ?? null;
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

function readOpenedRegions(): OpenedByComic {
  try {
    const raw = window.localStorage.getItem(UI_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { openedByComic?: unknown };
    if (!parsed.openedByComic || typeof parsed.openedByComic !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed.openedByComic).map(([comicId, regionIds]) => [
        comicId,
        Array.isArray(regionIds)
          ? regionIds.filter((id): id is string => typeof id === "string")
          : [],
      ]),
    );
  } catch {
    return {};
  }
}

function persist(nextState: SrsState, openedByComic: OpenedByComic) {
  try {
    window.localStorage.setItem(SRS_STORAGE_KEY, serializeSrsState(nextState));
    window.localStorage.setItem(
      UI_STORAGE_KEY,
      JSON.stringify({ openedByComic }),
    );
  } catch {
    // Storage can be unavailable in privacy modes. The in-memory session keeps working.
  }
}

function readStoredSrs(): string | null {
  try {
    return window.localStorage.getItem(SRS_STORAGE_KEY);
  } catch {
    return null;
  }
}

export default function Home() {
  const [srs, setSrs] = useState<SrsState>(initialSelection.state);
  const [currentComicId, setCurrentComicId] = useState(initialSelection.comic.id);
  const [openedByComic, setOpenedByComic] = useState<OpenedByComic>({});
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showPins, setShowPins] = useState(true);
  const [showTitleText, setShowTitleText] = useState(false);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("today");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const revealPanelRef = useRef<HTMLElement>(null);
  const summaryRef = useRef<HTMLElement>(null);
  const libraryRef = useRef<HTMLElement>(null);
  const aboutRef = useRef<HTMLElement>(null);
  const resetRef = useRef<HTMLElement>(null);

  const currentComic = COMIC_BY_ID.get(currentComicId) ?? COMICS[0];
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
  const selectedCard = selectedCardId ? lookupCard(selectedCardId) : null;
  const dueCardIds = getDueCardIds(srs, CURRICULUM_CARD_IDS);
  const learnedTodayIds = getLearnedTodayCardIds(srs).filter((cardId) =>
    CARD_BY_ID.has(cardId as CardId),
  );
  const activeSession = srs.activeSession;
  const clickedCardIds = activeSession?.clickedCardIds ?? [];
  const eligibleCardIds = activeSession?.eligibleCardIds ?? [];
  const selectedWordLearnedTodayCount = selectedWord
    ? unique(selectedWord.cardIds).filter((cardId) =>
        learnedTodayIds.includes(cardId),
      ).length
    : 0;
  const currentIndex = COMICS.findIndex((comic) => comic.id === currentComic.id);
  const currentDueCount = unique(currentComic.cardIds).filter((cardId) =>
    dueCardIds.includes(cardId),
  ).length;
  const currentNewCount = unique(currentComic.cardIds).filter(
    (cardId) => getCardProgress(srs, cardId).status === "unseen",
  ).length;
  const masteredCount = CARDS.filter(
    (card) => getCardProgress(srs, card.id).status === "mastered",
  ).length;

  useEffect(() => {
    const restored = hydrateSrsState(readStoredSrs());
    const selected = selectNextComic(COMICS, restored);
    const restoredOpened = readOpenedRegions();
    persist(selected.state, restoredOpened);
    queueMicrotask(() => {
      setSrs(selected.state);
      setCurrentComicId(selected.comic.id);
      setOpenedByComic(restoredOpened);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function commit(nextState: SrsState, nextOpened = openedByComic) {
    setSrs(nextState);
    setOpenedByComic(nextOpened);
    if (hydrated) persist(nextState, nextOpened);
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
    setSelectedCardId(cardId);
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

  function finishComic() {
    const sessionBefore = srs.activeSession;
    if (!sessionBefore) return;

    const clicked = new Set(sessionBefore.clickedCardIds);
    const independentlyUnderstood = sessionBefore.eligibleCardIds.filter(
      (cardId) =>
        !clicked.has(cardId) &&
        getCardProgress(srs, cardId).lastHelpDay !== srs.studyDay,
    ).length;
    const completed = completeComic(srs);
    const next = selectNextComic(COMICS, completed);
    const nextOpened = { ...openedByComic, [next.comic.id]: [] };

    setSummary({
      completedTitle: currentComic.titleEs,
      helpCardCount: clicked.size,
      masteredCount: independentlyUnderstood,
      nextComic: next.comic,
      overlapCardIds: next.overlapCardIds,
      advancedDays: next.advancedDays,
      reason: next.reason,
    });
    setCurrentComicId(next.comic.id);
    closeRegion();
    setShowTitleText(false);
    commit(next.state, nextOpened);
  }

  function resetProgress() {
    const fresh = selectNextComic(COMICS, createSrsState());
    const nextOpened: OpenedByComic = {};
    setCurrentComicId(fresh.comic.id);
    closeRegion();
    setSummary(null);
    setShowLibrary(false);
    setShowAbout(false);
    setShowReset(false);
    commit(fresh.state, nextOpened);
    persist(fresh.state, nextOpened);
    setToast("Your progress has been reset");
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      if (event.key === "Escape") {
        setSummary(null);
        setShowLibrary(false);
        setShowAbout(false);
        setShowReset(false);
        closeRegion();
        return;
      }
      if (summary || showLibrary || showAbout || showReset) return;
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
  }, [currentComic, summary, showLibrary, showAbout, showReset, srs, openedByComic]);

  useEffect(() => {
    const dialog = showReset
      ? resetRef.current
      : summary
        ? summaryRef.current
        : showLibrary
          ? libraryRef.current
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
  }, [summary, showLibrary, showAbout, showReset]);

  const libraryCards = useMemo(() => {
    const filtered = CARDS.filter((card) => {
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
  }, [libraryFilter, srs]);

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
          <div className="eyebrow">COMIC {currentIndex + 1} OF {COMICS.length}</div>
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
              <span className="original-title">{currentComic.title}</span>
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
              <small>English: {currentComic.titleText.en}</small>
              {currentComic.titleText.noteEn ? <small>{currentComic.titleText.noteEn}</small> : null}
            </div>
          ) : null}

          <div className="comic-paper">
            <div
              className={`comic-image-wrap ${showPins ? "show-pins" : "hide-pins"}`}
              style={{
                width: `min(100%, ${targetWidth}px)`,
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

        <aside ref={revealPanelRef} className={`reveal-panel ${selectedRegion ? "has-selection" : ""}`} aria-live="polite">
          {selectedRegion ? (
            <div className="reveal-scroll">
              <div className="reveal-meta">
                <span>DISCOVERY {openedRegionIds.indexOf(selectedRegion.id) + 1}</span>
                <button onClick={closeRegion} aria-label="Close explanation">×</button>
              </div>

              <div className="selected-word-kicker">SELECTED SPANISH WORD</div>
              <div className="phrase-original" lang="es">“{selectedWord?.text ?? selectedRegion.labelEs}”</div>
              <div className="phrase-context">From: <span lang="es">“{selectedRegion.labelEs}”</span></div>
              <div className={`zero-card-callout ${selectedWordLearnedTodayCount > 0 ? "has-learned" : ""}`} role="status">
                <strong>
                  {selectedWordLearnedTodayCount > 0
                    ? `${selectedWordLearnedTodayCount} related ${selectedWordLearnedTodayCount === 1 ? "card" : "cards"} learned today`
                    : "Word opened · no cards selected"}
                </strong>
                <span>
                  {selectedWordLearnedTodayCount > 0
                    ? "These may include shared cards learned elsewhere today; only explicit card choices are scheduled."
                    : "Choose a card below. Opening the word alone changes nothing."}
                </span>
              </div>

              {selectedWord ? (
                <section className="candidate-section" aria-labelledby="candidate-title">
                  <div className="cards-heading">
                    <span>CHOOSE A FLASHCARD</span>
                    <strong>{candidateCards.filter((card) => learnedTodayIds.includes(card.id)).length} / {candidateCards.length} learned today</strong>
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
                      return (
                        <section className="card-kind-group" key={group.kind} aria-label={group.label}>
                          <div className="card-kind-heading">
                            <span className={`kind-badge kind-${group.kind}`}>{group.label}</span>
                            <small>{group.description}</small>
                          </div>
                          <div className="candidate-list">
                            {groupCards.map((card) => {
                              const isSelected = selectedCardId === card.id;
                              const isLearned = learnedTodayIds.includes(card.id);
                              const candidateId = `candidate-${encodeURIComponent(card.id)}`;
                              return (
                                <button
                                  key={card.id}
                                  className={`${isSelected ? "active" : ""} ${isLearned ? "is-learned" : ""}`}
                                  onClick={() => learnCard(card.id)}
                                  aria-pressed={isSelected}
                                  aria-labelledby={`${candidateId}-prompt`}
                                  aria-describedby={`${candidateId}-status`}
                                >
                                  <span className="candidate-state" aria-hidden="true">{isLearned ? "✓" : "→"}</span>
                                  <span className="candidate-copy">
                                    <strong id={`${candidateId}-prompt`} lang="es">{card.promptEs}</strong>
                                    <small id={`${candidateId}-status`}>{isLearned ? "Learned today; reveal again" : "Reveal answer + add to review"}</small>
                                  </span>
                                </button>
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

              {selectedCard ? (
                <section className="learning-card-detail" aria-label={`Revealed ${KIND_LABELS[selectedCard.kind]} card`}>
                  <div className="detail-heading">
                    <div className={`kind-badge kind-${selectedCard.kind}`}>{KIND_LABELS[selectedCard.kind]}</div>
                    <span>LEARNED TODAY</span>
                  </div>
                  <div className="card-answer" lang="es">{selectedCard.promptEs}</div>
                  <div className="card-prompt">{selectedCard.answerEn}</div>
                  <p>{selectedCard.noteEn}</p>
                  <div className="card-tags">
                    {selectedCard.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <div className="memory-copy"><span>✓</span> This specific card returns on day {srs.studyDay + 1}</div>
                </section>
              ) : selectedWord ? (
                <div className="choose-card-prompt"><span>↑</span> Choose a card to reveal its answer and count it as learned today.</div>
              ) : null}

              {selectedCard ? (
                <div className="bubble-context">
                  <div className="translation-label">WHOLE-BUBBLE CONTEXT · NOT AN EXTRA CARD</div>
                  <strong>{selectedRegion.translationEn}</strong>
                  <p>{selectedRegion.noteEn}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="empty-reveal">
              <div className="empty-glyph">1</div>
              <h3>Let the comic speak first.</h3>
              <p>
                Choose a word whenever you need help. Tap any marked Spanish word in the picture; its meaning, expression, grammar, and idea cards will appear here.
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
        <button className="finish-button" onClick={finishComic}>
          I understand this comic <span>→</span>
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
                  const card = CARD_BY_ID.get(id as CardId);
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
                <button key={filter} className={libraryFilter === filter ? "active" : ""} onClick={() => setLibraryFilter(filter)} aria-pressed={libraryFilter === filter}>{label}</button>
              ))}
            </div>
            <div className="memory-list">
              {libraryCards.length > 0 ? libraryCards.map((card) => {
                const progress = getCardProgress(srs, card.id);
                return (
                  <article className="memory-row" key={card.id}>
                    <span className={`memory-kind kind-${card.kind}`}>{card.kind === "word" ? "A" : card.kind === "phrase" ? "“”" : card.kind === "grammar" ? "≋" : "✦"}</span>
                    <div><strong lang="es">{card.promptEs}</strong><p>{card.answerEn}</p></div>
                    <span className={`status-pill status-${progress.status}`}>{statusLabel(progress, srs.studyDay)}</span>
                  </article>
                );
              }) : (
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
              <li><span>2</span><div><strong>Choose word, then card</strong><p>Click a word directly in the picture. Opening it saves nothing; reveal only the meaning, expression, grammar, or idea you needed.</p></div></li>
              <li><span>3</span><div><strong>Finish honestly</strong><p>What you understood unaided graduates; what needed help returns soon.</p></div></li>
              <li><span>4</span><div><strong>Let overlap choose</strong><p>Your next comic contains as many of your due cards as possible.</p></div></li>
            </ol>
            <div className="license-note">
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
              <button onClick={resetProgress}>Yes, reset</button>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? <div className="toast" role="status"><span>✓</span>{toast}</div> : null}
    </main>
  );
}
