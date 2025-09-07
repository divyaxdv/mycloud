const mobilenet = require("@tensorflow-models/mobilenet");
const tf = require("@tensorflow/tfjs");

// Define your categories and tags for images
const categories = {
  Finance: ["invoice", "payment", "bank"],
  Cooking: ["food", "dish", "cooking"],
  Work: ["office", "meeting", "workspace"],
  Travel: ["beach", "mountain", "flight"],
  Study: ["book", "classroom", "lecture"],
  Media: ["film", "music", "camera"],
  Personal: ["selfie", "portrait"],
  Technology: ["computer", "gadget", "device"],
  Misc: ["random", "unknown"],
};

const tags = {
  Important: ["alert", "urgent"],
  Review: ["check", "verify"],
  Personal: ["selfie", "portrait"],
  Technical: ["circuit", "chip"],
  Finance: ["currency", "bill"],
  Study: ["book", "notes"],
};

let model;
let categoryEmbeddings = {};
let tagEmbeddings = {};

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

async function loadModel() {
  model = await mobilenet.load();

  // Generate dummy embeddings for categories and tags for example purposes
  for (const [cat, keywords] of Object.entries(categories)) {
    categoryEmbeddings[cat] = new Array(1024).fill(Math.random());
  }
  for (const [tag, keywords] of Object.entries(tags)) {
    tagEmbeddings[tag] = new Array(1024).fill(Math.random());
  }

  console.log("✅ MobileNet model loaded and embeddings initialized");
}

async function classifyImage(imageBuffer) {
  if (!model) throw new Error("Model not loaded");

  // Load image from buffer
  const tensor = tf.node
    .decodeImage(imageBuffer, 3)
    .resizeNearestNeighbor([224, 224])
    .expandDims(0)
    .toFloat()
    .div(tf.scalar(127))
    .sub(tf.scalar(1));

  // Predict classes
  const predictions = await model.classify(tensor);
  tensor.dispose();

  console.log("Image predictions:", predictions);

  // Use top prediction for category
  let bestCategory = { name: "Misc", score: 0 };
  for (const prediction of predictions) {
    for (const [cat, keywords] of Object.entries(categories)) {
      if (
        keywords.some((word) =>
          prediction.className.toLowerCase().includes(word)
        )
      ) {
        if (prediction.probability > bestCategory.score) {
          bestCategory = { name: cat, score: prediction.probability };
        }
      }
    }
  }

  if (bestCategory.score === 0) {
    bestCategory.name = "Misc";
  }

  // Find top 2 tags based on similarity with prediction className
  const predictionVector = new Array(1024).fill(Math.random()); // Dummy vector
  const tagScores = [];

  for (const [tag, tagVec] of Object.entries(tagEmbeddings)) {
    const score = cosineSimilarity(predictionVector, tagVec);
    tagScores.push({ tag, score });
  }

  tagScores.sort((a, b) => b.score - a.score);
  const topTags = tagScores.slice(0, 2).map((item) => item.tag);

  return {
    category: bestCategory.name,
    tags: topTags,
  };
}

// Load model at startup
loadModel();

module.exports = { classifyImage };
