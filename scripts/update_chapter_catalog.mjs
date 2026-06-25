import fs from "node:fs";
import path from "node:path";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const inputCsvPath = "C:\\Chess books\\Organized PDFs\\chapter_catalog.csv";
const outputCsvPath = process.argv[2] || inputCsvPath;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        field += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift();
  return rows.map((values) => {
    const entry = {};
    headers.forEach((header, idx) => {
      entry[header] = values[idx] ?? "";
    });
    return entry;
  });
}

function escapeCsv(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function toCsv(rows, headers) {
  const lines = [headers.map(escapeCsv).join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header] ?? "")).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

function normalizeSentence(text) {
  const cleaned = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function inferTheme(chapter) {
  const text = chapter.toLowerCase();

  if (text.includes("calculation")) return "Improving move-by-move analysis, candidate moves, and accurate variation work.";
  if (text.includes("pattern recognition")) return "Building reusable tactical patterns and faster recognition in practical play.";
  if (text.includes("analysis")) return "Reviewing games to find recurring mistakes and convert them into lessons.";
  if (text.includes("tournament")) return "Using competitive play and game-like conditions to sharpen practical decision-making.";
  if (text.includes("coach") || text.includes("mentor")) return "Using outside feedback, structure, and accountability to improve faster.";
  if (text.includes("opening")) return "Developing sound opening decisions, move-order awareness, and practical repertoire guidance.";
  if (text.includes("endgame")) return "Improving technical endgame knowledge, conversion, and defensive method.";
  if (text.includes("visualization") || text.includes("blindfold")) return "Strengthening board vision and the ability to calculate without moving pieces.";
  if (text.includes("speed chess")) return "Handling rapid and blitz games with better practical judgment and discipline.";
  if (text.includes("books") || text.includes("sites") || text.includes("chessbase") || text.includes("chessable") || text.includes("youtube")) {
    return "Using training tools more effectively instead of studying randomly or passively.";
  }
  if (text.includes("habits") || text.includes("plateaus") || text.includes("practice") || text.includes("mindfulness") || text.includes("routines")) {
    return "Building consistent training habits and a sustainable long-term improvement process.";
  }
  if (text.includes("candidate moves")) return "Generating stronger options before calculating and avoiding first-move bias.";
  if (text.includes("evaluat")) return "Judging positions more accurately before choosing a plan or concrete line.";
  if (text.includes("planning")) return "Turning positional features into clear plans and useful regrouping ideas.";
  if (text.includes("comparison method")) return "Comparing candidate positions systematically instead of relying on vague intuition.";
  if (text.includes("elimination method")) return "Narrowing choices efficiently to focus on the most relevant continuations.";
  if (text.includes("good and bad bishops")) return "Assessing bishop quality from pawn structure and piece activity.";
  if (text.includes("isolated pawn")) return "Playing with and against the isolani using activity, blockades, and structural targets.";
  if (text.includes("hanging pawns")) return "Handling hanging-pawn structures and the plans they create for both sides.";
  if (text.includes("backward pawn")) return "Identifying backward-pawn weaknesses and the right ways to attack or defend them.";
  if (text.includes("doubled pawns")) return "Understanding when doubled pawns are a weakness and when they bring practical benefits.";
  if (text.includes("centre")) return "Controlling the center and using it to support development, space, and active play.";
  if (text.includes("exchanging")) return "Choosing exchanges that improve your structure, activity, or long-term plan.";
  if (text.includes("improving the position of your pieces")) return "Upgrading badly placed pieces before forcing matters tactically.";
  if (text.includes("blockade")) return "Stopping passed pawns or restricting enemy activity through key-square control.";
  if (text.includes("zugzwang")) return "Using waiting moves and opposition ideas to force concessions.";
  if (text.includes("pawn endings")) return "Handling king-and-pawn endings with precise calculation and key-square technique.";
  if (text.includes("bishop endings")) return "Playing bishop endgames with color-complex awareness and tempo accuracy.";
  if (text.includes("rook against bishop")) return "Handling imbalanced endgames with active king and rook technique.";
  if (text.includes("rook against knight")) return "Managing material imbalances where activity and king position matter more than count alone.";
  if (text.includes("double attack")) return "Spotting and creating double attacks that win material or seize the initiative.";
  if (text.includes("pin")) return "Using pins and discovered attacks to restrict movement and create tactical targets.";
  if (text.includes("deflection")) return "Dragging defenders away from vital duties so tactical goals become possible.";
  if (text.includes("decoy")) return "Luring enemy pieces onto harmful squares to unlock a tactic or mating net.";
  if (text.includes("mating combinations")) return "Recognising mating patterns and calculating forcing attacks against the king.";
  if (text.includes("greek gift")) return "Judging when the classic bishop sacrifice works and how to follow it up.";
  if (text.includes("destroying the castled position")) return "Opening files and darkening king shelter to launch direct attacks.";
  if (text.includes("back rank")) return "Exploiting weak back-rank coordination with heavy-piece tactics.";
  if (text.includes("promotion")) return "Using promotion threats and underpromotion ideas in tactical and endgame settings.";
  if (text.includes("simple tactics")) return "Sharpening core tactical patterns that should become automatic in play.";
  if (text.includes("drawing combinations")) return "Finding perpetual checks, stalemates, and tactical resources in worse positions.";
  if (text.includes("french defence")) return "Understanding typical plans and structures arising from the French Defence.";
  if (text.includes("opening repertoire")) return "Learning practical repertoire choices and the structures they lead to.";
  if (text.includes("study")) return "Using composed positions to deepen calculation, imagination, and technical precision.";
  if (text.includes("combination")) return "Learning a recurring tactical motif and the positions where it becomes decisive.";
  if (text.includes("dynamic and static positions")) return "Distinguishing dynamic from static positions before deciding how concrete the calculation must be.";
  if (text.includes("forcing moves")) return "Prioritising checks, captures, and threats to calculate more efficiently.";
  if (text.includes("common mistakes")) return "Diagnosing recurring calculation errors that distort candidate-move selection and evaluation.";
  return normalizeSentence(chapter);
}

function inferWeakness(chapter, theme) {
  const text = `${chapter} ${theme}`.toLowerCase();

  if (text.includes("mate") || text.includes("attack") || text.includes("castled") || text.includes("king")) {
    return "Missed attacking chances, weak king-safety awareness, and slow conversion of forcing positions.";
  }
  if (text.includes("opening repertoire") || text.includes("opening principles") || text.includes("french defence") || text.includes("against 1.e4") || text.includes("with 1.d4") || text.includes("time in the opening")) {
    return "Directionless opening play, early inaccuracies, and poor repertoire discipline.";
  }
  if (text.includes("endgame") || text.includes("pawn endings") || text.includes("bishop endings") || text.includes("rook against") || text.includes("zugzwang")) {
    return "Late-game technique errors, weak conversion, and imprecise defensive play.";
  }
  if (text.includes("pin") || text.includes("double attack") || text.includes("deflection") || text.includes("decoy") || text.includes("combination") || text.includes("promotion") || text.includes("back rank") || text.includes("discovered")) {
    return "Missed tactical motifs, shallow calculation, and failure to notice forcing moves in time.";
  }
  if (text.includes("candidate moves") || text.includes("evaluat") || text.includes("planning") || text.includes("comparison method") || text.includes("analytical process") || text.includes("priorities when calculating")) {
    return "Poor decision-making, impulsive move choice, and weak candidate-move discipline.";
  }
  if (text.includes("bishop") || text.includes("isolated pawn") || text.includes("hanging pawns") || text.includes("backward pawn") || text.includes("doubled pawns") || text.includes("centre") || text.includes("exchanging") || text.includes("improving the position")) {
    return "Misjudging pawn structures, poor piece placement, and vague positional planning.";
  }
  if (text.includes("tournament") || text.includes("analysis") || text.includes("coach") || text.includes("habit") || text.includes("plateau") || text.includes("practice") || text.includes("mindfulness") || text.includes("books") || text.includes("sites") || text.includes("chessbase") || text.includes("chessable") || text.includes("youtube")) {
    return "Unstructured training, inconsistent study habits, and slow long-term improvement.";
  }
  if (text.includes("visualization") || text.includes("blindfold")) {
    return "Board-vision lapses, calculation drift, and difficulty holding positions in mind.";
  }
  if (text.includes("speed chess")) {
    return "Rushed decisions, sloppy practical habits, and poor time-use under faster controls.";
  }
  return "General strategic confusion and inconsistent practical decision-making.";
}

function cleanTitleFromFilename(filename) {
  const noExt = filename.replace(/\.pdf$/i, "");
  const noPrefix = noExt.replace(/^[0-9]+[-_ ]*/, "");
  const cleaned = noPrefix
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\- ]+/, "")
    .trim();
  if (cleaned.length >= 4) return cleaned;
  return noExt.replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

function inferLevelFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes("kids") || lower.includes("beginner") || lower.includes("step1") || lower.includes("step 1")) return "U1400";
  if (lower.includes("mastery") || lower.includes("grandmaster") || lower.includes("dvoretsky") || lower.includes("advanced") || lower.includes("master+")) return "1800-2199";
  if (lower.includes("intermediate") || lower.includes("beyond the basics") || lower.includes("strategy") || lower.includes("positional") || lower.includes("calculation")) return "1400-1799";
  return "All Ratings";
}

function inferSkillFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes("endgame") || lower.includes("endings")) return "Endgame Technique and Theory";
  if (lower.includes("tactic") || lower.includes("combination") || lower.includes("mate")) return "Tactics Training";
  if (lower.includes("calculation") || lower.includes("think-like") || lower.includes("think like")) return "Calculation and Thinking Process";
  if (lower.includes("strategy") || lower.includes("positional") || lower.includes("pawn structure")) return "Positional Strategy and Middlegame Planning";
  if (lower.includes("opening")) return "Opening Understanding";
  if (lower.includes("move-by-move") || lower.includes("move by move") || lower.includes("games")) return "Annotated Games and Thought Process";
  if (lower.includes("course") || lower.includes("training") || lower.includes("school")) return "Structured Chess Training";
  return "General Chess Improvement";
}

function inferAuthorFromTitle(title) {
  const patterns = [
    ["John Nunn", "John Nunn"],
    ["Silman", "Jeremy Silman"],
    ["Dvoretsky", "Mark Dvoretsky"],
    ["Ramesh", "R. B. Ramesh"],
    ["Johnson", "Ben Johnson"],
    ["Kotov", "Alexander Kotov"],
    ["Yusupov", "Artur Yusupov"],
    ["Chernev", "Irving Chernev"],
    ["Doknjas", "John Doknjas and Victoria Doknjas"],
    ["Shereshevsky", "Mikhail Shereshevsky"],
    ["Franco", "Zenon Franco"],
    ["Aagaard", "Jacob Aagaard"],
    ["Pachman", "Ludek Pachman"],
    ["Reshevsky", "Samuel Reshevsky"],
    ["Hansen", "Carsten Hansen"],
    ["Berliner", "Hans Berliner"],
    ["Ipatov", "Alexander Ipatov"],
    ["Arkell", "Keith Arkell"],
    ["Arizmendi", "Julen Arizmendi"],
    ["Golombek", "Harry Golombek"],
    ["Lasker", "Edward Lasker"],
    ["Tarrasch", "Siegbert Tarrasch"],
    ["Capablanca", "Jose Raul Capablanca"],
    ["Steinitz", "Wilhelm Steinitz"],
    ["Gobet", "Fernand Gobet"],
    ["Psakhis", "Lev Psakhis"],
    ["Hawkins", "Jonathan Hawkins"],
    ["Grivas", "Efstratios Grivas"],
    ["Mikhalchishin", "Adrian Mikhalchishin and Tadej Sakelsek"],
  ];
  for (const [needle, author] of patterns) {
    if (title.toLowerCase().includes(needle.toLowerCase())) return author;
  }
  return "Unknown";
}

function inferBookTheme(title, skill) {
  const lower = title.toLowerCase();
  if (lower.includes("endgame")) return "A practical endgame book focused on technique, theoretical essentials, and conversion.";
  if (lower.includes("tactic") || lower.includes("combination") || lower.includes("mate")) return "A tactics-focused training book built around pattern recognition, calculation, and forcing play.";
  if (lower.includes("calculation") || lower.includes("think like")) return "A training book aimed at strengthening calculation, candidate moves, and disciplined analysis.";
  if (lower.includes("strategy") || lower.includes("positional") || lower.includes("pawn structure") || lower.includes("system")) return "A strategic manual that connects structural features, piece activity, and long-term planning.";
  if (lower.includes("course") || lower.includes("training") || lower.includes("school")) return "A structured improvement course blending multiple chess skills into a guided training path.";
  if (lower.includes("move by move") || lower.includes("games")) return "An annotated game collection designed to explain plans, tactical moments, and practical decision-making.";
  return `A ${skill.toLowerCase()} book intended to improve practical understanding and decision-making.`;
}

function shouldSkipPdf(pdfPath) {
  const base = path.basename(pdfPath);
  if (base.startsWith("._")) return true;
  if (/tables\.pdf$/i.test(base)) return true;
  if (/phamlet/i.test(base)) return true;
  if (/earth is not a spinning ball/i.test(base)) return true;
  if (/Auh_to_belgrade/i.test(base)) return true;
  if (/d45c21bd-/i.test(base)) return true;
  return false;
}

function isUsefulOutlineTitle(title) {
  if (!title) return false;
  const text = title.trim();
  if (!text) return false;
  if (/^(img|image|scan)[ _-]?\d+/i.test(text)) return false;
  if (/^cover\d*$/i.test(text)) return false;
  if (/^blank page$/i.test(text)) return false;
  if (/^contents?$/i.test(text)) return false;
  if (/^key to symbols/i.test(text)) return false;
  if (/^preface$/i.test(text)) return false;
  if (/^introduction$/i.test(text)) return false;
  if (/^index/i.test(text)) return false;
  if (/^bibliography$/i.test(text)) return false;
  if (/^acknowledgements?$/i.test(text)) return false;
  if (/^copyright page$/i.test(text)) return false;
  return true;
}

async function extractUsableOutline(pdfPath) {
  try {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const outline = await doc.getOutline();
    if (!outline || !outline.length) return [];

    const titles = [];
    const walk = (items) => {
      for (const item of items) {
        const title = String(item.title || "").replace(/\s+/g, " ").trim();
        if (isUsefulOutlineTitle(title)) titles.push(title);
        if (item.items?.length) walk(item.items);
      }
    };
    walk(outline);

    const filtered = titles.filter((title) => {
      return /chapter|part|lesson|section|opening|endgame|tactic|strategy|game|attack|defence|defense|pawn|bishop|rook|knight|queen|king|combination|calculation|training|principle|principles|repertoire|method|course|school|study/i.test(title);
    });

    const unique = [...new Set(filtered)];
    if (unique.length >= 2 && unique.length <= 80) return unique;
    return [];
  } catch {
    return [];
  }
}

function makeRow(book, chapterName, chapterTheme) {
  return {
    title: book.title,
    author: book.author,
    level: book.level,
    rating_band: book.level,
    skill: book.skill,
    book_theme: book.bookTheme,
    chapter: chapterName,
    chapter_theme: normalizeSentence(chapterTheme),
    what_this_chapter_teaches: normalizeSentence(chapterTheme),
    what_weakness_it_solves: inferWeakness(chapterName, chapterTheme),
    folder_path: book.folderPath,
    relative_path: book.relativePath,
    file_path: book.filePath,
  };
}

const newBooks = [
  {
    title: "Encyclopedia of Chess Combinations, Fifth Edition",
    author: "Chess Informant",
    level: "All Ratings",
    skill: "Tactics Reference and Combination Motifs",
    bookTheme: "A motif-indexed reference of tactical combinations organized by recurring combination types.",
    folderPath: "C:\\Chess books\\New books\\Books",
    relativePath: "New books\\Books\\5th edition encyclopedia of combination.pdf",
    filePath: "C:\\Chess books\\New books\\Books\\5th edition encyclopedia of combination.pdf",
    chapters: [
      ["Elimination of Defence", "Removing a key defender so the tactical point behind it collapses."],
      ["Blockade", "Restricting key pawns or pieces so tactical gains become possible."],
      ["Clearance of Line or Square", "Freeing a line or square for a decisive attacking or tactical idea."],
      ["Deflection", "Dragging a defending piece away from an important duty."],
      ["Discovered Attack", "Revealing an attack by moving one piece out of the way."],
      ["Pin", "Immobilising a piece because moving it would lose something more important."],
      ["Destruction of Pawn Structure", "Shattering the pawn cover or structure to expose tactical targets."],
      ["Decoy", "Luring a piece to an unfavorable square where a tactic lands."],
      ["Interference", "Cutting the coordination between defending pieces or lines."],
      ["Double Attack", "Creating two threats at once so one cannot be met."],
    ],
  },
  {
    title: "Improve Your Chess Calculation",
    author: "R. B. Ramesh",
    level: "1400-1799",
    skill: "Calculation and Thinking Process",
    bookTheme: "A calculation manual focused on structured analysis, forcing moves, and common practical errors.",
    folderPath: "C:\\Chess books\\New books\\Books",
    relativePath: "New books\\Books\\Improve Your Chess Calculation  - R B Ramesh.pdf",
    filePath: "C:\\Chess books\\New books\\Books\\Improve Your Chess Calculation  - R B Ramesh.pdf",
    chapters: [
      ["Dynamic and static positions", inferTheme("Dynamic and static positions")],
      ["Calculation training with students", "Practical training examples that model how stronger calculation habits are built and corrected."],
      ["The analytical process", inferTheme("The analytical process")],
      ["Forcing moves", inferTheme("Forcing moves")],
      ["Common mistakes chess players make while calculating variations", inferTheme("Common mistakes chess players make while calculating variations")],
      ["Improving calculation through solving studies", inferTheme("Improving calculation through solving studies")],
      ["Chess improvement suggestions from a coach", "Turning coaching advice into a repeatable training process for stronger calculation and decision-making."],
    ],
  },
  {
    title: "Perpetual Chess Improvement",
    author: "Ben Johnson",
    level: "All Ratings",
    skill: "Training and Improvement Process",
    bookTheme: "A practical guide to improvement habits, study structure, and the tools serious amateurs can use well.",
    folderPath: "C:\\Chess books\\New books\\Books",
    relativePath: "New books\\Books\\Johnson - Perpetual Chess Improvement (2023).pdf",
    filePath: "C:\\Chess books\\New books\\Books\\Johnson - Perpetual Chess Improvement (2023).pdf",
    chapters: [
      ["Tournament games and their substitutes", inferTheme("Tournament games and their substitutes")],
      ["Game analysis", inferTheme("Game analysis")],
      ["Calculation and pattern recognition", inferTheme("Calculation and pattern recognition")],
      ["Coaches, chess friends and mentors", inferTheme("Coaches, chess friends and mentors")],
      ["Do amateurs overemphasize opening study?", inferTheme("Do amateurs overemphasize opening study?")],
      ["Must you know endgames?", inferTheme("Must you know endgames?")],
      ["Mimicking the masters", "Learning by copying strong model games, plans, and habits from stronger players."],
      ["Board visualization and blindfold chess", inferTheme("Board visualization and blindfold chess")],
      ["How to approach speed chess", inferTheme("How to approach speed chess")],
      ["Tactics redux", "Refreshing tactical training with better methods for retention, repetition, and practical transfer."],
      ["Status and titles", "Understanding ratings, titles, and how to keep improvement goals aligned with reality."],
      ["Chess checklists", "Using checklists to reduce missed threats, impulsive play, and avoidable oversight."],
      ["Habits and identity", inferTheme("Habits and identity")],
      ["Plateaus", inferTheme("Plateaus")],
      ["Deliberate practice and chess study", inferTheme("Deliberate practice and chess study")],
      ["Over-the-board tournament routines", "Building pre-game, in-game, and post-game routines that support steadier practical performance."],
      ["Playing against children", "Adjusting expectations and practical decisions against underrated and tactically alert juniors."],
      ["Rest, fitness and mindfulness", inferTheme("Rest, fitness and mindfulness")],
      ["Chess books", inferTheme("Chess books")],
      ["How to use the chess sites", inferTheme("How to use the chess sites")],
      ["Chessbase and Lichess studies", inferTheme("Chessbase and Lichess studies")],
      ["Extracting lessons from Stockfish and Leela", "Using engine feedback to learn ideas rather than passively copying lines."],
      ["Optimizing Chessable", inferTheme("Optimizing Chessable")],
      ["Chess YouTube", inferTheme("Chess YouTube")],
      ["Quantity vs quality", "Balancing volume of study with depth so training remains both efficient and sustainable."],
      ["Parting advice and reminders", "Collecting the practical reminders that keep improvement grounded in good habits."],
      ["Games", "Using illustrative games as models for training themes and practical decision-making."],
    ],
  },
  {
    title: "Build Up Your Chess 2 - Beyond the Basics",
    author: "Artur Yusupov",
    level: "1400-1799",
    skill: "Structured Chess Training",
    bookTheme: "A step-by-step training course mixing tactics, strategy, endgames, calculation, and opening understanding.",
    folderPath: "C:\\Chess books\\New books\\Books",
    relativePath: "New books\\Books\\Yusupov, Artur - Build Up Your Chess 2 - Beyond the Basics.pdf",
    filePath: "C:\\Chess books\\New books\\Books\\Yusupov, Artur - Build Up Your Chess 2 - Beyond the Basics.pdf",
    chapters: [
      ["Mating combinations", inferTheme("Mating combinations")],
      ["General endgame principles", inferTheme("General endgame principles")],
      ["Combinations involving the back rank", inferTheme("Combinations involving the back rank")],
      ["General opening principles", inferTheme("General opening principles")],
      ["The double attack", inferTheme("The double attack")],
      ["Good and bad bishops", inferTheme("Good and bad bishops")],
      ["Candidate moves", inferTheme("Candidate moves")],
      ["The centre", inferTheme("The centre")],
      ["The pin and the discovered attack", inferTheme("The pin and the discovered attack")],
      ["Zugzwang", inferTheme("Zugzwang")],
      ["Deflection", inferTheme("Deflection")],
      ["The Greek gift sacrifice", inferTheme("The Greek gift sacrifice")],
      ["Evaluating the position", inferTheme("Evaluating the position")],
      ["Planning in chess", inferTheme("Planning in chess")],
      ["An opening repertoire for White after 1.e4 e5", inferTheme("An opening repertoire for White after 1.e4 e5")],
      ["Destroying the castled position", inferTheme("Destroying the castled position")],
      ["An opening repertoire against 1.e4", inferTheme("An opening repertoire against 1.e4")],
      ["Exchanging", inferTheme("Exchanging")],
      ["Priorities when calculating variations", inferTheme("Priorities when calculating variations")],
      ["Pawn endings 1", inferTheme("Pawn endings 1")],
      ["Decoying", inferTheme("Decoying")],
      ["Time in the opening", inferTheme("Time in the opening")],
      ["Improving the position of your pieces", inferTheme("Improving the position of your pieces")],
      ["Pawn endings 2", inferTheme("Pawn endings 2")],
    ],
  },
  {
    title: "Build Up Your Chess 3 - Mastery",
    author: "Artur Yusupov",
    level: "1800-2199",
    skill: "Structured Chess Training",
    bookTheme: "A higher-level training course blending advanced tactics, positional themes, endgames, and decision methods.",
    folderPath: "C:\\Chess books\\New books\\Books",
    relativePath: "New books\\Books\\Yusupov, Artur - Build Up Your Chess 3 - Mastery.pdf",
    filePath: "C:\\Chess books\\New books\\Books\\Yusupov, Artur - Build Up Your Chess 3 - Mastery.pdf",
    chapters: [
      ["Combinations involving promotion", inferTheme("Combinations involving promotion")],
      ["Evaluation of the position", inferTheme("Evaluation of the position")],
      ["Pawn endings", inferTheme("Pawn endings")],
      ["Rook against bishop", inferTheme("Rook against bishop")],
      ["Opening repertoire for White with 1.d4", inferTheme("Opening repertoire for White with 1.d4")],
      ["The isolated pawn", inferTheme("The isolated pawn")],
      ["Playing against the isolated pawn", inferTheme("Playing against the isolated pawn")],
      ["Simple tactics", inferTheme("Simple tactics")],
      ["The backward pawn", inferTheme("The backward pawn")],
      ["Bishop endings", inferTheme("Bishop endings")],
      ["French Defence", inferTheme("French Defence")],
      ["Training with studies", inferTheme("Training with studies")],
      ["Blockade", inferTheme("Blockade")],
      ["Drawing combinations", inferTheme("Drawing combinations")],
      ["Opposite-coloured bishops", "Handling opposite-coloured bishop positions in both drawing and attacking contexts."],
      ["Opening repertoire for White with 1.d4 (Part 2)", inferTheme("Opening repertoire for White with 1.d4 (Part 2)")],
      ["The elimination method", inferTheme("The elimination method")],
      ["Hanging pawns", inferTheme("Hanging pawns")],
      ["Playing against hanging pawns", inferTheme("Playing against hanging pawns")],
      ["Simple tactics 2", inferTheme("Simple tactics 2")],
      ["Doubled pawns", inferTheme("Doubled pawns")],
      ["Opening repertoire for Black against 1.d4", inferTheme("Opening repertoire for Black against 1.d4")],
      ["The comparison method", inferTheme("The comparison method")],
      ["Rook against knight", inferTheme("Rook against knight")],
    ],
  },
];

const fallbackBooks = [
  {
    filename: "1001.pdf",
    title: "1001",
    author: "Unknown",
    level: "All Ratings",
    skill: "Tactics Training",
    bookTheme: "A puzzle-based training book intended to build tactical alertness through volume practice.",
    overview: "Large-scale tactics practice with short exercises, repeated pattern exposure, and practical motif recognition.",
  },
  {
    filename: "700.pdf",
    title: "700",
    author: "Unknown",
    level: "All Ratings",
    skill: "Chess Training",
    bookTheme: "A general chess training collection that needs deeper chapter extraction from the scan before fine cataloging.",
    overview: "Broad improvement material likely centered on practical training, model positions, and pattern work.",
  },
  {
    filename: "Dvoretsky_s Endgame Manual - Dvoretsky.pdf",
    title: "Dvoretsky's Endgame Manual",
    author: "Mark Dvoretsky",
    level: "1800-2199",
    skill: "Endgame Technique and Theory",
    bookTheme: "An advanced endgame manual focused on technical accuracy, theoretical essentials, and practical conversion.",
    overview: "Deep endgame study covering theoretical positions, practical technique, and the decision-making needed to convert or save difficult endings.",
  },
  {
    filename: "How to Reassess Your Chess-Silman.pdf",
    title: "How to Reassess Your Chess",
    author: "Jeremy Silman",
    level: "1400-1799",
    skill: "Positional Evaluation and Planning",
    bookTheme: "A structured guide to imbalances, positional evaluation, and plan selection.",
    overview: "Teaching players to evaluate imbalances, choose plans from structural clues, and replace vague play with purposeful decisions.",
  },
  {
    filename: "Kotov-Alexander-Think-Like-a-Grandmaster-pdf.pdf",
    title: "Think Like a Grandmaster",
    author: "Alexander Kotov",
    level: "1800-2199",
    skill: "Calculation and Thinking Process",
    bookTheme: "A classic training book on candidate moves, analysis trees, and disciplined calculation.",
    overview: "Improving calculation method, candidate-move selection, and disciplined thinking during critical moments.",
  },
  {
    filename: "Mate in 1 &2 Puzzles.pdf",
    title: "Mate in 1 & 2 Puzzles",
    author: "Unknown",
    level: "U1400",
    skill: "Basic Mating Patterns",
    bookTheme: "Short mating puzzles for pattern recognition and immediate tactical awareness.",
    overview: "Fast pattern training for mate threats, mating nets, and direct forcing play.",
  },
  {
    filename: "Mating_The_Castled_King.pdf",
    title: "Mating the Castled King",
    author: "Unknown",
    level: "1400-1799",
    skill: "Kingside Attack Patterns",
    bookTheme: "Typical attacking patterns against castled kings, especially around weakened pawn shields.",
    overview: "Recognising attacking setups, sacrifices, and piece coordination against the castled king.",
  },
  {
    filename: "Middle-Game-Combination-Strategy.pdf",
    title: "Middle-Game Combination Strategy",
    author: "Unknown",
    level: "1400-1799",
    skill: "Middlegame Tactics and Strategy",
    bookTheme: "A middlegame training book combining strategic buildup with tactical execution.",
    overview: "Linking positional advantages to tactical combinations and practical middlegame conversion.",
  },
  {
    filename: "MySystem-excerpt.pdf",
    title: "My System (Excerpt)",
    author: "Aron Nimzowitsch",
    level: "1400-1799",
    skill: "Positional Strategy Foundations",
    bookTheme: "Foundational strategic principles such as prophylaxis, blockade, restraint, and central control.",
    overview: "Core positional ideas that help players understand restraint, prophylaxis, pawn structures, and long-term planning.",
  },
  {
    filename: "Silman-s-Complete-Endgame-Course-2008-pdf.pdf",
    title: "Silman's Complete Endgame Course",
    author: "Jeremy Silman",
    level: "All Ratings",
    skill: "Endgame Training by Rating Level",
    bookTheme: "A rating-based endgame course designed to teach only the endings most relevant at each stage of improvement.",
    overview: "Practical endgame training organized by level so players learn the most useful material without overload.",
  },
  {
    filename: "Step1 Workbook Complete.pdf",
    title: "Step 1 Workbook",
    author: "Brunia, van Wijgerden, and others",
    level: "U1400",
    skill: "Beginner Tactics and Board Vision",
    bookTheme: "Workbook-based beginner training focused on elementary tactics, notation, and visual awareness.",
    overview: "Building basic tactical patterns, board vision, and disciplined move recognition for new players.",
  },
  {
    filename: "Step2 Workbook Complete.pdf",
    title: "Step 2 Workbook",
    author: "Brunia, van Wijgerden, and others",
    level: "U1400",
    skill: "Early Improver Tactics and Calculation",
    bookTheme: "A second-stage workbook that extends elementary tactics into slightly deeper combinations and practical exercises.",
    overview: "Strengthening calculation, tactical pattern retention, and practical accuracy beyond absolute beginner level.",
  },
  {
    filename: "The Chess Course - A Curriculum (Second Edition, 2016).pdf",
    title: "The Chess Course - A Curriculum",
    author: "Unknown",
    level: "All Ratings",
    skill: "Structured Curriculum and Coaching",
    bookTheme: "A curriculum-style guide for planning training progress across key chess topics.",
    overview: "Organising improvement into a teachable curriculum covering fundamentals, tactics, strategy, and training progression.",
  },
  {
    filename: "The Woodpecker Method (Smith, Tikkanen).pdf",
    title: "The Woodpecker Method",
    author: "Axel Smith and Hans Tikkanen",
    level: "1400-1799",
    skill: "Tactical Pattern Repetition",
    bookTheme: "A repeated-cycle tactics method designed to make common motifs automatic under practical conditions.",
    overview: "Using spaced repetition and high-volume tactical review to increase speed, confidence, and motif recall.",
  },
  {
    filename: "Training_Program_for_Chess_Players 1400−1800.pdf",
    title: "Training Program for Chess Players 1400-1800",
    author: "Unknown",
    level: "1400-1799",
    skill: "Structured Improvement Program",
    bookTheme: "A rating-targeted training program for intermediate players balancing tactics, strategy, and endgames.",
    overview: "Improvement guidance for club players who need structure, balanced study, and practical training priorities.",
  },
  {
    filename: "Training_Program_for_Chess_Players 1600−2000.pdf",
    title: "Training Program for Chess Players 1600-2000",
    author: "Unknown",
    level: "1800-2199",
    skill: "Structured Improvement Program",
    bookTheme: "A higher-level training program focused on strengthening calculation, positional judgment, and practical play.",
    overview: "More advanced training aimed at sharpening decision-making, calculation depth, and strategic understanding.",
  },
  {
    filename: "Training_program_for_juniors.pdf",
    title: "Training Program for Juniors",
    author: "Unknown",
    level: "U1400",
    skill: "Junior Improvement Program",
    bookTheme: "A youth-focused training program combining tactical habits, core technique, and practical study structure.",
    overview: "A junior-friendly improvement roadmap covering basic tactical awareness, endgames, and training discipline.",
  },
  {
    filename: "Understanding-chess-move-by-movepdf.pdf",
    title: "Understanding Chess Move by Move",
    author: "John Nunn",
    level: "1400-1799",
    skill: "Annotated Games and Thought Process",
    bookTheme: "Deeply explained games that train move-by-move reasoning and practical understanding.",
    overview: "Learning how strong players justify moves, combine plans with tactics, and explain transitions clearly.",
  },
  {
    filename: "Yusupov, Artur - Boost Your Chess 1 - The Fundamentals.pdf",
    title: "Boost Your Chess 1 - The Fundamentals",
    author: "Artur Yusupov",
    level: "U1400",
    skill: "Structured Chess Training",
    bookTheme: "A fundamentals course covering tactics, endgames, strategic ideas, and thinking habits.",
    overview: "A foundational training course that aims to raise all parts of a player's game in a balanced way.",
  },
  {
    filename: "Yusupov, Artur - Boost Your Chess 2 - Beyond the Basics.pdf",
    title: "Boost Your Chess 2 - Beyond the Basics",
    author: "Artur Yusupov",
    level: "1400-1799",
    skill: "Structured Chess Training",
    bookTheme: "A second-step training course for improving players that mixes tactics, planning, and technical play.",
    overview: "Balanced training for club players who need stronger calculation, strategic understanding, and technical reliability.",
  },
  {
    filename: "Yusupov, Artur - Boost Your Chess 3 - Mastery.pdf",
    title: "Boost Your Chess 3 - Mastery",
    author: "Artur Yusupov",
    level: "1800-2199",
    skill: "Structured Chess Training",
    bookTheme: "An advanced training course for stronger club players moving toward mastery-level habits.",
    overview: "Advanced mixed training focused on deeper calculation, richer positional understanding, and technical precision.",
  },
  {
    filename: "Yusupov, Artur - Build Up Your Chess 1 - The Fundamentals.pdf",
    title: "Build Up Your Chess 1 - The Fundamentals",
    author: "Artur Yusupov",
    level: "U1400",
    skill: "Structured Chess Training",
    bookTheme: "A fundamentals course covering tactical motifs, planning basics, and endgame essentials.",
    overview: "A broad first-step training book designed to fix common beginner and early club-player weaknesses.",
  },
  {
    filename: "Yusupov, Artur - Chess Evolution 1 - The Fundamentals (1).pdf",
    title: "Chess Evolution 1 - The Fundamentals",
    author: "Artur Yusupov",
    level: "U1400",
    skill: "Structured Chess Training",
    bookTheme: "A fundamentals-oriented training course that combines tactical, strategic, and technical exercises.",
    overview: "A foundational workbook-style course for improving calculation, technique, and overall practical understanding.",
  },
];

const existingRows = parseCsv(fs.readFileSync(inputCsvPath, "utf8"));

for (const row of existingRows) {
  row.chapter_theme = normalizeSentence(row.chapter_theme);
  row.what_this_chapter_teaches = normalizeSentence(row.what_this_chapter_teaches || row.chapter_theme || inferTheme(row.chapter));
  row.what_weakness_it_solves = normalizeSentence(row.what_weakness_it_solves || inferWeakness(row.chapter, row.chapter_theme));
}

const filteredRows = existingRows.filter((row) => {
  return !String(row.relative_path || "").startsWith("New books\\Books\\");
});

const appendedRows = [];
for (const book of newBooks) {
  for (const [chapterName, chapterTheme] of book.chapters) {
    appendedRows.push(makeRow(book, chapterName, chapterTheme));
  }
}

const finalRows = [...filteredRows, ...appendedRows];

for (const book of fallbackBooks) {
  const folderPath = "C:\\Chess books\\New books\\Books";
  const relativePath = `New books\\Books\\${book.filename}`;
  const filePath = path.join(folderPath, book.filename);
  finalRows.push(
    makeRow(
      {
        title: book.title,
        author: book.author,
        level: book.level,
        skill: book.skill,
        bookTheme: book.bookTheme,
        folderPath,
        relativePath,
        filePath,
      },
      "Whole Book Overview",
      book.overview,
    ),
  );
}

const knownPaths = new Set(finalRows.map((row) => row.file_path));
const allPdfPaths = [];

function collectPdfPaths(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if ([".git", ".codex", ".agents", "__pycache__", "node_modules"].includes(entry.name)) continue;
      collectPdfPaths(fullPath);
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf")) {
      allPdfPaths.push(fullPath);
    }
  }
}

collectPdfPaths("C:\\Chess books");

for (const pdfPath of allPdfPaths) {
  if (knownPaths.has(pdfPath) || shouldSkipPdf(pdfPath)) continue;

  const filename = path.basename(pdfPath);
  const title = cleanTitleFromFilename(filename);
  const level = inferLevelFromText(pdfPath);
  const skill = inferSkillFromText(pdfPath);
  const author = inferAuthorFromTitle(title);
  const bookTheme = inferBookTheme(title, skill);
  const relativePath = path.relative("C:\\Chess books", pdfPath);
  const folderPath = path.dirname(pdfPath);

  const book = {
    title,
    author,
    level,
    skill,
    bookTheme,
    folderPath,
    relativePath,
    filePath: pdfPath,
  };

  const outlineTitles = await extractUsableOutline(pdfPath);
  if (outlineTitles.length) {
    for (const outlineTitle of outlineTitles) {
      finalRows.push(makeRow(book, outlineTitle, inferTheme(outlineTitle)));
    }
  } else {
    finalRows.push(makeRow(book, "Whole Book Overview", bookTheme));
  }
}

const headers = [
  "title",
  "author",
  "level",
  "rating_band",
  "skill",
  "book_theme",
  "chapter",
  "chapter_theme",
  "what_this_chapter_teaches",
  "what_weakness_it_solves",
  "folder_path",
  "relative_path",
  "file_path",
];

fs.writeFileSync(outputCsvPath, toCsv(finalRows, headers), "utf8");
console.log(`Updated ${path.basename(outputCsvPath)} with ${appendedRows.length + fallbackBooks.length} new rows.`);
