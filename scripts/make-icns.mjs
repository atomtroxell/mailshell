// scripts/make-icns.mjs
// Writes assets/icons/icon.icns (macOS app icon) from the 256px PNG. ICNS can hold
// PNG data directly in the "ic08" (256 x 256) element, so no image library is needed.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const png = readFileSync(join(root, 'assets/icons/icon-256.png'));

const element = Buffer.alloc(8);
element.write('ic08', 0, 'ascii');
element.writeUInt32BE(png.length + 8, 4);
const header = Buffer.alloc(8);
header.write('icns', 0, 'ascii');
header.writeUInt32BE(header.length + element.length + png.length, 4);

writeFileSync(join(root, 'assets/icons/icon.icns'), Buffer.concat([header, element, png]));
writeFileSync(join(root, 'assets/icons/icon.png'), png);
console.log('wrote assets/icons/icon.icns and assets/icons/icon.png');
