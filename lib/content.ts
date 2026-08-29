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
  answerEn: string;
  noteEn: string;
  tags: readonly string[];
}

const LEGACY_CURATED_CARDS = [
  {
    id: "grammar-estar-gerundio",
    kind: "grammar",
    promptEs: "estar + gerundio",
    answerEn: "to be doing something right now",
    noteEn:
      "Spanish uses estar plus a gerund for an action in progress: estás volando, estamos teniendo problemas.",
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
  atomicCard("grammar-estar-gerundio"),
  atomicCard("grammar-past-contrast"),
  atomicCard("grammar-present-perfect"),
  atomicCard("grammar-subjunctive", {
    promptEs: "odiar/molestar que + subjuntivo",
    answerEn: "use the subjunctive after an emotional reaction to another action",
    noteEn:
      "Haga and tenga are subjunctive because the speaker reacts to what other people do.",
    tags: ["B1", "grammar", "subjunctive", "reactions"],
  }),
  atomicCard("grammar-subjunctive", {
    id: "grammar-esperar-que-subjunctive",
    promptEs: "esperar que + subjuntivo",
    answerEn: "to hope that something happens",
    noteEn:
      "A hoped-for outcome follows esperar que in the subjunctive: esté, hayan aprendido.",
    tags: ["B1", "grammar", "subjunctive", "hopes"],
  }),
  atomicCard("grammar-subjunctive", {
    id: "grammar-hasta-que-subjunctive",
    promptEs: "hasta que hable…",
    answerEn: "until I speak… (a future event not yet realized)",
    noteEn:
      "Hasta que takes the subjunctive when the awaited event has not happened yet.",
    tags: ["B1", "grammar", "subjunctive", "future events"],
  }),
  atomicCard("grammar-subjunctive", {
    id: "grammar-indefinite-relative-subjunctive",
    promptEs: "alguien que lleve…",
    answerEn: "someone who might be wearing…",
    noteEn:
      "A relative clause describing an unknown or not-yet-identified person can take the subjunctive.",
    tags: ["B1", "grammar", "subjunctive", "relative clauses"],
  }),
  atomicCard("grammar-subjunctive", {
    id: "grammar-evaluative-subjunctive",
    promptEs: "es insoportable que… te diga…",
    answerEn: "it is unbearable that… someone tells you…",
    noteEn:
      "An impersonal evaluation such as es insoportable que is followed by the subjunctive diga.",
    tags: ["B1", "grammar", "subjunctive", "evaluation"],
  }),
  atomicCard("grammar-hypothetical"),
  atomicCard("grammar-commands-register", {
    id: "grammar-informal-command",
    promptEs: "¡Únete!",
    answerEn: "Join! (informal singular command)",
    noteEn:
      "Únete is an affirmative tú command with the reflexive pronoun attached.",
    tags: ["A2", "grammar", "commands", "informal"],
  }),
  atomicCard("grammar-commands-register", {
    id: "grammar-formal-command",
    promptEs: "Mire. · Diga. · Perdone.",
    answerEn: "Look. · Say/Tell. · Excuse me. (formal commands)",
    noteEn:
      "Formal usted commands use the present-subjunctive form, even when they function as direct commands.",
    tags: ["A2", "grammar", "commands", "formal"],
  }),
  atomicCard("grammar-commands-register", {
    id: "grammar-formal-address",
    promptEs: "su hijo · esté contenta · ¿puede…?",
    answerEn: "your son · you are happy · can you…? (formal address)",
    noteEn:
      "Formal usted is paired with third-person verb forms and possessive su.",
    tags: ["A2", "grammar", "register", "formal"],
  }),
  atomicCard("question-words", {
    promptEs: "qué · cómo · por qué",
    answerEn: "question words carry a written accent",
    noteEn:
      "Qué and cómo are accented when interrogative; por qué is written as two words when it asks why.",
    tags: ["A1", "grammar", "questions", "accents"],
  }),
  atomicCard("phrase-venir-a-la-cama"),
  atomicCard("phrase-no-puedo-importante", {
    promptEs: "No puedo.",
    answerEn: "I can't.",
    noteEn:
      "The action after puedo can be omitted when the context makes it clear.",
    tags: ["A1", "common expression"],
  }),
  atomicCard("phrase-no-puedo-importante", {
    id: "phrase-esto-es-importante",
    promptEs: "Esto es importante.",
    answerEn: "This is important.",
    noteEn: "Esto points to the whole situation rather than a named object.",
    tags: ["A1", "common expression"],
  }),
  atomicCard("phrase-estar-equivocado"),
  atomicCard("concept-duty-calls"),
  atomicCard("phrase-change-patterns", {
    id: "phrase-volver-a-infinitive",
    promptEs: "volver a + infinitivo",
    answerEn: "to do something again",
    noteEn: "Volver a plus an infinitive marks repetition or a return to an action.",
    tags: ["A2", "verb pattern", "repetition"],
  }),
  atomicCard("phrase-change-patterns", {
    id: "phrase-dejar-de-infinitive",
    promptEs: "dejar de + infinitivo",
    answerEn: "to stop doing something",
    noteEn: "Dejar de plus an infinitive marks the end of an action or belief.",
    tags: ["A2", "verb pattern", "cessation"],
  }),
  atomicCard("phrase-ya-esta-comparar", {
    id: "phrase-ya-esta",
    promptEs: "¿Y ya está?",
    answerEn: "And that's it?",
    noteEn: "Ya está says that nothing more is required or remains to be done.",
    tags: ["A2", "conversation", "common expression"],
  }),
  atomicCard("phrase-ya-esta-comparar", {
    id: "grammar-para-infinitive-purpose",
    kind: "grammar",
    promptEs: "para comparar",
    answerEn: "in order to compare",
    noteEn: "Para plus an infinitive states the purpose of an action.",
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
  atomicCard("concept-programming-code", {
    promptEs: "lenguaje de programación",
    answerEn: "programming language",
    noteEn:
      "A programming language is a formal language used to express instructions for a computer.",
    tags: ["technology", "programming"],
  }),
  atomicCard("concept-antigravity"),
  atomicCard("phrase-trouble-break", {
    id: "phrase-tener-problemas",
    promptEs: "tener problemas",
    answerEn: "to have trouble; to have problems",
    noteEn: "Tener problemas is the usual Spanish expression for experiencing trouble.",
    tags: ["A2", "common expression", "problems"],
  }),
  atomicCard("phrase-trouble-break", {
    id: "grammar-roto-participle",
    kind: "grammar",
    promptEs: "romper → roto",
    answerEn: "to break → broken",
    noteEn: "Roto is the irregular past participle of romper.",
    tags: ["A2", "grammar", "irregular participle"],
  }),
  atomicCard("phrase-en-cierta-manera"),
  atomicCard("verb-poner-llamar", {
    id: "phrase-ponerle-un-nombre",
    promptEs: "ponerle un nombre a alguien",
    answerEn: "to give someone a name; to name someone",
    noteEn: "Le marks the person receiving the name; personal a introduces that person.",
    tags: ["A2", "expression", "object pronouns"],
  }),
  atomicCard("verb-poner-llamar", {
    id: "phrase-llamar-a-alguien",
    promptEs: "Le llamamos Pequeño Bobby Tablas.",
    answerEn: "We call him Little Bobby Tables.",
    noteEn: "Llamar describes the name people use for someone.",
    tags: ["A2", "expression", "naming"],
  }),
  atomicCard("concept-sql-injection"),
  atomicCard("phrase-records-hope", {
    id: "phrase-registros-estudiantiles",
    promptEs: "registros estudiantiles",
    answerEn: "student records",
    noteEn: "Estudiantiles is the adjective relating registros to students.",
    tags: ["A2", "expression", "education"],
  }),
  atomicCard("concept-input-sanitization"),
  atomicCard("grammar-soler"),
  atomicCard("concept-correlation-causation"),
  atomicCard("phrase-course-seem-maybe", {
    id: "phrase-dar-una-asignatura",
    promptEs: "dar una asignatura",
    answerEn: "to take or teach a course (depending on regional context)",
    noteEn: "In this Spanish translation, di una asignatura means I took a course.",
    tags: ["A2", "expression", "education", "Spain"],
  }),
  atomicCard("phrase-course-seem-maybe", {
    id: "phrase-parece-que",
    promptEs: "parece que…",
    answerEn: "it seems that…; it sounds like…",
    noteEn: "Parece que introduces an inference based on the available evidence.",
    tags: ["A2", "expression", "inference"],
  }),
  atomicCard("phrase-troubleshooting", {
    id: "phrase-no-tener-nada-que-ver",
    promptEs: "no tener nada que ver",
    answerEn: "to have nothing to do with it",
    noteEn: "This fixed expression denies any connection or relevance.",
    tags: ["B1", "idiom", "relevance"],
  }),
  atomicCard("phrase-troubleshooting", {
    id: "phrase-seguir-caido",
    promptEs: "seguir caído",
    answerEn: "to still be down; to remain offline",
    noteEn: "Seguir plus an adjective means to remain in that state.",
    tags: ["B1", "expression", "technology"],
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
    promptEs: "guión de soporte técnico",
    answerEn: "a fixed troubleshooting script used by first-line support",
    noteEn: "The caller's diagnosis conflicts with the agent's required script.",
    tags: ["technology", "technical support"],
  }),
  atomicCard("concept-haiku-support", {
    id: "concept-support-engineer",
    promptEs: "ingeniero",
    answerEn: "the specialist who can diagnose the underlying system problem",
    noteEn: "The joke contrasts specialist diagnosis with scripted first-line support.",
    tags: ["technology", "technical support", "work"],
  }),
  atomicCard("phrase-until-should", {
    id: "grammar-deberia-expectation",
    kind: "grammar",
    promptEs: "ya debería ir bien",
    answerEn: "it should be working now",
    noteEn: "Debería can express a reasoned expectation, not only an obligation.",
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
    answerEn: "a hidden backdoor into expert technical support",
    noteEn: "In the dream, the secret phrase bypasses the normal support process.",
    tags: ["technology", "technical support", "metaphor"],
  }),
  atomicCard("phrase-no-se-lo-diga"),
  atomicCard("phrase-no-se-lo-diga", {
    id: "phrase-como-minimo",
    promptEs: "como mínimo",
    answerEn: "at least; at a minimum",
    noteEn: "Como mínimo sets the lowest acceptable number or threshold.",
    tags: ["A2", "expression", "quantity"],
  }),
  atomicCard("phrase-instead-enjoy-view", {
    id: "phrase-en-lugar-de",
    promptEs: "en lugar de",
    answerEn: "instead of",
    noteEn: "En lugar de introduces an alternative to the action that follows.",
    tags: ["A2", "connector", "contrast"],
  }),
  atomicCard("phrase-instead-enjoy-view", {
    id: "phrase-disfrutar-de",
    promptEs: "disfrutar de la vista",
    answerEn: "to enjoy the view",
    noteEn: "This translation uses disfrutar de before the thing being enjoyed.",
    tags: ["A2", "expression", "outdoors"],
  }),
  atomicCard("phrase-instead-enjoy-view", {
    id: "phrase-puesta-de-sol",
    promptEs: "puesta de sol",
    answerEn: "sunset",
    noteEn: "Literally, puesta de sol describes the sun's setting.",
    tags: ["A2", "expression", "outdoors"],
  }),
  atomicCard("phrase-try-attention-arise", {
    id: "phrase-prestar-atencion",
    promptEs: "prestar atención",
    answerEn: "to pay attention",
    noteEn: "Prestar atención is a fixed expression; prestar alone usually means to lend.",
    tags: ["A2", "expression", "attention"],
  }),
  atomicCard("phrase-try-attention-arise", {
    id: "phrase-hacerle-una-foto",
    promptEs: "hacerle una foto a algo",
    answerEn: "to take a photo of something",
    noteEn:
      "Hacer una foto is the standard expression in Spain; le refers to the subject photographed.",
    tags: ["A2", "expression", "photography", "Spain"],
  }),
  atomicCard("phrase-try-attention-arise", {
    id: "grammar-ir-a-infinitive",
    kind: "grammar",
    promptEs: "voy a prestar…",
    answerEn: "I am going to pay…",
    noteEn:
      "Ir a plus an infinitive expresses an intended or expected future action.",
    tags: ["A2", "grammar", "future"],
  }),
  atomicCard("phrase-try-attention-arise", {
    id: "grammar-al-infinitive",
    kind: "grammar",
    promptEs: "al intentar…",
    answerEn: "when trying…; upon trying…",
    noteEn: "Al plus an infinitive expresses when something happens.",
    tags: ["B1", "grammar", "time clauses"],
  }),
  atomicCard("word-bother-experience", {
    id: "phrase-perdone-que-moleste",
    promptEs: "Perdone que la moleste.",
    answerEn: "Sorry to bother you.",
    noteEn: "A polite formal apology before interrupting someone.",
    tags: ["B1", "expression", "politeness", "formal"],
  }),
  atomicCard("word-bother-experience", {
    id: "phrase-tener-experiencias",
    promptEs: "tener experiencias",
    answerEn: "to have experiences",
    noteEn: "Spanish uses tener, literally to have, with experiencias.",
    tags: ["A2", "expression", "experience"],
  }),
  atomicCard("word-bother-experience", {
    id: "phrase-lo-siento",
    promptEs: "Lo siento.",
    answerEn: "I'm sorry.",
    noteEn: "Lo siento is the conventional expression for apologizing.",
    tags: ["A1", "expression", "politeness"],
  }),
  atomicCard("word-document-distract", {
    id: "phrase-en-realidad",
    kind: "phrase",
    promptEs: "en realidad",
    answerEn: "actually; in fact",
    noteEn: "En realidad corrects or qualifies what was just said.",
    tags: ["A2", "connector", "conversation"],
  }),
  atomicCard("grammar-commands-register", {
    id: "phrase-venga-ya",
    kind: "phrase",
    promptEs: "¡Venga ya!",
    answerEn: "Oh, come on!",
    noteEn: "Venga ya rejects a claim with impatience or disbelief.",
    tags: ["B1", "expression", "conversation", "Spain"],
  }),
  atomicCard("phrase-why-care"),
  atomicCard("phrase-hesitation", {
    id: "phrase-bueno-discourse-marker",
    promptEs: "Bueno, porque…",
    answerEn: "Well, because…",
    noteEn: "Bueno can buy time or soften the start of an answer.",
    tags: ["A2", "conversation", "discourse marker"],
  }),
  atomicCard("phrase-hesitation", {
    id: "concept-trailing-off-hesitation",
    kind: "concept",
    promptEs: "yo solo, eh…",
    answerEn: "I just, uh… (trailing off while searching for an answer)",
    noteEn: "Eh and the unfinished sentence reveal that the speaker has no good justification.",
    tags: ["A2", "conversation", "hesitation"],
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
  hacerle: "to take it/of it (as part of hacerle una foto)",
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

const WORD_SENSES = {
  a: [
    {
      key: "repetition-link",
      answerEn: "again (the linker in volver a + infinitive)",
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
      answerEn: "no separate English word; required before nosotros after únete",
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
      answerEn: "to it (referring to the subject of the photo)",
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
    return definitions.map(
      (sense) =>
        ({
          id: wordCardId(normalized, sense.key),
          kind: "word",
          promptEs: normalized,
          answerEn: sense.answerEn,
          noteEn:
            "This card tracks the meaning of this exact surface form in this comic context.",
          tags: ["word", "contextual sense"],
        }) satisfies LearningCard,
    );
  },
);

/**
 * Older seed cards that grouped several unrelated vocabulary words are
 * superseded by the exact surface-form cards above. Grammar, expressions,
 * and concepts remain as the reusable higher-level learning targets.
 */
const REUSABLE_CURATED_CARDS = ATOMIC_CURATED_CARDS;

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

export interface RevealRegion {
  id: string;
  /** Exact Spanish text printed in the translated image. */
  labelEs: string;
  translationEn: string;
  noteEn: string;
  bounds: PercentBounds;
  words: readonly WordOccurrence[];
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

interface RevealRegionSeed extends Omit<RevealRegion, "words" | "cardIds"> {
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
 */
const CURATED_CARD_PATTERNS = {
  "grammar-estar-gerundio": [
    ["estás", "volando"],
    ["estamos", "teniendo"],
  ],
  "grammar-past-contrast": [
    ["aprendí"],
    ["escribí"],
    ["probé"],
    ["solía"],
    ["implicaba"],
    ["di"],
    ["dejé"],
  ],
  "grammar-present-perfect": [
    ["ha", "roto"],
    ["hemos", "perdido"],
    ["he", "reiniciado"],
    ["han", "surgido"],
    ["has", "encontrado"],
  ],
  "grammar-subjunctive": [
    ["odio", "que"],
    ["molesta", "que"],
    ["haga"],
    ["tenga"],
  ],
  "grammar-esperar-que-subjunctive": [
    ["espero", "que"],
    ["esté"],
    ["hayan", "aprendido"],
  ],
  "grammar-hasta-que-subjunctive": [["hasta", "que", "hable"]],
  "grammar-indefinite-relative-subjunctive": [
    ["alguien", "que", "lleve"],
    ["persona", "que", "conozca"],
  ],
  "grammar-evaluative-subjunctive": [
    [
      "insoportable",
      "es",
      "que",
      "un",
      "desconocido",
      "condescendiente",
      "te",
      "diga",
    ],
  ],
  "grammar-hypothetical": [
    ["aunque", "volviese"],
    ["volvería", "a", "caerse"],
  ],
  "grammar-informal-command": [["únete"]],
  "grammar-formal-command": [
    ["mire"],
    ["diga"],
    ["perdone"],
  ],
  "grammar-formal-address": [
    ["su", "hijo"],
    ["su", "oficina"],
    ["esté", "contenta"],
    ["usted"],
    ["ve"],
    ["puede"],
    ["pasármela"],
    ["mire"],
    ["diga"],
    ["perdone"],
  ],
  "question-words": [["qué"], ["cómo"], ["por", "qué"]],
  "phrase-venir-a-la-cama": [["vienes", "a", "la", "cama"]],
  "phrase-no-puedo-importante": [["no", "puedo"]],
  "phrase-esto-es-importante": [["esto", "es", "importante"]],
  "phrase-estar-equivocado": [["está", "equivocado"]],
  "concept-duty-calls": [["internet"], ["equivocado"]],
  "phrase-volver-a-infinitive": [
    ["vuelve", "a", "ser"],
    ["volvería", "a", "caerse"],
  ],
  "phrase-dejar-de-infinitive": [["dejé", "de", "creerlo"]],
  "phrase-ya-esta": [["y", "ya", "está"]],
  "grammar-para-infinitive-purpose": [["para", "comparar"]],
  "concept-python": [["python"]],
  "concept-hello-world": [["hola", "mundo"]],
  "concept-dynamic-typing": [["tipado", "dinámico"]],
  "concept-indentation": [["indentación"]],
  "concept-programming-code": [
    ["lenguajes", "de", "programación"],
  ],
  "concept-antigravity": [["import", "antigravity"]],
  "phrase-tener-problemas": [["teniendo"], ["problemas"]],
  "grammar-roto-participle": [["ha", "roto"]],
  "phrase-en-cierta-manera": [["en", "cierta", "manera"]],
  "phrase-ponerle-un-nombre": [
    ["le", "puso", "a", "su", "hijo", "el", "nombre"],
  ],
  "phrase-llamar-a-alguien": [["le", "llamamos"]],
  "concept-sql-injection": [
    ["robert", "drop", "table", "students"],
    ["pequeño", "bobby", "tablas"],
  ],
  "phrase-registros-estudiantiles": [["registros", "estudiantiles"]],
  "concept-input-sanitization": [
    ["sanear", "la", "inserción"],
    ["bases", "de", "datos"],
  ],
  "grammar-soler": [["solía", "creer"]],
  "concept-correlation-causation": [
    ["correlación"],
    ["causalidad"],
    ["creerlo"],
    ["ayudó"],
  ],
  "phrase-dar-una-asignatura": [["di", "una", "asignatura"]],
  "phrase-parece-que": [["parece", "que"]],
  "phrase-no-tener-nada-que-ver": [["no", "tiene", "nada", "que", "ver"]],
  "phrase-seguir-caido": [["sigue", "caído"]],
  "phrase-da-igual": [["da", "igual"]],
  "concept-haiku-os": [["haiku"]],
  "concept-scripted-tech-support": [
    ["seguir", "un", "guión"],
    ["servicio", "técnico"],
    ["soporte", "telefónico"],
  ],
  "concept-support-engineer": [["ingeniero"]],
  "grammar-deberia-expectation": [["ya", "debería", "ir", "bien"]],
  "concept-shibboleet": [["shibboleet"]],
  "concept-support-backdoor": [["puerta", "trasera"]],
  "phrase-no-se-lo-diga": [["no", "se", "lo", "diga", "a", "nadie"]],
  "phrase-como-minimo": [["como", "mínimo"]],
  "phrase-en-lugar-de": [["en", "lugar", "de"]],
  "phrase-disfrutar-de": [["disfrutar", "de", "la", "vista"]],
  "phrase-puesta-de-sol": [["puesta", "de", "sol"]],
  "phrase-prestar-atencion": [["prestar"], ["atención"]],
  "phrase-hacerle-una-foto": [["hacerle", "una", "foto", "a", "algo"]],
  "grammar-ir-a-infinitive": [["voy", "a", "prestar"]],
  "grammar-al-infinitive": [["al", "intentar"]],
  "phrase-perdone-que-moleste": [["perdone", "que", "la", "moleste"]],
  "phrase-tener-experiencias": [["tenga", "experiencias"]],
  "phrase-lo-siento": [["lo", "siento"]],
  "phrase-en-realidad": [["en", "realidad"]],
  "phrase-venga-ya": [["venga", "ya"]],
  "phrase-why-care": [["por", "qué"], ["te", "importa"]],
  "phrase-bueno-discourse-marker": [["bueno"]],
  "concept-trailing-off-hesitation": [["yo", "solo", "eh"]],
} as const satisfies Partial<
  Record<CuratedCardId, readonly (readonly NormalizedWord[])[]>
>;

const LEGACY_CARD_EXPANSIONS: Partial<
  Record<LegacyCuratedCardId, readonly string[]>
> = {
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
  "phrase-no-puedo-importante": [
    "phrase-no-puedo-importante",
    "phrase-esto-es-importante",
  ],
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
    "concept-programming-code",
    "phrase-como-minimo",
  ],
  "phrase-trouble-break": [
    "phrase-tener-problemas",
    "grammar-roto-participle",
  ],
  "verb-poner-llamar": [
    "phrase-ponerle-un-nombre",
    "phrase-llamar-a-alguien",
  ],
  "phrase-records-hope": [
    "phrase-registros-estudiantiles",
    "grammar-esperar-que-subjunctive",
  ],
  "phrase-course-seem-maybe": [
    "phrase-dar-una-asignatura",
    "phrase-parece-que",
  ],
  "phrase-troubleshooting": [
    "phrase-no-tener-nada-que-ver",
    "phrase-seguir-caido",
    "phrase-da-igual",
  ],
  "concept-haiku-support": [
    "concept-haiku-os",
    "concept-scripted-tech-support",
    "concept-support-engineer",
    "phrase-da-igual",
  ],
  "phrase-until-should": [
    "grammar-hasta-que-subjunctive",
    "grammar-deberia-expectation",
  ],
  "concept-shibboleet": ["concept-shibboleet", "concept-support-backdoor"],
  "phrase-instead-enjoy-view": [
    "phrase-en-lugar-de",
    "phrase-disfrutar-de",
    "phrase-puesta-de-sol",
  ],
  "phrase-try-attention-arise": [
    "phrase-prestar-atencion",
    "phrase-hacerle-una-foto",
    "grammar-ir-a-infinitive",
    "grammar-al-infinitive",
  ],
  "word-bother-experience": [
    "phrase-perdone-que-moleste",
    "phrase-tener-experiencias",
    "phrase-lo-siento",
  ],
  "word-document-distract": ["phrase-en-realidad"],
  "phrase-hesitation": [
    "phrase-bueno-discourse-marker",
    "concept-trailing-off-hesitation",
  ],
};

const REUSABLE_CURATED_CARD_IDS = new Set<string>(
  REUSABLE_CURATED_CARDS.map((card) => card.id),
);
const CURATED_PATTERNS_BY_ID: Partial<
  Record<CuratedCardId, readonly (readonly NormalizedWord[])[]>
> = CURATED_CARD_PATTERNS;

function matchingIndexes(
  tokens: readonly { normalized: string }[],
  pattern: readonly string[],
): Set<number> {
  const indexes = new Set<number>();
  for (let start = 0; start <= tokens.length - pattern.length; start += 1) {
    if (
      pattern.every(
        (expected, offset) => tokens[start + offset].normalized === expected,
      )
    ) {
      for (let offset = 0; offset < pattern.length; offset += 1) {
        indexes.add(start + offset);
      }
    }
  }
  return indexes;
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

function meaningCardIdForOccurrence(
  tokens: readonly { normalized: string }[],
  index: number,
): WordCardId {
  const normalized = tokens[index].normalized as NormalizedWord;
  const senses = WORD_SENSES[normalized as keyof typeof WORD_SENSES] as
    | readonly WordSenseDefinition[]
    | undefined;
  if (!senses) return wordCardId(normalized);

  const matched = senses.find(
    (sense) =>
      sense.contexts?.some((context) =>
        contextMatchesAt(tokens, index, context),
      ) ?? false,
  );
  const fallback = senses.find((sense) => !sense.contexts);
  const sense = matched ?? fallback;
  if (!sense) {
    throw new Error(`No contextual word sense for ${normalized}`);
  }
  return wordCardId(normalized, sense.key);
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
      for (const index of matchingIndexes(tokens, pattern)) indexes.add(index);
    }
    if (cardId === "question-words") {
      tokens.forEach((token, index) => {
        if (
          token.normalized === "qué" &&
          tokens[index - 1]?.normalized === "imagina"
        ) {
          indexes.delete(index);
        }
      });
    }
    if (cardId === "grammar-evaluative-subjunctive") {
      tokens.forEach((token, index) => {
        if (!["insoportable", "es", "que", "diga"].includes(token.normalized)) {
          indexes.delete(index);
        }
      });
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
    const wordMeaningCardId = meaningCardIdForOccurrence(tokens, index);
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
      });

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
