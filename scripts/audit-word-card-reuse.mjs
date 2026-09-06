#!/usr/bin/env node
import fs from "node:fs/promises";
import { auditWordCardReuse, unexpectedWordCardDuplicates } from "./lib/word-card-reuse.mjs";

const args = process.argv.slice(2);
let surface;
let check = false;
let json = false;
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--surface" && args[index + 1] && !args[index + 1].startsWith("--")) {
    surface = args[++index].normalize("NFC").toLocaleLowerCase("es");
  } else if (arg === "--check") {
    check = true;
  } else if (arg === "--json") {
    json = true;
  } else {
    throw new Error(`Unknown or incomplete argument: ${arg}. Use [--surface bien] [--check] [--json].`);
  }
}
const [manifest, baseline] = await Promise.all([
  "../public/corpus/manifest.json", "../data/review/word-card-reuse-baseline.json",
].map(async (file) => JSON.parse(await fs.readFile(new URL(file, import.meta.url), "utf8"))));
const audit = auditWordCardReuse(manifest);
const unexpected = unexpectedWordCardDuplicates(audit, baseline);
const groups = audit.groups.filter((group) => surface === undefined || group.surface === surface);
if (json) {
  process.stdout.write(`${JSON.stringify({ groups, exactDuplicates: audit.exactDuplicates, unexpectedDuplicates: unexpected }, null, 2)}\n`);
} else {
  process.stdout.write(`Word-card reuse audit: ${audit.groups.filter((group) => group.cards.length > 1).length} forms have multiple cards; ${audit.exactDuplicates.length} groups have identical teaching content (${unexpected.length} unacknowledged).\n`);
  process.stdout.write("Shared spellings are review candidates, not automatic merge decisions.\n");
  for (const cards of audit.exactDuplicates) {
    process.stdout.write(`Identical teaching: ${cards.map((card) => card.id).join(", ")}\n`);
  }
  if (surface !== undefined) {
    if (!groups.length) process.stdout.write(`No reachable word cards for ${surface}.\n`);
    for (const group of groups) {
      process.stdout.write(`\n${group.surface}: ${group.cards.length} cards across ${group.comicCount} distinct comics\n`);
      for (const card of group.cards) {
        process.stdout.write(`  ${card.id}: ${card.answerEn} — ${card.comicCount} comics [${card.reviewStatus}]\n`);
        for (const comic of card.comics) process.stdout.write(`    ${comic.title} (${comic.id})\n`);
      }
    }
  }
}
if (check && unexpected.length) process.exitCode = 1;
