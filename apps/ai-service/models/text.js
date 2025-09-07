const use = require("@tensorflow-models/universal-sentence-encoder");
let textModel;

async function loadModel() {
  textModel = await use.load();
  console.log("✅ USE model loaded");
}

async function classifyText(text) {
  if (!textModel) throw new Error("Text model not loaded");

  console.log("Classifying text:", text);

  // const embeddings = await textModel.embed([text]);

  if (text.toLowerCase().includes("invoice")) return "Finance";
  if (text.toLowerCase().includes("recipe")) return "Cooking";

  return "General";
}

// At worker start
loadModel();

module.exports = { classifyText };
