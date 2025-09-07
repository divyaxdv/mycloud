const ffmpeg = require("fluent-ffmpeg");

function classifyAudio(audioPath) {
  console.log("Pretend we're classifying audio at:", audioPath);

  // Use ffmpeg to process audio if needed
  return "Podcast";
}

module.exports = { classifyAudio };
