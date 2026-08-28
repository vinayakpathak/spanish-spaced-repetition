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

const SRS_STORAGE_KEY = "tira:srs:v1";
const UI_STORAGE_KEY = "tira:ui:v1";
const CURRICULUM_CARD_IDS = CARDS.map((card) => card.id);

const KIND_LABELS: Record<LearningCard["kind"], string> = {
  word: "palabra",
  phrase: "frase",
  grammar: "gramática",
  concept: "idea",
};

type LibraryFilter = "today" | "next" | "mastered" | "all";
type OpenedByComic = Record<string, string[]>;

interface Summary {
  completedTitle: string;
  learnedCount: number;
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

function cardsForRegion(region: RevealRegion | null): LearningCard[] {
  if (!region) return [];
  return region.cardIds
    .map((id) => lookupCard(id))
    .filter((card): card is LearningCard => card !== null);
}

function lookupCard(cardId: string): LearningCard | null {
  return (CARD_BY_ID.get(cardId as CardId) as LearningCard | undefined) ?? null;
}

function statusLabel(progress: CardProgress, studyDay: number): string {
  if (progress.lastHelpDay === studyDay) return "aprendiendo hoy";
  if (progress.status === "unseen") return "nueva";
  if (progress.dueDay !== null && progress.dueDay <= studyDay) return "para ahora";
  if (progress.dueDay !== null) {
    const days = progress.dueDay - studyDay;
    return days === 1 ? "mañana" : `en ${days} días`;
  }
  return progress.status === "mastered" ? "dominada" : "en curso";
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
  const [selectedCardIndex, setSelectedCardIndex] = useState(-1);
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
  const selectedCards = cardsForRegion(selectedRegion);
  const selectedCard =
    selectedCardIndex >= 0 ? selectedCards[selectedCardIndex] ?? null : null;
  const dueCardIds = getDueCardIds(srs, CURRICULUM_CARD_IDS);
  const learnedTodayIds = getLearnedTodayCardIds(srs);
  const activeSession = srs.activeSession;
  const clickedCardIds = activeSession?.clickedCardIds ?? [];
  const eligibleCardIds = activeSession?.eligibleCardIds ?? [];
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

  function openRegion(region: RevealRegion) {
    setSelectedRegionId(region.id);
    setSelectedCardIndex(-1);
    if (!openedRegionIds.includes(region.id)) {
      const nextOpened = {
        ...openedByComic,
        [currentComic.id]: [...openedRegionIds, region.id],
      };
      commit(srs, nextOpened);
      setToast("Frase abierta · elige exactamente qué necesitabas");
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

  function learnCard(cardId: string, index: number) {
    setSelectedCardIndex(index);
    if (clickedCardIds.includes(cardId)) return;
    const nextState = recordCardHelp(srs, cardId);
    commit(nextState);
    setToast("1 tarjeta guardada para repasar");
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
      learnedCount: clicked.size,
      masteredCount: independentlyUnderstood,
      nextComic: next.comic,
      overlapCardIds: next.overlapCardIds,
      advancedDays: next.advancedDays,
      reason: next.reason,
    });
    setCurrentComicId(next.comic.id);
    setSelectedRegionId(null);
    setSelectedCardIndex(-1);
    setShowTitleText(false);
    commit(next.state, nextOpened);
  }

  function resetProgress() {
    const fresh = selectNextComic(COMICS, createSrsState());
    const nextOpened: OpenedByComic = {};
    setCurrentComicId(fresh.comic.id);
    setSelectedRegionId(null);
    setSelectedCardIndex(-1);
    setSummary(null);
    setShowLibrary(false);
    setShowAbout(false);
    setShowReset(false);
    commit(fresh.state, nextOpened);
    persist(fresh.state, nextOpened);
    setToast("Tu progreso empezó de nuevo");
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
        setSelectedRegionId(null);
        return;
      }
      if (summary || showLibrary || showAbout || showReset) return;
      const regionIndex = Number(event.key) - 1;
      if (Number.isInteger(regionIndex) && currentComic.regions[regionIndex]) {
        openRegion(currentComic.regions[regionIndex]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // openRegion intentionally uses the current render's state snapshot.
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
        a.answerEs.localeCompare(b.answerEs, "es")
      );
    });
  }, [libraryFilter, srs]);

  const targetCards = unique(eligibleCardIds)
    .map((id) => lookupCard(id))
    .filter((card): card is LearningCard => card !== null);
  const targetWidth = Math.min(
    700,
    Math.max(320, Math.round(currentComic.image.aspectRatio * 520)),
  );

  return (
    <main className="app-shell" data-ready={hydrated ? "true" : "false"}>
      <header className="topbar">
        <button className="brand brand-button" onClick={() => setShowAbout(true)} aria-label="Acerca de Tira">
          <span className="brand-mark">t</span>
          <span>tira</span>
        </button>
        <div className="session-note">
          <span className="pulse-dot" /> sesión · día {srs.studyDay}
        </div>
        <nav className="top-actions" aria-label="Navegación principal">
          <button className="text-nav active" aria-current="page">Aprender</button>
          <button className="text-nav" onClick={() => setShowLibrary(true)}>Mis tarjetas</button>
          <div className="top-stat"><strong>{dueCardIds.length}</strong> por repasar</div>
          <button className="avatar" onClick={() => setShowLibrary(true)} aria-label="Abrir tu memoria">
            {learnedTodayIds.length}
          </button>
        </nav>
      </header>

      <section className="learning-layout" id="top">
        <aside className="lesson-rail">
          <div className="eyebrow">TIRA {currentIndex + 1} DE {COMICS.length}</div>
          <h1>Primero,<br />solo mira.</h1>
          <p>
            Toca una frase únicamente cuando necesites ayuda. Recordaremos lo
            que descubras.
          </p>

          <div className="rail-progress" aria-label="Progreso de la tira">
            <div className="progress-copy">
              <span>Exploradas</span>
              <strong>{openedRegionIds.length} / {currentComic.regions.length}</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${(openedRegionIds.length / currentComic.regions.length) * 100}%` }} />
            </div>
          </div>

          <div className="target-summary">
            <div className="target-label">POR QUÉ ESTA TIRA</div>
            {currentDueCount > 0 ? (
              <div className="target-row"><span className="target-dot due" /> <strong>{currentDueCount}</strong> coincidencias para repasar</div>
            ) : null}
            {currentNewCount > 0 ? (
              <div className="target-row"><span className="target-dot new" /> <strong>{currentNewCount}</strong> ideas nuevas</div>
            ) : null}
            {currentDueCount === 0 && currentNewCount === 0 ? (
              <div className="target-row"><span className="target-dot revisit" /> una vuelta de consolidación</div>
            ) : null}
          </div>

          <div className="target-peek">
            {targetCards.slice(0, 3).map((card) => (
              <span key={card.id}>{card.answerEs}</span>
            ))}
            {targetCards.length > 3 ? <em>+{targetCards.length - 3}</em> : null}
          </div>

          <div className="tiny-tip">
            <span>?</span>
            <p>Puedes abrir una frase sin guardar todo. Elige solo las tarjetas concretas que te faltaban.</p>
          </div>
        </aside>

        <article className="comic-stage">
          <div className="comic-heading">
            <div>
              <div className="comic-number">XKCD · {currentComic.xkcdNumber}</div>
              <h2>{currentComic.titleEs}</h2>
              <span className="original-title">{currentComic.title}</span>
            </div>
            <div className="comic-tools">
              <button
                className={`tool-button ${showPins ? "is-active" : ""}`}
                onClick={() => setShowPins((visible) => !visible)}
                aria-pressed={showPins}
              >
                <span className="pin-mini">1</span>{showPins ? "Ocultar zonas" : "Mostrar zonas"}
              </button>
              <button
                className={`icon-button ${showTitleText ? "is-active" : ""}`}
                onClick={() => setShowTitleText((visible) => !visible)}
                aria-label="Ver el texto oculto de xkcd"
                aria-pressed={showTitleText}
              >
                i
              </button>
            </div>
          </div>

          {showTitleText ? (
            <div className="title-text" role="note">
              <span>TEXTO OCULTO</span>
              <p>{currentComic.titleText.es}</p>
              {currentComic.titleText.adaptationNoteEs ? <small>{currentComic.titleText.adaptationNoteEs}</small> : null}
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
                alt={currentComic.image.altEs}
              />
              {currentComic.regions.map((region, index) => {
                const wasOpened = openedRegionIds.includes(region.id);
                const isSelected = selectedRegionId === region.id;
                return (
                  <button
                    key={region.id}
                    className={`hotspot ${wasOpened ? "is-opened" : ""} ${isSelected ? "is-selected" : ""}`}
                    style={{
                      left: `${region.bounds.x}%`,
                      top: `${region.bounds.y}%`,
                      width: `${region.bounds.width}%`,
                      height: `${region.bounds.height}%`,
                    }}
                    aria-label={`Explicar: ${region.labelEn}`}
                    onClick={() => openRegion(region)}
                  >
                    <span>{wasOpened ? "✓" : index + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="comic-footer">
            <div>
              <a href={currentComic.source.pageUrl} target="_blank" rel="noreferrer">
                “{currentComic.title}” · xkcd #{currentComic.xkcdNumber} ↗
              </a>
              <span> por Randall Munroe</span>
            </div>
            <div>
              <a href={currentComic.source.licenseUrl} target="_blank" rel="noreferrer">CC BY-NC 2.5</a>
              <span> · adaptación y notas no oficiales</span>
            </div>
          </div>
        </article>

        <aside ref={revealPanelRef} className={`reveal-panel ${selectedRegion ? "has-selection" : ""}`} aria-live="polite">
          {selectedRegion ? (
            <div className="reveal-scroll">
              <div className="reveal-meta">
                <span>DESCUBRIMIENTO {openedRegionIds.indexOf(selectedRegion.id) + 1}</span>
                <button onClick={() => setSelectedRegionId(null)} aria-label="Cerrar explicación">×</button>
              </div>

              <div className="phrase-original">“{selectedRegion.labelEn}”</div>
              <div className="translation-label">UNA FORMA NATURAL DE DECIRLO</div>
              <h3>{selectedRegion.translationEs}</h3>
              <div className="note-card">
                <span className="note-spark">✦</span>
                <p>{selectedRegion.noteEs}</p>
              </div>

              <div className="cards-heading">
                <span>¿QUÉ NECESITABAS?</span>
                <strong>{selectedCards.filter((card) => clickedCardIds.includes(card.id)).length} / {selectedCards.length}</strong>
              </div>
              <p className="cards-instruction">Elige solo la palabra, regla o idea que te faltaba. Cada elección se guarda por separado.</p>
              <div className="card-switcher" aria-label="Conceptos de la frase">
                {selectedCards.map((card, index) => (
                  <button
                    key={card.id}
                    className={`${selectedCardIndex === index ? "active" : ""} ${clickedCardIds.includes(card.id) ? "is-learned" : ""}`}
                    onClick={() => learnCard(card.id, index)}
                    aria-pressed={selectedCardIndex === index}
                  >
                    <span>{clickedCardIds.includes(card.id) ? "✓" : index + 1}</span>{KIND_LABELS[card.kind]}
                  </button>
                ))}
              </div>

              {selectedCard ? (
                <div className="learning-card-detail">
                  <div className={`kind-badge kind-${selectedCard.kind}`}>{KIND_LABELS[selectedCard.kind]}</div>
                  <div className="card-prompt">{selectedCard.promptEn}</div>
                  <div className="card-answer">{selectedCard.answerEs}</div>
                  <p>{selectedCard.noteEs}</p>
                  <div className="card-tags">
                    {selectedCard.tags.map((tag) => <span key={tag}>{tag}</span>)}
                  </div>
                  <div className="memory-copy"><span>✓</span> vuelve en el día {srs.studyDay + 1}</div>
                </div>
              ) : (
                <div className="choose-card-prompt"><span>↑</span> Elige una tarjeta para ver el detalle y añadirla al repaso.</div>
              )}
            </div>
          ) : (
            <div className="empty-reveal">
              <div className="empty-glyph">1</div>
              <h3>La tira habla primero.</h3>
              <p>
                Toca una frase marcada para ver su español; después elige la
                palabra, regla o idea concreta que necesitabas.
              </p>
              <div className="gesture-line"><span>↖</span> prueba con cualquier número</div>
              <div className="today-mini">
                <span>HOY</span>
                <strong>{learnedTodayIds.length}</strong>
                <p>{learnedTodayIds.length === 1 ? "tarjeta aprendida" : "tarjetas aprendidas"}</p>
              </div>
            </div>
          )}
        </aside>
      </section>

      <footer className="action-bar">
        <div className="action-hint">
          <span className="keycap">1–{currentComic.regions.length}</span>
          <span>atajos para explorar</span>
        </div>
        <button className="finish-button" onClick={finishComic}>
          Ya entendí la tira <span>→</span>
        </button>
        <div className="review-preview">
          <strong>{clickedCardIds.length}</strong> con ayuda · <strong>{Math.max(0, eligibleCardIds.length - clickedCardIds.length)}</strong> ya sabías
        </div>
      </footer>

      {summary ? (
        <div className="modal-backdrop" role="presentation">
          <section ref={summaryRef} className="summary-modal" role="dialog" aria-modal="true" aria-labelledby="summary-title">
            <div className="success-orbit"><span>✓</span></div>
            <div className="summary-eyebrow">TIRA ENTENDIDA</div>
            <h2 id="summary-title">{summary.completedTitle}</h2>
            <p>La tira ya hizo su trabajo. Tu próxima elección viene del calendario, no del azar.</p>

            <div className="grade-grid">
              <div><strong>{summary.learnedCount}</strong><span>necesitaron ayuda</span><small>vuelven pronto</small></div>
              <div><strong>{summary.masteredCount}</strong><span>entendidas sin ayuda</span><small>graduadas</small></div>
            </div>

            {summary.advancedDays > 0 ? (
              <div className="time-jump">El simulador avanzó <strong>{summary.advancedDays} días</strong> hasta el próximo repaso.</div>
            ) : null}

            <div className="next-comic-card">
              <img src={summary.nextComic.image.src} alt="" />
              <div>
                <span>LA SIGUIENTE</span>
                <strong>{summary.nextComic.titleEs}</strong>
                <p>
                  {summary.reason === "due"
                    ? `${summary.overlapCardIds.length} coincidencias con tu repaso`
                    : "abre una parte nueva del vocabulario"}
                </p>
              </div>
            </div>
            {summary.overlapCardIds.length > 0 ? (
              <div className="overlap-chips">
                {summary.overlapCardIds.slice(0, 4).map((id) => {
                  const card = CARD_BY_ID.get(id as CardId);
                  return card ? <span key={id}>{card.answerEs}</span> : null;
                })}
              </div>
            ) : null}
            <button className="primary-wide" onClick={() => setSummary(null)}>Seguir con la próxima tira <span>→</span></button>
            <button className="secondary-link" onClick={() => { setSummary(null); setShowLibrary(true); }}>Ver mis tarjetas</button>
          </section>
        </div>
      ) : null}

      {showLibrary ? (
        <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowLibrary(false); }}>
          <aside ref={libraryRef} className="memory-drawer" role="dialog" aria-modal="true" aria-labelledby="memory-title">
            <div className="drawer-header">
              <div><span>TU MEMORIA</span><h2 id="memory-title">Mis tarjetas</h2></div>
              <button onClick={() => setShowLibrary(false)} aria-label="Cerrar tarjetas">×</button>
            </div>
            <div className="memory-overview">
              <div><strong>{learnedTodayIds.length}</strong><span>hoy</span></div>
              <div><strong>{dueCardIds.length}</strong><span>ahora</span></div>
              <div><strong>{masteredCount}</strong><span>dominadas</span></div>
            </div>
            <div className="memory-tabs" aria-label="Filtros de tarjetas">
              {([
                ["today", "Hoy"],
                ["next", "Próximas"],
                ["mastered", "Dominadas"],
                ["all", "Todas"],
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
                    <div><strong>{card.answerEs}</strong><p>{card.promptEn}</p></div>
                    <span className={`status-pill status-${progress.status}`}>{statusLabel(progress, srs.studyDay)}</span>
                  </article>
                );
              }) : (
                <div className="empty-list"><span>○</span><h3>Aún no hay nada aquí.</h3><p>Abre una frase en la tira y aparecerá en tu memoria.</p></div>
              )}
            </div>
            <div className="drawer-footer">
              <button onClick={() => { setShowLibrary(false); setShowAbout(true); }}>Cómo funciona</button>
              <button className="danger-link" onClick={() => setShowReset(true)}>Reiniciar progreso</button>
            </div>
          </aside>
        </div>
      ) : null}

      {showAbout ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAbout(false); }}>
          <section ref={aboutRef} className="about-modal" role="dialog" aria-modal="true" aria-labelledby="about-title">
            <button className="modal-close" onClick={() => setShowAbout(false)} aria-label="Cerrar">×</button>
            <div className="brand about-brand"><span className="brand-mark">t</span><span>tira</span></div>
            <div className="summary-eyebrow">CÓMO FUNCIONA</div>
            <h2 id="about-title">Español, viñeta a viñeta.</h2>
            <p>Tira convierte el contexto real de un cómic en una sesión de memoria, sin examen aparte.</p>
            <ol className="method-steps">
              <li><span>1</span><div><strong>Mira antes de traducir</strong><p>La imagen y el chiste te dan una oportunidad real de inferir.</p></div></li>
              <li><span>2</span><div><strong>Pide ayuda solo cuando haga falta</strong><p>Cada frase abierta guarda palabras, gramática e ideas para repasarlas.</p></div></li>
              <li><span>3</span><div><strong>Termina con honestidad</strong><p>Lo que entendiste sin ayuda se gradúa; lo que abriste vuelve pronto.</p></div></li>
              <li><span>4</span><div><strong>Deja que el solapamiento elija</strong><p>La siguiente tira contiene la mayor cantidad posible de tarjetas pendientes.</p></div></li>
            </ol>
            <div className="license-note">
              <strong>Sobre los cómics</strong>
              <p>Obra original de Randall Munroe, publicada en xkcd bajo <a href="https://creativecommons.org/licenses/by-nc/2.5/" target="_blank" rel="noreferrer">CC BY-NC 2.5</a>. Traducciones y notas son adaptaciones no oficiales. Tira es un prototipo gratuito y no está afiliado con xkcd.</p>
            </div>
            <button className="primary-wide" onClick={() => setShowAbout(false)}>Volver a la tira</button>
          </section>
        </div>
      ) : null}

      {showReset ? (
        <div className="modal-backdrop reset-layer" role="presentation">
          <section ref={resetRef} className="reset-modal" role="alertdialog" aria-modal="true" aria-labelledby="reset-title">
            <div className="warning-glyph">↺</div>
            <h2 id="reset-title">¿Empezar de cero?</h2>
            <p>Se borrarán las tarjetas, los intervalos y el historial guardado en este dispositivo.</p>
            <div className="reset-actions">
              <button onClick={() => setShowReset(false)}>Cancelar</button>
              <button onClick={resetProgress}>Sí, reiniciar</button>
            </div>
          </section>
        </div>
      ) : null}

      {toast ? <div className="toast" role="status"><span>✓</span>{toast}</div> : null}
    </main>
  );
}
