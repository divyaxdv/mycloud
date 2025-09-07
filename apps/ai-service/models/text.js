const use = require("@tensorflow-models/universal-sentence-encoder");
require("@tensorflow/tfjs");

let textModel;
let categoryEmbeddings = {};
let tagEmbeddings = {};

const categories = {
  Finance: [
    "invoice",
    "receipt",
    "payment",
    "bill",
    "bank statement",
    "tax",
    "investment",
  ],
  Cooking: [
    "recipe",
    "cooking instructions",
    "ingredients",
    "dish",
    "meal",
    "baking",
  ],
  Work: [
    "meeting notes",
    "project report",
    "office memo",
    "client presentation",
    "work schedule",
  ],
  Travel: [
    "flight ticket",
    "hotel booking",
    "itinerary",
    "passport",
    "visa",
    "travel plan",
  ],
  Study: [
    "university",
    "college",
    "lecture notes",
    "assignments",
    "thesis",
    "course syllabus",
    "research paper",
    "exam paper",
    "study material",
  ],
  General: ["miscellaneous", "random notes"],
};

const tags = {
  Important: ["important", "urgent", "priority", "critical"],
  Personal: ["personal", "family", "friends", "diary"],
  Technical: ["technical", "engineering", "coding", "software"],
  Finance: ["invoice", "payment", "expense", "tax"],
  Study: ["exam", "lecture", "assignment", "notes"],
};

const categoryBoosts = {
  Study: 1.1,
};

function cosineSimilarity(a, b) {
  const dot = a.reduce((sum, x, i) => sum + x * b[i], 0);
  const normA = Math.sqrt(a.reduce((sum, x) => sum + x * x, 0));
  const normB = Math.sqrt(b.reduce((sum, x) => sum + x * x, 0));
  return dot / (normA * normB);
}

function averageVector(vectors) {
  const len = vectors.length;
  const dim = vectors[0].length;
  const avg = new Array(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) avg[i] += v[i];
  }
  return avg.map((x) => x / len);
}

function preprocessText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, "")
    .trim();
}

async function loadModel() {
  textModel = await use.load();

  // Precompute category embeddings
  for (const [cat, examples] of Object.entries(categories)) {
    const emb = await textModel.embed(examples);
    const arr = await emb.array();
    emb.dispose?.();
    categoryEmbeddings[cat] = averageVector(arr);
  }

  // Precompute tag embeddings
  for (const [tag, examples] of Object.entries(tags)) {
    const emb = await textModel.embed(examples);
    const arr = await emb.array();
    emb.dispose?.();
    tagEmbeddings[tag] = averageVector(arr);
  }

  console.log("✅ USE model loaded and categories/tags prepared");
}

async function classifyText(text) {
  if (!textModel) throw new Error("Text model not loaded");

  const processedText = preprocessText(text);
  const emb = await textModel.embed([processedText]);
  const [vector] = await emb.array();
  emb.dispose?.();

  let best = { category: "General", score: -1 };

  for (const [cat, catVec] of Object.entries(categoryEmbeddings)) {
    const score = cosineSimilarity(vector, catVec) * (categoryBoosts[cat] || 1);
    if (score > best.score) best = { category: cat, score };
  }

  if (best.score < 0.5 && processedText.includes("university")) {
    best.category = "Study";
  }

  return best.category;
}

async function predictTags(text) {
  if (!textModel) throw new Error("Text model not loaded");

  const processedText = preprocessText(text);
  const emb = await textModel.embed([processedText]);
  const [vector] = await emb.array();
  emb.dispose?.();

  const tagScores = [];

  for (const [tag, tagVec] of Object.entries(tagEmbeddings)) {
    const score = cosineSimilarity(vector, tagVec);
    console.log(`Tag: ${tag}, Score: ${score.toFixed(3)}`);
    tagScores.push({ tag, score });
  }

  // Sort by descending score and take top 2
  tagScores.sort((a, b) => b.score - a.score);

  const topTags = tagScores.slice(0, 2).map((item) => item.tag);

  console.log("Predicted top tags:", topTags);

  return topTags;
}

loadModel();

module.exports = { classifyText, predictTags };
