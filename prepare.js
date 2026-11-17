// Gets the app ready for packaging: copies index.html into app/, with the PDF tools bundled so it works offline from the first launch.
const fs = require('fs');
const path = require('path');
const root = __dirname, out = path.join(root, 'app'), vendor = path.join(out, 'vendor');
fs.rmSync(out, {recursive: true, force: true});
fs.mkdirSync(vendor, {recursive: true});

const libs = [['pdfjs-dist/build/pdf.min.js', 'pdf.min.js'], ['pdfjs-dist/build/pdf.worker.min.js', 'pdf.worker.min.js'], ['pdf-lib/dist/pdf-lib.min.js', 'pdf-lib.min.js']];
for (const [from, to] of libs) {
  const src = path.join(root, 'node_modules', from);
  if (!fs.existsSync(src)) throw new Error('Missing ' + from + '. Run "npm install" first.');
  fs.copyFileSync(src, path.join(vendor, to));
}

let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/';
html = html.split(CDN + 'pdf.js/3.11.174/pdf.worker.min.js').join('app://mynotes/vendor/pdf.worker.min.js')
           .split(CDN + 'pdf.js/3.11.174/pdf.min.js').join('vendor/pdf.min.js')
           .split(CDN + 'pdf-lib/1.17.1/pdf-lib.min.js').join('vendor/pdf-lib.min.js');
// the install-as-an-app pieces belong to the website only
html = html.replace(/<link rel="manifest"[^>]*>\n?/, '').replace(/<link rel="apple-touch-icon"[^>]*>\n?/, '')
           .replace(/if \('serviceWorker' in navigator\)[^\n]*\n/, '');
if (html.includes(CDN)) throw new Error('A library address was not replaced. Check prepare.js.');
fs.writeFileSync(path.join(out, 'index.html'), html);
for (const f of ['icon-192.png', 'icon-512.png']) fs.copyFileSync(path.join(root, f), path.join(out, f));
console.log('App files are ready in app/');
