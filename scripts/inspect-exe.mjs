import fs from 'node:fs';

const buf = fs.readFileSync('public/updates/BarracaUno-1.3.1.0.exe');
const str = buf.toString('latin1');
const matches = str.match(/https?:\/\/[a-zA-Z0-9.-]+[^\s\x00"'<>]+/g) || [];
console.log('URLs:', [...new Set(matches)]);

const str16 = buf.toString('utf16le');
const matches16 = str16.match(/https?:\/\/[a-zA-Z0-9.-]+[^\s\x00"'<>]+/g) || [];
console.log('UTF16 URLs:', [...new Set(matches16)]);

