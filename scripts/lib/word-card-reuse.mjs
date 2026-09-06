/** Read-only candidates for editorial review; matching text never merges IDs. */
export function auditWordCardReuse(manifest) {
  const usage = new Map();
  for (const comic of manifest.comics) {
    for (const id of new Set(comic.cardIds)) {
      if (!usage.has(id)) usage.set(id, new Map());
      usage.get(id).set(comic.id, { id: comic.id, title: comic.title });
    }
  }
  const surfaces = new Map();
  const signatures = new Map();
  for (const card of manifest.cardCatalog) {
    if (card.kind !== "word" || !usage.has(card.id)) continue;
    const entry = {
      id: card.id,
      promptEs: card.promptEs,
      answerEn: card.answerEn,
      reviewStatus: card.reviewStatus ?? "unspecified",
      comicCount: usage.get(card.id).size,
      comics: [...usage.get(card.id).values()].sort((a, b) => a.id.localeCompare(b.id)),
    };
    const surface = card.promptEs.normalize("NFC").toLocaleLowerCase("es");
    if (!surfaces.has(surface)) surfaces.set(surface, []);
    surfaces.get(surface).push(entry);
    // Ignore metadata but preserve case, accents, inflections and teaching detail.
    const signature = JSON.stringify([
      card.promptEs, card.questionEn, card.answerEn, card.noteEn,
      card.example?.es, card.example?.en,
    ].map((value) => (value ?? "").normalize("NFC")));
    if (!signatures.has(signature)) signatures.set(signature, []);
    signatures.get(signature).push(entry);
  }
  const groups = [...surfaces].map(([surface, cards]) => ({
    surface,
    comicCount: new Set(cards.flatMap((card) => card.comics.map((comic) => comic.id))).size,
    cards: cards.sort((a, b) => a.id.localeCompare(b.id)),
  })).sort((a, b) => a.surface.localeCompare(b.surface));
  const exactDuplicates = [...signatures.values()]
    .filter((cards) => cards.length > 1)
    .map((cards) => cards.sort((a, b) => a.id.localeCompare(b.id)))
    .sort((a, b) => a[0].id.localeCompare(b[0].id));
  return { groups, exactDuplicates };
}

/** A baseline acknowledges specific existing pairs; it never permits new IDs. */
export function unexpectedWordCardDuplicates(audit, baseline) {
  const acknowledged = new Set(baseline.map(({ cardIds }) => JSON.stringify([...cardIds].sort())));
  return audit.exactDuplicates.filter((cards) =>
    !acknowledged.has(JSON.stringify(cards.map((card) => card.id).sort())),
  );
}
