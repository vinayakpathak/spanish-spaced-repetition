/**
 * Curated, non-commercial seed content for the xkcd Spanish reader.
 *
 * The original comics remain © Randall Munroe and are used under CC BY-NC
 * 2.5. The Spanish learning notes and hotspot geometry are app-specific
 * adaptations. Keep the attribution rendered anywhere a comic is shown.
 */

export type CardKind = "word" | "phrase" | "grammar" | "concept";

export interface LearningCard {
  id: string;
  kind: CardKind;
  promptEn: string;
  answerEs: string;
  noteEs: string;
  tags: readonly string[];
}

export const CARDS = [
  {
    id: "grammar-contractions",
    kind: "grammar",
    promptEn: "English contractions: can't, we're, code's, you've",
    answerEs: "contracciones: cannot, we are, code is, you have",
    noteEs:
      "En inglés informal se contraen auxiliares con mucha frecuencia. El contexto decide si ’s significa is o posesión.",
    tags: ["A2", "gramática", "forma hablada"],
  },
  {
    id: "grammar-present-progressive",
    kind: "grammar",
    promptEn: "be + verb-ing",
    answerEs: "estar + gerundio / una acción en curso",
    noteEs:
      "Are you coming? pregunta por un plan inmediato; my code is compiling describe un proceso que está ocurriendo ahora.",
    tags: ["A2", "gramática", "tiempo verbal"],
  },
  {
    id: "grammar-imperative",
    kind: "grammar",
    promptEn: "Imperative: Come! Make it! Get back!",
    answerEs: "imperativo: ¡Ven! ¡Hazlo! ¡Vuelve!",
    noteEs:
      "El inglés forma el imperativo con el verbo sin sujeto. En español la forma cambia según la persona y el registro.",
    tags: ["A2", "gramática", "instrucciones"],
  },
  {
    id: "grammar-simple-past",
    kind: "grammar",
    promptEn: "learned / typed / did he break?",
    answerEs: "aprendí / escribí / ¿rompió?",
    noteEs:
      "El pasado simple sitúa una acción terminada. En preguntas inglesas, did lleva el pasado y el verbo vuelve a su forma base.",
    tags: ["A2", "gramática", "tiempo verbal"],
  },
  {
    id: "grammar-present-perfect",
    kind: "grammar",
    promptEn: "we've lost / you've learned",
    answerEs: "hemos perdido / has aprendido",
    noteEs:
      "Have + participio conecta un hecho pasado con su resultado presente. El español de España suele conservar el perfecto aquí.",
    tags: ["B1", "gramática", "tiempo verbal"],
  },
  {
    id: "concept-code-instructions",
    kind: "concept",
    promptEn: "code as instructions",
    answerEs: "el código como instrucciones para un ordenador",
    noteEs:
      "Los seis chistes juegan con la distancia entre una instrucción literal para la máquina y la intención humana.",
    tags: ["tecnología", "idea recurrente"],
  },
  {
    id: "word-program-family",
    kind: "word",
    promptEn: "program / programmer / programming",
    answerEs: "programa / programador(a) / programación o programar",
    noteEs:
      "Una misma raíz aparece como sustantivo, persona y actividad. Program también puede ser verbo: programar.",
    tags: ["A2", "tecnología", "familia léxica"],
  },
  {
    id: "word-work",
    kind: "word",
    promptEn: "work",
    answerEs: "trabajo; trabajar; funcionar",
    noteEs:
      "Aquí significa trabajo o trabajar. En otros contextos, it works se traduce como funciona.",
    tags: ["A1", "palabra frecuente"],
  },
  {
    id: "word-learn",
    kind: "word",
    promptEn: "learn",
    answerEs: "aprender",
    noteEs:
      "Learn es adquirir conocimiento; teach es enseñarlo. Learned puede ser pasado o participio.",
    tags: ["A1", "educación"],
  },
  {
    id: "phrase-come-to-bed",
    kind: "phrase",
    promptEn: "Are you coming to bed?",
    answerEs: "¿Vienes a la cama?",
    noteEs:
      "En inglés, come indica movimiento hacia quien habla. En esta escena española resulta natural usar venir.",
    tags: ["A2", "vida diaria"],
  },
  {
    id: "phrase-this-is-important",
    kind: "phrase",
    promptEn: "This is important.",
    answerEs: "Esto es importante.",
    noteEs:
      "This señala la situación inmediata. Importante es un cognado útil y no cambia de género.",
    tags: ["A1", "cognado"],
  },
  {
    id: "question-what",
    kind: "word",
    promptEn: "What?",
    answerEs: "¿Qué?",
    noteEs:
      "Como interrogativo, qué lleva tilde. Una sola palabra puede expresar sorpresa o pedir repetición.",
    tags: ["A1", "preguntas"],
  },
  {
    id: "phrase-be-wrong",
    kind: "phrase",
    promptEn: "to be wrong",
    answerEs: "estar equivocado / no tener razón",
    noteEs:
      "No suele decirse ser incorrecto de una persona. Estar equivocado y no tener razón son las opciones naturales.",
    tags: ["A2", "opiniones"],
  },
  {
    id: "word-someone",
    kind: "word",
    promptEn: "someone",
    answerEs: "alguien",
    noteEs:
      "Someone se refiere a una persona indefinida. Something, con la misma raíz, significa algo.",
    tags: ["A1", "pronombre"],
  },
  {
    id: "concept-duty-calls-irony",
    kind: "concept",
    promptEn: "Duty Calls: the irony",
    answerEs: "tratar una discusión en internet como si fuera un deber urgente",
    noteEs:
      "El título usa la expresión duty calls —el deber llama— para engrandecer una obsesión bastante trivial.",
    tags: ["humor", "ironía", "internet"],
  },
  {
    id: "question-how",
    kind: "word",
    promptEn: "How?",
    answerEs: "¿Cómo?",
    noteEs:
      "How pregunta por la manera. Cómo lleva tilde cuando es interrogativo o exclamativo.",
    tags: ["A1", "preguntas"],
  },
  {
    id: "concept-python",
    kind: "concept",
    promptEn: "Python",
    answerEs: "Python, un lenguaje de programación",
    noteEs:
      "El chiste exagera la sensación de facilidad y libertad que puede dar un lenguaje con una sintaxis legible.",
    tags: ["tecnología", "programación"],
  },
  {
    id: "word-simple",
    kind: "word",
    promptEn: "simple",
    answerEs: "sencillo / simple",
    noteEs:
      "Simple es cognado, pero sencillo suena muy natural cuando algo es fácil de hacer o entender.",
    tags: ["A1", "adjetivo", "cognado"],
  },
  {
    id: "concept-hello-world",
    kind: "concept",
    promptEn: "Hello, World!",
    answerEs: "¡Hola, mundo!, el primer programa tradicional",
    noteEs:
      "Es el ejemplo mínimo con el que muchos tutoriales enseñan a mostrar texto en un lenguaje nuevo.",
    tags: ["tecnología", "cultura de programación"],
  },
  {
    id: "concept-dynamic-typing",
    kind: "concept",
    promptEn: "dynamic typing",
    answerEs: "tipado dinámico",
    noteEs:
      "Los tipos se comprueban durante la ejecución; una variable no queda atada para siempre a un único tipo declarado.",
    tags: ["tecnología", "programación"],
  },
  {
    id: "concept-significant-whitespace",
    kind: "concept",
    promptEn: "whitespace",
    answerEs: "espacios en blanco; en Python, la sangría estructura el código",
    noteEs:
      "Whitespace incluye espacios, tabulaciones y saltos de línea. Python usa la sangría donde otros lenguajes usan llaves.",
    tags: ["tecnología", "programación"],
  },
  {
    id: "phrase-come-join-us",
    kind: "phrase",
    promptEn: "Come join us!",
    answerEs: "¡Ven con nosotros! / ¡Únete!",
    noteEs:
      "Come + verbo es una invitación informal muy común: come see, come help, come join.",
    tags: ["A2", "invitaciones"],
  },
  {
    id: "word-fun",
    kind: "word",
    promptEn: "fun",
    answerEs: "diversión / divertido",
    noteEs:
      "En programming is fun funciona como adjetivo predicativo; en español decimos programar es divertido.",
    tags: ["A1", "palabra frecuente"],
  },
  {
    id: "idiom-whole-new-world",
    kind: "phrase",
    promptEn: "a whole new world",
    answerEs: "todo un mundo nuevo",
    noteEs:
      "Whole intensifica la totalidad: no es solo algo nuevo, sino una realidad completamente distinta.",
    tags: ["B1", "expresión"],
  },
  {
    id: "phrase-thats-it",
    kind: "phrase",
    promptEn: "That's it?",
    answerEs: "¿Eso es todo? / ¿Ya está?",
    noteEs:
      "La pregunta expresa sorpresa porque algo parece demasiado fácil o breve.",
    tags: ["A2", "conversación"],
  },
  {
    id: "phrase-for-comparison",
    kind: "phrase",
    promptEn: "for comparison",
    answerEs: "para comparar / a modo de comparación",
    noteEs:
      "For comparison explica el propósito. En el chiste intenta racionalizar una decisión absurda.",
    tags: ["B1", "conector"],
  },
  {
    id: "concept-antigravity-joke",
    kind: "concept",
    promptEn: "import antigravity",
    answerEs: "importar antigravity: código real convertido en chiste visual",
    noteEs:
      "Python incluye un módulo antigravity como broma: al importarlo abre este mismo cómic en un navegador.",
    tags: ["humor", "programación", "referencia"],
  },
  {
    id: "word-compile",
    kind: "word",
    promptEn: "compile / compiling",
    answerEs: "compilar / compilando",
    noteEs:
      "Compilar transforma código fuente a otra forma ejecutable. Mientras tarda, los personajes se escaquean.",
    tags: ["tecnología", "verbo"],
  },
  {
    id: "idiom-slack-off",
    kind: "phrase",
    promptEn: "slack off",
    answerEs: "holgazanear / escaquearse",
    noteEs:
      "Es informal: trabajar menos de lo que se espera. Legitimately vuelve cómica la excusa.",
    tags: ["B1", "trabajo", "phrasal verb"],
  },
  {
    id: "phrase-get-back-to-work",
    kind: "phrase",
    promptEn: "Get back to work!",
    answerEs: "¡Vuelvan al trabajo! / ¡A trabajar!",
    noteEs:
      "Get back to significa retomar o volver a una actividad, no únicamente regresar físicamente.",
    tags: ["A2", "trabajo", "phrasal verb"],
  },
  {
    id: "phrase-carry-on",
    kind: "phrase",
    promptEn: "Carry on.",
    answerEs: "Continúen. / Sigan.",
    noteEs:
      "Carry on es un phrasal verb para continuar. Aquí el jefe retira inmediatamente su objeción.",
    tags: ["B1", "phrasal verb"],
  },
  {
    id: "verb-make",
    kind: "word",
    promptEn: "make",
    answerEs: "hacer / preparar",
    noteEs:
      "Con comida, make suele ser preparar: make a sandwich es preparar un sándwich.",
    tags: ["A1", "verbo frecuente"],
  },
  {
    id: "grammar-reflexive-yourself",
    kind: "grammar",
    promptEn: "Make it yourself.",
    answerEs: "Hazlo tú mismo. / Prepáratelo tú.",
    noteEs:
      "Yourself enfatiza que la misma persona debe hacer la acción, sin ayuda de otra.",
    tags: ["A2", "pronombre reflexivo"],
  },
  {
    id: "concept-sudo",
    kind: "concept",
    promptEn: "sudo",
    answerEs: "comando que ejecuta otra orden con privilegios elevados",
    noteEs:
      "El chiste trata a la otra persona como una computadora que obedece en cuanto la petición lleva sudo.",
    tags: ["tecnología", "línea de comandos", "humor"],
  },
  {
    id: "word-okay",
    kind: "word",
    promptEn: "Okay.",
    answerEs: "Vale. / De acuerdo.",
    noteEs:
      "Okay también se usa en español, pero vale y de acuerdo son respuestas naturales para aceptar una petición.",
    tags: ["A1", "conversación"],
  },
  {
    id: "phrase-computer-trouble",
    kind: "phrase",
    promptEn: "We're having some computer trouble.",
    answerEs: "Tenemos algunos problemas informáticos.",
    noteEs:
      "Have trouble significa tener dificultades o problemas; no se traduce como tener lío de forma literal.",
    tags: ["A2", "tecnología", "expresión"],
  },
  {
    id: "phrase-break-something",
    kind: "phrase",
    promptEn: "Did he break something?",
    answerEs: "¿Rompió algo?",
    noteEs:
      "Something se vuelve algo en afirmativas y muchas preguntas donde se espera que exista tal cosa.",
    tags: ["A2", "preguntas"],
  },
  {
    id: "idiom-in-a-way",
    kind: "phrase",
    promptEn: "In a way—",
    answerEs: "En cierto modo…",
    noteEs:
      "Sirve para aceptar parcialmente una descripción y preparar una explicación con matices.",
    tags: ["B1", "matiz", "expresión"],
  },
  {
    id: "verb-name-call",
    kind: "word",
    promptEn: "name someone / call someone",
    answerEs: "ponerle un nombre a alguien / llamar a alguien",
    noteEs:
      "They named him Robert describe el acto de nombrarlo; we call him Bobby dice cómo lo llaman habitualmente.",
    tags: ["A2", "verbos"],
  },
  {
    id: "concept-sql-injection",
    kind: "concept",
    promptEn: "SQL injection",
    answerEs: "inyección SQL",
    noteEs:
      "El nombre contiene código que cierra una cadena y ordena borrar la tabla Students. Solo funciona si la entrada se concatena sin protección.",
    tags: ["seguridad", "bases de datos", "humor"],
  },
  {
    id: "word-records",
    kind: "word",
    promptEn: "student records",
    answerEs: "expedientes o registros del alumnado",
    noteEs:
      "Record aquí es un sustantivo: datos conservados oficialmente, no el verbo grabar.",
    tags: ["B1", "educación", "datos"],
  },
  {
    id: "phrase-i-hope",
    kind: "phrase",
    promptEn: "I hope…",
    answerEs: "Espero que…",
    noteEs:
      "En español, espero que suele ir seguido de subjuntivo: espero que estés contenta; espero que hayas aprendido.",
    tags: ["B1", "subjuntivo", "opiniones"],
  },
  {
    id: "concept-input-sanitization",
    kind: "concept",
    promptEn: "sanitize database inputs",
    answerEs: "validar y parametrizar las entradas de la base de datos",
    noteEs:
      "Sanitize se traduce a menudo como sanear, pero la defensa concreta es validar datos y usar consultas parametrizadas.",
    tags: ["seguridad", "bases de datos"],
  },
  {
    id: "phrase-spend-time-on",
    kind: "phrase",
    promptEn: "spend time on a task",
    answerEs: "dedicar tiempo a una tarea",
    noteEs:
      "Spend time on combina spend con una actividad. También puede decirse spend time doing: pasar tiempo haciendo algo.",
    tags: ["A2", "tiempo", "trabajo"],
  },
  {
    id: "grammar-should",
    kind: "grammar",
    promptEn: "I should write a program.",
    answerEs: "Debería escribir un programa.",
    noteEs:
      "Should propone lo aconsejable. Debería conserva aquí el tono de idea razonable, no de obligación absoluta.",
    tags: ["A2", "verbo modal"],
  },
  {
    id: "concept-automation",
    kind: "concept",
    promptEn: "automation",
    answerEs: "automatización: hacer que un proceso se ejecute solo",
    noteEs:
      "La teoría promete ahorrar trabajo repetido; la tira contrasta ese ahorro con el coste de construir y mantener la herramienta.",
    tags: ["tecnología", "productividad"],
  },
  {
    id: "phrase-take-over",
    kind: "phrase",
    promptEn: "automation takes over",
    answerEs: "la automatización se hace cargo / toma el relevo",
    noteEs:
      "Take over significa asumir el control o la responsabilidad que antes tenía otra persona o proceso.",
    tags: ["B1", "phrasal verb", "trabajo"],
  },
  {
    id: "phrase-free-time",
    kind: "phrase",
    promptEn: "free time",
    answerEs: "tiempo libre",
    noteEs:
      "Free aquí significa disponible, no gratis. Es una colocación muy frecuente.",
    tags: ["A1", "tiempo"],
  },
  {
    id: "concept-debugging",
    kind: "concept",
    promptEn: "debugging / rethinking / ongoing development",
    answerEs: "depuración / replanteamiento / desarrollo continuo",
    noteEs:
      "Son las fases imprevistas que convierten un pequeño script en un proyecto que nunca termina.",
    tags: ["tecnología", "programación", "procesos"],
  },
  {
    id: "word-ongoing",
    kind: "word",
    promptEn: "ongoing",
    answerEs: "continuo / en curso",
    noteEs:
      "Ongoing describe algo que sigue desarrollándose y todavía no ha terminado.",
    tags: ["B1", "adjetivo"],
  },
  {
    id: "phrase-no-time-for",
    kind: "phrase",
    promptEn: "no time for the original task anymore",
    answerEs: "ya no queda tiempo para la tarea original",
    noteEs:
      "No time for marca falta de tiempo; anymore, en una negativa, indica que la situación dejó de ser cierta.",
    tags: ["A2", "tiempo", "expresión"],
  },
] as const satisfies readonly LearningCard[];

export type CardId = (typeof CARDS)[number]["id"];

export interface PercentBounds {
  /** Percentage from the image's left edge. */
  x: number;
  /** Percentage from the image's top edge. */
  y: number;
  /** Percentage of the image width. */
  width: number;
  /** Percentage of the image height. */
  height: number;
}

export interface RevealRegion {
  id: string;
  labelEn: string;
  translationEs: string;
  noteEs: string;
  bounds: PercentBounds;
  cardIds: readonly CardId[];
}

export interface ComicSource {
  creator: "Randall Munroe";
  publisher: "xkcd";
  pageUrl: string;
  imageUrl: string;
  licenseName: "Creative Commons Attribution-NonCommercial 2.5 Generic";
  licenseLabel: "CC BY-NC 2.5";
  licenseUrl: "https://creativecommons.org/licenses/by-nc/2.5/";
  attributionText: "xkcd by Randall Munroe · xkcd.com";
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
    altEs: string;
  };
  source: ComicSource;
  titleText: {
    en: string;
    es: string;
    adaptationNoteEs?: string;
  };
  regions: readonly RevealRegion[];
  /** De-duplicated union of all region card IDs; this is the scheduler index. */
  cardIds: readonly CardId[];
}

type ComicSeed = Omit<Comic, "cardIds">;

export const XKCD_LICENSE = {
  creator: "Randall Munroe",
  publisher: "xkcd",
  licenseName: "Creative Commons Attribution-NonCommercial 2.5 Generic",
  licenseLabel: "CC BY-NC 2.5",
  licenseUrl: "https://creativecommons.org/licenses/by-nc/2.5/",
  attributionText: "xkcd by Randall Munroe · xkcd.com",
  attributionRequired: true,
  commercialUseAllowed: false,
} as const;

function defineComic(seed: ComicSeed): Comic {
  return {
    ...seed,
    cardIds: [...new Set(seed.regions.flatMap((region) => region.cardIds))],
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
      src: "/comics/duty-calls.png",
      width: 300,
      height: 330,
      aspectRatio: 300 / 330,
      altEs:
        "Una persona frente al ordenador no va a la cama porque alguien está equivocado en internet.",
    },
    source: {
      ...XKCD_LICENSE,
      pageUrl: "https://xkcd.com/386/",
      imageUrl: "https://imgs.xkcd.com/comics/duty_calls.png",
    },
    titleText: {
      en: "What do you want me to do? LEAVE? Then they'll keep being wrong!",
      es: "¿Qué quieres que haga? ¿QUE ME VAYA? ¡Entonces seguirán estando equivocados!",
    },
    regions: [
      {
        id: "coming-to-bed",
        labelEn: "Are you coming to bed?",
        translationEs: "¿Vienes a la cama?",
        noteEs:
          "Es presente progresivo en inglés, pero el presente simple es la opción natural en español para este plan inmediato.",
        bounds: { x: 9, y: 2, width: 69, height: 11 },
        cardIds: [
          "phrase-come-to-bed",
          "grammar-present-progressive",
        ],
      },
      {
        id: "cant-important",
        labelEn: "I can't. This is important.",
        translationEs: "No puedo. Esto es importante.",
        noteEs:
          "El verbo tras puedo queda implícito: no puedo [ir]. Can't es la contracción de cannot.",
        bounds: { x: 41, y: 13, width: 56, height: 18 },
        cardIds: ["grammar-contractions", "phrase-this-is-important"],
      },
      {
        id: "what",
        labelEn: "What?",
        translationEs: "¿Qué?",
        noteEs:
          "Una pregunta mínima que aquí pide explicación. El qué interrogativo lleva tilde.",
        bounds: { x: 23, y: 27, width: 27, height: 12 },
        cardIds: ["question-what"],
      },
      {
        id: "wrong-on-the-internet",
        labelEn: "Someone is wrong on the internet.",
        translationEs: "Alguien está equivocado en internet.",
        noteEs:
          "La frase y el título convierten una discusión insignificante en un supuesto deber urgente.",
        bounds: { x: 43, y: 34, width: 55, height: 24 },
        cardIds: [
          "phrase-be-wrong",
          "word-someone",
          "concept-duty-calls-irony",
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
      src: "/comics/python.png",
      width: 518,
      height: 588,
      aspectRatio: 518 / 588,
      altEs:
        "Una persona vuela tras aprender Python y explica que programar vuelve a ser divertido; import antigravity es el remate.",
    },
    source: {
      ...XKCD_LICENSE,
      pageUrl: "https://xkcd.com/353/",
      imageUrl: "https://imgs.xkcd.com/comics/python.png",
    },
    titleText: {
      en: "I wrote 20 short programs in Python yesterday. It was wonderful. Perl, I'm leaving you.",
      es: "Ayer escribí 20 programas cortos en Python. Fue maravilloso. Perl, te dejo.",
    },
    regions: [
      {
        id: "youre-flying",
        labelEn: "You're flying! How?",
        translationEs: "¡Estás volando! ¿Cómo?",
        noteEs:
          "You're contrae you are. How pregunta por el modo en que sucede algo extraordinario.",
        bounds: { x: 22, y: 25, width: 20, height: 13 },
        cardIds: [
          "grammar-contractions",
          "grammar-present-progressive",
          "question-how",
        ],
      },
      {
        id: "python-answer",
        labelEn: "Python!",
        translationEs: "¡Python!",
        noteEs:
          "La respuesta absurda presenta el lenguaje de programación como si fuera un superpoder.",
        bounds: { x: 67, y: 11, width: 20, height: 10 },
        cardIds: ["concept-python", "word-program-family"],
      },
      {
        id: "learned-last-night",
        labelEn:
          "I learned it last night! Everything is so simple! Hello world is just print ‘Hello, World!’",
        translationEs:
          "¡Lo aprendí anoche! ¡Todo es muy sencillo! Hola, mundo es simplemente print ‘Hello, World!’.",
        noteEs:
          "Learned marca una acción terminada. Hello, World! es el ejemplo inicial clásico de un lenguaje.",
        bounds: { x: 1, y: 72, width: 29, height: 27 },
        cardIds: [
          "word-learn",
          "grammar-simple-past",
          "word-simple",
          "concept-hello-world",
          "concept-code-instructions",
        ],
      },
      {
        id: "dynamic-typing-join-us",
        labelEn:
          "I dunno… Dynamic typing? Whitespace? Come join us! Programming is fun again! It's a whole new world up here!",
        translationEs:
          "No sé… ¿Tipado dinámico? ¿Espacios en blanco? ¡Únete! ¡Programar vuelve a ser divertido! ¡Aquí arriba hay todo un mundo nuevo!",
        noteEs:
          "El personaje duda de rasgos reales de Python; la respuesta cambia del debate técnico a una invitación entusiasta.",
        bounds: { x: 34, y: 57, width: 28, height: 42 },
        cardIds: [
          "concept-dynamic-typing",
          "concept-significant-whitespace",
          "grammar-imperative",
          "phrase-come-join-us",
          "word-program-family",
          "word-fun",
          "idiom-whole-new-world",
        ],
      },
      {
        id: "import-antigravity",
        labelEn:
          "I just typed ‘import antigravity.’ That's it? …I also sampled everything in the medicine cabinet for comparison.",
        translationEs:
          "Solo escribí ‘import antigravity’. ¿Eso es todo? …También probé todo lo del botiquín, para comparar.",
        noteEs:
          "El módulo antigravity existe como huevo de Pascua; la última frase revela otra posible causa del vuelo.",
        bounds: { x: 65, y: 57, width: 34, height: 42 },
        cardIds: [
          "concept-code-instructions",
          "concept-antigravity-joke",
          "phrase-thats-it",
          "grammar-simple-past",
          "phrase-for-comparison",
        ],
      },
    ],
  },
  {
    id: "compiling",
    xkcdNumber: 303,
    publishedAt: "2007-08-15",
    title: "Compiling",
    titleEs: "Compilando",
    image: {
      src: "/comics/compiling.png",
      width: 413,
      height: 360,
      aspectRatio: 413 / 360,
      altEs:
        "Dos programadores hacen esgrima en sillas de oficina y justifican no trabajar diciendo que el código se está compilando.",
    },
    source: {
      ...XKCD_LICENSE,
      pageUrl: "https://xkcd.com/303/",
      imageUrl: "https://imgs.xkcd.com/comics/compiling.png",
    },
    titleText: {
      en: "‘Are you stealing those LCDs?’ ‘Yeah, but I'm doing it while my code compiles.’",
      es: "—¿Estás robando esas pantallas LCD? —Sí, pero lo hago mientras compila mi código.",
    },
    regions: [
      {
        id: "programmer-excuse",
        labelEn:
          "The #1 programmer excuse for legitimately slacking off: ‘My code's compiling.’",
        translationEs:
          "La excusa número uno de los programadores para escaquearse legítimamente: «Mi código se está compilando».",
        noteEs:
          "Code's significa code is, no posesión. Slacking off es trabajar menos de lo esperado.",
        bounds: { x: 11, y: 4, width: 79, height: 27 },
        cardIds: [
          "word-program-family",
          "idiom-slack-off",
          "grammar-contractions",
          "grammar-present-progressive",
          "word-compile",
          "concept-code-instructions",
        ],
      },
      {
        id: "get-back-to-work",
        labelEn: "Hey! Get back to work!",
        translationEs: "¡Eh! ¡Vuelvan al trabajo!",
        noteEs:
          "Get back to work pide retomar una tarea. El imperativo inglés no muestra si habla a una o varias personas.",
        bounds: { x: 5, y: 35, width: 39, height: 19 },
        cardIds: [
          "phrase-get-back-to-work",
          "grammar-imperative",
          "word-work",
        ],
      },
      {
        id: "compiling-reply",
        labelEn: "Compiling!",
        translationEs: "¡Compilando!",
        noteEs:
          "Una sola palabra basta como excusa porque deja implícito my code is: mi código se está compilando.",
        bounds: { x: 31, y: 55, width: 32, height: 14 },
        cardIds: [
          "word-compile",
          "grammar-present-progressive",
          "concept-code-instructions",
        ],
      },
      {
        id: "carry-on",
        labelEn: "Oh. Carry on.",
        translationEs: "Ah. Continúen.",
        noteEs:
          "Carry on autoriza a seguir. El humor está en que el jefe acepta sin más una excusa técnica.",
        bounds: { x: 4, y: 84, width: 38, height: 13 },
        cardIds: ["phrase-carry-on", "grammar-imperative"],
      },
    ],
  },
  {
    id: "sandwich",
    xkcdNumber: 149,
    publishedAt: "2006-08-28",
    title: "Sandwich",
    titleEs: "Sándwich",
    image: {
      src: "/comics/sandwich.png",
      width: 360,
      height: 299,
      aspectRatio: 360 / 299,
      altEs:
        "Una persona logra que otra le prepare un sándwich al anteponer sudo a la misma orden.",
    },
    source: {
      ...XKCD_LICENSE,
      pageUrl: "https://xkcd.com/149/",
      imageUrl: "https://imgs.xkcd.com/comics/sandwich.png",
    },
    titleText: {
      en: "Proper User Policy apparently means Simon Says.",
      es: "Por lo visto, «política de uso correcto» significa «Simón dice».",
      adaptationNoteEs:
        "La adaptación conserva el juego: sudo funciona como la fórmula «Simón dice», que vuelve obligatoria la orden.",
    },
    regions: [
      {
        id: "make-me-a-sandwich",
        labelEn: "Make me a sandwich.",
        translationEs: "Prepárame un sándwich.",
        noteEs:
          "Make significa preparar cuando hablamos de comida. La forma base crea un imperativo directo.",
        bounds: { x: 6, y: 6, width: 53, height: 15 },
        cardIds: ["verb-make", "grammar-imperative"],
      },
      {
        id: "make-it-yourself",
        labelEn: "What? Make it yourself.",
        translationEs: "¿Qué? Prepáratelo tú.",
        noteEs:
          "Yourself enfatiza que no debe pedírselo a otra persona. El español puede repetir tú para dar ese énfasis.",
        bounds: { x: 61, y: 16, width: 36, height: 25 },
        cardIds: [
          "question-what",
          "verb-make",
          "grammar-reflexive-yourself",
          "grammar-imperative",
        ],
      },
      {
        id: "sudo-make",
        labelEn: "Sudo make me a sandwich.",
        translationEs: "Sudo: prepárame un sándwich.",
        noteEs:
          "Sudo eleva los permisos de un comando. La tira finge que también da autoridad sobre una persona.",
        bounds: { x: 6, y: 32, width: 51, height: 24 },
        cardIds: [
          "concept-sudo",
          "concept-code-instructions",
          "verb-make",
          "grammar-imperative",
        ],
      },
      {
        id: "okay",
        labelEn: "Okay.",
        translationEs: "Vale.",
        noteEs:
          "La aceptación inmediata es el remate: el personaje responde como si sudo le obligara.",
        bounds: { x: 59, y: 44, width: 25, height: 16 },
        cardIds: ["word-okay", "concept-sudo"],
      },
    ],
  },
  {
    id: "exploits-of-a-mom",
    xkcdNumber: 327,
    publishedAt: "2007-10-10",
    title: "Exploits of a Mom",
    titleEs: "Los exploits de una madre",
    image: {
      src: "/comics/exploits-of-a-mom.png",
      width: 666,
      height: 205,
      aspectRatio: 666 / 205,
      altEs:
        "Una madre habla con la escuela después de ponerle a su hijo un nombre que ejecuta una inyección SQL.",
    },
    source: {
      ...XKCD_LICENSE,
      pageUrl: "https://xkcd.com/327/",
      imageUrl: "https://imgs.xkcd.com/comics/exploits_of_a_mom.png",
    },
    titleText: {
      en: "Her daughter is named Help I'm trapped in a driver's license factory.",
      es: "Su hija se llama «Ayuda, estoy atrapada en una fábrica de carnés de conducir».",
    },
    regions: [
      {
        id: "computer-trouble",
        labelEn:
          "Hi, this is your son's school. We're having some computer trouble.",
        translationEs:
          "Hola, llamamos de la escuela de su hijo. Tenemos algunos problemas informáticos.",
        noteEs:
          "This is… es una forma telefónica de identificarse. Have trouble equivale a tener problemas.",
        bounds: { x: 1, y: 2, width: 21, height: 43 },
        cardIds: [
          "grammar-contractions",
          "phrase-computer-trouble",
          "concept-code-instructions",
        ],
      },
      {
        id: "did-he-break-something",
        labelEn: "Oh dear—did he break something? In a way—",
        translationEs: "Ay, Dios… ¿Rompió algo? En cierto modo…",
        noteEs:
          "Did coloca la pregunta en pasado. In a way concede que sí, pero anuncia que la explicación no será literal.",
        bounds: { x: 24, y: 2, width: 21, height: 43 },
        cardIds: [
          "grammar-simple-past",
          "phrase-break-something",
          "idiom-in-a-way",
        ],
      },
      {
        id: "bobby-tables",
        labelEn:
          "Did you really name your son ‘Robert'); DROP TABLE Students;--’? Oh, yes. Little Bobby Tables, we call him.",
        translationEs:
          "¿De verdad llamó a su hijo ‘Robert'); DROP TABLE Students;--’? Sí. Lo llamamos el pequeño Bobby Tablas.",
        noteEs:
          "El nombre cierra una cadena y añade una orden SQL destructiva. Bobby es el apodo de Robert.",
        bounds: { x: 47, y: 2, width: 24, height: 91 },
        cardIds: [
          "verb-name-call",
          "concept-sql-injection",
          "concept-code-instructions",
        ],
      },
      {
        id: "lost-records",
        labelEn:
          "Well, we've lost this year's student records. I hope you're happy.",
        translationEs:
          "Bueno, hemos perdido los expedientes de este año. Espero que esté contenta.",
        noteEs:
          "We've lost usa el perfecto porque la pérdida sigue afectando al presente. Hope introduce un deseo aquí sarcástico.",
        bounds: { x: 75, y: 2, width: 24, height: 42 },
        cardIds: [
          "grammar-contractions",
          "grammar-present-perfect",
          "word-records",
          "phrase-i-hope",
        ],
      },
      {
        id: "sanitize-inputs",
        labelEn:
          "And I hope you've learned to sanitize your database inputs.",
        translationEs:
          "Y yo espero que hayan aprendido a validar las entradas de su base de datos.",
        noteEs:
          "La defensa real no es limpiar texto a mano: se validan datos y se usan consultas parametrizadas.",
        bounds: { x: 79, y: 44, width: 20, height: 49 },
        cardIds: [
          "phrase-i-hope",
          "grammar-contractions",
          "grammar-present-perfect",
          "word-learn",
          "concept-input-sanitization",
          "concept-code-instructions",
        ],
      },
    ],
  },
  {
    id: "automation",
    xkcdNumber: 1319,
    publishedAt: "2014-01-20",
    title: "Automation",
    titleEs: "Automatización",
    image: {
      src: "/comics/automation.png",
      width: 404,
      height: 408,
      aspectRatio: 404 / 408,
      altEs:
        "Dos gráficos contrastan la teoría de automatizar una tarea con la realidad de dedicar cada vez más trabajo a mantener el código.",
    },
    source: {
      ...XKCD_LICENSE,
      pageUrl: "https://xkcd.com/1319/",
      imageUrl: "https://imgs.xkcd.com/comics/automation.png",
    },
    titleText: {
      en: "‘Automating’ comes from the roots ‘auto-’ meaning ‘self-’, and ‘mating’, meaning ‘screwing’.",
      es: "«Automating» viene de auto-, «por sí mismo», y mating, «aparearse»; de ahí que automatizar acabe jodiéndote.",
      adaptationNoteEs:
        "El original divide automating en auto + mating y remata con screwing, que puede significar tanto mantener sexo como fastidiar.",
    },
    regions: [
      {
        id: "spend-time-automating",
        labelEn:
          "I spend a lot of time on this task. I should write a program automating it!",
        translationEs:
          "Dedico mucho tiempo a esta tarea. ¡Debería escribir un programa que la automatice!",
        noteEs:
          "Spend time on es dedicar tiempo a. Should presenta la automatización como una recomendación sensata.",
        bounds: { x: 10, y: 0, width: 82, height: 12 },
        cardIds: [
          "phrase-spend-time-on",
          "grammar-should",
          "word-program-family",
          "concept-automation",
          "concept-code-instructions",
        ],
      },
      {
        id: "theory-writing-code",
        labelEn: "Theory: writing code; work on original task",
        translationEs: "Teoría: escribir código; trabajar en la tarea original",
        noteEs:
          "La inversión inicial en código sube mientras el trabajo manual empieza a bajar.",
        bounds: { x: 12, y: 22, width: 34, height: 28 },
        cardIds: [
          "word-work",
          "concept-code-instructions",
          "concept-automation",
        ],
      },
      {
        id: "automation-takes-over",
        labelEn: "Automation takes over; free time",
        translationEs: "La automatización toma el relevo; tiempo libre",
        noteEs:
          "Take over indica que el sistema asume la tarea. El resultado ideal sería liberar tiempo.",
        bounds: { x: 45, y: 25, width: 51, height: 27 },
        cardIds: [
          "phrase-take-over",
          "phrase-free-time",
          "concept-automation",
        ],
      },
      {
        id: "reality-ongoing-development",
        labelEn:
          "Reality: writing code; debugging; rethinking; ongoing development",
        translationEs:
          "Realidad: escribir código; depurar; replantear; desarrollo continuo",
        noteEs:
          "Ongoing señala que el desarrollo no termina. El gráfico transforma una herramienta pequeña en mantenimiento permanente.",
        bounds: { x: 12, y: 59, width: 84, height: 28 },
        cardIds: [
          "concept-debugging",
          "word-ongoing",
          "concept-code-instructions",
          "word-work",
        ],
      },
      {
        id: "no-time-anymore",
        labelEn: "No time for original task anymore",
        translationEs: "Ya no queda tiempo para la tarea original",
        noteEs:
          "Anymore aparece en una negativa para expresar ya no. Es la inversión irónica de la promesa de ahorrar tiempo.",
        bounds: { x: 72, y: 79, width: 27, height: 15 },
        cardIds: [
          "phrase-no-time-for",
          "word-work",
          "concept-automation",
        ],
      },
    ],
  },
] as const satisfies readonly ComicSeed[];

export const COMICS: readonly Comic[] = COMIC_SEEDS.map(defineComic);

export const CARD_BY_ID: ReadonlyMap<CardId, (typeof CARDS)[number]> = new Map(
  CARDS.map((card) => [card.id, card]),
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

    if (comic.source.pageUrl !== `https://xkcd.com/${comic.xkcdNumber}/`) {
      errors.push(`Unexpected source page for ${comic.id}`);
    }
    if (!comic.source.imageUrl.startsWith("https://imgs.xkcd.com/comics/")) {
      errors.push(`Unexpected source image host for ${comic.id}`);
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

      for (const cardId of region.cardIds) {
        referenced.add(cardId);
        if (!cardIds.has(cardId)) {
          errors.push(
            `Unknown card reference in ${comic.id}/${region.id}: ${cardId}`,
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
    }
  }

  return errors;
}

const validationErrors = validateContent();
if (validationErrors.length > 0) {
  throw new Error(`Invalid seed content:\n${validationErrors.join("\n")}`);
}
