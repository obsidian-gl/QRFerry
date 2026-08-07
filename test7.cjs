const { createEncoder, blockToBinary } = require('luby-transform');
const crypto = require('crypto');
const data = crypto.randomBytes(500 * 1024);
const enc = createEncoder(data, 800);
const gen = enc.fountain();
let max = 0;
for (let i = 0; i < 2000; i++) {
  const bin = blockToBinary(gen.next().value);
  if (bin.length > max) max = bin.length;
}
console.log("Max bin size for 500KB:", max);
