const { createEncoder, createDecoder, blockToBinary, binaryToBlock } = require('luby-transform');
const crypto = require('crypto');
const data = crypto.randomBytes(500 * 1024); // 500 KB
const enc = createEncoder(data, 800);
const gen = enc.fountain();
const dec = createDecoder();
let count = 0;
let dropped = 0;

for (let i = 0; i < 20000; i++) {
  const block = gen.next().value;
  const bin = blockToBinary(block);
  
  if (bin.length > 2100) {
    dropped++;
    continue;
  }
  
  dec.addBlock(binaryToBlock(bin));
  count++;
  
  if (dec.getDecoded()) {
    console.log(`Decoded after ${count} blocks! Dropped ${dropped}`);
    process.exit(0);
  }
}
console.log("Failed to decode. Decoded count:", dec.decodedCount, "k:", enc.k);
