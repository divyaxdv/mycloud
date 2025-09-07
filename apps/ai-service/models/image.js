const mobilenet = require("@tensorflow-models/mobilenet");
const tf = require("@tensorflow/tfjs-node");

async function classifyImage(imagePath) {
  const model = await mobilenet.load();

  // Here you’d load and process the image buffer using tf.node
  console.log("Pretend we're processing image at:", imagePath);

  return "Entertainment";
}

module.exports = { classifyImage };
