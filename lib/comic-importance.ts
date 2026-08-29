export const DEFAULT_COMIC_IMPORTANCE_DAMPING = 0.85;
export const DEFAULT_COMIC_IMPORTANCE_TOLERANCE = 1e-12;
export const DEFAULT_COMIC_IMPORTANCE_MAX_ITERATIONS = 1_000;
export const COMIC_IMPORTANCE_ALGORITHM =
  "damped-bipartite-centrality-v1" as const;

export interface ComicCardGraphInput {
  readonly id: string;
  /** Stable analytics target IDs associated with this comic. */
  readonly cardIds: readonly string[];
}

export interface ComicImportanceOptions {
  /** Probability of following a comic/card edge. Must be in [0, 1). */
  readonly damping?: number;
  /** Stop when the L1 distance between successive rank vectors is this small. */
  readonly tolerance?: number;
  readonly maxIterations?: number;
}

export interface ComicImportanceScore {
  readonly comicId: string;
  /** Damped recursive centrality normalized across comics; all scores sum to 1. */
  readonly score: number;
  /** Deterministic ordinal rank. Equal scores are ordered by comic ID. */
  readonly rank: number;
  /** 1 for first, 0 for last; a one-comic corpus receives 1. */
  readonly percentile: number;
  readonly cardCount: number;
  /** Cards on this comic that also occur on at least one other comic. */
  readonly sharedCardCount: number;
}

export interface ComicImportanceResult {
  /** Comic scores in rank order. */
  readonly comics: readonly ComicImportanceScore[];
  readonly algorithm: typeof COMIC_IMPORTANCE_ALGORITHM;
  readonly normalization: "comic-sum-1";
  readonly damping: number;
  readonly tolerance: number;
  readonly maxIterations: number;
  readonly iterations: number;
  readonly converged: boolean;
  readonly nodeCount: number;
  readonly comicNodeCount: number;
  readonly cardNodeCount: number;
  readonly edgeCount: number;
}

interface ValidatedOptions {
  damping: number;
  tolerance: number;
  maxIterations: number;
}

const compareIds = (left: string, right: string): number => {
  const leftCharacters = Array.from(left);
  const rightCharacters = Array.from(right);
  const sharedLength = Math.min(leftCharacters.length, rightCharacters.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const difference =
      (leftCharacters[index].codePointAt(0) ?? 0) -
      (rightCharacters[index].codePointAt(0) ?? 0);
    if (difference !== 0) return difference;
  }
  return leftCharacters.length - rightCharacters.length;
};

function validateOptions(
  options: ComicImportanceOptions,
): ValidatedOptions {
  const damping = options.damping ?? DEFAULT_COMIC_IMPORTANCE_DAMPING;
  const tolerance = options.tolerance ?? DEFAULT_COMIC_IMPORTANCE_TOLERANCE;
  const maxIterations =
    options.maxIterations ?? DEFAULT_COMIC_IMPORTANCE_MAX_ITERATIONS;

  if (!Number.isFinite(damping) || damping < 0 || damping >= 1) {
    throw new RangeError("damping must be a finite number in [0, 1)");
  }
  if (!Number.isFinite(tolerance) || tolerance <= 0) {
    throw new RangeError("tolerance must be a finite number greater than 0");
  }
  if (!Number.isInteger(maxIterations) || maxIterations <= 0) {
    throw new RangeError("maxIterations must be a positive integer");
  }

  return { damping, tolerance, maxIterations };
}

function validateAndSortComics(
  comics: readonly ComicCardGraphInput[],
): ComicCardGraphInput[] {
  const comicIds = new Set<string>();
  const validated = comics.map((comic, comicIndex) => {
    if (!comic || typeof comic.id !== "string" || comic.id.trim() === "") {
      throw new TypeError(`comic at index ${comicIndex} must have a non-empty id`);
    }
    if (comicIds.has(comic.id)) {
      throw new Error(`duplicate comic id: ${comic.id}`);
    }
    comicIds.add(comic.id);

    if (!Array.isArray(comic.cardIds)) {
      throw new TypeError(`comic ${comic.id} must have a cardIds array`);
    }
    const cardIds = new Set<string>();
    for (const [cardIndex, cardId] of comic.cardIds.entries()) {
      if (typeof cardId !== "string" || cardId.trim() === "") {
        throw new TypeError(
          `card reference ${cardIndex} on comic ${comic.id} must be a non-empty id`,
        );
      }
      if (cardIds.has(cardId)) {
        throw new Error(`duplicate card reference ${cardId} on comic ${comic.id}`);
      }
      cardIds.add(cardId);
    }

    return { id: comic.id, cardIds: [...cardIds].sort(compareIds) };
  });

  return validated.sort((left, right) => compareIds(left.id, right.id));
}

/**
 * Rank comics using damped alternating centrality on a bipartite graph.
 *
 * One partition contains comic nodes and the other contains stable analytics
 * target IDs. Each comic/target association is one undirected edge. With C
 * comics, F targets, damping d, and N(x) denoting a node's neighbors, each
 * iteration is:
 *
 * cardRaw(f)   = sum(comicScore(c), c in N(f))
 * cardScore(f) = (1 - d) / F + d * cardRaw(f) / sum(cardRaw)
 *
 * comicRaw(c)   = sum(nextCardScore(f), f in N(c))
 * comicScore(c) = (1 - d) / C + d * comicRaw(c) / sum(comicRaw)
 *
 * This is the HITS/eigenvector-style recursive relationship the product needs:
 * a comic is important when it uses important cards, while a card is important
 * when it appears in important comics. Teleportation gives every node in each
 * partition a positive baseline and makes disconnected components comparable.
 * Both partitions begin uniformly. Iteration stops when their combined L1
 * change reaches the tolerance. A corpus with no card edges remains uniformly
 * ranked. Sorting stable IDs first makes results independent of input order;
 * score ties use Unicode code-point ID order.
 */
export function rankComicsByCardGraph(
  inputComics: readonly ComicCardGraphInput[],
  options: ComicImportanceOptions = {},
): ComicImportanceResult {
  const { damping, tolerance, maxIterations } = validateOptions(options);
  const comics = validateAndSortComics(inputComics);
  const comicCount = comics.length;

  if (comicCount === 0) {
    return {
      comics: [],
      algorithm: COMIC_IMPORTANCE_ALGORITHM,
      normalization: "comic-sum-1",
      damping,
      tolerance,
      maxIterations,
      iterations: 0,
      converged: true,
      nodeCount: 0,
      comicNodeCount: 0,
      cardNodeCount: 0,
      edgeCount: 0,
    };
  }

  const cardIds = [...new Set(comics.flatMap((comic) => comic.cardIds))].sort(
    compareIds,
  );
  const cardIndexes = new Map(
    cardIds.map((cardId, index) => [cardId, comicCount + index]),
  );
  const cardCount = cardIds.length;
  const nodeCount = comicCount + cardCount;
  const comicDegrees = comics.map((comic) => comic.cardIds.length);
  const cardDegrees = new Array<number>(cardCount).fill(0);
  const edges: Array<readonly [comicIndex: number, cardNodeIndex: number]> = [];

  comics.forEach((comic, comicIndex) => {
    comic.cardIds.forEach((cardId) => {
      const cardNodeIndex = cardIndexes.get(cardId);
      // Every card index was constructed from these same references.
      if (cardNodeIndex === undefined) {
        throw new Error(`internal graph error: missing card node ${cardId}`);
      }
      cardDegrees[cardNodeIndex - comicCount] += 1;
      edges.push([comicIndex, cardNodeIndex]);
    });
  });

  if (cardCount === 0) {
    const uniformlyRanked: ComicImportanceScore[] = comics.map(
      (comic, index) => {
        const rank = index + 1;
        return {
          comicId: comic.id,
          score: 1 / comicCount,
          rank,
          percentile:
            comicCount === 1 ? 1 : (comicCount - rank) / (comicCount - 1),
          cardCount: 0,
          sharedCardCount: 0,
        };
      },
    );
    return {
      comics: uniformlyRanked,
      algorithm: COMIC_IMPORTANCE_ALGORITHM,
      normalization: "comic-sum-1",
      damping,
      tolerance,
      maxIterations,
      iterations: 0,
      converged: true,
      nodeCount,
      comicNodeCount: comicCount,
      cardNodeCount: 0,
      edgeCount: 0,
    };
  }

  let comicScores = new Array<number>(comicCount).fill(1 / comicCount);
  let cardScores = new Array<number>(cardCount).fill(1 / cardCount);
  let iterations = 0;
  let converged = false;

  for (let iteration = 1; iteration <= maxIterations; iteration += 1) {
    const cardRaw = new Array<number>(cardCount).fill(0);
    edges.forEach(([comicIndex, cardNodeIndex]) => {
      cardRaw[cardNodeIndex - comicCount] += comicScores[comicIndex];
    });
    const cardRawTotal = cardRaw.reduce((sum, value) => sum + value, 0);
    const nextCardScores = cardRaw.map(
      (value) =>
        (1 - damping) / cardCount + damping * (value / cardRawTotal),
    );

    const comicRaw = new Array<number>(comicCount).fill(0);
    edges.forEach(([comicIndex, cardNodeIndex]) => {
      const cardIndex = cardNodeIndex - comicCount;
      comicRaw[comicIndex] += nextCardScores[cardIndex];
    });
    const comicRawTotal = comicRaw.reduce((sum, value) => sum + value, 0);
    const nextComicScores = comicRaw.map(
      (value) =>
        (1 - damping) / comicCount + damping * (value / comicRawTotal),
    );

    const cardDistance = nextCardScores.reduce(
      (sum, score, index) => sum + Math.abs(score - cardScores[index]),
      0,
    );
    const comicDistance = nextComicScores.reduce(
      (sum, score, index) => sum + Math.abs(score - comicScores[index]),
      0,
    );
    cardScores = nextCardScores;
    comicScores = nextComicScores;
    iterations = iteration;

    if (cardDistance + comicDistance <= tolerance) {
      converged = true;
      break;
    }
  }

  const unranked = comics.map((comic, comicIndex) => ({
    comicId: comic.id,
    score: comicScores[comicIndex],
    cardCount: comicDegrees[comicIndex],
    sharedCardCount: comic.cardIds.filter((cardId) => {
      const cardNodeIndex = cardIndexes.get(cardId);
      return cardNodeIndex !== undefined &&
        cardDegrees[cardNodeIndex - comicCount] > 1;
    }).length,
  }));
  unranked.sort(
    (left, right) =>
      right.score - left.score ||
      compareIds(left.comicId, right.comicId),
  );

  const ranked: ComicImportanceScore[] = unranked.map((comic, index) => {
    const rank = index + 1;
    return {
      ...comic,
      rank,
      percentile:
        comicCount === 1 ? 1 : (comicCount - rank) / (comicCount - 1),
    };
  });

  return {
    comics: ranked,
    algorithm: COMIC_IMPORTANCE_ALGORITHM,
    normalization: "comic-sum-1",
    damping,
    tolerance,
    maxIterations,
    iterations,
    converged,
    nodeCount,
    comicNodeCount: comicCount,
    cardNodeCount: cardCount,
    edgeCount: edges.length,
  };
}
