import { WORD_BOUNDS_BY_REGION } from "./word-bounds.generated.js";

/**
 * Curated, non-commercial seed content for an English speaker learning Spanish.
 *
 * Randall Munroe's originals and Gabriel Rodríguez Alberich's unofficial
 * Spanish translations are published under CC BY-NC 2.5. Keep both source
 * links and the translation credit visible wherever a comic is shown.
 */

export type CardKind = "word" | "phrase" | "grammar" | "concept";

export interface LearningCard {
  id: string;
  kind: CardKind;
  promptEs: string;
  /** Plain-English question shown on reusable grammar and expression cards. */
  questionEn?: string;
  answerEn: string;
  /** Reusable explanation only. Comic-specific details belong to CardApplication. */
  noteEn: string;
  /** A reusable example invented for the lesson, never copied from a comic. */
  example?: { es: string; en: string };
  tags: readonly string[];
  /** Generated cards remain provisional until a human reviews the OCR and sense. */
  reviewStatus?: "reviewed" | "needs-review";
  /** Exceptional opt-out; never set false merely because content needs review. */
  schedulable?: boolean;
  /** Build provenance is intentionally display metadata, never an SRS identity. */
  provenance?: {
    contextualSenseReviewed?: boolean;
    [key: string]: unknown;
  };
}

// Authoring templates and region-group aliases inherited from the first seed
// pass. These entries are not the schedulable curriculum; only
// ATOMIC_CURATED_CARDS below becomes live cards.
const LEGACY_CURATED_CARDS = [
  {
    id: "grammar-estar-gerundio",
    kind: "grammar",
    promptEs: "estar + gerundio",
    answerEn: "to be doing something right now",
    noteEn:
      "Spanish uses estar plus a gerund for an action in progress.",
    tags: ["A2", "grammar", "actions in progress"],
  },
  {
    id: "grammar-past-contrast",
    kind: "grammar",
    promptEs: "aprendí / di · solía / tenía",
    answerEn: "I learned / took · I used to / had",
    noteEn:
      "The preterite presents completed events; the imperfect sets up past habits or background conditions.",
    tags: ["A2", "grammar", "past tenses"],
  },
  {
    id: "grammar-present-perfect",
    kind: "grammar",
    promptEs: "hemos perdido · han surgido · has encontrado",
    answerEn: "we have lost · have arisen · you have found",
    noteEn:
      "Haber plus a past participle connects an earlier event to the present situation.",
    tags: ["B1", "grammar", "perfect tense"],
  },
  {
    id: "grammar-subjunctive",
    kind: "grammar",
    promptEs: "que haga · que tenga · que hayan aprendido",
    answerEn: "that someone do · have · have learned",
    noteEn:
      "Spanish often uses the subjunctive after reactions, wishes, and descriptions of an indefinite situation.",
    tags: ["B1", "grammar", "subjunctive"],
  },
  {
    id: "grammar-hypothetical",
    kind: "grammar",
    promptEs: "aunque volviese, volvería a caerse",
    answerEn: "even if it came back, it would go down again",
    noteEn:
      "An imperfect-subjunctive condition pairs naturally with the conditional for a hypothetical result.",
    tags: ["B2", "grammar", "conditional"],
  },
  {
    id: "grammar-commands-register",
    kind: "grammar",
    promptEs: "¡Únete! · Mire. · Diga. · su hijo",
    answerEn: "Join! · Look. · Say. · your son (formal)",
    noteEn:
      "Únete is an informal command; mire and diga use formal usted, which also takes su and third-person verbs.",
    tags: ["A2", "grammar", "commands", "register"],
  },
  {
    id: "question-words",
    kind: "grammar",
    promptEs: "¿qué? · ¿cómo? · ¿por qué?",
    answerEn: "what? · how? · why?",
    noteEn:
      "Spanish question words carry an accent. Por qué is two words when it asks why.",
    tags: ["A1", "questions", "accents"],
  },
  {
    id: "phrase-venir-a-la-cama",
    kind: "phrase",
    promptEs: "¿Vienes a la cama?",
    answerEn: "Are you coming to bed?",
    noteEn:
      "Spanish commonly uses the simple present for a plan that is happening right now.",
    tags: ["A1", "daily life"],
  },
  {
    id: "phrase-no-puedo-importante",
    kind: "phrase",
    promptEs: "No puedo. Esto es importante.",
    answerEn: "I can't. This is important.",
    noteEn:
      "The action after puedo can be omitted when context supplies it. Esto points to a whole situation.",
    tags: ["A1", "common phrase"],
  },
  {
    id: "indefinite-pronouns",
    kind: "grammar",
    promptEs: "alguien · algo",
    answerEn: "someone · something/anything",
    noteEn:
      "Alguien refers to an unspecified person; algo refers to an unspecified thing.",
    tags: ["A1", "pronouns"],
  },
  {
    id: "phrase-estar-equivocado",
    kind: "phrase",
    promptEs: "estar equivocado",
    answerEn: "to be wrong / mistaken",
    noteEn:
      "For a person holding a mistaken belief, Spanish naturally uses estar equivocado rather than ser incorrecto.",
    tags: ["A2", "opinions"],
  },
  {
    id: "concept-duty-calls",
    kind: "concept",
    promptEs: "El deber llama",
    answerEn: "Duty calls",
    noteEn:
      "The title makes an ordinary internet argument sound like an urgent moral obligation.",
    tags: ["humor", "irony", "internet"],
  },
  {
    id: "word-learn-simple",
    kind: "word",
    promptEs: "aprender · sencillo",
    answerEn: "to learn · simple/easy",
    noteEn:
      "Sencillo often sounds more natural than simple when something is easy to understand or do.",
    tags: ["A1", "learning", "vocabulary"],
  },
  {
    id: "phrase-change-patterns",
    kind: "phrase",
    promptEs: "volver a + infinitivo · dejar de + infinitivo",
    answerEn: "to do again · to stop doing",
    noteEn:
      "Volver a marks a return or repetition; dejar de marks the end of an action or belief.",
    tags: ["A2", "verb patterns"],
  },
  {
    id: "phrase-ya-esta-comparar",
    kind: "phrase",
    promptEs: "¿Y ya está? · para comparar",
    answerEn: "And that's it? · for comparison",
    noteEn:
      "Ya está says nothing more is needed; para plus an infinitive states a purpose.",
    tags: ["A2", "conversation", "connector"],
  },
  {
    id: "concept-python",
    kind: "concept",
    promptEs: "Python",
    answerEn: "the Python programming language",
    noteEn:
      "The joke exaggerates the freedom and delight people can feel when using readable, approachable code.",
    tags: ["technology", "programming"],
  },
  {
    id: "concept-hello-world",
    kind: "concept",
    promptEs: "Hola mundo",
    answerEn: "Hello, World — a traditional first program",
    noteEn:
      "Many programming tutorials begin with the smallest program that displays a short message.",
    tags: ["technology", "programming culture"],
  },
  {
    id: "concept-python-syntax",
    kind: "concept",
    promptEs: "tipado dinámico · indentación",
    answerEn: "dynamic typing · indentation",
    noteEn:
      "Python checks types at runtime and uses indentation to mark code structure.",
    tags: ["technology", "programming"],
  },
  {
    id: "concept-programming-code",
    kind: "concept",
    promptEs: "programar · código · lenguajes de programación",
    answerEn: "programming · code · programming languages",
    noteEn:
      "Several comics turn literal computer instructions and programmer culture into the source of the joke.",
    tags: ["technology", "recurring idea"],
  },
  {
    id: "concept-antigravity",
    kind: "concept",
    promptEs: "import antigravity",
    answerEn: "a real Python Easter egg used as a visual joke",
    noteEn:
      "Python's antigravity module opens this xkcd comic in a web browser when imported.",
    tags: ["technology", "programming", "reference"],
  },
  {
    id: "phrase-trouble-break",
    kind: "phrase",
    promptEs: "tener problemas · romper / roto",
    answerEn: "to have trouble · to break / broken",
    noteEn:
      "Roto is the irregular past participle of romper; tener problemas is the usual trouble expression.",
    tags: ["A2", "problems", "irregular form"],
  },
  {
    id: "phrase-en-cierta-manera",
    kind: "phrase",
    promptEs: "en cierta manera",
    answerEn: "in a way / in a sense",
    noteEn:
      "This softens a partial agreement and signals that the explanation needs qualification.",
    tags: ["B1", "nuance", "connector"],
  },
  {
    id: "verb-poner-llamar",
    kind: "phrase",
    promptEs: "ponerle un nombre · llamarlo",
    answerEn: "to name someone · to call someone",
    noteEn:
      "Ponerle un nombre describes naming; llamarlo describes the name people habitually use.",
    tags: ["A2", "verbs", "object pronouns"],
  },
  {
    id: "concept-sql-injection",
    kind: "concept",
    promptEs: "inyección SQL",
    answerEn: "SQL injection",
    noteEn:
      "The child's name closes a text value and adds a destructive command, exploiting unsafe string concatenation.",
    tags: ["technology", "security", "databases"],
  },
  {
    id: "phrase-records-hope",
    kind: "phrase",
    promptEs: "registros estudiantiles · espero que…",
    answerEn: "student records · I hope that…",
    noteEn:
      "A hoped-for situation normally follows esperar que in the subjunctive.",
    tags: ["B1", "education", "subjunctive"],
  },
  {
    id: "concept-input-sanitization",
    kind: "concept",
    promptEs: "sanear la inserción de una base de datos",
    answerEn: "to sanitize database input",
    noteEn:
      "The wording refers to validating input and, in practice, using parameterized queries.",
    tags: ["technology", "security", "databases"],
  },
  {
    id: "grammar-soler",
    kind: "grammar",
    promptEs: "soler + infinitivo",
    answerEn: "to usually do / used to do",
    noteEn:
      "Solía creer means I used to believe; the imperfect presents it as a former habitual view.",
    tags: ["A2", "grammar", "verb pattern"],
  },
  {
    id: "concept-correlation-causation",
    kind: "concept",
    promptEs: "La correlación no implica causalidad.",
    answerEn: "Correlation does not imply causation.",
    noteEn:
      "Two things changing together does not by itself show that one caused the other.",
    tags: ["statistics", "reasoning", "cognates"],
  },
  {
    id: "phrase-course-seem-maybe",
    kind: "phrase",
    promptEs: "una asignatura · parece que… · quizá",
    answerEn: "a course · it seems that… · maybe",
    noteEn:
      "In Spain, asignatura means a course or subject. Quizá introduces uncertainty.",
    tags: ["A2", "education", "uncertainty"],
  },
  {
    id: "word-tech-vocabulary",
    kind: "word",
    promptEs: "ordenador · módem · conexión · servidor",
    answerEn: "computer · modem · connection · server",
    noteEn:
      "Ordenador is standard in Spain; computadora is common across much of Latin America.",
    tags: ["A2", "technology", "Spain"],
  },
  {
    id: "phrase-troubleshooting",
    kind: "phrase",
    promptEs: "reiniciar · seguir caído · no tener nada que ver",
    answerEn: "restart · still be down · have nothing to do with it",
    noteEn:
      "These are common troubleshooting expressions; no tener nada que ver denies relevance.",
    tags: ["B1", "technology", "idiom"],
  },
  {
    id: "concept-haiku-support",
    kind: "concept",
    promptEs: "Haiku · soporte técnico · ingeniero",
    answerEn: "Haiku OS · technical support · engineer",
    noteEn:
      "The comic contrasts scripted first-line support with an engineer who can diagnose the real problem.",
    tags: ["technology", "operating systems", "work"],
  },
  {
    id: "phrase-until-should",
    kind: "phrase",
    promptEs: "hasta que hable… · ya debería ir bien",
    answerEn: "until I speak… · it should be working now",
    noteEn:
      "An awaited event after hasta que takes the subjunctive; debería can express a reasonable expectation.",
    tags: ["B1", "subjunctive", "modal meaning"],
  },
  {
    id: "concept-shibboleet",
    kind: "concept",
    promptEs: "shibboleet · puerta trasera",
    answerEn: "a secret code word · a backdoor",
    noteEn:
      "Shibboleet blends shibboleth with 1337 (leet). In the dream, it bypasses scripted support.",
    tags: ["technology", "wordplay", "internet culture"],
  },
  {
    id: "phrase-no-se-lo-diga",
    kind: "phrase",
    promptEs: "No se lo diga a nadie.",
    answerEn: "Don't tell anyone.",
    noteEn:
      "Se replaces le before the direct-object pronoun lo: do not tell it to anyone.",
    tags: ["B1", "object pronouns", "command"],
  },
  {
    id: "phrase-instead-enjoy-view",
    kind: "phrase",
    promptEs: "en lugar de · disfrutar de la vista · puesta de sol",
    answerEn: "instead of · enjoy the view · sunset",
    noteEn:
      "En lugar de introduces an alternative; this translation uses disfrutar de before the thing enjoyed.",
    tags: ["A2", "connector", "outdoors"],
  },
  {
    id: "word-document-distract",
    kind: "word",
    promptEs: "documentar · distraer · en realidad",
    answerEn: "to document · to distract · actually",
    noteEn:
      "Te distrae de vivirla means it distracts you from living it; la refers back to tu vida.",
    tags: ["B1", "verbs", "connector"],
  },
  {
    id: "phrase-try-attention-arise",
    kind: "phrase",
    promptEs: "intentar · prestar atención · surgir",
    answerEn: "to try · to pay attention · to arise",
    noteEn:
      "Intentar takes an infinitive directly; prestar atención is a fixed expression.",
    tags: ["B1", "verbs", "common phrase"],
  },
  {
    id: "word-bother-experience",
    kind: "phrase",
    promptEs: "molestar que… · tener experiencias",
    answerEn: "to be bothered that… · to have experiences",
    noteEn:
      "When reacting to another person's action, molestar que is followed by the subjunctive.",
    tags: ["B1", "emotion", "subjunctive"],
  },
  {
    id: "word-unbearable-remember",
    kind: "word",
    promptEs: "insoportable · condescendiente · recordar",
    answerEn: "unbearable · condescending · to remember",
    noteEn:
      "Recordar means remember, not record; grabar is the usual verb for recording audio or video.",
    tags: ["B1", "adjectives", "false friend"],
  },
  {
    id: "phrase-why-care",
    kind: "phrase",
    promptEs: "¿Por qué te importa?",
    answerEn: "Why do you care?",
    noteEn:
      "Importar works like gustar: the thing matters to you, so te is an indirect-object pronoun.",
    tags: ["A2", "question", "gustar-type verb"],
  },
  {
    id: "phrase-hesitation",
    kind: "phrase",
    promptEs: "Bueno, porque… yo solo, eh…",
    answerEn: "Well, because… I just, uh…",
    noteEn:
      "Bueno can buy time at the start of an answer; eh marks hesitation while the speaker searches for a reason.",
    tags: ["A2", "conversation", "hesitation"],
  },
] as const satisfies readonly LearningCard[];

type LegacyCuratedCardId = (typeof LEGACY_CURATED_CARDS)[number]["id"];

function atomicCard(
  legacyId: LegacyCuratedCardId,
  changes: Partial<LearningCard> & { id?: string } = {},
): LearningCard {
  const legacy = LEGACY_CURATED_CARDS.find((card) => card.id === legacyId);
  if (!legacy) throw new Error(`Missing legacy card: ${legacyId}`);
  return { ...legacy, ...changes };
}

/**
 * Higher-level cards are deliberately atomic: one expression, one reusable
 * grammar rule, or one cultural/technical idea per scheduling target.
 */
const ATOMIC_CURATED_CARDS = [
  atomicCard("grammar-estar-gerundio", {
    promptEs: "estar + gerundio (-ando/-iendo)",
    questionEn: "How does Spanish show that an action is in progress at the time being discussed?",
    answerEn: "Use a form of estar followed by the verb's -ando or -iendo form.",
    noteEn:
      "The form of estar tells you who is acting. Most -ar verbs change to -ando; most -er and -ir verbs change to -iendo. This works much like English “am/is/are doing.”",
    example: { es: "Estoy leyendo.", en: "I am reading." },
  }),
  atomicCard("grammar-past-contrast", {
    promptEs: "hablé vs. hablaba",
    questionEn: "Which past form tells an event, and which one sets the scene?",
    answerEn:
      "Use the preterite for a bounded or completed event; use the imperfect for background, habits, or an action in progress.",
    noteEn:
      "Both forms describe the past, but they present it differently. The preterite moves the story forward with a completed event. The imperfect describes what was going on, what things were like, or what used to happen.",
    example: {
      es: "Ayer llovió. Antes llovía mucho.",
      en: "It rained yesterday. It used to rain a lot before.",
    },
  }),
  atomicCard("grammar-present-perfect", {
    promptEs: "he/has/ha/hemos/habéis/han + participio",
    questionEn: "How do you connect a completed action to the present?",
    answerEn:
      "Use the present tense of haber plus a past participle, like English “have done.”",
    noteEn:
      "Choose he, has, ha, hemos, habéis, or han for the subject. Then add a participle: most -ar verbs use -ado and most -er/-ir verbs use -ido. The participle does not change after haber. How often speakers choose this tense instead of the simple past varies by region.",
    example: { es: "He terminado.", en: "I have finished." },
  }),
  atomicCard("grammar-subjunctive", {
    promptEs: "emoción o reacción + que + subjuntivo",
    questionEn: "What verb form follows a reaction to what another person does?",
    answerEn:
      "After an emotional reaction plus que, put the second action in the subjunctive.",
    noteEn:
      "The first part gives a reaction such as joy, annoyance, fear, or hate. Que introduces the action being reacted to. Spanish marks that second action with the subjunctive when it has its own subject.",
    example: {
      es: "Me alegra que estés aquí.",
      en: "I am glad that you are here.",
    },
    tags: ["B1", "grammar", "subjunctive", "reactions"],
  }),
  atomicCard("grammar-subjunctive", {
    id: "grammar-esperar-que-subjunctive",
    promptEs: "esperar que + subjuntivo",
    questionEn: "What form follows esperar que when you hope for an outcome?",
    answerEn: "Use the subjunctive after esperar que to say “to hope that…”",
    noteEn:
      "Esperar by itself can mean “to wait.” Esperar que followed by a new subject and verb usually means “to hope that.” The hoped-for outcome is not presented as a certain fact, so its verb is subjunctive.",
    example: {
      es: "Espero que tengas un buen día.",
      en: "I hope you have a good day.",
    },
    tags: ["B1", "grammar", "subjunctive", "hopes"],
  }),
  atomicCard("grammar-subjunctive", {
    id: "grammar-hasta-que-subjunctive",
    promptEs: "hasta que + subjuntivo",
    questionEn: "What form follows hasta que when the event is still pending?",
    answerEn:
      "Use the subjunctive after hasta que when you are waiting for a future event.",
    noteEn:
      "Hasta que means “until.” Use the subjunctive when the event has not happened yet. Use the indicative when describing a completed event or something that habitually happens.",
    example: {
      es: "Esperaré hasta que llegues.",
      en: "I will wait until you arrive.",
    },
    tags: ["B1", "grammar", "subjunctive", "future events"],
  }),
  atomicCard("grammar-subjunctive", {
    id: "grammar-indefinite-relative-subjunctive",
    promptEs: "alguien/algo que + subjuntivo",
    questionEn: "How do you describe a person or thing you have not identified yet?",
    answerEn:
      "Use the subjunctive in the que-clause when the person or thing is unknown, uncertain, or may not exist.",
    noteEn:
      "Spanish contrasts an identified person with a person you are still looking for. A known person normally takes the indicative; an unknown or hypothetical one often takes the subjunctive.",
    example: {
      es: "Busco a alguien que hable inglés.",
      en: "I am looking for someone who speaks English.",
    },
    tags: ["B1", "grammar", "subjunctive", "relative clauses"],
  }),
  atomicCard("grammar-subjunctive", {
    id: "grammar-evaluative-subjunctive",
    promptEs: "es + adjetivo de valoración + que + subjuntivo",
    questionEn: "What form follows a judgment such as “it is important that…”?",
    answerEn:
      "Use the subjunctive after an impersonal judgment or evaluation followed by que.",
    noteEn:
      "The opening es + adjective gives the speaker's judgment: es importante, es raro, es bueno, and so on. Que introduces the situation being judged, whose verb normally takes the subjunctive.",
    example: {
      es: "Es importante que descanses.",
      en: "It is important that you rest.",
    },
    tags: ["B1", "grammar", "subjunctive", "evaluation"],
  }),
  atomicCard("grammar-hypothetical", {
    promptEs: "aunque + imperfecto de subjuntivo → condicional",
    questionEn: "How do you express an unlikely “even if…, …would…” situation?",
    answerEn:
      "Use aunque plus the imperfect subjunctive for the condition, then the conditional for the result.",
    noteEn:
      "This pattern presents the condition as hypothetical rather than expected. Imperfect-subjunctive forms can end in -ra or -se; both are valid. The result often uses a form ending in -ría.",
    example: {
      es: "Aunque tuviera tiempo, no iría.",
      en: "Even if I had time, I would not go.",
    },
  }),
  atomicCard("grammar-commands-register", {
    id: "grammar-informal-command",
    promptEs: "imperativo afirmativo de tú + pronombre al final",
    questionEn: "Where does a pronoun go with a positive tú command?",
    answerEn:
      "Attach the pronoun to the end of an affirmative tú command and write them as one word.",
    noteEn:
      "This applies to object and reflexive pronouns such as me, te, lo, la, and se. The combined word may need a written accent to keep the original stress.",
    example: { es: "¡Siéntate!", en: "Sit down!" },
    tags: ["A2", "grammar", "commands", "informal"],
  }),
  atomicCard("grammar-commands-register", {
    id: "grammar-formal-command",
    promptEs: "usted: hable / coma / escriba",
    questionEn: "How do you give a polite command to one person?",
    answerEn:
      "Use an usted command, which has the same form as the present subjunctive.",
    noteEn:
      "For regular verbs, -ar verbs use an -e ending and -er/-ir verbs use an -a ending. Common irregular forms must be learned separately. Usted is usually omitted because the verb already signals formal address.",
    example: { es: "Pase, por favor.", en: "Come in, please." },
    tags: ["A2", "grammar", "commands", "formal"],
  }),
  atomicCard("grammar-commands-register", {
    id: "grammar-formal-address",
    promptEs: "usted + verbo en tercera persona",
    questionEn: "Which verb form goes with formal “you”?",
    answerEn:
      "Usted means “you,” but it uses the same third-person singular verb forms as él or ella.",
    noteEn:
      "Treat usted grammatically like él or ella even though it addresses the listener. Spanish often leaves usted unspoken; the verb form and context still communicate politeness or distance.",
    example: {
      es: "¿Usted necesita ayuda?",
      en: "Do you need help?",
    },
    tags: ["A2", "grammar", "register", "formal"],
  }),
  atomicCard("question-words", {
    promptEs: "qué · cómo · cuándo…",
    questionEn: "When do Spanish question and exclamation words need an accent?",
    answerEn:
      "Use the written accent when these words ask a question or add an exclamation, even inside a longer sentence.",
    noteEn:
      "Accented forms such as qué, cómo, and cuándo ask or exclaim. Their unstressed connector forms—que, como, cuando—do not. The accent remains in an indirect question such as no sé qué quiere (“I don't know what they want”).",
    example: {
      es: "¿Cómo te llamas?",
      en: "What is your name?",
    },
    tags: ["A1", "grammar", "questions", "accents"],
  }),
  atomicCard("question-words", {
    id: "grammar-por-que-vs-porque",
    promptEs: "por qué / porque",
    questionEn: "What is the difference between por qué and porque?",
    answerEn: "Por qué means “why”; porque means “because.”",
    noteEn:
      "Write the question form as two words, with an accent on qué. Write the usual answer word porque as one word without an accent.",
    example: {
      es: "¿Por qué estudias español? Porque me gusta.",
      en: "Why do you study Spanish? Because I like it.",
    },
    tags: ["A1", "grammar", "questions", "spelling"],
  }),
  atomicCard("phrase-venir-a-la-cama", {
    id: "grammar-present-immediate-plan",
    kind: "grammar",
    promptEs: "presente → plan futuro",
    questionEn: "Can Spanish use the present tense for a near-future plan?",
    answerEn:
      "Yes. Use the present when the context or a time expression makes the future plan clear.",
    noteEn:
      "This is common for arranged or immediate plans, much like English “Are you coming tomorrow?” The present form does not change; the surrounding context supplies the future meaning.",
    example: {
      es: "Salimos esta noche.",
      en: "We are going out tonight.",
    },
    tags: ["A1", "grammar", "present tense", "plans"],
  }),
  atomicCard("phrase-no-puedo-importante", {
    id: "grammar-poder-ellipsis",
    kind: "grammar",
    promptEs: "poder + acción omitida",
    questionEn: "Can the action after poder be left unsaid?",
    answerEn:
      "Yes. Leave out the infinitive when the listener can recover the action from the conversation.",
    noteEn:
      "Poder normally appears before an infinitive, as in puedo ir (“I can go”). In a reply, the infinitive can disappear: no puedo means “I can't [do that].”",
    example: {
      es: "—¿Puedes venir? —No puedo.",
      en: "—Can you come? —I can't.",
    },
    tags: ["A1", "grammar", "ellipsis", "modal verbs"],
  }),
  atomicCard("phrase-estar-equivocado", {
    noteEn:
      "For a person holding a mistaken belief, Spanish naturally uses estar equivocado rather than ser incorrecto.",
  }),
  atomicCard("concept-duty-calls"),
  atomicCard("phrase-change-patterns", {
    id: "phrase-volver-a-infinitive",
    promptEs: "volver a + infinitivo",
    answerEn: "to do something again",
    noteEn:
      "Volver a plus an infinitive marks repetition or a return to an action.",
    tags: ["A2", "verb pattern", "repetition"],
  }),
  atomicCard("phrase-change-patterns", {
    id: "phrase-dejar-de-infinitive",
    promptEs: "dejar de + infinitivo",
    answerEn: "to stop doing something",
    noteEn:
      "Dejar de plus an infinitive marks the end of an action or belief.",
    tags: ["A2", "verb pattern", "cessation"],
  }),
  atomicCard("phrase-ya-esta-comparar", {
    id: "phrase-ya-esta",
    promptEs: "ya está",
    answerEn: "that's it; it is done",
    noteEn:
      "Ya está says that nothing more is required or remains to be done.",
    tags: ["A2", "conversation", "common expression"],
  }),
  atomicCard("phrase-ya-esta-comparar", {
    id: "grammar-para-infinitive-purpose",
    kind: "grammar",
    promptEs: "para + infinitivo",
    questionEn: "How do you say that one action is the purpose of another?",
    answerEn: "Use para plus an infinitive to mean “in order to do something.”",
    noteEn:
      "Use this compact pattern when the understood subject of both actions is the same. If a different person will perform the second action, Spanish normally uses para que plus the subjunctive instead.",
    example: { es: "Estudio para aprender.", en: "I study in order to learn." },
    tags: ["A2", "grammar", "purpose"],
  }),
  atomicCard("concept-python"),
  atomicCard("concept-hello-world"),
  atomicCard("concept-python-syntax", {
    id: "concept-dynamic-typing",
    promptEs: "tipado dinámico",
    answerEn: "dynamic typing",
    noteEn: "Python checks and associates value types at runtime.",
    tags: ["technology", "programming", "type systems"],
  }),
  atomicCard("concept-python-syntax", {
    id: "concept-indentation",
    promptEs: "indentación",
    answerEn: "indentation used to mark code structure",
    noteEn: "Python uses indentation as part of its block syntax.",
    tags: ["technology", "programming", "syntax"],
  }),
  atomicCard("concept-antigravity"),
  atomicCard("phrase-trouble-break", {
    id: "phrase-tener-problemas",
    promptEs: "tener problemas",
    answerEn: "to have trouble; to have problems",
    noteEn:
      "Tener problemas is the usual Spanish expression for experiencing trouble.",
    tags: ["A2", "common expression", "problems"],
  }),
  atomicCard("phrase-trouble-break", {
    id: "grammar-roto-participle",
    kind: "grammar",
    promptEs: "romper → roto",
    questionEn: "What is the irregular past participle of romper, “to break”?",
    answerEn: "Roto means “broken” and is the irregular past participle of romper.",
    noteEn:
      "Use roto after haber in compound tenses: he roto means “I have broken.” When roto acts as an adjective, it changes to match the noun: roto, rota, rotos, or rotas.",
    example: { es: "He roto el vaso.", en: "I have broken the glass." },
    tags: ["A2", "grammar", "irregular participle"],
  }),
  atomicCard("phrase-en-cierta-manera", {
    noteEn:
      "This expression softens a partial agreement and signals a qualification.",
  }),
  atomicCard("verb-poner-llamar", {
    id: "phrase-ponerle-un-nombre",
    promptEs: "ponerle un nombre a alguien",
    answerEn: "to give someone a name; to name someone",
    noteEn:
      "Le marks the person receiving the name; personal a introduces that person.",
    tags: ["A2", "expression", "object pronouns"],
  }),
  atomicCard("verb-poner-llamar", {
    id: "phrase-llamar-a-alguien",
    promptEs: "llamar a alguien + nombre/apodo",
    answerEn: "to call someone by a name or nickname",
    noteEn:
      "Llamar can introduce the name people use for someone.",
    tags: ["A2", "expression", "naming"],
  }),
  atomicCard("concept-sql-injection"),
  atomicCard("concept-input-sanitization", {
    promptEs: "sanear entradas de base de datos",
    answerEn: "to sanitize database input",
    noteEn:
      "The concept means validating untrusted input and, in practice, using parameterized queries.",
  }),
  atomicCard("grammar-soler", {
    questionEn: "How do you say that someone usually does, or used to do, something?",
    answerEn:
      "Conjugate soler and put the main action in the infinitive.",
    noteEn:
      "Present forms such as suelo and suele describe a current habit. Imperfect forms such as solía describe a past habit and are often translated as “used to.” The following verb stays in its infinitive form.",
    example: {
      es: "Suelo caminar al trabajo.",
      en: "I usually walk to work.",
    },
  }),
  atomicCard("concept-correlation-causation"),
  atomicCard("phrase-course-seem-maybe", {
    id: "phrase-dar-una-asignatura",
    promptEs: "dar una asignatura",
    answerEn: "normally, to teach a subject or course",
    noteEn:
      "Dar una asignatura normally means to teach a subject. To say that a student takes a course, cursar or hacer una asignatura is usually clearer.",
    tags: ["A2", "expression", "education", "Spain"],
  }),
  atomicCard("phrase-course-seem-maybe", {
    id: "phrase-parece-que",
    promptEs: "parece que…",
    answerEn: "it seems that…; it sounds like…",
    noteEn:
      "Parece que introduces an inference based on the available evidence.",
    tags: ["A2", "expression", "inference"],
  }),
  atomicCard("phrase-troubleshooting", {
    id: "phrase-no-tener-nada-que-ver",
    promptEs: "no tener nada que ver",
    answerEn: "to have nothing to do with it",
    noteEn:
      "This fixed expression denies any connection or relevance.",
    tags: ["B1", "idiom", "relevance"],
  }),
  atomicCard("phrase-troubleshooting", {
    id: "grammar-seguir-state",
    kind: "grammar",
    promptEs: "seguir + adjetivo/estado",
    questionEn: "How do you say that someone or something is still in the same state?",
    answerEn: "Use seguir followed by an adjective or state word to mean “still be” or “remain.”",
    noteEn:
      "Conjugate seguir for the subject, then describe the continuing state. An adjective after seguir agrees with the person or thing it describes.",
    example: {
      es: "La puerta sigue abierta.",
      en: "The door is still open.",
    },
    tags: ["B1", "grammar", "continuation", "state"],
  }),
  atomicCard("phrase-troubleshooting", {
    id: "phrase-da-igual",
    promptEs: "da igual",
    answerEn: "it doesn't matter; never mind",
    noteEn:
      "Da igual is a fixed conversational expression for dismissing a distinction or topic.",
    tags: ["A2", "expression", "conversation"],
  }),
  atomicCard("concept-haiku-support", {
    id: "concept-haiku-os",
    promptEs: "Haiku",
    answerEn: "an experimental open-source operating system",
    noteEn: "The unusual operating system derails the scripted support conversation.",
    tags: ["technology", "operating systems"],
  }),
  atomicCard("concept-haiku-support", {
    id: "concept-scripted-tech-support",
    promptEs: "soporte con guión vs. diagnóstico experto",
    answerEn: "scripted first-line support contrasted with expert diagnosis",
    noteEn:
      "The caller is trapped in a fixed troubleshooting script until an engineer recognizes the underlying problem immediately.",
    tags: ["technology", "technical support", "work"],
  }),
  atomicCard("phrase-until-should", {
    id: "grammar-deberia-expectation",
    kind: "grammar",
    promptEs: "debería + infinitivo (expectativa)",
    questionEn: "How can debería express an expectation rather than advice?",
    answerEn:
      "Debería plus an infinitive can mean that something should probably happen or be true.",
    noteEn:
      "Context decides whether debería gives advice or states a likely expectation. With an inanimate subject or a prediction, English “should” often means “is expected to.”",
    example: {
      es: "El tren debería llegar pronto.",
      en: "The train should arrive soon.",
    },
    tags: ["B1", "grammar", "modal meaning"],
  }),
  atomicCard("concept-shibboleet", {
    promptEs: "shibboleet",
    answerEn: "the comic's imagined secret code word for reaching expert support",
    noteEn: "The word blends shibboleth with 1337 (leet).",
    tags: ["technology", "wordplay", "internet culture"],
  }),
  atomicCard("concept-shibboleet", {
    id: "concept-support-backdoor",
    promptEs: "puerta trasera",
    answerEn: "a hidden access path that bypasses normal controls",
    noteEn:
      "A backdoor bypasses the normal route or controls; the term can be used literally in technology or metaphorically for a hidden shortcut.",
    tags: ["technology", "technical support", "metaphor"],
  }),
  atomicCard("phrase-no-se-lo-diga", {
    id: "grammar-se-lo-pronouns",
    kind: "grammar",
    promptEs: "le/les + lo/la/los/las → se lo/se la/se los/se las",
    questionEn: "Why does le or les change to se before lo, la, los, or las?",
    answerEn:
      "Spanish replaces le or les with se when a direct-object pronoun follows it.",
    noteEn:
      "The indirect-object pronoun comes first and the direct-object pronoun second. Spanish avoids combinations such as le lo, so le changes to se: doy el libro a Ana becomes se lo doy. Here se means “to her” and lo means “it.”",
    example: { es: "Se lo doy.", en: "I give it to him/her/you." },
    tags: ["B1", "grammar", "object pronouns"],
  }),
  atomicCard("phrase-no-se-lo-diga", {
    id: "phrase-como-minimo",
    promptEs: "como mínimo",
    answerEn: "at least; at a minimum",
    noteEn:
      "Como mínimo sets the lowest acceptable number or threshold.",
    tags: ["A2", "expression", "quantity"],
  }),
  atomicCard("phrase-instead-enjoy-view", {
    id: "phrase-en-lugar-de",
    promptEs: "en lugar de",
    answerEn: "instead of",
    noteEn:
      "En lugar de introduces an alternative to the action that follows.",
    tags: ["A2", "connector", "contrast"],
  }),
  atomicCard("phrase-instead-enjoy-view", {
    id: "phrase-disfrutar-de",
    promptEs: "disfrutar de + sustantivo",
    answerEn: "to enjoy something",
    noteEn:
      "Disfrutar de introduces the person, thing, or experience being enjoyed.",
    tags: ["A2", "verb pattern", "prepositions"],
  }),
  atomicCard("phrase-instead-enjoy-view", {
    id: "phrase-puesta-de-sol",
    promptEs: "puesta de sol",
    answerEn: "sunset",
    noteEn:
      "This lexicalized expression literally describes the sun's setting.",
    tags: ["A2", "expression", "outdoors"],
  }),
  atomicCard("phrase-try-attention-arise", {
    id: "phrase-prestar-atencion",
    promptEs: "prestar atención",
    answerEn: "to pay attention",
    noteEn:
      "Prestar atención is a fixed expression; prestar alone usually means to lend.",
    tags: ["A2", "expression", "attention"],
  }),
  atomicCard("phrase-try-attention-arise", {
    id: "phrase-hacerle-una-foto",
    promptEs: "hacer(le) una foto / hacer fotos",
    answerEn: "to take a photo of something / to take photos",
    noteEn:
      "Hacer una foto is the standard expression in Spain. The indirect pronoun le can point to the person or thing being photographed.",
    tags: ["A2", "expression", "photography", "Spain"],
  }),
  atomicCard("phrase-try-attention-arise", {
    id: "grammar-ir-a-infinitive",
    kind: "grammar",
    promptEs: "ir a + infinitivo",
    questionEn: "How do you say that someone is going to do something?",
    answerEn: "Conjugate ir, add a, and keep the main action in the infinitive.",
    noteEn:
      "This common pattern expresses a plan, intention, or expected near-future action. Only ir changes for the subject; the final verb stays in its dictionary form.",
    example: { es: "Voy a estudiar.", en: "I am going to study." },
    tags: ["A2", "grammar", "future"],
  }),
  atomicCard("phrase-try-attention-arise", {
    id: "grammar-al-infinitive",
    kind: "grammar",
    promptEs: "al + infinitivo",
    questionEn: "How do you say “when doing” or “upon doing” something?",
    answerEn: "Use al followed by an infinitive to say when another action happens.",
    noteEn:
      "This compact time expression often has the same subject as the main clause. Translate it naturally as “when,” “on,” or “upon” doing the action.",
    example: { es: "Al llegar, te llamaré.", en: "When I arrive, I will call you." },
    tags: ["B1", "grammar", "time clauses"],
  }),
  atomicCard("word-bother-experience", {
    id: "phrase-perdone-que-moleste",
    promptEs: "Perdone que + subjuntivo",
    answerEn: "Excuse me for…; Sorry to… (formal)",
    noteEn:
      "This is a productive formal apology before an interruption.",
    tags: ["B1", "expression", "politeness", "formal"],
  }),
  atomicCard("word-bother-experience", {
    id: "phrase-lo-siento",
    promptEs: "Lo siento.",
    answerEn: "I'm sorry.",
    noteEn:
      "Lo siento is the conventional expression for apologizing.",
    tags: ["A1", "expression", "politeness"],
  }),
  atomicCard("word-document-distract", {
    id: "phrase-en-realidad",
    kind: "phrase",
    promptEs: "en realidad",
    answerEn: "actually; in fact",
    noteEn:
      "En realidad corrects or qualifies what was just said.",
    tags: ["A2", "connector", "conversation"],
  }),
  atomicCard("grammar-commands-register", {
    id: "phrase-venga-ya",
    kind: "phrase",
    promptEs: "¡Venga ya!",
    answerEn: "Oh, come on!",
    noteEn:
      "Venga ya rejects a claim with impatience or disbelief.",
    tags: ["B1", "expression", "conversation", "Spain"],
  }),
  atomicCard("phrase-why-care", {
    id: "grammar-importar-indirect-object",
    kind: "grammar",
    promptEs: "me/te/le importa",
    questionEn: "Why does importar put the person in me, te, or le?",
    answerEn:
      "The thing that matters is the subject; the person who cares is an indirect object, as with gustar.",
    noteEn:
      "Use me, te, le, nos, or les for the person affected. The verb agrees with the thing that matters: me importa el libro but me importan los libros.",
    example: {
      es: "Me importa tu opinión.",
      en: "Your opinion matters to me; I care about your opinion.",
    },
    tags: ["A2", "grammar", "indirect object", "gustar-type verb"],
  }),
  atomicCard("phrase-hesitation", {
    id: "phrase-bueno-discourse-marker",
    promptEs: "bueno (marcador discursivo)",
    answerEn: "well…; a way to buy time or soften a response",
    noteEn:
      "Bueno can buy time or soften the start of an answer.",
    tags: ["A2", "conversation", "discourse marker"],
  }),
] as const satisfies readonly LearningCard[];

/**
 * One entry per exact, case-folded surface form in the translated dialogue.
 * Accents are intentionally preserved: que/qué, si/sí, esta/está, and similar
 * forms are different learning targets.
 */
const WORD_GLOSSARY = {
  "90": "the '90s",
  a: "to; at",
  al: "to the; at the",
  algo: "something; anything",
  alguien: "someone; anyone",
  algunas: "some",
  "allá": "there; over there",
  anoche: "last night",
  antigravity: "antigravity (the Python module)",
  "año": "year",
  apaga: "goes out; turns off",
  "aprendí": "I learned",
  aprendido: "learned",
  "arreglará": "will be fixed",
  asignatura: "course; school subject",
  "atención": "attention",
  aunque: "although; even if",
  "automáticamente": "automatically",
  aventuras: "adventures",
  "ayudó": "helped",
  barba: "beard",
  bases: "bases (in bases de datos: databases)",
  bien: "well; fine",
  bobby: "Bobby (a name)",
  "botiquín": "medicine cabinet; first-aid kit",
  bueno: "well; okay",
  cada: "each; every",
  caerse: "to fall; to go down",
  "caído": "down; offline",
  cama: "bed",
  cambio: "change; move",
  cargo: "cargo (as in cargo pants)",
  causalidad: "causation",
  cerca: "near; nearby",
  cierta: "certain; a particular",
  ciertos: "certain; some",
  claro: "sure; of course",
  clase: "class",
  clic: "click",
  como: "as; like",
  "cómo": "how",
  comparar: "to compare",
  con: "with",
  condescendiente: "condescending; patronizing",
  "conexión": "connection",
  conozca: "know (subjunctive form)",
  contenta: "happy; pleased",
  "coño": "fuck; damn (vulgar)",
  "correlación": "correlation",
  creer: "to believe",
  creerlo: "to believe it",
  creo: "I think; I believe",
  cualquier: "any; whichever",
  da: "doesn't matter (as part of da igual)",
  datos: "data",
  de: "of; from",
  debe: "must; is supposed to",
  "debería": "should",
  decir: "to say; to tell",
  "dejé": "I left; I stopped",
  del: "of the; from the",
  dentro: "inside; within",
  desconocido: "stranger; unknown person",
  di: "I took (a course)",
  diga: "say; tell (formal/subjunctive form)",
  "dinámico": "dynamic",
  dios: "God",
  disfrutan: "they enjoy",
  disfrutar: "to enjoy",
  distrae: "distracts",
  divertido: "fun; enjoyable",
  documentar: "to document",
  dos: "two",
  drop: "DROP (SQL command that deletes an object)",
  durante: "during",
  eh: "uh; um",
  el: "the (masculine singular)",
  en: "in; on",
  encontrado: "found",
  entre: "between; among",
  equivocado: "wrong; mistaken",
  es: "is",
  esa: "that (feminine)",
  "escribí": "I wrote; I typed",
  escuela: "school",
  espadas: "swords",
  espero: "I hope",
  "está": "is (a state or location)",
  "estadística": "statistics",
  estamos: "we are",
  "estás": "you are",
  este: "this (masculine)",
  "esté": "be; is (subjunctive form)",
  esto: "this (thing or situation)",
  estos: "these (masculine)",
  estudiantiles: "student; relating to students",
  experiencias: "experiences",
  experimental: "experimental",
  forma: "way; form",
  foto: "photo",
  fotografiar: "to photograph",
  fotos: "photos",
  futuro: "future",
  geeks: "geeks",
  gente: "people",
  gracias: "thanks; thank you",
  "guión": "script",
  ha: "has",
  hable: "speak (subjunctive form)",
  hacerle: "to take a photo of it or them (in hacerle una foto)",
  haga: "do; make (subjunctive form)",
  haiku: "Haiku (an operating system)",
  han: "they have; you all have",
  has: "you have",
  hasta: "until; up to",
  hay: "there is; there are",
  hayan: "have (plural subjunctive form)",
  he: "I have",
  hemos: "we have",
  hijo: "son",
  hola: "hello",
  horas: "hours",
  igual: "doesn't matter (as part of da igual)",
  imagina: "imagine",
  implicaba: "implied",
  import: "import (load a software module)",
  importa: "matters; is important to",
  importante: "important",
  incorrecta: "incorrect; wrong",
  "indentación": "indentation",
  "informáticos": "computer-related; IT",
  ingeniero: "engineer",
  inicio: "start; beginning",
  "inserción": "insertion; input",
  insoportable: "unbearable",
  intentar: "to try; to attempt",
  intento: "I try; I attempt",
  internet: "internet",
  ir: "to go; to work or run",
  justo: "just; right at",
  la: "the (feminine singular); her; it",
  le: "to him; to her; to you",
  lenguajes: "languages",
  llamada: "call",
  llamamos: "we call",
  llamo: "I call; I am calling",
  lleve: "wear; carry (subjunctive form)",
  lo: "it; the thing",
  los: "the (masculine plural)",
  luego: "then; later",
  lugar: "place",
  luz: "light",
  manera: "way; manner",
  mapa: "map",
  "más": "more; most",
  mayores: "greatest; biggest; older",
  mej: "best… (a cut-off mejor)",
  "menú": "menu",
  mesas: "desks; tables",
  metro: "subway; metro",
  mi: "my",
  mierda: "shit; damn (vulgar)",
  "mínimo": "minimum; at least",
  "mío": "my; mine",
  mire: "look (formal command)",
  mis: "my (plural)",
  "módem": "modem",
  molesta: "bothers",
  moleste: "bother (subjunctive/formal form)",
  momento: "moment",
  montaron: "they set up; they built",
  "muchísimas": "very many; so much",
  mundo: "world",
  nada: "nothing; anything",
  nadie: "nobody; anybody",
  no: "no; not",
  nombre: "name",
  nosotros: "we; us",
  nuevo: "new",
  nunca: "never",
  odia: "he/she hates",
  odio: "I hate",
  oficina: "office",
  oh: "oh",
  operativo: "operating; operational",
  ordenador: "computer (especially in Spain)",
  otra: "other; another (feminine)",
  otros: "others; other people",
  palabra: "word",
  pantalones: "pants; trousers",
  para: "in order to (expressing purpose)",
  parece: "seems; appears",
  pared: "wall",
  "pasará": "will be passed; will be transferred",
  "pasármela": "to pass her to me; put her on",
  pegado: "stuck; posted",
  peluche: "stuffed toy; plush toy",
  "pequeño": "small; little",
  perdido: "lost",
  perdone: "excuse me; sorry (formal)",
  perfecto: "perfect; great",
  pero: "but",
  persona: "person",
  "pingüino": "penguin",
  pocas: "few",
  por: "for; by; because of",
  porque: "because",
  "póster": "poster",
  prestar: "to pay (as part of prestar atención)",
  print: "print (display text in code)",
  "probé": "I tried; I tested",
  problema: "problem",
  problemas: "problems; trouble",
  "programación": "programming",
  programar: "to program; to code",
  puede: "can; you can",
  puedo: "I can",
  puerta: "door",
  puesta: "setting (as in sunset)",
  pusieron: "they put; they installed",
  puso: "named; gave a name to",
  python: "Python (a programming language)",
  que: "that; which; who",
  "qué": "what",
  quieres: "you want",
  "quizá": "maybe; perhaps",
  "quizás": "maybe; perhaps",
  realidad: "actually; in fact (as part of en realidad)",
  realmente: "really; actually",
  recordar: "to remember",
  recurrente: "recurring",
  registros: "records",
  reiniciado: "restarted",
  reiniciar: "to restart",
  relevan: "relevan… (a cut-off relevante, relevant)",
  robert: "Robert (a name)",
  roto: "broken",
  sanear: "to sanitize; clean up",
  se: "himself/herself/itself; passive/reflexive marker",
  "sé": "I know",
  seguir: "to follow (a script)",
  sencillo: "simple; easy",
  ser: "to be",
  serio: "seriously (as part of en serio)",
  servicio: "service",
  servidor: "server",
  shibboleet: "shibboleet (the comic's secret code word)",
  si: "if",
  "sí": "yes",
  siento: "I feel (in lo siento: I'm sorry)",
  sigue: "continues; remains",
  simplemente: "simply; just",
  sin: "without",
  sistema: "system",
  sistemas: "systems",
  sol: "sun",
  "solía": "I used to",
  solo: "only; just",
  soporte: "support",
  students: "Students (the database table name)",
  su: "your (formal singular)",
  surgido: "arisen; emerged",
  sus: "your (formal, before a plural noun)",
  tablas: "tables",
  table: "TABLE (a database table in SQL)",
  "también": "also; too",
  tan: "so; such",
  te: "you; to you",
  "técnico": "technical",
  "telefónico": "telephone; phone-related",
  tenga: "have (subjunctive form)",
  tengo: "I have",
  teniendo: "having",
  "tía": "woman; girl (colloquial)",
  tiene: "has",
  tipado: "typing (a programming type system)",
  tipo: "guy; type",
  todo: "everything; all",
  todos: "all; every (plural)",
  trasera: "back; rear",
  tu: "your",
  uf: "ugh",
  un: "a; an (masculine)",
  una: "a; an (feminine)",
  unas: "some; a few",
  "únete": "join; join us",
  uplink: "uplink (a network connection going upstream)",
  usted: "you (formal)",
  vale: "okay; all right",
  vaya: "wow; oh my",
  ve: "sees; do you see",
  venga: "come (in venga ya: come on)",
  veo: "I see",
  ver: "to see",
  vida: "life",
  vienes: "you come; you are coming",
  vista: "view; sight",
  vives: "you live",
  vivirla: "to live it",
  volando: "flying",
  "volvería": "would return; would do again",
  volviese: "came back; returned (subjunctive)",
  voy: "I am going",
  vuelve: "returns; becomes again",
  y: "and",
  ya: "already; now; that's it",
  yo: "I",
} as const;

type CuratedCard = (typeof ATOMIC_CURATED_CARDS)[number];
type CuratedCardId = CuratedCard["id"];
type NormalizedWord = keyof typeof WORD_GLOSSARY & string;
type WordCardId = `word-${string}`;

type BeginnerLanguageCardCopy = Required<
  Pick<LearningCard, "questionEn" | "answerEn" | "noteEn" | "example">
> & { promptEs?: string };

/**
 * Final learner-facing copy for every reusable grammar or expression card.
 * Keeping it in one exhaustive map makes it harder for terse legacy seed copy
 * to slip back into the live curriculum.
 */
const BEGINNER_LANGUAGE_CARD_COPY = {
  "grammar-estar-gerundio": {
    questionEn: "How do you say that someone is in the middle of doing something?",
    answerEn:
      "Use a form of estar followed by an action word ending in -ando or -iendo.",
    noteEn:
      "Estar changes to show who is doing the action: estoy, estás, está, and so on. For most verbs, replace -ar with -ando (hablar → hablando) and replace -er or -ir with -iendo (comer → comiendo, vivir → viviendo). This is similar to English “am/is/are doing.”",
    example: { es: "Estoy leyendo.", en: "I am reading." },
  },
  "grammar-past-contrast": {
    questionEn:
      "Spanish has two common ways to talk about the past. When do you use each one?",
    answerEn:
      "Use the preterite for a completed event and the imperfect for background, an ongoing situation, or something that used to happen.",
    noteEn:
      "Think of a story: the preterite answers “What happened next?” The imperfect answers “What was happening?”, “What were things like?”, or “What used to happen?” These two names describe how the speaker presents an event, not simply how long it lasted.",
    example: {
      es: "Mientras caminaba, empezó a llover.",
      en: "While I was walking, it started to rain.",
    },
  },
  "grammar-present-perfect": {
    questionEn: "How do you say “have done,” as in “I have finished”?",
    answerEn:
      "Use he, has, ha, hemos, habéis, or han followed by the verb’s completed-action form.",
    noteEn:
      "These are forms of haber, the helper verb used here like English “have.” For most verbs, the completed-action form ends in -ado after an -ar verb and -ido after an -er or -ir verb. This form is called the past participle, and it does not change after haber. How often this tense is used instead of the simple past varies by region.",
    example: { es: "He terminado.", en: "I have finished." },
  },
  "grammar-subjunctive": {
    questionEn:
      "What happens to the second verb after phrases such as “I’m glad that…” or “It bothers me that…”?",
    answerEn:
      "Spanish puts that second verb in a special form called the subjunctive.",
    noteEn:
      "The first part expresses someone’s feeling or reaction. Que means “that” and introduces what they are reacting to. When the part after que has its own doer, Spanish normally changes its verb to the subjunctive: estás becomes estés in the example. English does not need a separate word for this change.",
    example: {
      es: "Me alegra que estés aquí.",
      en: "I am glad that you are here.",
    },
  },
  "grammar-esperar-que-subjunctive": {
    questionEn:
      "After esperar que (“to hope that”), what happens to the next verb?",
    answerEn: "Put the verb for the hoped-for event in the subjunctive.",
    noteEn:
      "The subjunctive is a special Spanish verb form often used for hoped-for or uncertain events. Esperar by itself can mean “to wait.” When esperar que introduces who or what will perform the hoped-for action, that action uses the subjunctive: llegas becomes llegues.",
    example: {
      es: "Espero que llegues pronto.",
      en: "I hope you arrive soon.",
    },
  },
  "grammar-hasta-que-subjunctive": {
    questionEn:
      "After hasta que (“until”), which verb form do you use for something that has not happened yet?",
    answerEn: "Use the subjunctive for the still-awaited action.",
    noteEn:
      "The subjunctive is a special Spanish verb form used here because the action is still pending. In esperaré hasta que llegues, the arrival has not happened yet. After the event has already happened, Spanish uses its ordinary statement form instead: esperé hasta que llegaste means “I waited until you arrived.”",
    example: {
      es: "Esperaré hasta que llegues.",
      en: "I will wait until you arrive.",
    },
  },
  "grammar-indefinite-relative-subjunctive": {
    questionEn:
      "Which verb form do you use when you are looking for a person or thing that has not been identified—and may not exist?",
    answerEn:
      "Use the subjunctive after que when describing that unknown person or thing.",
    noteEn:
      "Spanish treats a known person differently from one you are still trying to find. Conozco a alguien que habla inglés means “I know someone who speaks English.” Busco a alguien que hable inglés uses hable because no particular person has been identified.",
    example: {
      es: "Busco a alguien que hable inglés.",
      en: "I am looking for someone who speaks English.",
    },
  },
  "grammar-evaluative-subjunctive": {
    questionEn:
      "After “It is important/good/strange that…,” which form does the next Spanish verb take?",
    answerEn: "Use the subjunctive for the situation being judged.",
    noteEn:
      "Phrases such as es importante, es bueno, and es raro express a judgment about what follows. Spanish marks the verb after que with the subjunctive. In the example, descansas—the ordinary statement form—changes to descanses.",
    example: {
      es: "Es importante que descanses.",
      en: "It is important that you rest.",
    },
  },
  "grammar-hypothetical": {
    questionEn: "How do you say an imaginary “even if…, …would…” sentence?",
    answerEn:
      "After aunque (“even if”), use the hypothetical past form; use the “would” form for the result.",
    noteEn:
      "Spanish calls the first form the imperfect subjunctive. It commonly ends in -ra or -se, as in tuviera or tuviese. The result uses the conditional, often ending in -ría, as in iría. Together they present the condition as imagined or unlikely rather than expected.",
    example: {
      es: "Aunque tuviera tiempo, no iría.",
      en: "Even if I had time, I would not go.",
    },
  },
  "grammar-informal-command": {
    questionEn:
      "If a positive command includes a short word such as te (“yourself”) or lo (“it”), where does that word go?",
    answerEn:
      "Attach it to the end of the command and write the result as one word.",
    noteEn:
      "A positive command tells someone to do something, rather than not to do it. With one informal listener, sienta + te becomes siéntate. A written accent may be added so the combined word keeps the original stress. In a negative command, the short word goes before the verb instead: no te sientes.",
    example: { es: "¡Siéntate aquí!", en: "Sit down here!" },
  },
  "grammar-formal-command": {
    questionEn: "How do you politely tell one person to do something in Spanish?",
    answerEn:
      "Use the usted command form: regular -ar verbs end in -e, while regular -er and -ir verbs end in -a.",
    noteEn:
      "Usted is the polite or formal singular “you.” Hablar becomes hable, comer becomes coma, and escribir becomes escriba. Usted is usually left out because the command ending already shows formal address. Some common verbs are irregular, such as decir → diga.",
    example: { es: "Pase, por favor.", en: "Come in, please." },
  },
  "grammar-formal-address": {
    questionEn:
      "When usted means polite or formal “you,” which verb form goes with it?",
    answerEn:
      "Use the same singular verb form used with él or ella (“he” or “she”).",
    noteEn:
      "Although usted refers to the listener, Spanish treats it like “he” or “she” when choosing the verb. Compare tú necesitas for informal “you need” with usted necesita for formal “you need.” Spanish often leaves usted unspoken when the context makes it clear.",
    example: {
      es: "¿Necesita ayuda?",
      en: "Do you need help? (formal)",
    },
  },
  "question-words": {
    questionEn:
      "Why do words such as que, como, and cuando sometimes have a written accent?",
    answerEn:
      "Write qué, cómo, cuándo, and similar words with an accent when they ask a question or add an exclamation.",
    noteEn:
      "This includes direct questions (¿Qué quieres?), questions inside another sentence (No sé qué quiere), and exclamations (¡Qué bonito!). Without the accent, these words usually connect parts of a sentence instead: el libro que quiero means “the book that I want.”",
    example: {
      es: "¿Cómo te llamas?",
      en: "What is your name?",
    },
  },
  "grammar-por-que-vs-porque": {
    questionEn: "How do you write “why” and “because” in Spanish?",
    answerEn: "Por qué means “why”; porque means “because.”",
    noteEn:
      "Write the question form as two words, with an accent on qué. Write the usual answer word porque as one word without an accent.",
    example: {
      es: "¿Por qué estudias español? Porque me gusta.",
      en: "Why do you study Spanish? Because I like it.",
    },
  },
  "grammar-present-immediate-plan": {
    questionEn: "Can a Spanish present-time verb describe a future plan?",
    answerEn:
      "Yes. Use the normal present form when a time word or the situation makes the future meaning clear.",
    noteEn:
      "This is common for arranged or immediate plans, just as English can say “Are you coming tomorrow?” A phrase such as mañana or esta noche—or the conversation itself—tells the listener that the action is in the future.",
    example: {
      es: "Salimos esta noche.",
      en: "We are going out tonight.",
    },
  },
  "grammar-poder-ellipsis": {
    questionEn:
      "In a reply with poder (“can” or “be able to”), can you leave out the action?",
    answerEn:
      "Yes. If the action is already clear, puedo or no puedo can stand alone.",
    noteEn:
      "Poder usually comes before another verb in its dictionary form: puedo ir means “I can go.” When the conversation has already named the action, Spanish can omit that second verb, just as English says “I can” or “I can’t.”",
    example: {
      es: "—¿Puedes venir? —No puedo.",
      en: "—Can you come? —I can’t.",
    },
  },
  "grammar-para-infinitive-purpose": {
    questionEn: "How do you say “in order to do something” in Spanish?",
    answerEn: "Use para followed by the verb’s dictionary form.",
    noteEn:
      "The dictionary form ends in -ar, -er, or -ir and is called the infinitive. Use para + verb when the same person or thing performs both actions: in estudio para aprender, I both study and learn. When someone else performs the second action, Spanish needs the different pattern para que.",
    example: {
      es: "Estudio para aprender.",
      en: "I study in order to learn.",
    },
  },
  "grammar-roto-participle": {
    questionEn: "What special form of romper (“to break”) means “broken”?",
    answerEn: "Romper changes irregularly to roto.",
    noteEn:
      "Roto is the form used after haber in phrases such as he roto (“I have broken”). This kind of form is called a past participle. It can also describe a noun; then its ending matches that noun: un vaso roto but una ventana rota.",
    example: {
      es: "He roto el vaso.",
      en: "I have broken the glass.",
    },
  },
  "grammar-soler": {
    questionEn:
      "How do you say that someone usually does something, or used to do it?",
    answerEn:
      "Use a form of soler followed by the action verb in its dictionary form.",
    noteEn:
      "Soler adds the idea of a habit. Suelo means “I usually,” while solía means “I used to.” The action after it stays in its unchanged -ar, -er, or -ir form: suelo caminar, solía caminar.",
    example: {
      es: "Suelo caminar al trabajo.",
      en: "I usually walk to work.",
    },
  },
  "grammar-seguir-state": {
    questionEn:
      "How do you say that someone or something is still in the same condition?",
    answerEn:
      "Use a form of seguir followed by the word that describes the condition.",
    noteEn:
      "Seguir normally means “to continue” or “to keep going.” Before a description, it means “to still be” or “to remain”: sigue abierta means “is still open.” If the describing word has masculine, feminine, singular, or plural endings, match it to what is being described.",
    example: {
      es: "La puerta sigue abierta.",
      en: "The door is still open.",
    },
  },
  "grammar-deberia-expectation": {
    questionEn:
      "Besides giving advice, what can debería followed by a verb mean?",
    answerEn: "It can say that something is expected or likely to happen.",
    noteEn:
      "Context decides between advice and expectation. Deberías descansar tells a person what they should do. El tren debería llegar pronto predicts what is expected to happen. In both uses, the following action stays in its dictionary form.",
    example: {
      es: "El tren debería llegar pronto.",
      en: "The train should arrive soon.",
    },
  },
  "grammar-se-lo-pronouns": {
    questionEn:
      "How do you say “I give it to her/him/them” without repeating the person and the thing?",
    answerEn:
      "Use se for the recipient, followed by lo, la, los, or las for the thing.",
    noteEn:
      "Le or les normally means “to him,” “to her,” “to you” (formal), or “to them.” Immediately before lo, la, los, or las, it changes to se; Spanish does not say le lo. Se still stands for the recipient, while the second word stands for the thing. Le doy el libro a Ana therefore becomes se lo doy.",
    example: {
      es: "Le doy el libro a Ana. → Se lo doy.",
      en: "I give the book to Ana. → I give it to her.",
    },
  },
  "grammar-ir-a-infinitive": {
    questionEn: "How do you say that someone is going to do something?",
    answerEn:
      "Use a form of ir (“to go”), then a, then the action verb in its dictionary form.",
    noteEn:
      "Ir changes to match the person: voy a means “I am going to,” vas a means “you are going to,” and va a means “he/she is going to.” The final action stays in its unchanged -ar, -er, or -ir form. This pattern expresses a plan, intention, or expected future event.",
    example: {
      es: "Voy a estudiar.",
      en: "I am going to study.",
    },
  },
  "grammar-al-infinitive": {
    questionEn:
      "How do you say “when doing something” or “upon doing something”?",
    answerEn: "Use al followed by the action verb in its dictionary form.",
    noteEn:
      "The dictionary form ends in -ar, -er, or -ir and is called the infinitive. Al + verb tells when the main action happens. Translate it naturally as “when,” “on,” or “upon”: al llegar means “when arriving” or simply “when someone arrives.”",
    example: {
      es: "Al llegar, te llamaré.",
      en: "When I arrive, I will call you.",
    },
  },
  "grammar-importar-indirect-object": {
    questionEn:
      "Why does me importa work like “it matters to me” rather than “I care about it”?",
    answerEn:
      "The thing that matters chooses importa or importan; me, te, le, nos, or les says who cares.",
    noteEn:
      "Spanish builds this idea from the thing outward. Me importa el libro literally says “The book matters to me,” so the singular el libro uses importa. Me importan los libros says “Books matter to me,” so the plural los libros uses importan. The small word identifies the affected person: me means “to me,” te means “to you,” and le can mean “to him,” “to her,” or formal “to you.”",
    example: {
      es: "Me importa tu opinión.",
      en: "Your opinion matters to me; I care about your opinion.",
    },
  },
  "phrase-estar-equivocado": {
    questionEn: "How do you say that a person is wrong or mistaken?",
    answerEn:
      "Use estar equivocado or estar equivocada: “to be wrong” or “to be mistaken.”",
    noteEn:
      "Spanish uses estar here because it describes the person’s state. Equivocado changes to match the person being described: equivocado for one male person, equivocada for one female person, and equivocados or equivocadas for groups.",
    example: {
      es: "Creo que estoy equivocado.",
      en: "I think I am wrong.",
    },
  },
  "phrase-volver-a-infinitive": {
    questionEn: "How do you say that someone does something again?",
    answerEn:
      "Use a form of volver, then a, then the action verb in its dictionary form.",
    noteEn:
      "The dictionary form of a verb is called the infinitive. It usually ends in -ar, -er, or -ir, such as hablar, comer, or salir. Only volver changes to show who acts and when; the final verb stays in its dictionary form. In this pattern, volver a means repeating the action, not literally returning to a place.",
    example: {
      es: "Marta vuelve a llamar.",
      en: "Marta calls again.",
    },
  },
  "phrase-dejar-de-infinitive": {
    questionEn: "How do you say that someone stops doing something?",
    answerEn:
      "Use a form of dejar, then de, then the action verb in its dictionary form.",
    noteEn:
      "The dictionary form of a verb is called the infinitive. It usually ends in -ar, -er, or -ir. Only dejar changes to show who acts and when; the final verb stays in its dictionary form. Keep de in this pattern: dejar alone usually means “to leave” or “to let,” while dejar de + action means to stop doing that action.",
    example: {
      es: "Quiero dejar de fumar.",
      en: "I want to stop smoking.",
    },
  },
  "phrase-ya-esta": {
    questionEn: "What can ya está mean when something is finished?",
    answerEn: "Ya está can mean “that's it,” “it's done,” or “all set.”",
    noteEn:
      "This is an everyday fixed expression. It tells the listener that something is complete or that nothing else needs to be added. The most natural English wording depends on the situation.",
    example: {
      es: "Ya está. Podemos irnos.",
      en: "That's it. We can leave.",
    },
  },
  "phrase-tener-problemas": {
    questionEn: "How do you say that someone or something is having trouble?",
    answerEn:
      "Use tener problemas, often followed by con to name the problem.",
    noteEn:
      "Change tener to match who has the problem: tengo problemas means “I am having trouble.” Use con before the person, thing, or activity causing difficulty.",
    example: {
      es: "Tengo problemas con mi teléfono.",
      en: "I am having trouble with my phone.",
    },
  },
  "phrase-en-cierta-manera": {
    questionEn:
      "How can you say that something is true only from one point of view?",
    answerEn: "En cierta manera means “in a way” or “in a sense.”",
    noteEn:
      "Use this expression when a statement is only partly true or is true from one particular point of view. It signals that a qualification or explanation may follow.",
    example: {
      es: "En cierta manera, los dos tienen razón.",
      en: "In a way, they are both right.",
    },
  },
  "phrase-ponerle-un-nombre": {
    questionEn: "How do you say that you give a person or animal a name?",
    answerEn:
      "Use ponerle un nombre a alguien: “to give someone a name” or “to name someone.”",
    noteEn:
      "In this expression, poner means “to give or assign,” not literally “to put.” Le means “to him, her, or it.” You can state who receives the name after a, as in ponerle un nombre al perro.",
    example: {
      es: "Vamos a ponerle un nombre al perro.",
      en: "We are going to give the dog a name.",
    },
  },
  "phrase-llamar-a-alguien": {
    promptEs: "llamar a alguien + nombre o apodo",
    questionEn:
      "How do you say what name or nickname people use for someone?",
    answerEn:
      "Use llamar a alguien followed by the name or nickname: “to call someone…”",
    noteEn:
      "Here llamar means “to call someone by a name,” not “to telephone.” Small words such as lo, la, or—in much of Spain—le can stand for the person being named. The name or nickname follows llamar.",
    example: {
      es: "A Elena la llaman Nena.",
      en: "People call Elena “Nena.”",
    },
  },
  "phrase-dar-una-asignatura": {
    questionEn: "In Spain, what does dar una asignatura normally mean?",
    answerEn: "It normally means “to teach a subject or course.”",
    noteEn:
      "Dar often means “to give.” In an educational context, a teacher can dar una asignatura. A student normally cursa, hace, or estudia una asignatura instead.",
    example: {
      es: "Este año doy una asignatura de historia.",
      en: "This year I teach a history course.",
    },
  },
  "phrase-parece-que": {
    questionEn:
      "How do you introduce something that seems likely but is not certain?",
    answerEn:
      "Parece que… means “It seems that…” or “It looks as though…”",
    noteEn:
      "Put a complete statement after que. Use this pattern when the available evidence points toward a conclusion, but you are not presenting that conclusion as completely certain.",
    example: {
      es: "Parece que va a llover.",
      en: "It looks like it is going to rain.",
    },
  },
  "phrase-no-tener-nada-que-ver": {
    promptEs: "no tener nada que ver con…",
    questionEn: "How do you say that one thing has no connection to another?",
    answerEn:
      "Use no tener nada que ver con…: “to have nothing to do with…”",
    noteEn:
      "This is a fixed expression; ver does not mean literally “to see” here. Use con to name the unrelated subject. You can leave that subject unsaid when the conversation already makes it clear.",
    example: {
      es: "Eso no tiene nada que ver con el precio.",
      en: "That has nothing to do with the price.",
    },
  },
  "phrase-da-igual": {
    questionEn: "How do you say that a choice or difference does not matter?",
    answerEn:
      "Da igual means “it doesn't matter” or “either way is fine.”",
    noteEn:
      "Treat da igual as a fixed expression rather than translating its two words separately. Add me, te, or le to say who does not mind: me da igual means “I don't mind.”",
    example: {
      es: "Da igual; las dos opciones son buenas.",
      en: "It doesn't matter; both options are good.",
    },
  },
  "phrase-como-minimo": {
    questionEn:
      "How do you say that a number is the lowest possible or required amount?",
    answerEn: "Como mínimo means “at least” or “at a minimum.”",
    noteEn:
      "Place this expression next to the relevant amount. Here como belongs to the whole expression and does not mean “like.”",
    example: {
      es: "Necesitamos como mínimo tres personas.",
      en: "We need at least three people.",
    },
  },
  "phrase-en-lugar-de": {
    questionEn: "How do you say “instead of” before a thing or an action?",
    answerEn: "Use en lugar de.",
    noteEn:
      "After en lugar de, use a thing or the dictionary form of an action verb. That dictionary form is called the infinitive and usually ends in -ar, -er, or -ir.",
    example: {
      es: "Caminamos en lugar de conducir.",
      en: "We walk instead of driving.",
    },
  },
  "phrase-disfrutar-de": {
    promptEs: "disfrutar de algo o alguien",
    questionEn:
      "How does disfrutar de connect “enjoy” to the thing being enjoyed?",
    answerEn:
      "Disfrutar de followed by a thing means “to enjoy that thing.”",
    noteEn:
      "De introduces what is being enjoyed and usually has no separate English word here. Spanish can also use disfrutar directly without de in many contexts, so learn disfrutar de as a common pattern rather than an unbreakable rule.",
    example: {
      es: "Disfrutamos de la música.",
      en: "We enjoy the music.",
    },
  },
  "phrase-puesta-de-sol": {
    questionEn: "What is the usual Spanish expression for “sunset”?",
    answerEn: "Puesta de sol means “sunset.”",
    noteEn:
      "Learn these three words as one noun expression. Puesta means “setting” here, so the phrase literally describes the setting of the sun.",
    example: {
      es: "Vimos una puesta de sol preciosa.",
      en: "We saw a beautiful sunset.",
    },
  },
  "phrase-prestar-atencion": {
    questionEn: "How do you say “to pay attention” in Spanish?",
    answerEn: "Use prestar atención.",
    noteEn:
      "English uses “pay,” but Spanish uses prestar, a verb that by itself often means “to lend.” Add a before the person or thing receiving the attention: prestar atención a algo.",
    example: {
      es: "Presta atención a la pregunta.",
      en: "Pay attention to the question.",
    },
  },
  "phrase-hacerle-una-foto": {
    promptEs: "hacer una foto · hacerle una foto a alguien/algo",
    questionEn:
      "In Spain, how do you say “to take a photo” or “to take a photo of someone”?",
    answerEn:
      "Use hacer una foto; to name what is photographed, use hacerle una foto a alguien or algo.",
    noteEn:
      "Hacer normally means “to make” or “to do,” but in this expression it corresponds to English “take.” Le and the words after a point to the person or thing in the photo. Tomar una foto is common in many other regions.",
    example: {
      es: "Vamos a hacerle una foto al perro.",
      en: "We are going to take a photo of the dog.",
    },
  },
  "phrase-perdone-que-moleste": {
    promptEs: "Perdone que…",
    questionEn:
      "How can you formally apologize before interrupting or bothering someone?",
    answerEn:
      "Say Perdone que… followed by the action: “Excuse me for…” or “Sorry to…”",
    noteEn:
      "Perdone is the polite form used when addressing one person formally. The verb after que uses a special form called the subjunctive because the speaker is apologizing for the action rather than simply reporting it. With someone you address informally, say Perdona que… instead.",
    example: {
      es: "Perdone que interrumpa.",
      en: "Excuse me for interrupting.",
    },
  },
  "phrase-lo-siento": {
    questionEn:
      "What is the standard way to say “I'm sorry” when apologizing or expressing sympathy?",
    answerEn: "Lo siento means “I'm sorry.”",
    noteEn:
      "Use this fixed expression for an apology or when reacting sympathetically to bad news. Learn it as a complete expression instead of translating lo and siento separately.",
    example: {
      es: "Lo siento. Fue un error.",
      en: "I'm sorry. It was a mistake.",
    },
  },
  "phrase-en-realidad": {
    questionEn:
      "What expression means “actually” or “in fact” when correcting an impression?",
    answerEn: "En realidad means “actually” or “in fact.”",
    noteEn:
      "Use it to correct or qualify what someone may believe. It does not mean “currently”; Spanish normally uses actualmente for that meaning.",
    example: {
      es: "Pensaba que era lunes, pero en realidad es martes.",
      en: "I thought it was Monday, but it is actually Tuesday.",
    },
  },
  "phrase-venga-ya": {
    questionEn:
      "In Spain, what does ¡Venga ya! mean when someone reacts with disbelief or impatience?",
    answerEn: "It means “Oh, come on!” or “No way!”",
    noteEn:
      "Venga by itself is a form of venir, “to come,” but the complete expression is a fixed reaction. Tone can make it sound playful, disbelieving, or annoyed.",
    example: {
      es: "—Dice que ganó solo. —¡Venga ya!",
      en: "—He says he won by himself. —Oh, come on!",
    },
  },
  "phrase-bueno-discourse-marker": {
    promptEs: "bueno…",
    questionEn:
      "What can bueno mean at the start of an answer when it is not describing something as good?",
    answerEn:
      "It can mean “well…,” giving the speaker time or softening the reply.",
    noteEn:
      "Here bueno organizes the conversation rather than describing a person or thing. A pause after it can signal hesitation, reluctance, or a gentle correction.",
    example: {
      es: "Bueno… no lo sé.",
      en: "Well… I don't know.",
    },
  },
} as const satisfies Partial<
  Record<CuratedCardId, BeginnerLanguageCardCopy>
>;

interface WordSenseContext {
  pattern: readonly NormalizedWord[];
  /** Index of the target word inside pattern. */
  at: number;
}

interface WordSenseDefinition {
  key: string;
  answerEn: string;
  /** Omitted for the fallback sense of this surface form. */
  contexts?: readonly WordSenseContext[];
}

interface WordCardTeaching {
  /** Reusable, beginner-oriented explanation; never mentions a comic. */
  noteEn: string;
  /** Reusable example invented for this card, never copied from a comic. */
  example: { es: string; en: string };
}

const WORD_SENSES = {
  a: [
    {
      key: "repetition-link",
      answerEn:
        "no separate English word; it links volver to the repeated action",
      contexts: [
        { pattern: ["vuelve", "a", "ser"], at: 1 },
        { pattern: ["volvería", "a", "caerse"], at: 1 },
      ],
    },
    {
      key: "personal-a",
      answerEn: "no separate English word; marks a specific person as the object",
      contexts: [
        { pattern: ["puso", "a", "su", "hijo"], at: 1 },
        { pattern: ["usted", "a", "alguien"], at: 1 },
      ],
    },
    {
      key: "infinitive-link",
      answerEn: "to (linking a verb to the following infinitive)",
      contexts: [{ pattern: ["aprendido", "a", "sanear"], at: 1 }],
    },
    {
      key: "near-future",
      answerEn: "to (part of ir a + infinitive, going to do something)",
      contexts: [{ pattern: ["voy", "a", "prestar"], at: 1 }],
    },
    {
      key: "photo-target",
      answerEn: "of (marks what the photo is of)",
      contexts: [{ pattern: ["foto", "a", "algo"], at: 1 }],
    },
    {
      key: "join-complement",
      answerEn: "links unirse to the person or group being joined",
      contexts: [{ pattern: ["únete", "a", "nosotros"], at: 1 }],
    },
    {
      key: "recipient",
      answerEn: "to (introducing the recipient)",
      contexts: [{ pattern: ["diga", "a", "nadie"], at: 1 }],
    },
    { key: "destination", answerEn: "to (toward a destination)" },
  ],
  al: [
    {
      key: "time-clause",
      answerEn: "when; upon (al + infinitive)",
      contexts: [{ pattern: ["al", "intentar"], at: 0 }],
    },
    { key: "contraction", answerEn: "to the (a + el)" },
  ],
  bien: [
    {
      key: "working-properly",
      answerEn: "properly; well (ir bien means to be working)",
      contexts: [{ pattern: ["ir", "bien"], at: 1 }],
    },
    { key: "discourse", answerEn: "well; all right (opening a response)" },
  ],
  de: [
    {
      key: "verb-complement",
      answerEn: "no separate English word; a required verb complement",
      contexts: [
        { pattern: ["dejé", "de", "creerlo"], at: 1 },
        { pattern: ["disfrutar", "de", "la"], at: 1 },
      ],
    },
    {
      key: "from",
      answerEn: "from",
      contexts: [
        { pattern: ["llamo", "de", "la", "escuela"], at: 1 },
        { pattern: ["distrae", "de", "vivirla"], at: 1 },
      ],
    },
    {
      key: "manner",
      answerEn: "in (as part of de forma, in a … way)",
      contexts: [{ pattern: ["experiencias", "de", "forma"], at: 1 }],
    },
    { key: "of", answerEn: "of" },
  ],
  el: [
    {
      key: "el-que",
      answerEn: "the particular thing (as part of el qué, what exactly)",
      contexts: [{ pattern: ["el", "qué"], at: 0 }],
    },
    { key: "article", answerEn: "the (masculine singular article)" },
  ],
  la: [
    {
      key: "formal-object-pronoun",
      answerEn: "you (formal feminine direct-object pronoun)",
      contexts: [{ pattern: ["que", "la", "moleste"], at: 1 }],
    },
    { key: "article", answerEn: "the (feminine singular article)" },
  ],
  le: [
    {
      key: "formal-recipient",
      answerEn: "to you (formal indirect-object pronoun)",
      contexts: [{ pattern: ["se", "le", "pasará"], at: 1 }],
    },
    {
      key: "photo-subject",
      answerEn: "to it (the thing receiving attention)",
      contexts: [{ pattern: ["algo", "le", "voy"], at: 1 }],
    },
    { key: "him", answerEn: "to him; him" },
  ],
  lo: [
    {
      key: "apology",
      answerEn: "it (in the fixed apology lo siento, I'm sorry)",
      contexts: [{ pattern: ["lo", "siento"], at: 0 }],
    },
    {
      key: "neutral-relative",
      answerEn: "what; that which (as part of lo que)",
      contexts: [{ pattern: ["todo", "lo", "que"], at: 1 }],
    },
    {
      key: "neutral-article",
      answerEn: "the (neutral article before an adjective, as in lo mejor)",
      contexts: [{ pattern: ["es", "lo", "mej"], at: 1 }],
    },
    { key: "object-pronoun", answerEn: "it (direct-object pronoun)" },
  ],
  "más": [
    {
      key: "farther",
      answerEn: "farther (as part of más allá, farther away)",
      contexts: [{ pattern: ["mesas", "más", "allá"], at: 1 }],
    },
    { key: "more", answerEn: "more" },
  ],
  por: [
    {
      key: "question",
      answerEn: "why (together with qué: por qué)",
      contexts: [{ pattern: ["por", "qué"], at: 0 }],
    },
    {
      key: "cause",
      answerEn: "because of; due to",
      contexts: [
        { pattern: ["es", "por", "python"], at: 1 },
        { pattern: ["recurrente", "por", "un", "cambio"], at: 1 },
      ],
    },
    { key: "exclamation", answerEn: "for (as part of vaya por Dios)" },
  ],
  "qué": [
    {
      key: "exclamative-degree",
      answerEn: "how (to what a degree, as in qué insoportable)",
      contexts: [{ pattern: ["imagina", "qué", "insoportable"], at: 1 }],
    },
    {
      key: "why-complement",
      answerEn: "why (together with por: por qué)",
      contexts: [{ pattern: ["por", "qué"], at: 1 }],
    },
    { key: "interrogative", answerEn: "what" },
  ],
  que: [
    {
      key: "neutral-relative",
      answerEn: "what; that which (as part of lo que)",
      contexts: [{ pattern: ["lo", "que", "hay"], at: 1 }],
    },
    {
      key: "fixed-nada-que-ver",
      answerEn: "no separate English word (part of nada que ver)",
      contexts: [{ pattern: ["nada", "que", "ver"], at: 1 }],
    },
    {
      key: "until-link",
      answerEn: "until (together with hasta: hasta que)",
      contexts: [{ pattern: ["hasta", "que", "hable"], at: 1 }],
    },
    {
      key: "relative",
      answerEn: "who; that; which (relative pronoun)",
      contexts: [
        { pattern: ["alguien", "que", "lleve"], at: 1 },
        { pattern: ["persona", "que", "conozca"], at: 1 },
        { pattern: ["experimental", "que", "he"], at: 1 },
        { pattern: ["trasera", "que", "pusieron"], at: 1 },
        { pattern: ["geeks", "que", "montaron"], at: 1 },
        { pattern: ["algo", "que", "quieres"], at: 1 },
        { pattern: ["forma", "en", "que", "vives"], at: 2 },
        { pattern: ["momento", "en", "que", "has"], at: 2 },
      ],
    },
    { key: "clause-link", answerEn: "that (introducing a clause)" },
  ],
  se: [
    {
      key: "passive-fixed",
      answerEn: "marks a passive event: will be fixed",
      contexts: [{ pattern: ["se", "arreglará"], at: 0 }],
    },
    {
      key: "passive-transfer",
      answerEn: "marks an automatic passive transfer",
      contexts: [{ pattern: ["se", "le", "pasará"], at: 0 }],
    },
    {
      key: "indirect-before-lo",
      answerEn: "to them/anyone; replaces le before lo",
      contexts: [{ pattern: ["no", "se", "lo", "diga"], at: 1 }],
    },
    { key: "change-of-state", answerEn: "marks a change of state: turns off" },
  ],
  te: [
    {
      key: "indirect",
      answerEn: "to you",
      contexts: [
        { pattern: ["te", "molesta"], at: 0 },
        { pattern: ["te", "diga"], at: 0 },
        { pattern: ["te", "importa"], at: 0 },
      ],
    },
    { key: "direct", answerEn: "you (direct-object pronoun)" },
  ],
  ya: [
    {
      key: "thats-it",
      answerEn: "that's it; nothing more (as part of ya está)",
      contexts: [{ pattern: ["ya", "está"], at: 0 }],
    },
    {
      key: "now",
      answerEn: "now; by now",
      contexts: [
        { pattern: ["ya", "veo"], at: 0 },
        { pattern: ["ya", "debería"], at: 0 },
      ],
    },
    {
      key: "come-on-emphasis",
      answerEn: "adds impatient emphasis in venga ya (come on!)",
      contexts: [{ pattern: ["venga", "ya"], at: 1 }],
    },
    { key: "already", answerEn: "already" },
  ],
} as const satisfies Partial<
  Record<NormalizedWord, readonly WordSenseDefinition[]>
>;

/**
 * Most word cards stay intentionally compact. Only forms whose short gloss
 * hides grammar, morphology, or an idiomatic use receive a teaching note.
 */
const WORD_CARD_TEACHING = {
  "word-a--join-complement": {
    noteEn:
      "Unirse (“to join”) takes a before the person, group, or activity being joined. English does not translate this a separately.",
    example: {
      es: "Quiero unirme a este grupo.",
      en: "I want to join this group.",
    },
  },
  "word-a--personal-a": {
    noteEn:
      "Spanish generally places a before a specific person who receives a verb’s action. This “personal a” is not translated as a separate English word.",
    example: { es: "Veo a Marta.", en: "I see Marta." },
  },
  "word-de--verb-complement": {
    noteEn:
      "Some Spanish verbs require de before their complement or a following infinitive. English often absorbs this de into the verb’s translation: dejar de means “to stop doing,” while disfrutar de means “to enjoy.”",
    example: { es: "Dejé de fumar.", en: "I stopped smoking." },
  },
  "word-al--contraction": {
    noteEn:
      "Al is the required contraction of a + el. Spanish writes them as one word whenever both occur together.",
    example: { es: "Voy al mercado.", en: "I’m going to the market." },
  },
  "word-del": {
    noteEn:
      "Del is the required contraction of de + el. It can mean “of the” or “from the,” depending on context.",
    example: {
      es: "Vengo del mercado.",
      en: "I’m coming from the market.",
    },
  },
  "word-que--clause-link": {
    noteEn:
      "Que introduces a clause after verbs such as creer, saber, esperar, or decir. English often uses “that,” but may leave it unstated.",
    example: {
      es: "Creo que Ana viene.",
      en: "I think that Ana is coming.",
    },
  },
  "word-que--relative": {
    noteEn:
      "Que connects a noun to information describing it. Depending on the noun, English translates it as “who,” “that,” or “which.”",
    example: {
      es: "La persona que llamó es mi amiga.",
      en: "The person who called is my friend.",
    },
  },
  "word-lo--neutral-relative": {
    noteEn:
      "Lo combines with que to refer to an idea, action, or whole situation rather than a masculine noun. Together, lo que means “what” or “the thing that.”",
    example: {
      es: "Entiendo lo que dices.",
      en: "I understand what you’re saying.",
    },
  },
  "word-que--neutral-relative": {
    noteEn:
      "Here que completes lo que, a neutral expression meaning “what” or “the thing that.” It does not refer to a particular masculine or feminine noun.",
    example: {
      es: "Entiendo lo que dices.",
      en: "I understand what you’re saying.",
    },
  },
  "word-lo--neutral-article": {
    noteEn:
      "Neutral lo turns an adjective into an abstract idea: lo importante means “the important thing,” not a masculine noun.",
    example: {
      es: "Lo importante es empezar.",
      en: "The important thing is to begin.",
    },
  },
  "word-lo--object-pronoun": {
    noteEn:
      "Lo replaces a masculine singular thing, or sometimes a whole idea, as the direct object. It normally appears before a conjugated verb.",
    example: {
      es: "Tengo el libro y lo leo.",
      en: "I have the book and I’m reading it.",
    },
  },
  "word-qué--exclamative-degree": {
    noteEn:
      "Qué before an adjective can express a strong degree, like English “how” in “how strange!” It keeps its written accent.",
    example: {
      es: "¡Qué bonito es el jardín!",
      en: "How beautiful the garden is!",
    },
  },
  "word-esto": {
    noteEn:
      "Esto is a neutral demonstrative for an unidentified thing, fact, or whole situation. It is not used directly before a noun.",
    example: { es: "Esto es difícil.", en: "This is difficult." },
  },
  "word-la--formal-object-pronoun": {
    noteEn:
      "When speaking formally to a woman, la can mean “you” as the direct object. The same form also commonly means “her.”",
    example: {
      es: "La llamaré mañana, señora.",
      en: "I’ll call you tomorrow, ma’am.",
    },
  },
  "word-le--formal-recipient": {
    noteEn:
      "When addressing someone formally, le can mean “to you.” It is an indirect-object pronoun and normally appears before the conjugated verb.",
    example: {
      es: "Le escribo mañana, señor.",
      en: "I’ll write to you tomorrow, sir.",
    },
  },
  "word-le--him": {
    noteEn:
      "Le usually marks an indirect object, such as a recipient (“to him”). With a masculine person, especially in Spain, le can also be used as the direct object (“him”); this accepted use is called leísmo.",
    example: {
      es: "Le di el libro a Pablo.",
      en: "I gave Pablo the book.",
    },
  },
  "word-le--photo-subject": {
    noteEn:
      "Here le points back to a thing and functions as an indirect-object pronoun with prestar atención. A fuller a + noun phrase can state what le refers to.",
    example: {
      es: "A esta cuestión le presto mucha atención.",
      en: "I pay close attention to this issue.",
    },
  },
  "word-te--indirect": {
    noteEn:
      "Te can mean “to you” when you are the recipient or the person affected by an action. It normally appears before a conjugated verb.",
    example: {
      es: "Te envío un mensaje.",
      en: "I’m sending you a message.",
    },
  },
  "word-se--change-of-state": {
    noteEn:
      "With some verbs, se marks that something enters a new state rather than acting on another object. Apagarse means “to go out” or “to turn off.”",
    example: { es: "La luz se apagó.", en: "The light went out." },
  },
  "word-se--passive-fixed": {
    noteEn:
      "Se can present a change as happening without naming an agent. Depending on the verb and context, English may use a passive or describe the result as happening on its own.",
    example: {
      es: "El problema se resolverá mañana.",
      en: "The problem will be resolved tomorrow.",
    },
  },
  "word-se--passive-transfer": {
    noteEn:
      "This se presents the action without naming who performs it. A following le can identify the person who receives or is affected by the action.",
    example: {
      es: "Se le enviará un mensaje.",
      en: "A message will be sent to you.",
    },
  },
  "word-se--indirect-before-lo": {
    noteEn:
      "When le or les comes immediately before lo, la, los, or las, it changes to se. This se identifies the recipient; it is not reflexive.",
    example: {
      es: "Le doy el libro a Ana. → Se lo doy.",
      en: "I give the book to Ana. → I give it to her.",
    },
  },
  "word-su": {
    noteEn:
      "With formal usted, su can mean “your.” The same form can also mean “his,” “her,” or “their,” so context identifies the owner.",
    example: {
      es: "Señora, aquí está su café.",
      en: "Ma’am, here is your coffee.",
    },
  },
  "word-sus": {
    noteEn:
      "Sus is used before plural things that are owned. It agrees with what is owned, not with the owner; with usted, it can mean formal “your.”",
    example: {
      es: "Señor, estos son sus documentos.",
      en: "Sir, these are your documents.",
    },
  },
  "word-hacerle": {
    noteEn:
      "Hacerle combines hacer with the indirect-object pronoun le. In hacerle una foto a algo or alguien, the full expression means “to take a photo of it or them.”",
    example: {
      es: "Quiero hacerle una foto al edificio.",
      en: "I want to take a photo of the building.",
    },
  },
  "word-pasármela": {
    noteEn:
      "Pasármela combines pasar + me + la: pasar means “to pass,” me means “to me,” and la replaces a feminine person or thing. Object pronouns can attach to an infinitive.",
    example: {
      es: "La botella está allí; ¿puedes pasármela?",
      en: "The bottle is over there; can you pass it to me?",
    },
  },
  "word-prestar": {
    noteEn:
      "Prestar normally means “to lend,” but prestar atención is a fixed expression meaning “to pay attention.”",
    example: {
      es: "Presta atención a la explicación.",
      en: "Pay attention to the explanation.",
    },
  },
  "word-ir": {
    noteEn:
      "Ir normally means “to go.” In ir bien or ir mal, it describes how something works or is going: va bien means “it works” or “it’s going well.”",
    example: {
      es: "La aplicación va bien.",
      en: "The app is working well.",
    },
  },
  "word-nada": {
    noteEn:
      "After a negative verb, nada is commonly translated as “anything,” even though its basic meaning is “nothing.” Spanish keeps both negative words.",
    example: { es: "No veo nada.", en: "I don’t see anything." },
  },
  "word-nadie": {
    noteEn:
      "After a negative verb, nadie is commonly translated as “anyone.” Spanish uses negative concord, so no and nadie can appear together.",
    example: {
      es: "No conozco a nadie.",
      en: "I don’t know anyone.",
    },
  },
} as const satisfies Partial<Record<WordCardId, WordCardTeaching>>;

/**
 * This copy is materialized into CardApplication records, not LearningCard.
 * It may therefore describe the selected occurrence without contaminating the
 * reusable SRS card when that card appears in another comic.
 */
const WORD_APPLICATION_EXPLANATIONS = {
  "word-a--join-complement":
    "Here a connects únete to nosotros. English simply says “join us,” so a disappears in translation.",
  "word-a--personal-a":
    "Here a marks a specific person as the receiver of the action; it has no separate English word.",
  "word-de--verb-complement":
    "Here de is required by the verb before the following complement. Translate the complete verb pattern, not de by itself.",
  "word-que--relative":
    "Here que connects the noun before it to a description of that noun.",
  "word-lo--neutral-relative":
    "Here lo joins que to form lo que, referring to an idea or situation rather than a named object.",
  "word-que--neutral-relative":
    "Here que completes lo que. Together they mean “what” or “the thing that.”",
  "word-lo--neutral-article":
    "Here lo turns the following adjective into an abstract idea: “the best thing.”",
  "word-qué--exclamative-degree":
    "Here qué intensifies insoportable. The combination means “how unbearable,” not “what unbearable.”",
  "word-la--formal-object-pronoun":
    "Here la refers respectfully to the woman being bothered, so it means formal “you.”",
  "word-le--formal-recipient":
    "Here le identifies the formally addressed person who will receive the transferred call.",
  "word-le--photo-subject":
    "Here le points back to algo—the thing that will receive the speaker’s attention.",
  "word-te--indirect":
    "Here te marks “you” as the person affected by the verb rather than as its subject.",
  "word-se--passive-fixed":
    "Here se lets the speaker say that the problem will be fixed without naming who will fix it.",
  "word-se--passive-transfer":
    "Here se presents the transfer without naming the operator; le identifies the person receiving it.",
  "word-se--indirect-before-lo":
    "Here se replaces le before lo. Se is the recipient and lo is the thing not to be told.",
} as const satisfies Partial<Record<WordCardId, string>>;

/** Occurrence-specific guidance for reusable expressions. */
const PHRASE_APPLICATION_EXPLANATIONS = {
  "phrase-estar-equivocado":
    "Here estar describes the person’s current state, and equivocado labels that state as being mistaken.",
  "phrase-volver-a-infinitive":
    "Here volver + a + the unchanged action verb says that the action happens again.",
  "phrase-dejar-de-infinitive":
    "Here dejar + de + the unchanged action verb says that the action or belief stopped.",
  "phrase-ya-esta":
    "Here ya está signals that the action is complete and nothing more is needed.",
  "phrase-tener-problemas":
    "Here a form of tener combines with problemas to describe trouble that is currently happening.",
  "phrase-en-cierta-manera":
    "Here en cierta manera limits the claim: it is true only in one sense, not completely.",
  "phrase-ponerle-un-nombre":
    "Here ponerle un nombre assigns a name, and the words after a identify who receives it.",
  "phrase-llamar-a-alguien":
    "Here llamar introduces the name or nickname used for the person; it does not mean making a phone call.",
  "phrase-dar-una-asignatura":
    "Here dar una asignatura refers to teaching a course, not taking one as a student.",
  "phrase-parece-que":
    "Here parece que introduces a conclusion that seems likely from the available evidence.",
  "phrase-no-tener-nada-que-ver":
    "Here the whole fixed expression denies any connection; ver does not literally mean seeing.",
  "phrase-da-igual":
    "Here da igual dismisses the distinction because the choice does not matter.",
  "phrase-como-minimo":
    "Here como mínimo sets the lowest acceptable amount or threshold.",
  "phrase-en-lugar-de":
    "Here en lugar de introduces the action chosen as the alternative.",
  "phrase-disfrutar-de":
    "Here disfrutar de connects the act of enjoying to what is being enjoyed.",
  "phrase-puesta-de-sol":
    "Here puesta de sol works as one noun expression meaning “sunset.”",
  "phrase-prestar-atencion":
    "Here prestar atención works as one expression meaning “to pay attention”; prestar is not being used as “to lend.”",
  "phrase-hacerle-una-foto":
    "Here hacer una foto means taking a photo; le and the words after a can identify what is photographed.",
  "phrase-perdone-que-moleste":
    "Here Perdone que politely introduces an apology before the potentially bothersome action.",
  "phrase-lo-siento":
    "Here lo siento functions as the complete conventional apology, rather than as two separately translated words.",
  "phrase-en-realidad":
    "Here en realidad signals a correction or qualification of the preceding idea.",
  "phrase-venga-ya":
    "Here venga ya is a fixed reaction showing disbelief or impatience, not a literal request to come.",
  "phrase-bueno-discourse-marker":
    "Here bueno opens a hesitant response and gives the speaker time; it does not describe something as good.",
} as const satisfies Partial<Record<CuratedCardId, string>>;

function wordCardId(normalized: string, senseKey?: string): WordCardId {
  return `word-${normalized}${senseKey ? `--${senseKey}` : ""}`;
}

const WORD_CARDS = Object.entries(WORD_GLOSSARY).flatMap(
  ([normalized, defaultAnswerEn]) => {
    const senses = WORD_SENSES[normalized as keyof typeof WORD_SENSES] as
      | readonly WordSenseDefinition[]
      | undefined;
    const definitions = senses ?? [
      { key: "", answerEn: defaultAnswerEn } satisfies WordSenseDefinition,
    ];
    return definitions.map((sense) => {
      const id = wordCardId(normalized, sense.key);
      const teaching =
        WORD_CARD_TEACHING[id as keyof typeof WORD_CARD_TEACHING];
      return {
        id,
        kind: "word",
        promptEs: normalized,
        answerEn: sense.answerEn,
        noteEn: teaching?.noteEn ?? "",
        ...(teaching ? { example: teaching.example } : {}),
        tags: ["word", "contextual sense"],
      } satisfies LearningCard;
    });
  },
);

/**
 * Older seed cards that grouped several unrelated vocabulary words are
 * superseded by the exact surface-form cards above. Grammar, expressions,
 * and concepts remain as the reusable higher-level learning targets.
 */
const REUSABLE_CURATED_CARDS: readonly LearningCard[] =
  ATOMIC_CURATED_CARDS.map((card) => ({
    ...card,
    ...(BEGINNER_LANGUAGE_CARD_COPY[
      card.id as keyof typeof BEGINNER_LANGUAGE_CARD_COPY
    ] ?? {}),
  }));

export const CARDS: readonly LearningCard[] = [
  ...REUSABLE_CURATED_CARDS,
  ...WORD_CARDS,
];

export type CardId = CuratedCardId | WordCardId;

export interface PercentBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WordOccurrence {
  /** Unique within its reveal region, so repeated words remain clickable. */
  id: string;
  /** Exact token as printed in the Spanish translation. */
  text: string;
  /** NFC-normalized, lower-case surface form used to share word cards. */
  normalized: string;
  /**
   * Exact clickable glyph boxes as full-image percentages. A visibly
   * hyphenated line-wrap has one box for each printed fragment.
   */
  bounds: readonly PercentBounds[];
  /** Word meaning first, followed by only related higher-level cards. */
  cardIds: readonly CardId[];
}

export interface CardApplication {
  /** Display-only identity; SRS scheduling always uses cardId. */
  id: string;
  cardId: CardId;
  /** Every word occurrence that instantiates this use of the shared card. */
  participantWordIds: readonly string[];
  /** Only the relevant Spanish fragment, never a whole-bubble translation. */
  exampleEs: string;
  /** How the reusable lesson applies to this exact comic fragment. */
  explanationEn: string;
}

export interface RevealRegion {
  id: string;
  /** Exact Spanish text printed in the translated image. */
  labelEs: string;
  translationEn: string;
  noteEn: string;
  bounds: PercentBounds;
  words: readonly WordOccurrence[];
  /** Comic-specific display context, stored separately from shared cards. */
  applications: readonly CardApplication[];
  cardIds: readonly CardId[];
}

export interface ComicSource {
  creator: "Randall Munroe";
  publisher: "xkcd";
  originalPageUrl: string;
  originalImageUrl: string;
  translationPageUrl: string;
  translationImageUrl: string;
  translationCredit: "Gabriel Rodríguez Alberich";
  licenseName: "Creative Commons Attribution-NonCommercial 2.5 Generic";
  licenseLabel: "CC BY-NC 2.5";
  licenseUrl: "https://creativecommons.org/licenses/by-nc/2.5/";
  attributionRequired: true;
  commercialUseAllowed: false;
}

export interface Comic {
  id: string;
  xkcdNumber: number;
  publishedAt: string;
  title: string;
  titleEs: string;
  image: {
    src: string;
    width: number;
    height: number;
    aspectRatio: number;
    altEn: string;
  };
  source: ComicSource;
  titleText: { es: string; en: string; noteEn?: string };
  regions: readonly RevealRegion[];
  /** De-duplicated union of all region card IDs; this is the scheduler index. */
  cardIds: readonly CardId[];
}

interface RevealRegionSeed extends Omit<RevealRegion, "words" | "applications" | "cardIds"> {
  /** Curated cards eligible to be linked to words in this region. */
  cardIds: readonly LegacyCuratedCardId[];
}

type ComicSeed = Omit<Comic, "cardIds" | "regions"> & {
  regions: readonly RevealRegionSeed[];
};

export const XKCD_LICENSE = {
  creator: "Randall Munroe",
  publisher: "xkcd",
  translationCredit: "Gabriel Rodríguez Alberich",
  licenseName: "Creative Commons Attribution-NonCommercial 2.5 Generic",
  licenseLabel: "CC BY-NC 2.5",
  licenseUrl: "https://creativecommons.org/licenses/by-nc/2.5/",
  attributionRequired: true,
  commercialUseAllowed: false,
} as const;

const WORD_TOKEN_PATTERN = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

function normalizeWord(text: string): string {
  return text.normalize("NFC").toLocaleLowerCase("es");
}

function tokenizeLabel(labelEs: string): { text: string; normalized: string }[] {
  return [...labelEs.matchAll(WORD_TOKEN_PATTERN)].map((match) => ({
    text: match[0],
    normalized: normalizeWord(match[0]),
  }));
}

/**
 * Contiguous surface patterns make links occurrence-specific. For example,
 * the `a` in `vuelve a ser` receives that expression card, while another `a`
 * elsewhere in the same bubble does not.
 *
 * A targeted pattern can match a larger exact surface span while linking only
 * the offsets that instantiate the learning target. This is useful when an
 * adverb, subject, or other comic-specific word interrupts a reusable pattern.
 */
interface TargetedCuratedPattern {
  tokens: readonly NormalizedWord[];
  targetOffsets?: readonly number[];
  /** Optional occurrence-specific teaching copy; kept outside LearningCard. */
  exampleEs?: string;
  applicationEn?: string;
}

type CuratedPattern = readonly NormalizedWord[] | TargetedCuratedPattern;

const CURATED_CARD_PATTERNS = {
  "grammar-estar-gerundio": [
    {
      tokens: ["estás", "volando"],
      exampleEs: "estás volando",
      applicationEn:
        "Estás is the tú form of estar (“you are”), and volando is the -ando form of volar (“to fly”). Together they present the flying as happening now.",
    },
    {
      tokens: ["estamos", "teniendo"],
      exampleEs: "estamos teniendo",
      applicationEn:
        "Estamos means “we are,” and teniendo is the irregular -iendo form of tener. The school is describing a problem currently in progress.",
    },
  ],
  "grammar-past-contrast": [
    {
      tokens: ["aprendí"],
      exampleEs: "aprendí",
      applicationEn:
        "Aprendí is preterite because learning it last night is presented as one completed event.",
    },
    {
      tokens: ["escribí"],
      exampleEs: "escribí",
      applicationEn:
        "Escribí is preterite because typing the command is a completed step in the story.",
    },
    {
      tokens: ["probé"],
      exampleEs: "probé",
      applicationEn:
        "Probé is preterite because trying the other items is presented as a completed action.",
    },
    {
      tokens: ["solía"],
      exampleEs: "solía",
      applicationEn:
        "Solía is imperfect because it describes a repeated former habit: what the speaker used to believe.",
    },
    {
      tokens: ["implicaba"],
      exampleEs: "implicaba",
      applicationEn:
        "Implicaba is imperfect because it describes the continuing content of that former belief, not a new completed event.",
    },
    {
      tokens: ["di"],
      exampleEs: "di una asignatura",
      applicationEn:
        "Di is preterite because the course is treated as a completed event that changed the speaker's view.",
    },
    {
      tokens: ["dejé"],
      exampleEs: "dejé de creerlo",
      applicationEn:
        "Dejé is preterite because stopping the belief is the completed change that moves the story forward.",
    },
  ],
  "grammar-present-perfect": [
    {
      tokens: ["ha", "roto"],
      exampleEs: "ha roto",
      applicationEn:
        "Ha is the he/she/usted form of haber, and roto is the participle. The question asks about a past action whose result matters now.",
    },
    {
      tokens: ["hemos", "perdido"],
      exampleEs: "hemos perdido",
      applicationEn:
        "Hemos is the we form of haber, followed by perdido. The records were lost earlier, and that loss is the school's current problem.",
    },
    {
      tokens: ["he", "reiniciado"],
      exampleEs: "he reiniciado",
      applicationEn:
        "He is the I form of haber, followed by reiniciado. The restart has just been completed and its result is relevant now.",
    },
    {
      tokens: ["han", "surgido"],
      exampleEs: "han surgido",
      applicationEn:
        "Han is the they form of haber, followed by surgido. The adventures happened before now but are being discussed as part of the speaker's experience.",
    },
    {
      tokens: ["has", "encontrado"],
      exampleEs: "has encontrado",
      applicationEn:
        "Has is the tú form of haber, followed by encontrado. The thing was found earlier and is still important at this moment.",
    },
  ],
  "grammar-subjunctive": [
    {
      tokens: ["odio", "que", "la", "gente", "haga", "fotos"],
      targetOffsets: [0, 1, 4],
      exampleEs: "odio que … haga fotos",
      applicationEn:
        "Odio gives the emotional reaction. Que introduces what other people do, so hacer appears in the subjunctive form haga.",
    },
    {
      tokens: ["molesta", "que", "otra", "gente", "tenga", "experiencias"],
      targetOffsets: [0, 1, 4],
      exampleEs: "molesta que … tenga experiencias",
      applicationEn:
        "Molesta gives the reaction. Que introduces another group's action, so tener appears in the subjunctive form tenga.",
    },
  ],
  "grammar-esperar-que-subjunctive": [
    {
      tokens: ["espero", "que", "esté"],
      exampleEs: "espero que esté",
      applicationEn:
        "Espero que introduces the speaker's hope, so estar changes to the subjunctive form esté.",
    },
    {
      tokens: ["espero", "que", "hayan", "aprendido"],
      exampleEs: "espero que hayan aprendido",
      applicationEn:
        "Espero que introduces a hope about an already completed action. Hayan aprendido is the perfect subjunctive: “have learned.”",
    },
  ],
  "grammar-hasta-que-subjunctive": [
    {
      tokens: ["hasta", "que", "hable"],
      exampleEs: "hasta que hable",
      applicationEn:
        "The speaker has not yet talked to an engineer. Because that event is still pending, hablar appears as the subjunctive hable.",
    },
  ],
  "grammar-indefinite-relative-subjunctive": [
    {
      tokens: ["alguien", "que", "lleve"],
      exampleEs: "alguien que lleve",
      applicationEn:
        "Alguien refers to a person not yet identified. The description after que therefore uses the subjunctive form lleve.",
    },
    {
      tokens: ["persona", "que", "conozca"],
      exampleEs: "una persona que conozca",
      applicationEn:
        "The speaker is not naming a known person, but any person who meets the requirement. Conocer therefore appears as conozca.",
    },
  ],
  "grammar-evaluative-subjunctive": [
    {
      tokens: [
        "insoportable",
        "es",
        "que",
        "un",
        "desconocido",
        "condescendiente",
        "te",
        "diga",
      ],
      targetOffsets: [0, 1, 2, 7],
      exampleEs: "qué insoportable es que … diga",
      applicationEn:
        "Es insoportable gives the judgment. Que introduces the action being judged, so decir appears in the subjunctive form diga.",
    },
  ],
  "grammar-hypothetical": [
    {
      tokens: ["aunque", "volviese", "volvería", "a", "caerse"],
      targetOffsets: [0, 1, 2],
      exampleEs: "aunque volviese, volvería a caerse",
      applicationEn:
        "Volviese presents the return as hypothetical. Volvería gives the imagined result: it would go down again.",
    },
  ],
  "grammar-informal-command": [
    {
      tokens: ["únete"],
      exampleEs: "¡Únete!",
      applicationEn:
        "Únete combines the affirmative tú command une with the reflexive pronoun te. The written accent keeps the stress in the right place.",
    },
  ],
  "grammar-formal-command": [
    {
      tokens: ["mire"],
      exampleEs: "mire",
      applicationEn:
        "Mire is the usted command of mirar. It politely asks one person to look or listen.",
    },
    {
      tokens: ["diga"],
      exampleEs: "diga",
      applicationEn:
        "Diga is the irregular usted command of decir. It politely tells one person to say something.",
    },
    {
      tokens: ["perdone"],
      exampleEs: "perdone",
      applicationEn:
        "Perdone is the usted command of perdonar. Here it works as the polite formula “excuse me.”",
    },
  ],
  "grammar-formal-address": [
    {
      tokens: ["esté", "contenta"],
      targetOffsets: [0],
      exampleEs: "esté contenta",
      applicationEn:
        "The caller addresses the mother as usted. Esté is therefore singular third person, even though it means “you are” here.",
    },
    {
      tokens: ["usted"],
      exampleEs: "usted",
      applicationEn:
        "Usted explicitly marks the listener as formal “you” and takes singular third-person grammar.",
    },
    {
      tokens: ["debe"],
      exampleEs: "debe",
      applicationEn:
        "Debe is singular third person in form, but here it means formal “you must.”",
    },
    {
      tokens: ["ve"],
      exampleEs: "¿Ve…?",
      applicationEn:
        "Ve is singular third person in form, but the question politely asks the listener “Do you see…?”",
    },
    {
      tokens: ["perfecto", "puede", "pasármela"],
      targetOffsets: [1],
      exampleEs: "puede",
      applicationEn:
        "Puede uses the singular form associated with usted, marking the request as formal without needing to repeat usted.",
    },
    {
      tokens: ["puede", "decir"],
      targetOffsets: [0],
      exampleEs: "puede decir",
      applicationEn:
        "Puede is singular third person in form, but here it means formal “you can say.”",
    },
  ],
  "question-words": [
    {
      tokens: ["el", "qué"],
      targetOffsets: [1],
      exampleEs: "¿El qué?",
      applicationEn:
        "Qué carries an accent because it directly asks “what?” in this short follow-up question.",
    },
    {
      tokens: ["mej", "qué"],
      targetOffsets: [1],
      exampleEs: "¿Qué…?",
      applicationEn:
        "Qué carries an accent because the surprised speaker is asking “what?”",
    },
    {
      tokens: ["imagina", "qué", "insoportable"],
      targetOffsets: [1],
      exampleEs: "qué insoportable",
      applicationEn:
        "Qué carries an accent here because it is exclamative: qué insoportable means “how unbearable.”",
    },
    {
      tokens: ["por", "qué"],
      targetOffsets: [1],
      exampleEs: "por qué",
      applicationEn:
        "Qué keeps its accent inside por qué because the phrase asks “why.”",
    },
    {
      tokens: ["volando", "cómo"],
      targetOffsets: [1],
      exampleEs: "¿Cómo?",
      applicationEn:
        "Cómo carries an accent because it directly asks “how?”",
    },
    {
      tokens: ["cómo", "estás", "volando"],
      targetOffsets: [0],
      exampleEs: "cómo",
      applicationEn:
        "Cómo carries an accent here because it asks a direct question about manner: “how?”",
    },
    {
      tokens: ["importa", "cómo", "disfrutan"],
      targetOffsets: [1],
      exampleEs: "cómo disfrutan",
      applicationEn:
        "Cómo carries an accent because it introduces the embedded question of how other people enjoy the sunset.",
    },
  ],
  "grammar-por-que-vs-porque": [
    {
      tokens: ["por", "qué"],
      exampleEs: "¿Por qué?",
      applicationEn:
        "This is the two-word question form por qué, meaning “why.” The one-word answer form porque means “because.”",
    },
  ],
  "grammar-present-immediate-plan": [
    {
      tokens: ["vienes", "a", "la", "cama"],
      targetOffsets: [0],
      exampleEs: "vienes",
      applicationEn:
        "Vienes has an ordinary present-time form, but the surrounding situation makes it a plan about what happens next.",
    },
  ],
  "grammar-poder-ellipsis": [
    {
      tokens: ["no", "puedo"],
      targetOffsets: [1],
      exampleEs: "puedo",
      applicationEn:
        "Puedo normally introduces an action. Here that action is left unsaid because the preceding conversation already makes it clear.",
    },
  ],
  "phrase-estar-equivocado": [["está", "equivocado"]],
  "concept-duty-calls": [["internet"], ["equivocado"]],
  "phrase-volver-a-infinitive": [
    ["vuelve", "a", "ser"],
    ["volvería", "a", "caerse"],
  ],
  "phrase-dejar-de-infinitive": [["dejé", "de", "creerlo"]],
  "phrase-ya-esta": [["ya", "está"]],
  "grammar-para-infinitive-purpose": [
    {
      tokens: ["para", "comparar"],
      exampleEs: "para comparar",
      applicationEn:
        "Para introduces the purpose, and comparar stays in the infinitive: the extra attempt was made “in order to compare.”",
    },
  ],
  "concept-python": [["python"]],
  "concept-hello-world": [["hola", "mundo"]],
  "concept-dynamic-typing": [["tipado", "dinámico"]],
  "concept-indentation": [["indentación"]],
  "concept-antigravity": [["import", "antigravity"]],
  "phrase-tener-problemas": [
    {
      tokens: ["estamos", "teniendo", "ciertos", "problemas"],
      targetOffsets: [1, 3],
    },
  ],
  "grammar-roto-participle": [
    {
      tokens: ["ha", "roto"],
      targetOffsets: [1],
      exampleEs: "ha roto",
      applicationEn:
        "Roto is the irregular participle that follows ha. Here it means “has broken.”",
    },
  ],
  "phrase-en-cierta-manera": [["en", "cierta", "manera"]],
  "phrase-ponerle-un-nombre": [
    ["le", "puso", "a", "su", "hijo", "el", "nombre", "de", "robert"],
  ],
  "phrase-llamar-a-alguien": [
    ["le", "llamamos", "pequeño", "bobby", "tablas"],
  ],
  "concept-sql-injection": [
    ["robert", "drop", "table", "students"],
    ["pequeño", "bobby", "tablas"],
  ],
  "concept-input-sanitization": [
    {
      tokens: ["sanear", "la", "inserción", "de", "sus", "bases", "de", "datos"],
      targetOffsets: [0, 2, 5, 7],
    },
  ],
  "grammar-soler": [
    {
      tokens: ["solía", "creer"],
      exampleEs: "solía creer",
      applicationEn:
        "Solía is the past-habit form of soler, and creer remains an infinitive. Together they mean “used to believe.”",
    },
  ],
  "concept-correlation-causation": [
    ["correlación"],
    ["implicaba"],
    ["causalidad"],
  ],
  "phrase-dar-una-asignatura": [["di", "una", "asignatura"]],
  "phrase-parece-que": [["parece", "que"]],
  "phrase-no-tener-nada-que-ver": [["no", "tiene", "nada", "que", "ver"]],
  "grammar-seguir-state": [
    {
      tokens: ["sigue", "caído"],
      exampleEs: "sigue caído",
      applicationEn:
        "Sigue says the state continues, and caído describes the down or offline state: it is still down.",
    },
  ],
  "phrase-da-igual": [["da", "igual"]],
  "concept-haiku-os": [["haiku"]],
  "concept-scripted-tech-support": [
    ["seguir", "un", "guión"],
    ["servicio", "técnico"],
    ["soporte", "telefónico"],
    ["ingeniero"],
  ],
  "grammar-deberia-expectation": [
    {
      tokens: ["ya", "debería", "ir", "bien"],
      targetOffsets: [1, 2],
      exampleEs: "debería ir bien",
      applicationEn:
        "Debería ir expresses a reasoned expectation, not advice: the connection should now work properly.",
    },
  ],
  "concept-shibboleet": [["shibboleet"]],
  "concept-support-backdoor": [["puerta", "trasera"]],
  "grammar-se-lo-pronouns": [
    {
      tokens: ["no", "se", "lo", "diga", "a", "nadie"],
      targetOffsets: [1, 2],
      exampleEs: "no se lo diga",
      applicationEn:
        "Se stands for “to anyone,” and lo stands for the secret. Spanish uses se lo, not le lo, before diga.",
    },
  ],
  "phrase-como-minimo": [["como", "mínimo"]],
  "phrase-en-lugar-de": [["en", "lugar", "de"]],
  "phrase-disfrutar-de": [
    ["disfrutar", "de", "la", "vista"],
    {
      tokens: ["disfrutan", "otros", "de", "una", "puesta", "de", "sol"],
      targetOffsets: [0, 2, 3, 4, 5, 6],
    },
  ],
  "phrase-puesta-de-sol": [["puesta", "de", "sol"]],
  "phrase-prestar-atencion": [
    {
      tokens: ["prestar", "más", "atención"],
      targetOffsets: [0, 2],
    },
  ],
  "phrase-hacerle-una-foto": [
    ["hacerle", "una", "foto", "a", "algo"],
    ["haga", "fotos"],
  ],
  "grammar-ir-a-infinitive": [
    {
      tokens: ["voy", "a", "prestar"],
      exampleEs: "voy a prestar",
      applicationEn:
        "Voy shows who acts, a links the verbs, and prestar stays in its unchanged dictionary form. Together they mark the following action as planned or expected.",
    },
  ],
  "grammar-al-infinitive": [
    {
      tokens: ["al", "intentar"],
      exampleEs: "al intentar",
      applicationEn:
        "Al plus the infinitive intentar marks when the adventures arose: “when trying.”",
    },
  ],
  "phrase-perdone-que-moleste": [["perdone", "que", "la", "moleste"]],
  "phrase-lo-siento": [["lo", "siento"]],
  "phrase-en-realidad": [["en", "realidad"]],
  "phrase-venga-ya": [["venga", "ya"]],
  "grammar-importar-indirect-object": [
    {
      tokens: ["te", "importa"],
      exampleEs: "te importa",
      applicationEn:
        "Te names the person affected (“to you”), while the situation is what matters. In natural English, the question asks why you care.",
    },
  ],
  "phrase-bueno-discourse-marker": [["bueno"]],
} as const satisfies Partial<
  Record<CuratedCardId, readonly CuratedPattern[]>
>;

const LEGACY_CARD_EXPANSIONS: Partial<
  Record<LegacyCuratedCardId, readonly string[]>
> = {
  "question-words": ["question-words", "grammar-por-que-vs-porque"],
  "grammar-subjunctive": [
    "grammar-subjunctive",
    "grammar-esperar-que-subjunctive",
    "grammar-hasta-que-subjunctive",
    "grammar-indefinite-relative-subjunctive",
    "grammar-evaluative-subjunctive",
  ],
  "grammar-commands-register": [
    "grammar-informal-command",
    "grammar-formal-command",
    "grammar-formal-address",
    "phrase-venga-ya",
  ],
  "phrase-venir-a-la-cama": ["grammar-present-immediate-plan"],
  "phrase-no-puedo-importante": ["grammar-poder-ellipsis"],
  "phrase-change-patterns": [
    "phrase-volver-a-infinitive",
    "phrase-dejar-de-infinitive",
  ],
  "phrase-ya-esta-comparar": [
    "phrase-ya-esta",
    "grammar-para-infinitive-purpose",
  ],
  "concept-python-syntax": ["concept-dynamic-typing", "concept-indentation"],
  "concept-programming-code": [
    "phrase-como-minimo",
    "concept-scripted-tech-support",
  ],
  "phrase-trouble-break": [
    "phrase-tener-problemas",
    "grammar-roto-participle",
  ],
  "verb-poner-llamar": [
    "phrase-ponerle-un-nombre",
    "phrase-llamar-a-alguien",
  ],
  "phrase-records-hope": ["grammar-esperar-que-subjunctive"],
  "phrase-course-seem-maybe": [
    "phrase-dar-una-asignatura",
    "phrase-parece-que",
  ],
  "phrase-troubleshooting": [
    "phrase-no-tener-nada-que-ver",
    "grammar-seguir-state",
    "phrase-da-igual",
  ],
  "concept-haiku-support": [
    "concept-haiku-os",
    "concept-scripted-tech-support",
    "phrase-da-igual",
  ],
  "phrase-until-should": [
    "grammar-hasta-que-subjunctive",
    "grammar-deberia-expectation",
  ],
  "concept-shibboleet": ["concept-shibboleet", "concept-support-backdoor"],
  "phrase-no-se-lo-diga": ["grammar-se-lo-pronouns"],
  "phrase-instead-enjoy-view": [
    "phrase-en-lugar-de",
    "phrase-disfrutar-de",
    "phrase-puesta-de-sol",
    "phrase-hacerle-una-foto",
  ],
  "phrase-try-attention-arise": [
    "phrase-prestar-atencion",
    "phrase-hacerle-una-foto",
    "grammar-ir-a-infinitive",
    "grammar-al-infinitive",
  ],
  "word-bother-experience": [
    "phrase-perdone-que-moleste",
    "phrase-lo-siento",
  ],
  "word-document-distract": ["phrase-en-realidad"],
  "phrase-why-care": ["grammar-importar-indirect-object"],
  "phrase-hesitation": ["phrase-bueno-discourse-marker"],
};

const REUSABLE_CURATED_CARD_IDS = new Set<string>(
  REUSABLE_CURATED_CARDS.map((card) => card.id),
);
const CURATED_PATTERNS_BY_ID: Partial<
  Record<CuratedCardId, readonly CuratedPattern[]>
> = CURATED_CARD_PATTERNS;

interface CuratedPatternMatch {
  start: number;
  participantIndexes: readonly number[];
  matchedIndexes: readonly number[];
}

function matchingPatternOccurrences(
  tokens: readonly { normalized: string }[],
  pattern: CuratedPattern,
): CuratedPatternMatch[] {
  const matches: CuratedPatternMatch[] = [];
  const expectedTokens = "tokens" in pattern ? pattern.tokens : pattern;
  const targetOffsets =
    "tokens" in pattern
      ? (pattern.targetOffsets ?? expectedTokens.map((_, offset) => offset))
      : expectedTokens.map((_, offset) => offset);

  if (
    targetOffsets.length === 0 ||
    new Set(targetOffsets).size !== targetOffsets.length ||
    targetOffsets.some(
      (offset) => offset < 0 || offset >= expectedTokens.length,
    )
  ) {
    throw new Error("Invalid target offsets in curated card pattern");
  }

  for (
    let start = 0;
    start <= tokens.length - expectedTokens.length;
    start += 1
  ) {
    if (
      expectedTokens.every(
        (expected, offset) => tokens[start + offset].normalized === expected,
      )
    ) {
      matches.push({
        start,
        participantIndexes: targetOffsets.map((offset) => start + offset),
        matchedIndexes: expectedTokens.map((_, offset) => start + offset),
      });
    }
  }
  return matches;
}

function contextMatchesAt(
  tokens: readonly { normalized: string }[],
  occurrenceIndex: number,
  context: WordSenseContext,
): boolean {
  const start = occurrenceIndex - context.at;
  if (start < 0 || start + context.pattern.length > tokens.length) return false;
  return context.pattern.every(
    (expected, offset) => tokens[start + offset].normalized === expected,
  );
}

interface ResolvedWordMeaning {
  cardId: WordCardId;
  matchedContext?: WordSenseContext;
  contextStart?: number;
}

function resolveWordMeaningForOccurrence(
  tokens: readonly { normalized: string }[],
  index: number,
): ResolvedWordMeaning {
  const normalized = tokens[index].normalized as NormalizedWord;
  const senses = WORD_SENSES[normalized as keyof typeof WORD_SENSES] as
    | readonly WordSenseDefinition[]
    | undefined;
  if (!senses) return { cardId: wordCardId(normalized) };

  const matches = senses.flatMap((sense) =>
    (sense.contexts ?? [])
      .filter((context) => contextMatchesAt(tokens, index, context))
      .map((context) => ({ sense, context })),
  );
  if (matches.length > 1) {
    throw new Error(
      `Ambiguous contextual word sense for ${normalized} at token ${index}`,
    );
  }
  const matched = matches[0];
  const fallback = senses.find((sense) => !sense.contexts);
  const sense = matched?.sense ?? fallback;
  if (!sense) {
    throw new Error(`No contextual word sense for ${normalized}`);
  }
  return {
    cardId: wordCardId(normalized, sense.key),
    ...(matched
      ? {
          matchedContext: matched.context,
          contextStart: index - matched.context.at,
        }
      : {}),
  };
}

function defineRegion(seed: RevealRegionSeed): RevealRegion {
  const tokens = tokenizeLabel(seed.labelEs);
  const occurrenceBounds = WORD_BOUNDS_BY_REGION[seed.id];
  if (!occurrenceBounds || occurrenceBounds.length !== tokens.length) {
    throw new Error(
      `Missing word bounds for ${seed.id}: expected ${tokens.length}, received ${occurrenceBounds?.length ?? 0}`,
    );
  }
  const linkedIndexes = new Map<CuratedCardId, Set<number>>();
  const applications: CardApplication[] = [];

  const candidateCardIds = [
    ...new Set(
      seed.cardIds.flatMap((legacyId) => {
        const expanded = LEGACY_CARD_EXPANSIONS[legacyId];
        if (expanded) return expanded;
        return REUSABLE_CURATED_CARD_IDS.has(legacyId) ? [legacyId] : [];
      }),
    ),
  ];

  for (const cardId of candidateCardIds) {
    if (!REUSABLE_CURATED_CARD_IDS.has(cardId)) continue;
    const patterns = CURATED_PATTERNS_BY_ID[cardId] ?? [];
    const indexes = new Set<number>();
    for (const pattern of patterns) {
      for (const match of matchingPatternOccurrences(tokens, pattern)) {
        for (const index of match.participantIndexes) indexes.add(index);
        const applicationEn =
          ("tokens" in pattern ? pattern.applicationEn : undefined) ??
          PHRASE_APPLICATION_EXPLANATIONS[
            cardId as keyof typeof PHRASE_APPLICATION_EXPLANATIONS
          ];
        if (applicationEn) {
          applications.push({
            id: `${seed.id}:${cardId}:${match.start}`,
            cardId,
            participantWordIds: match.participantIndexes.map(
              (index) => `${seed.id}-word-${index + 1}`,
            ),
            exampleEs:
              ("tokens" in pattern ? pattern.exampleEs : undefined) ??
              match.matchedIndexes.map((index) => tokens[index].text).join(" "),
            explanationEn: applicationEn,
          });
        }
      }
    }
    if (indexes.size === 0) continue;
    linkedIndexes.set(cardId, indexes);
  }

  const words = tokens.map((token, index): WordOccurrence => {
    if (!(token.normalized in WORD_GLOSSARY)) {
      throw new Error(
        `Missing word gloss for ${token.normalized} in region ${seed.id}`,
      );
    }
    const resolvedMeaning = resolveWordMeaningForOccurrence(tokens, index);
    const wordMeaningCardId = resolvedMeaning.cardId;
    const applicationExplanation =
      WORD_APPLICATION_EXPLANATIONS[
        wordMeaningCardId as keyof typeof WORD_APPLICATION_EXPLANATIONS
      ];
    if (
      resolvedMeaning.matchedContext &&
      resolvedMeaning.contextStart !== undefined &&
      applicationExplanation
    ) {
      const contextEnd =
        resolvedMeaning.contextStart +
        resolvedMeaning.matchedContext.pattern.length;
      applications.push({
        id: `${seed.id}:${wordMeaningCardId}:word-${index + 1}`,
        cardId: wordMeaningCardId,
        participantWordIds: [`${seed.id}-word-${index + 1}`],
        exampleEs: tokens
          .slice(resolvedMeaning.contextStart, contextEnd)
          .map((contextToken) => contextToken.text)
          .join(" "),
        explanationEn: applicationExplanation,
      });
    }
    const relatedCardIds = [...linkedIndexes.entries()]
      .filter(([, indexes]) => indexes.has(index))
      .map(([cardId]) => cardId);
    return {
      id: `${seed.id}-word-${index + 1}`,
      text: token.text,
      normalized: token.normalized,
      bounds: occurrenceBounds[index],
      cardIds: [wordMeaningCardId, ...relatedCardIds],
    };
  });

  return {
    id: seed.id,
    labelEs: seed.labelEs,
    translationEn: seed.translationEn,
    noteEn: seed.noteEn,
    bounds: seed.bounds,
    words,
    applications,
    cardIds: [...new Set(words.flatMap((word) => word.cardIds))],
  };
}

function defineComic(seed: ComicSeed): Comic {
  const regions = seed.regions.map(defineRegion);
  return {
    ...seed,
    regions,
    cardIds: [...new Set(regions.flatMap((region) => region.cardIds))],
  };
}

const COMIC_SEEDS = [
  {
    id: "duty-calls",
    xkcdNumber: 386,
    publishedAt: "2008-02-20",
    title: "Duty Calls",
    titleEs: "El deber llama",
    image: {
      src: "/comics/duty-calls-es.png",
      width: 300,
      height: 330,
      aspectRatio: 300 / 330,
      altEn:
        "Spanish-language xkcd comic: a person stays at the computer because someone on the internet is wrong.",
    },
    source: {
      ...XKCD_LICENSE,
      originalPageUrl: "https://xkcd.com/386/",
      originalImageUrl: "https://imgs.xkcd.com/comics/duty_calls.png",
      translationPageUrl: "https://es.xkcd.com/strips/el-deber-llama/",
      translationImageUrl: "https://es.xkcd.com/images/duty_calls.png",
    },
    titleText: {
      es: "¿Qué quieres que haga? ¿IRME? ¡Entonces seguirán equivocados!",
      en: "What do you want me to do? LEAVE? Then they'll keep being wrong!",
    },
    regions: [
      {
        id: "coming-to-bed",
        labelEs: "¿VIENES A LA CAMA?",
        translationEn: "Are you coming to bed?",
        noteEn: "The simple present sounds natural for this immediate plan.",
        bounds: { x: 9, y: 2, width: 69, height: 11 },
        cardIds: ["phrase-venir-a-la-cama"],
      },
      {
        id: "cant-important",
        labelEs: "NO PUEDO. ESTO ES IMPORTANTE.",
        translationEn: "I can't. This is important.",
        noteEn:
          "The omitted action after puedo is understood from the invitation.",
        bounds: { x: 41, y: 13, width: 56, height: 18 },
        cardIds: ["phrase-no-puedo-importante"],
      },
      {
        id: "what",
        labelEs: "¿EL QUÉ?",
        translationEn: "What do you mean?",
        noteEn: "El qué asks which particular thing is meant.",
        bounds: { x: 16, y: 27, width: 34, height: 12 },
        cardIds: ["question-words"],
      },
      {
        id: "wrong-on-the-internet",
        labelEs: "ALGUIEN EN INTERNET ESTÁ EQUIVOCADO.",
        translationEn: "Someone on the internet is wrong.",
        noteEn:
          "The line and title turn a trivial disagreement into a supposed duty.",
        bounds: { x: 41, y: 33, width: 57, height: 25 },
        cardIds: [
          "indefinite-pronouns",
          "phrase-estar-equivocado",
          "concept-duty-calls",
        ],
      },
    ],
  },
  {
    id: "python",
    xkcdNumber: 353,
    publishedAt: "2007-12-05",
    title: "Python",
    titleEs: "Python",
    image: {
      src: "/comics/python-es.png",
      width: 518,
      height: 588,
      aspectRatio: 518 / 588,
      altEn:
        "Spanish-language xkcd comic: a programmer flies after discovering how enjoyable Python feels.",
    },
    source: {
      ...XKCD_LICENSE,
      originalPageUrl: "https://xkcd.com/353/",
      originalImageUrl: "https://imgs.xkcd.com/comics/python.png",
      translationPageUrl: "https://es.xkcd.com/strips/python/",
      translationImageUrl: "https://es.xkcd.com/images/python.png",
    },
    titleText: {
      es: "Ayer escribí 20 programas cortos en Python. Fue increíble. Perl, te dejo.",
      en: "I wrote 20 short programs in Python yesterday. It was wonderful. Perl, I'm leaving you.",
    },
    regions: [
      {
        id: "youre-flying",
        labelEs: "¡ESTÁS VOLANDO! ¿CÓMO?",
        translationEn: "You're flying! How?",
        noteEn:
          "Estás volando describes an action in progress; cómo carries an accent in a question.",
        bounds: { x: 20, y: 24, width: 25, height: 15 },
        cardIds: ["grammar-estar-gerundio", "question-words"],
      },
      {
        id: "python-answer",
        labelEs: "¡ES PYTHON!",
        translationEn: "It's Python!",
        noteEn:
          "The absurd answer presents a programming language as a superpower.",
        bounds: { x: 66, y: 10, width: 23, height: 11 },
        cardIds: ["concept-python", "concept-programming-code"],
      },
      {
        id: "learned-last-night",
        labelEs:
          "¡LO APRENDÍ ANOCHE! ¡TODO ES TAN SENCILLO! EL HOLA MUNDO ES SIMPLEMENTE print \"¡Hola mundo!\"",
        translationEn:
          "I learned it last night! Everything is so simple! Hello World is just print \"Hello world!\"",
        noteEn:
          "Lo refers to Python, and aprendí is a completed event. Hola mundo is the classic first-program example.",
        bounds: { x: 1, y: 72, width: 29, height: 27 },
        cardIds: [
          "word-learn-simple",
          "grammar-past-contrast",
          "concept-hello-world",
          "concept-programming-code",
        ],
      },
      {
        id: "dynamic-typing-join-us",
        labelEs:
          "NO SÉ… ¿TIPADO DINÁMICO? ¿INDENTACIÓN? ¡ÚNETE A NOSOTROS! ¡PROGRAMAR VUELVE A SER DIVERTIDO! ¡ES UN MUNDO NUEVO! PERO… ¿CÓMO ESTÁS VOLANDO?",
        translationEn:
          "I don't know… Dynamic typing? Indentation? Join us! Programming is fun again! It's a whole new world! But… how are you flying?",
        noteEn:
          "The response moves from real Python features to an enthusiastic invitation.",
        bounds: { x: 34, y: 57, width: 28, height: 42 },
        cardIds: [
          "concept-python-syntax",
          "grammar-commands-register",
          "phrase-change-patterns",
          "concept-programming-code",
          "grammar-estar-gerundio",
          "question-words",
        ],
      },
      {
        id: "import-antigravity",
        labelEs:
          "SIMPLEMENTE ESCRIBÍ import antigravity. ¿Y YA ESTÁ? … TAMBIÉN PROBÉ TODO LO QUE HAY EN EL BOTIQUÍN, PARA COMPARAR. PERO CREO QUE ESTO ES POR PYTHON.",
        translationEn:
          "I just typed import antigravity. And that's it? …I also tried everything in the medicine cabinet, for comparison. But I think this is because of Python.",
        noteEn:
          "The medicine-cabinet detail offers a second, less sensible explanation for the flight.",
        bounds: { x: 65, y: 57, width: 34, height: 42 },
        cardIds: [
          "grammar-past-contrast",
          "concept-antigravity",
          "phrase-ya-esta-comparar",
          "concept-python",
          "concept-programming-code",
        ],
      },
    ],
  },
  {
    id: "exploits-of-a-mom",
    xkcdNumber: 327,
    publishedAt: "2007-10-10",
    title: "Exploits of a Mom",
    titleEs: "Exploits de una madre",
    image: {
      src: "/comics/exploits-of-a-mom-es.png",
      width: 666,
      height: 205,
      aspectRatio: 666 / 205,
      altEn:
        "Spanish-language xkcd comic: a school calls a mother whose son's name contains a SQL injection.",
    },
    source: {
      ...XKCD_LICENSE,
      originalPageUrl: "https://xkcd.com/327/",
      originalImageUrl: "https://imgs.xkcd.com/comics/exploits_of_a_mom.png",
      translationPageUrl: "https://es.xkcd.com/strips/exploits-de-una-madre/",
      translationImageUrl:
        "https://es.xkcd.com/images/exploits_of_a_mom.png",
    },
    titleText: {
      es: "Su hija se llama Socorro, estoy atrapada en una fábrica de carnés de conducir.",
      en: "Her daughter is named Help I'm trapped in a driver's license factory.",
    },
    regions: [
      {
        id: "computer-trouble",
        labelEs:
          "HOLA, LLAMO DE LA ESCUELA DE SU HIJO. ESTAMOS TENIENDO CIERTOS PROBLEMAS INFORMÁTICOS.",
        translationEn:
          "Hello, I'm calling from your son's school. We're having some computer problems.",
        noteEn:
          "Su marks formal address; estamos teniendo emphasizes an ongoing problem.",
        bounds: { x: 1, y: 1, width: 21, height: 96 },
        cardIds: [
          "grammar-commands-register",
          "grammar-estar-gerundio",
          "phrase-trouble-break",
        ],
      },
      {
        id: "did-he-break-something",
        labelEs: "VAYA POR DIOS, ¿HA ROTO ALGO? EN CIERTA MANERA…",
        translationEn: "Oh my, has he broken something? In a way…",
        noteEn:
          "Ha roto is present perfect; en cierta manera prepares a qualified yes.",
        bounds: { x: 23, y: 1, width: 22, height: 96 },
        cardIds: [
          "grammar-present-perfect",
          "phrase-trouble-break",
          "indefinite-pronouns",
          "phrase-en-cierta-manera",
        ],
      },
      {
        id: "bobby-tables",
        labelEs:
          "¿REALMENTE LE PUSO A SU HIJO EL NOMBRE DE Robert'); DROP TABLE Students;--? OH, SÍ. LE LLAMAMOS PEQUEÑO BOBBY TABLAS.",
        translationEn:
          "Did you really name your son Robert'); DROP TABLE Students;--? Oh, yes. We call him Little Bobby Tables.",
        noteEn:
          "The name closes a text value and injects a destructive SQL command. Le refers to the son.",
        bounds: { x: 47, y: 1, width: 25, height: 96 },
        cardIds: [
          "verb-poner-llamar",
          "concept-sql-injection",
          "concept-programming-code",
        ],
      },
      {
        id: "lost-records",
        labelEs:
          "BIEN, HEMOS PERDIDO TODOS LOS REGISTROS ESTUDIANTILES DE ESTE AÑO. ESPERO QUE ESTÉ CONTENTA.",
        translationEn:
          "Well, we've lost all this year's student records. I hope you're happy.",
        noteEn:
          "Hemos perdido emphasizes the present result. Esté is formal and subjunctive after espero que.",
        bounds: { x: 74, y: 1, width: 25, height: 42 },
        cardIds: [
          "grammar-present-perfect",
          "phrase-records-hope",
          "grammar-subjunctive",
          "grammar-commands-register",
        ],
      },
      {
        id: "sanitize-inputs",
        labelEs:
          "Y YO ESPERO QUE HAYAN APRENDIDO A SANEAR LA INSERCIÓN DE SUS BASES DE DATOS.",
        translationEn:
          "And I hope you've learned to sanitize your database inputs.",
        noteEn:
          "Hayan aprendido is perfect subjunctive. Secure code should use parameterized queries.",
        bounds: { x: 77, y: 42, width: 22, height: 57 },
        cardIds: [
          "phrase-records-hope",
          "grammar-subjunctive",
          "word-learn-simple",
          "concept-input-sanitization",
          "concept-programming-code",
        ],
      },
    ],
  },
  {
    id: "correlation",
    xkcdNumber: 552,
    publishedAt: "2009-03-06",
    title: "Correlation",
    titleEs: "Correlación",
    image: {
      src: "/comics/correlation-es.png",
      width: 459,
      height: 185,
      aspectRatio: 459 / 185,
      altEn:
        "Spanish-language xkcd comic: a statistics class may or may not have cured a mistaken belief about causation.",
    },
    source: {
      ...XKCD_LICENSE,
      originalPageUrl: "https://xkcd.com/552/",
      originalImageUrl: "https://imgs.xkcd.com/comics/correlation.png",
      translationPageUrl: "https://es.xkcd.com/strips/correlacion/",
      translationImageUrl: "https://es.xkcd.com/images/correlation.png",
    },
    titleText: {
      es: "La correlación no implica causalidad, pero sí que alza las cejas de forma sugerente y hace gestos furtivos mientras mueve los labios diciendo: «mira por ahí».",
      en: "Correlation doesn't imply causation, but it does waggle its eyebrows suggestively and gesture furtively while mouthing ‘look over there.’",
    },
    regions: [
      {
        id: "used-to-believe",
        labelEs: "SOLÍA CREER QUE LA CORRELACIÓN IMPLICABA CAUSALIDAD.",
        translationEn: "I used to believe that correlation implied causation.",
        noteEn:
          "Solía creer and implicaba describe a former habit and background belief.",
        bounds: { x: 1, y: 1, width: 33, height: 98 },
        cardIds: [
          "grammar-soler",
          "grammar-past-contrast",
          "concept-correlation-causation",
        ],
      },
      {
        id: "statistics-class",
        labelEs:
          "LUEGO DI UNA ASIGNATURA DE ESTADÍSTICA Y DEJÉ DE CREERLO.",
        translationEn:
          "Then I took a statistics class and stopped believing it.",
        noteEn:
          "In Spain, dar una asignatura can mean to take a course. Lo refers to the earlier belief.",
        bounds: { x: 37, y: 1, width: 29, height: 98 },
        cardIds: [
          "grammar-past-contrast",
          "phrase-course-seem-maybe",
          "phrase-change-patterns",
          "concept-correlation-causation",
        ],
      },
      {
        id: "class-helped",
        labelEs: "PARECE QUE ESA CLASE TE AYUDÓ. BUENO, QUIZÁ.",
        translationEn: "It sounds like that class helped you. Well, maybe.",
        noteEn:
          "Quizá undercuts the causal claim: perhaps the class did not cause the change.",
        bounds: { x: 69, y: 1, width: 30, height: 98 },
        cardIds: [
          "phrase-course-seem-maybe",
          "concept-correlation-causation",
        ],
      },
    ],
  },
  {
    id: "tech-support",
    xkcdNumber: 806,
    publishedAt: "2010-10-15",
    title: "Tech Support",
    titleEs: "Soporte técnico",
    image: {
      src: "/comics/tech-support-es.png",
      width: 625,
      height: 923,
      aspectRatio: 625 / 923,
      altEn:
        "Spanish-language xkcd comic: a capable caller dreams of a secret shortcut through scripted technical support.",
    },
    source: {
      ...XKCD_LICENSE,
      originalPageUrl: "https://xkcd.com/806/",
      originalImageUrl: "https://imgs.xkcd.com/comics/tech_support.png",
      translationPageUrl: "https://es.xkcd.com/strips/soporte-tecnico/",
      translationImageUrl: "https://es.xkcd.com/images/tech_support.png",
    },
    titleText: {
      es: "Hace poco uno me dijo que buscara un ordenador y lo encendiera para poder reiniciarlo. Se negaba a avanzar en su guión antes de que le dijera que había hecho eso.",
      en: "I recently had someone ask me to go get a computer and turn it on so I could restart it. He refused to move further in the script until I said I had done that.",
    },
    regions: [
      {
        id: "restart-script",
        labelEs:
          "¿REINICIAR MI ORDENADOR? YA SÉ QUE DEBE SEGUIR UN GUIÓN, PERO LA LUZ UPLINK DEL MÓDEM SE APAGA CADA POCAS HORAS. EL PROBLEMA ESTÁ ENTRE SU OFICINA Y EL MÓDEM.",
        translationEn:
          "Restart my computer? I know you have a script to follow, but the modem's uplink light goes off every few hours. The problem is between your office and the modem.",
        noteEn:
          "The caller already has evidence that the fault lies upstream, not in the computer.",
        bounds: { x: 1, y: 1, width: 29, height: 31 },
        cardIds: [
          "word-tech-vocabulary",
          "phrase-troubleshooting",
          "concept-haiku-support",
          "grammar-commands-register",
        ],
      },
      {
        id: "still-down",
        labelEs:
          "MI ORDENADOR NO TIENE NADA QUE VER… VALE, DA IGUAL, HE ‘REINICIADO MI ORDENADOR’. SIGUE CAÍDO, Y AUNQUE VOLVIESE, VOLVERÍA A CAERSE DENTRO DE UNAS HORAS, PORQUE SU…",
        translationEn:
          "My computer has nothing to do with… okay, whatever, I've ‘restarted my computer.’ It's still down, and even if it came back, it would go down again in a few hours, because your…",
        noteEn:
          "The quoted perfect tense signals pretend compliance; the conditional describes a hypothetical recurrence.",
        bounds: { x: 33, y: 1, width: 31, height: 31 },
        cardIds: [
          "phrase-troubleshooting",
          "grammar-present-perfect",
          "grammar-hypothetical",
          "phrase-change-patterns",
        ],
      },
      {
        id: "haiku",
        labelEs:
          "NO TENGO MENÚ INICIO. ESTO ES UN SISTEMA HAIKU, PERO NO ES RELEVAN… ¿HAIKU? ES UN SISTEMA OPERATIVO EXPERIMENTAL QUE HE… EH, DA IGUAL.",
        translationEn:
          "I don't have a Start menu. This is a Haiku system, but that isn't relevan— Haiku? It's an experimental operating system that I… uh, never mind.",
        noteEn:
          "The unfamiliar operating system distracts the agent from the real connection problem.",
        bounds: { x: 66, y: 1, width: 33, height: 31 },
        cardIds: ["concept-haiku-support", "word-tech-vocabulary"],
      },
      {
        id: "reach-engineer",
        labelEs:
          "LO SIENTO, PERO ESTO NUNCA SE ARREGLARÁ HASTA QUE HABLE CON UN INGENIERO. ¿VE CERCA DE USTED A ALGUIEN QUE LLEVE PANTALONES CARGO, QUIZÁS CON UN MAPA DEL METRO PEGADO EN LA PARED? HAY UNA TÍA DOS MESAS MÁS ALLÁ CON UN PINGÜINO DE PELUCHE Y UN PÓSTER DE UN TIPO CON BARBA CON ESPADAS. PERFECTO, ¿PUEDE PASÁRMELA? CLARO. HOLA, PERDONE QUE LA MOLESTE, PERO MI CONEXIÓN… SÍ, YA VEO. ES UN PROBLEMA RECURRENTE POR UN CAMBIO DE SERVIDOR. YA DEBERÍA IR BIEN. MUCHÍSIMAS GRACIAS.",
        translationEn:
          "Sorry, but this will never be fixed until I speak to an engineer. Do you see anyone nearby wearing cargo pants, perhaps with a subway map on the wall? There's a woman two desks over with a stuffed penguin and a poster of a bearded guy with swords. Perfect, can you put her on? Sure. Hello, sorry to bother you, but my connection… Yes, I see it. It's a recurring problem from a server move. It should be working now. Thank you so much.",
        noteEn:
          "The stereotypes identify the engineer, who immediately sees the recurring server-side problem.",
        bounds: { x: 1, y: 34, width: 98, height: 32 },
        cardIds: [
          "phrase-until-should",
          "grammar-subjunctive",
          "grammar-commands-register",
          "concept-haiku-support",
          "indefinite-pronouns",
          "word-bother-experience",
          "word-tech-vocabulary",
        ],
      },
      {
        id: "shibboleet-dream",
        labelEs:
          "SIN PROBLEMA. MIRE, EN EL FUTURO, DURANTE UNA LLAMADA AL SERVICIO TÉCNICO, PUEDE DECIR LA PALABRA ‘SHIBBOLEET’ EN CUALQUIER MOMENTO Y AUTOMÁTICAMENTE SE LE PASARÁ CON UNA PERSONA QUE CONOZCA COMO MÍNIMO DOS LENGUAJES DE PROGRAMACIÓN. ¿EN SERIO? SÍ. ES UNA PUERTA TRASERA QUE PUSIERON LOS GEEKS QUE MONTARON ESTOS SISTEMAS DE SOPORTE TELEFÓNICO EN LOS 90. NO SE LO DIGA A NADIE. DIOS MÍO, ESTO ES LO MEJ… ¿QUÉ…? …MIERDA.",
        translationEn:
          "No problem. In the future, on a tech-support call, you can say ‘shibboleet’ at any point and you'll automatically be transferred to someone who knows at least two programming languages. Seriously? Yes. It's a backdoor installed by the geeks who built these phone-support systems in the '90s. Don't tell anyone. My God, this is the grea— What…? …Damn.",
        noteEn:
          "The perfect secret shortcut turns out to be a dream; mierda gives the ending its frustrated punch.",
        bounds: { x: 1, y: 68, width: 98, height: 31 },
        cardIds: [
          "grammar-commands-register",
          "grammar-subjunctive",
          "concept-shibboleet",
          "concept-programming-code",
          "phrase-no-se-lo-diga",
          "question-words",
        ],
      },
    ],
  },
  {
    id: "photos",
    xkcdNumber: 1314,
    publishedAt: "2014-01-08",
    title: "Photos",
    titleEs: "Fotos",
    image: {
      src: "/comics/photos-es.png",
      width: 728,
      height: 482,
      aspectRatio: 728 / 482,
      altEn:
        "Spanish-language xkcd comic: one person challenges another for judging people who photograph a sunset.",
    },
    source: {
      ...XKCD_LICENSE,
      originalPageUrl: "https://xkcd.com/1314/",
      originalImageUrl: "https://imgs.xkcd.com/comics/photos.png",
      translationPageUrl: "https://es.xkcd.com/strips/fotos/",
      translationImageUrl: "https://es.xkcd.com/images/photos.png",
    },
    titleText: {
      es: "Odio que la gente le haga fotos a la comida en lugar de comérsela, porque no hay nada que me guste más que el sonido de la gente masticando.",
      en: "I hate when people take photos of their meal instead of eating it, because there's nothing I love more than the sound of other people chewing.",
    },
    regions: [
      {
        id: "photos-instead-of-view",
        labelEs:
          "UF, ODIO QUE LA GENTE HAGA FOTOS EN LUGAR DE DISFRUTAR DE LA VISTA. ¿POR QUÉ?",
        translationEn:
          "Ugh, I hate that people take photos instead of enjoying the view. Why?",
        noteEn:
          "Odiar que reacts to another person's action and takes the subjunctive haga.",
        bounds: { x: 1, y: 1, width: 29, height: 48 },
        cardIds: [
          "grammar-subjunctive",
          "phrase-instead-enjoy-view",
          "question-words",
        ],
      },
      {
        id: "documenting-distracts",
        labelEs:
          "DOCUMENTAR TU VIDA TE DISTRAE DE VIVIRLA. EN REALIDAD, NO… VENGA YA.",
        translationEn:
          "Documenting your life distracts you from living it. Actually, no… Oh, come on.",
        noteEn:
          "The final la in vivirla refers back to vida. Venga ya rejects the claim impatiently.",
        bounds: { x: 32, y: 1, width: 21, height: 48 },
        cardIds: [
          "word-document-distract",
          "grammar-commands-register",
        ],
      },
      {
        id: "pay-more-attention",
        labelEs:
          "SI INTENTO HACERLE UNA FOTO A ALGO, LE VOY A PRESTAR MÁS ATENCIÓN. ALGUNAS DE MIS MAYORES AVENTURAS HAN SURGIDO AL INTENTAR FOTOGRAFIAR ALGO.",
        translationEn:
          "If I try to take a photo of something, I'll pay more attention to it. Some of my greatest adventures have come from trying to photograph something.",
        noteEn:
          "Le refers to the subject of the photo; ir a plus an infinitive expresses the expected result.",
        bounds: { x: 56, y: 1, width: 43, height: 48 },
        cardIds: [
          "phrase-try-attention-arise",
          "indefinite-pronouns",
          "grammar-present-perfect",
        ],
      },
      {
        id: "experiences-incorrectly",
        labelEs:
          "SI TE MOLESTA QUE OTRA GENTE TENGA EXPERIENCIAS DE FORMA ‘INCORRECTA’, IMAGINA QUÉ INSOPORTABLE ES QUE UN DESCONOCIDO CONDESCENDIENTE TE DIGA QUE ODIA LA FORMA EN QUE VIVES TU VIDA JUSTO EN EL MOMENTO EN QUE HAS ENCONTRADO ALGO QUE QUIERES RECORDAR. ¿POR QUÉ COÑO TE IMPORTA CÓMO DISFRUTAN OTROS DE UNA PUESTA DE SOL?",
        translationEn:
          "If it bothers you that other people have experiences the ‘wrong’ way, imagine how unbearable it is to have a condescending stranger tell you they hate the way you live your life just when you've found something you want to remember. Why the fuck do you care how other people enjoy a sunset?",
        noteEn:
          "Coño is deliberately vulgar, strengthening an angry challenge to the stranger's judgment.",
        bounds: { x: 1, y: 52, width: 58, height: 47 },
        cardIds: [
          "word-bother-experience",
          "grammar-subjunctive",
          "word-unbearable-remember",
          "grammar-present-perfect",
          "indefinite-pronouns",
          "phrase-why-care",
          "phrase-instead-enjoy-view",
          "question-words",
        ],
      },
      {
        id: "caught-on-camera",
        labelEs: "BUENO, PORQUE… PORQUE YO SOLO, EH… CLIC",
        translationEn: "Well, because… because I just, uh… Click.",
        noteEn:
          "Unable to justify his complaint, the critic becomes the subject of the other person's photo.",
        bounds: { x: 61, y: 52, width: 38, height: 47 },
        cardIds: ["phrase-hesitation"],
      },
    ],
  },
] as const satisfies readonly ComicSeed[];

export const COMICS: readonly Comic[] = COMIC_SEEDS.map(defineComic);

export const CARD_BY_ID: ReadonlyMap<CardId, LearningCard> = new Map(
  CARDS.map((card) => [card.id as CardId, card]),
);

export const COMIC_BY_ID: ReadonlyMap<string, Comic> = new Map(
  COMICS.map((comic) => [comic.id, comic]),
);

/** Returns human-readable integrity failures. An empty array means valid. */
export function validateContent(): string[] {
  const errors: string[] = [];
  const cardIds = new Set<string>();
  const comicIds = new Set<string>();
  const xkcdNumbers = new Set<number>();
  const curriculumReferenced = new Set<string>();

  for (const card of CARDS) {
    if (cardIds.has(card.id)) errors.push(`Duplicate card id: ${card.id}`);
    cardIds.add(card.id);
    if (
      card.kind !== "concept" &&
      /\bcomic\b|this translation/i.test(card.noteEn)
    ) {
      errors.push(`Reusable language card embeds comic context: ${card.id}`);
    }
    if (
      card.kind === "word" &&
      Boolean(card.noteEn.trim()) !== Boolean(card.example)
    ) {
      errors.push(
        `Expanded word card needs both an explanation and example: ${card.id}`,
      );
    }
    if (card.kind === "grammar" || card.kind === "phrase") {
      if (!card.questionEn?.trim()) {
        errors.push(`Language card has no beginner question: ${card.id}`);
      }
      if (!card.noteEn.trim()) {
        errors.push(`Language card has no reusable explanation: ${card.id}`);
      }
      if (!card.example?.es.trim() || !card.example.en.trim()) {
        errors.push(`Language card has no reusable bilingual example: ${card.id}`);
      }
    }
  }

  for (const comic of COMICS) {
    if (comicIds.has(comic.id)) errors.push(`Duplicate comic id: ${comic.id}`);
    if (xkcdNumbers.has(comic.xkcdNumber)) {
      errors.push(`Duplicate xkcd number: ${comic.xkcdNumber}`);
    }
    comicIds.add(comic.id);
    xkcdNumbers.add(comic.xkcdNumber);

    if (
      comic.source.originalPageUrl !==
      `https://xkcd.com/${comic.xkcdNumber}/`
    ) {
      errors.push(`Unexpected original source page for ${comic.id}`);
    }
    if (
      !comic.source.originalImageUrl.startsWith(
        "https://imgs.xkcd.com/comics/",
      )
    ) {
      errors.push(`Unexpected original image host for ${comic.id}`);
    }
    if (
      !comic.source.translationPageUrl.startsWith(
        "https://es.xkcd.com/strips/",
      )
    ) {
      errors.push(`Unexpected translation page for ${comic.id}`);
    }
    if (
      !comic.source.translationImageUrl.startsWith(
        "https://es.xkcd.com/images/",
      )
    ) {
      errors.push(`Unexpected translation image host for ${comic.id}`);
    }
    if (comic.source.translationCredit !== "Gabriel Rodríguez Alberich") {
      errors.push(`Unexpected translation credit for ${comic.id}`);
    }
    if (!comic.image.src.endsWith("-es.png")) {
      errors.push(`Comic does not use a localized asset path: ${comic.id}`);
    }
    if (comic.image.width <= 0 || comic.image.height <= 0) {
      errors.push(`Invalid image dimensions for ${comic.id}`);
    }
    const measuredRatio = comic.image.width / comic.image.height;
    if (Math.abs(measuredRatio - comic.image.aspectRatio) > 0.000_001) {
      errors.push(`Aspect ratio does not match dimensions for ${comic.id}`);
    }

    const regionIds = new Set<string>();
    const referenced = new Set<string>();
    for (const region of comic.regions) {
      if (regionIds.has(region.id)) {
        errors.push(`Duplicate region id in ${comic.id}: ${region.id}`);
      }
      regionIds.add(region.id);
      const { x, y, width, height } = region.bounds;
      if (
        x < 0 ||
        y < 0 ||
        width <= 0 ||
        height <= 0 ||
        x + width > 100 ||
        y + height > 100
      ) {
        errors.push(`Out-of-range bounds in ${comic.id}/${region.id}`);
      }

      const expectedTokens = tokenizeLabel(region.labelEs);
      if (region.words.length !== expectedTokens.length) {
        errors.push(
          `Word occurrence count mismatch in ${comic.id}/${region.id}`,
        );
      }
      const wordIds = new Set<string>();
      const wordReferenced = new Set<string>();
      const seenGlyphBounds = new Set<string>();
      region.words.forEach((word, index) => {
        if (wordIds.has(word.id)) {
          errors.push(
            `Duplicate word occurrence id in ${comic.id}/${region.id}: ${word.id}`,
          );
        }
        wordIds.add(word.id);

        const expected = expectedTokens[index];
        if (
          !expected ||
          word.text !== expected.text ||
          word.normalized !== expected.normalized
        ) {
          errors.push(
            `Word occurrence order mismatch in ${comic.id}/${region.id} at ${index}`,
          );
        }
        if (word.normalized !== normalizeWord(word.text)) {
          errors.push(
            `Invalid word normalization in ${comic.id}/${region.id}: ${word.text}`,
          );
        }
        if (word.bounds.length === 0) {
          errors.push(
            `Word has no clickable bounds in ${comic.id}/${region.id}: ${word.text}`,
          );
        }
        word.bounds.forEach((fragment, fragmentIndex) => {
          const values = [
            fragment.x,
            fragment.y,
            fragment.width,
            fragment.height,
          ];
          if (
            values.some((value) => !Number.isFinite(value)) ||
            fragment.x < 0 ||
            fragment.y < 0 ||
            fragment.width <= 0 ||
            fragment.height <= 0 ||
            fragment.x + fragment.width > 100 ||
            fragment.y + fragment.height > 100
          ) {
            errors.push(
              `Out-of-range word bounds in ${comic.id}/${region.id}/${word.id}/${fragmentIndex}`,
            );
          }
          const centerX = fragment.x + fragment.width / 2;
          const centerY = fragment.y + fragment.height / 2;
          if (
            centerX < x ||
            centerX > x + width ||
            centerY < y ||
            centerY > y + height
          ) {
            errors.push(
              `Word bounds fall outside their region in ${comic.id}/${region.id}/${word.id}/${fragmentIndex}`,
            );
          }
          const serialized = values.map((value) => value.toFixed(4)).join(":");
          if (seenGlyphBounds.has(serialized)) {
            errors.push(
              `Duplicate word bounds in ${comic.id}/${region.id}: ${serialized}`,
            );
          }
          seenGlyphBounds.add(serialized);

          const previous = word.bounds[fragmentIndex - 1];
          if (
            previous &&
            (fragment.y < previous.y - 0.5 ||
              (Math.abs(fragment.y - previous.y) <= 0.5 &&
                fragment.x < previous.x))
          ) {
            errors.push(
              `Word fragments are out of reading order in ${comic.id}/${region.id}/${word.id}`,
            );
          }
        });
        if (word.cardIds.length === 0) {
          errors.push(
            `Word has no meaning card in ${comic.id}/${region.id}: ${word.text}`,
          );
          return;
        }
        if (new Set(word.cardIds).size !== word.cardIds.length) {
          errors.push(
            `Duplicate card on word in ${comic.id}/${region.id}: ${word.text}`,
          );
        }
        const meaningCardId = word.cardIds[0];
        const meaningCard = CARDS.find((card) => card.id === meaningCardId);
        if (!meaningCard || meaningCard.kind !== "word") {
          errors.push(
            `First card is not a word meaning in ${comic.id}/${region.id}: ${word.text}`,
          );
        }
        const baseMeaningId = wordCardId(word.normalized);
        if (
          meaningCard?.promptEs !== word.normalized ||
          (meaningCardId !== baseMeaningId &&
            !meaningCardId.startsWith(`${baseMeaningId}--`))
        ) {
          errors.push(
            `Word meaning card does not match surface form in ${comic.id}/${region.id}: ${word.text}`,
          );
        }
        for (const cardId of word.cardIds) {
          wordReferenced.add(cardId);
          if (!cardIds.has(cardId)) {
            errors.push(
              `Unknown word card reference in ${comic.id}/${region.id}: ${cardId}`,
            );
          }
        }
        for (const cardId of word.cardIds.slice(1)) {
          const relatedKind = CARD_BY_ID.get(cardId)?.kind;
          if (relatedKind !== "grammar" && relatedKind !== "phrase") continue;
          const matchingApplications = region.applications.filter(
            (application) =>
              application.cardId === cardId &&
              application.participantWordIds.includes(word.id),
          );
          if (matchingApplications.length !== 1) {
            errors.push(
              `Language link needs exactly one comic application in ${comic.id}/${region.id}/${word.id}: ${cardId}`,
            );
          }
        }
        const wordApplicationCount = region.applications.filter(
          (application) =>
            application.cardId === meaningCardId &&
            application.participantWordIds.includes(word.id),
        ).length;
        const expectsWordApplication =
          meaningCardId in WORD_APPLICATION_EXPLANATIONS;
        if (wordApplicationCount !== (expectsWordApplication ? 1 : 0)) {
          errors.push(
            `Word meaning application mismatch in ${comic.id}/${region.id}/${word.id}: ${meaningCardId}`,
          );
        }
      });

      const applicationIds = new Set<string>();
      const applicationTuples = new Set<string>();
      for (const application of region.applications) {
        if (applicationIds.has(application.id)) {
          errors.push(
            `Duplicate application id in ${comic.id}/${region.id}: ${application.id}`,
          );
        }
        applicationIds.add(application.id);
        const card = CARD_BY_ID.get(application.cardId);
        if (
          !card ||
          (card.kind !== "grammar" &&
            card.kind !== "phrase" &&
            card.kind !== "word")
        ) {
          errors.push(
            `Application does not reference a word, grammar, or phrase card in ${comic.id}/${region.id}: ${application.cardId}`,
          );
        }
        if (!application.exampleEs.trim() || !application.explanationEn.trim()) {
          errors.push(
            `Application has empty teaching copy in ${comic.id}/${region.id}: ${application.id}`,
          );
        }
        if (
          application.participantWordIds.length === 0 ||
          new Set(application.participantWordIds).size !==
            application.participantWordIds.length
        ) {
          errors.push(
            `Application has invalid participants in ${comic.id}/${region.id}: ${application.id}`,
          );
        }
        const tuple = `${application.cardId}:${[...application.participantWordIds].sort().join(",")}`;
        if (applicationTuples.has(tuple)) {
          errors.push(
            `Duplicate application participants in ${comic.id}/${region.id}: ${tuple}`,
          );
        }
        applicationTuples.add(tuple);
        for (const participantWordId of application.participantWordIds) {
          const participant = region.words.find(
            (word) => word.id === participantWordId,
          );
          if (!participant) {
            errors.push(
              `Application references an unknown word in ${comic.id}/${region.id}: ${participantWordId}`,
            );
          } else if (
            (card?.kind === "word" &&
              (application.participantWordIds.length !== 1 ||
                participant.cardIds[0] !== application.cardId)) ||
            ((card?.kind === "grammar" || card?.kind === "phrase") &&
              !participant.cardIds.slice(1).includes(application.cardId))
          ) {
            errors.push(
              `Application is not reverse-linked in ${comic.id}/${region.id}/${participantWordId}: ${application.cardId}`,
            );
          }
        }
        const exampleTokens = tokenizeLabel(application.exampleEs).map(
          (token) => token.normalized,
        );
        let regionCursor = 0;
        const exampleIsSubsequence = exampleTokens.every((exampleToken) => {
          const nextIndex = region.words.findIndex(
            (word, index) =>
              index >= regionCursor && word.normalized === exampleToken,
          );
          if (nextIndex < 0) return false;
          regionCursor = nextIndex + 1;
          return true;
        });
        if (!exampleIsSubsequence) {
          errors.push(
            `Application example is not from its comic region in ${comic.id}/${region.id}: ${application.id}`,
          );
        }
      }

      const languageIdsInRegion = new Set(
        [...wordReferenced].filter(
          (cardId) => {
            const kind = CARD_BY_ID.get(cardId as CardId)?.kind;
            return kind === "grammar" || kind === "phrase";
          },
        ),
      );
      const applicationCardIds = new Set(
        region.applications
          .filter((application) => {
            const kind = CARD_BY_ID.get(application.cardId)?.kind;
            return kind === "grammar" || kind === "phrase";
          })
          .map((application) => application.cardId),
      );
      for (const languageCardId of languageIdsInRegion) {
        if (!applicationCardIds.has(languageCardId as CardId)) {
          errors.push(
            `Region language card has no application in ${comic.id}/${region.id}: ${languageCardId}`,
          );
        }
      }
      for (const applicationCardId of applicationCardIds) {
        if (!languageIdsInRegion.has(applicationCardId)) {
          errors.push(
            `Region application has no linked language card in ${comic.id}/${region.id}: ${applicationCardId}`,
          );
        }
      }

      if (new Set(region.cardIds).size !== region.cardIds.length) {
        errors.push(`Duplicate region card index in ${comic.id}/${region.id}`);
      }
      for (const cardId of region.cardIds) {
        referenced.add(cardId);
        if (!cardIds.has(cardId)) {
          errors.push(
            `Unknown card reference in ${comic.id}/${region.id}: ${cardId}`,
          );
        }
        if (!wordReferenced.has(cardId)) {
          errors.push(
            `Region index has unlinked ${cardId} in ${comic.id}/${region.id}`,
          );
        }
      }
      for (const cardId of wordReferenced) {
        if (!region.cardIds.includes(cardId as CardId)) {
          errors.push(
            `Region index missing ${cardId} in ${comic.id}/${region.id}`,
          );
        }
      }
    }
    const indexed = new Set<string>(comic.cardIds);
    for (const cardId of referenced) {
      if (!indexed.has(cardId)) {
        errors.push(`Comic index missing ${cardId} in ${comic.id}`);
      }
    }
    for (const cardId of indexed) {
      if (!referenced.has(cardId)) {
        errors.push(`Comic index has unused ${cardId} in ${comic.id}`);
      }
      curriculumReferenced.add(cardId);
    }
  }
  for (const card of CARDS) {
    if (!curriculumReferenced.has(card.id)) {
      errors.push(`Curriculum card is not linked to any word: ${card.id}`);
    }
  }
  return errors;
}

const validationErrors = validateContent();
if (validationErrors.length > 0) {
  throw new Error(`Invalid seed content:\n${validationErrors.join("\n")}`);
}
