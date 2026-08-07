const { createEncoder, createDecoder, blockToBinary, binaryToBlock } = require('luby-transform');
const crypto = require('crypto');
const data = crypto.randomBytes(5 * 1024 * 1024);
console.log("creating encoder...");
const enc = createEncoder(data, 1000);
console.log("encoder created, k =", enc.k);
const gen = enc.fountain();
console.log("generator created");
let count = 0;
for (let i=0; i<100; i++) {
  const block = gen.next().value;
  blockToBinary(block);
  count++;
}
console.log("generated 100 blocks");
