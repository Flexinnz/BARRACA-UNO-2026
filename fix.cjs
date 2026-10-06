const fs = require('fs');
let txt = fs.readFileSync('app/globals.css');
// Find the bad UTF-16 characters
const badIdx = txt.indexOf(Buffer.from([0x0A, 0x00, 0x2F, 0x00, 0x2A, 0x00])); // \n \0 / \0 * \0
if (badIdx !== -1) {
  txt = txt.subarray(0, badIdx);
}
fs.writeFileSync('app/globals.css', txt);
fs.appendFileSync('app/globals.css', `
/* Better integration for banners in Dark Mode */
:root[data-theme="dark"] .page-heading { background: transparent; border-bottom-color: var(--edge); }
:root[data-theme="dark"] .page-heading:before { opacity: 0.1; }
:root[data-theme="dark"] .sidebar-note { background-color: var(--surface); border: 1px solid var(--edge); }
:root[data-theme="dark"] .sidebar-note:before { opacity: 0.15; }
`);
