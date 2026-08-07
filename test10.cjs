const { createEncoder, createDecoder, blockToBinary, binaryToBlock } = require('luby-transform');
const crypto = require('crypto');
const data = crypto.randomBytes(1024 * 1024);
const enc = createEncoder(data, 1200, false);
const gen = enc.fountain();
const dec = createDecoder();
let count = 0;
let dropped = 0;
let maxSeen = 0;
for (let i = 0; i < 50000; i++) {
  const block = gen.next().value;
  const bin = blockToBinary(block);
  if (bin.length > maxSeen) maxSeen = bin.length;
  
  if (bin.length > 2100) {
    dropped++;
    continue;
  }
  
  dec.addBlock(binaryToBlock(bin));
  count++;
  
  if (dec.getDecoded()) {
    console.log(`Decoded after ${count} blocks! Dropped ${dropped}. Max seen: ${maxSeen}`);
    process.exit(0);
  }
}
console.log(`Failed to decode. Decoded: ${dec.decodedCount}/${enc.k}. Dropped ${dropped}. Max seen: ${maxSeen}`);
