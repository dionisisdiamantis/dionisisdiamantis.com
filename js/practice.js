const notationRoot = document.getElementById("notation-root");
const answersRow = document.getElementById("answers-row");
const feedbackRow = document.getElementById("feedback-row");
const gameStatusEl = document.getElementById("game-status");

const NOTE_COUNT = 10;
const NOTE_OPTIONS_BY_LEVEL = [
  ["d/4", "e/4", "f/4", "g/4", "a/4", "b/4", "c/5", "d/5", "e/5", "f/5"],
  ["c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4", "c/5", "d/5", "e/5", "f/5", "g/5"],
  ["b/3", "c/4", "d/4", "e/4", "f/4", "g/4", "a/4", "b/4", "c/5", "d/5", "e/5", "f/5", "g/5", "a/5"],
];
const KEY_SIGNATURES_BY_LEVEL = [
  ["G", "D"],
  ["G", "D", "A", "E"],
  ["G", "D", "A", "E", "B", "F#"],
];

const LETTER_TO_NOTE = {
  c: "ΝΤΟ",
  d: "ΡΕ",
  e: "ΜΙ",
  f: "ΦΑ",
  g: "ΣΟΛ",
  a: "ΛΑ",
  b: "ΣΙ",
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

const state = {
  level: 1,
  isGameOver: false,
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

function getDifficultyBucket(level) {
  if (level <= 2) return 0;
  if (level <= 4) return 1;
  return 2;
}

function expectedNoteName(key, noteKey) {
  const letter = noteKey[0].toLowerCase();
  const isSharpFromKey = KEY_TO_SHARPS[key].includes(letter);
  const baseName = LETTER_TO_NOTE[letter] || "";
  return isSharpFromKey ? `${baseName}#` : baseName;
}

function createExercise() {
  const bucket = getDifficultyBucket(state.level);
  const key = randomChoice(KEY_SIGNATURES_BY_LEVEL[bucket]);
  const noteOptions = NOTE_OPTIONS_BY_LEVEL[bucket];
  const notes = Array.from({ length: NOTE_COUNT }, () => {
    const noteKey = randomChoice(noteOptions);
    return { noteKey, expected: expectedNoteName(key, noteKey) };
  });
  return { key, notes };
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
  stave.addClef("treble");
  stave.addKeySignature(exercise.key);
  stave.addTimeSignature("4/4");
  stave.setContext(context).draw();

  const notes = exercise.notes.map((item) => new VF.StaveNote({
    clef: "treble",
    keys: [item.noteKey],
    duration: "q",
  }));

  const voice = new VF.Voice({ num_beats: NOTE_COUNT, beat_value: 4 });
  voice.addTickables(notes);
  new VF.Formatter().joinVoices([voice]).formatToStave([voice], stave, { align_rests: false });
  voice.draw(context, stave);

  // Visual barline in the middle for two measure feel.
  if (notes.length >= 4) {
    const splitIdx = Math.floor(notes.length / 2) - 1;
    const splitX = (notes[splitIdx].getAbsoluteX() + notes[splitIdx + 1].getAbsoluteX()) / 2;
    const topY = stave.getYForLine(0);
    const bottomY = stave.getYForLine(4);
    if (typeof context.setLineWidth === "function") context.setLineWidth(1.2);
    if (typeof context.setStrokeStyle === "function") context.setStrokeStyle("#0f172a");
    context.beginPath();
    context.moveTo(splitX, topY);
    context.lineTo(splitX, bottomY);
    context.stroke();
  }

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

  state.currentExpected = exercise.notes.map((n) => normalizeAnswer(n.expected));
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
  state.level += 1;
  setStatus("Great! New notes loaded.");
  renderExercise();
}

function startGame() {
  state.isGameOver = false;
  state.level = 1;
  clearInlineFeedback();
  setStatus("Fill all note names correctly to continue.");
  renderExercise();
}

window.addEventListener("resize", () => {
  if (!state.isGameOver) renderExercise();
});

startGame();
