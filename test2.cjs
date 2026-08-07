const { createEncoder, createDecoder, blockToBinary, binaryToBlock } = require('luby-transform');
const data = Buffer.alloc(5 * 1024 * 1024);
console.log("creating encoder...");
const enc = createEncoder(data, 1000);
console.log("encoder created, k =", enc.k);
const gen = enc.fountain();
console.log("generator created");
let count = 0;
for (let i=0; i<100; i++) {
  gen.next().value;
  count++;
}
console.log("generated 100 blocks");
