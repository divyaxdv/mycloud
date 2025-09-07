const { classifyText, predictTags } = require("./text");
const { classifyImage } = require("./image");
const { classifyAudio } = require("./audio");

module.exports = {
  classifyText,
  classifyImage,
  classifyAudio,
  predictTags,
};
