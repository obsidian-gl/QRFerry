const { createEncoder, blockToBinary } = require('luby-transform');
const crypto = require('crypto');
const data = crypto.randomBytes(1 * 1024 * 1024); // 1 MB
const enc = createEncoder(data, 1000);
const gen = enc.fountain();
let maxBinSize = 0;
for (let i=0; i<100; i++) {
  const block = gen.next().value;
  const bin = blockToBinary(block);
  if (bin.length > maxBinSize) maxBinSize = bin.length;
}
console.log("Max bin size for 1MB:", maxBinSize);
