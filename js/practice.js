const notationRoot = document.getElementById("notation-root");
const answersRow = document.getElementById("answers-row");
const feedbackRow = document.getElementById("feedback-row");
const gameStatusEl = document.getElementById("game-status");
const notationElBtn = document.getElementById("notation-el");
const notationEnBtn = document.getElementById("notation-en");

const NOTE_COUNT = 10;
const NOTE_OPTIONS_BY_CLEF = {
  treble: [
    "f/3", "g/3", "a/3", "b/3",
    "c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4",
    "c/5", "d/5", "e/5", "f/5", "g/5", "a/5", "b/5",
    "c/6", "d/6", "e/6",
  ],
  bass: [
    "a/1", "b/1",
    "c/2", "d/2", "e/2", "f/2", "g/2", "a/2", "b/2",
    "c/3", "d/3", "e/3", "f/3", "g/3", "a/3", "b/3",
    "c/4", "d/4", "e/4", "f/4", "g/4",
  ],
};
const AVAILABLE_CLEFS = ["treble", "bass"];
const AVAILABLE_KEY_SIGNATURES = ["G", "D", "A", "E", "B", "F#"];

const LETTER_TO_NOTE = {
  c: "ΝΤΟ",
  d: "ΡΕ",
  e: "ΜΙ",
  f: "ΦΑ",
  g: "ΣΟΛ",
  a: "ΛΑ",
  b: "ΣΙ",
};
const LETTER_TO_ENGLISH = {
  c: "C",
  d: "D",
  e: "E",
  f: "F",
  g: "G",
  a: "A",
  b: "B",
};

const KEY_TO_SHARPS = {
  C: [],
  G: ["f"],
  D: ["f", "c"],
  A: ["f", "c", "g"],
  E: ["f", "c", "g", "d"],
  B: ["f", "c", "g", "d", "a"],
  "F#": ["f", "c", "g", "d", "a", "e"],
};

const LETTER_TO_SEMITONE = {
  c: 0,
  d: 2,
  e: 4,
  f: 5,
  g: 7,
  a: 9,
  b: 11,
};

const THIRD_LINE_MIDI_BY_CLEF = {
  treble: 71,
  bass: 50,
};

const state = {
  isGameOver: false,
  answerNotation: "el",
  currentExpected: [],
  currentExercise: null,
  inputXPositions: [],
};

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
  return items[randomInt(0, items.length - 1)];
}

function normalizeAnswer(value) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function expectedNoteName(key, noteKey, notationMode) {
  const letter = noteKey[0].toLowerCase();
  const isSharpFromKey = KEY_TO_SHARPS[key].includes(letter);
  const baseMap = notationMode === "en" ? LETTER_TO_ENGLISH : LETTER_TO_NOTE;
  const baseName = baseMap[letter] || "";
  return isSharpFromKey ? `${baseName}#` : baseName;
}

function noteKeyToMidi(noteKey) {
  const [letterRaw, octaveRaw] = noteKey.split("/");
  const letter = letterRaw?.toLowerCase();
  const octave = Number(octaveRaw);
  if (!Object.prototype.hasOwnProperty.call(LETTER_TO_SEMITONE, letter) || Number.isNaN(octave)) return null;
  return (octave + 1) * 12 + LETTER_TO_SEMITONE[letter];
}

function createExercise() {
  const clef = randomChoice(AVAILABLE_CLEFS);
  const key = randomChoice(AVAILABLE_KEY_SIGNATURES);
  const noteOptions = NOTE_OPTIONS_BY_CLEF[clef];
  const notes = Array.from({ length: NOTE_COUNT }, () => {
    const noteKey = randomChoice(noteOptions);
    return { noteKey };
  });
  return { clef, key, notes };
}

function updateNotationToggleUI() {
  if (notationElBtn) {
    const isActive = state.answerNotation === "el";
    notationElBtn.classList.toggle("is-active", isActive);
    notationElBtn.setAttribute("aria-pressed", String(isActive));
  }
  if (notationEnBtn) {
    const isActive = state.answerNotation === "en";
    notationEnBtn.classList.toggle("is-active", isActive);
    notationEnBtn.setAttribute("aria-pressed", String(isActive));
  }
}

function setAnswerNotation(mode) {
  if (mode !== "el" && mode !== "en") return;
  if (state.answerNotation === mode) return;
  state.answerNotation = mode;
  updateNotationToggleUI();
  clearInlineFeedback();
  if (state.currentExercise) {
    drawExercise(state.currentExercise);
  } else {
    renderExercise();
  }
}

function getVexFlowApi() {
  if (window.Vex && window.Vex.Flow) return window.Vex.Flow;
  if (window.VexFlow) return window.VexFlow;
  return null;
}

function drawExercise(exercise) {
  if (!notationRoot || !answersRow || !feedbackRow) return;
  const VF = getVexFlowApi();
  if (!VF) return;
  notationRoot.innerHTML = "";
  answersRow.innerHTML = "";
  feedbackRow.innerHTML = "";
  state.inputXPositions = [];

  const width = notationRoot.clientWidth || 900;
  const renderer = new VF.Renderer(notationRoot, VF.Renderer.Backends.SVG);
  renderer.resize(width, 220);
  const context = renderer.getContext();

  const stave = new VF.Stave(10, 50, Math.max(300, width - 20));
  const clef = exercise.clef || "treble";
  stave.addClef(clef);
  stave.addKeySignature(exercise.key);
  const barlineNone = VF.BarlineType?.NONE ?? VF.Barline?.type?.NONE;
  if (barlineNone !== undefined) {
    stave.setBegBarType(barlineNone);
    stave.setEndBarType(barlineNone);
  }
  stave.setContext(context).draw();

  const notes = exercise.notes.map((item) => {
    const midi = noteKeyToMidi(item.noteKey);
    const thirdLineMidi = THIRD_LINE_MIDI_BY_CLEF[clef] ?? THIRD_LINE_MIDI_BY_CLEF.treble;
    const stemDirection = midi !== null && midi >= thirdLineMidi ? VF.Stem.DOWN : VF.Stem.UP;
    return new VF.StaveNote({
      clef,
      keys: [item.noteKey],
      duration: "q",
      stem_direction: stemDirection,
    });
  });

  const voice = new VF.Voice({ num_beats: NOTE_COUNT, beat_value: 4 });
  voice.addTickables(notes);
  new VF.Formatter().joinVoices([voice]).formatToStave([voice], stave, { align_rests: false });
  voice.draw(context, stave);

  const staveAbsX = stave.getX();
  const staveWidth = stave.getWidth();
  const minX = staveAbsX + 22;
  const maxX = staveAbsX + staveWidth - 22;

  notes.forEach((note, index) => {
    const x = Math.min(maxX, Math.max(minX, note.getAbsoluteX()));
    const input = document.createElement("input");
    input.type = "text";
    input.className = "note-answer";
    input.style.left = `${x}px`;
    input.autocomplete = "off";
    input.spellcheck = false;
    input.maxLength = 6;
    input.setAttribute("aria-label", `Answer for note ${index + 1}`);

    input.addEventListener("input", () => {
      if (state.isGameOver) return;
      const userValue = normalizeAnswer(input.value);
      if (!userValue) return;
      clearInlineFeedback();
      maybeAdvanceLevel();
    });

    answersRow.appendChild(input);
    state.inputXPositions.push(x);
  });

  state.currentExpected = exercise.notes.map((n) => normalizeAnswer(
    expectedNoteName(exercise.key, n.noteKey, state.answerNotation)
  ));
  state.currentExercise = exercise;
}

function setStatus(text) {
  if (gameStatusEl) gameStatusEl.textContent = text;
}

function allAnswersCorrect() {
  const inputs = Array.from(answersRow?.querySelectorAll(".note-answer") || []);
  if (inputs.length !== NOTE_COUNT) return false;
  return inputs.every((input, i) => normalizeAnswer(input.value) === state.currentExpected[i]);
}

function allAnswersFilled() {
  const inputs = Array.from(answersRow?.querySelectorAll(".note-answer") || []);
  if (inputs.length !== NOTE_COUNT) return false;
  return inputs.every((input) => normalizeAnswer(input.value).length > 0);
}

function clearInlineFeedback() {
  if (feedbackRow) feedbackRow.innerHTML = "";
}

function renderResultMarks() {
  if (!feedbackRow) return;
  feedbackRow.innerHTML = "";
  const inputs = Array.from(answersRow?.querySelectorAll(".note-answer") || []);
  inputs.forEach((input, index) => {
    const mark = document.createElement("div");
    const isCorrect = normalizeAnswer(input.value) === state.currentExpected[index];
    mark.className = `answer-mark ${isCorrect ? "answer-mark--correct" : "answer-mark--wrong"}`;
    mark.style.left = `${state.inputXPositions[index] || 0}px`;
    mark.textContent = isCorrect ? "✓" : "✕";
    feedbackRow.appendChild(mark);
  });
}

function renderExercise() {
  if (!notationRoot || !answersRow) return;
  if (!getVexFlowApi()) {
    notationRoot.innerHTML = "<p>Unable to load music notation library.</p>";
    return;
  }
  drawExercise(createExercise());
}

function maybeAdvanceLevel() {
  if (!allAnswersFilled()) return;
  if (!allAnswersCorrect()) {
    renderResultMarks();
    setStatus("Some answers are incorrect. Fix the ✕ answers and try again.");
    return;
  }
  clearInlineFeedback();
  setStatus("Great! New random notes loaded.");
  renderExercise();
}

function startGame() {
  state.isGameOver = false;
  state.answerNotation = "el";
  updateNotationToggleUI();
  clearInlineFeedback();
  setStatus("Fill all note names correctly to continue.");
  renderExercise();
}

notationElBtn?.addEventListener("click", () => setAnswerNotation("el"));
notationEnBtn?.addEventListener("click", () => setAnswerNotation("en"));

const currentYearEl = document.getElementById("current-year");
if (currentYearEl) {
  currentYearEl.textContent = String(new Date().getFullYear());
}

window.addEventListener("resize", () => {
  if (!state.isGameOver) renderExercise();
});

startGame();
