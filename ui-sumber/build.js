#!/usr/bin/env node
/* Membuat folder situs statis (siap upload ke Netlify) dari file HTML proyek ini.
 *
 * Pemakaian:   node build.js [--exec-url=https://script.google.com/macros/s/XXXX/exec] [--out=site]
 *
 * Yang dilakukan:
 *  - Menggabungkan <?!= include('...') ?> ke dalam index.html dan tabel.html (Apps Script biasanya melakukannya)
 *  - Mengganti scriptlet Apps Script (<?= historyUrl ?>, <?= captureUrl ?>, <?!= sheetsJson ?>)
 *  - Menulis config.js (alamat /exec + daftar sheet dari Main.gs), ikon, manifest, dan _headers
 * Hasilnya tidak mengubah file sumber, jadi versi Apps Script tetap berjalan seperti biasa. */
const fs = require('fs'), path = require('path'), vm = require('vm');

const args = {};
process.argv.slice(2).forEach(a => { const m = /^--([^=]+)=(.*)$/.exec(a); if (m) args[m[1]] = m[2]; });
const SRC = __dirname;
const OUT = path.resolve(args.out || path.join(SRC, 'site'));
const EXEC = args['exec-url'] || 'GANTI_DENGAN_URL_EXEC_ANDA';
const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

// Daftar sheet dibaca langsung dari Main.gs supaya tidak ada salinan yang bisa tidak sinkron
function sheetOptions() {
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(read('Main.gs') + '\n;this.__out = getSheetOptionsJson_();', ctx);
  return JSON.parse(ctx.__out);
}

function assemble(file) {
  let html = read(file);
  html = html.replace(/<\?!= include\('(\w+)'\) \?>/g, (m, name) => read(name + '.html'));
  html = html.replace('<script>window.SHEETS_CFG = <?!= sheetsJson ?>;</script>', '<script src="config.js"></script>');
  html = html.replace('<?= historyUrl ?>', 'tabel.html').replace('<?= captureUrl ?>', 'index.html');
  // ikon: berkas nyata + manifest (menu "Tambahkan ke layar utama")
  html = html.replace(/<link rel="icon"[^>]*>/, [
    '<link rel="icon" type="image/svg+xml" href="favicon.svg">',
    '<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png">',
    '<link rel="apple-touch-icon" href="favicon-192.png">',
    '<link rel="manifest" href="manifest.webmanifest">',
    '<meta name="theme-color" content="#0F6E51">'
  ].join('\n'));
  // Sisa scriptlet di luar komentar kode = ada yang terlewat
  const stripped = html.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const left = stripped.match(/<\?[=!]?[^>]*\?>/g);
  if (left) throw new Error(file + ': scriptlet tersisa: ' + left.slice(0, 3).join(' | '));
  return html;
}


// Halaman tes koneksi (buka: /tes.html) — membantu mencari penyebab "Gagal terhubung" tanpa alat khusus
const DIAG_HTML = `<!DOCTYPE html>
<html lang="id"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tes Koneksi — MOBILE DATA CAPTURE</title>
<style>
  body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F3F7F5;color:#1F2937;}
  main{max-width:560px;margin:0 auto;padding:20px 16px 40px;}
  h1{font-size:19px;margin:0 0 4px;} p{margin:0 0 14px;color:#6B7280;font-size:14px;}
  button{min-height:48px;padding:0 20px;border:0;border-radius:12px;background:#0F6E51;color:#fff;font-size:15px;font-weight:800;}
  button:disabled{opacity:.6;}
  .st{display:flex;gap:10px;margin:10px 0;padding:12px 14px;border-radius:12px;background:#fff;border:1.5px solid #E5E7EB;font-size:14px;line-height:1.45;overflow-wrap:anywhere;}
  .st b{flex:none;width:22px;} .ok{border-color:#86CBB0;} .bad{border-color:#F3B4B4;background:#FFF8F8;} .warn{border-color:#FCD34D;background:#FFFBEB;}
  code{background:#F3F4F6;padding:1px 5px;border-radius:5px;font-size:12.5px;}
</style></head><body><main>
<h1>Tes Koneksi</h1>
<p>Memeriksa apakah situs ini bisa berbicara dengan Apps Script. Tekan tombol, lalu baca hasilnya dari atas ke bawah.</p>
<button id="go">Jalankan tes</button>
<div id="out"></div>
<script src="config.js"></script>
<script>
(function () {
  var out = document.getElementById('out'), go = document.getElementById('go');
  function add(cls, icon, html) { var d = document.createElement('div'); d.className = 'st ' + cls; d.innerHTML = '<b>' + icon + '</b><span>' + html + '</span>'; out.appendChild(d); }
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]; }); }
  go.addEventListener('click', async function () {
    out.innerHTML = ''; go.disabled = true;
    try {
      var url = (window.APP_CONFIG || {}).execUrl || '';
      if (!url || /GANTI|ISI_DI_SINI/.test(url)) { add('bad', '✗', 'Alamat belum diisi. Buka <code>config.js</code>, ganti <code>GANTI_DENGAN_URL_EXEC_ANDA</code> dengan URL web app Apps Script, simpan, lalu unggah ulang situs ke Netlify.'); return; }
      add('ok', '✓', 'config.js terbaca. Alamat: <code>' + esc(url) + '</code>');
      if (!/^https:\\/\\/script\\.google\\.com\\/macros\\/s\\/[^/]+\\/exec$/.test(url)) {
        add('warn', '!', 'Bentuk alamat tidak biasa. Seharusnya <code>https://script.google.com/macros/s/…/exec</code> (berakhiran <b>/exec</b>, bukan /dev, bukan alamat /a/macros/ milik domain Workspace).');
      }
      var reach = false;
      try { await fetch(url, { mode: 'no-cors', cache: 'no-store', credentials: 'omit' }); reach = true; add('ok', '✓', 'Alamat bisa dijangkau dari browser ini (jaringan dan alamat benar).'); }
      catch (e) { add('bad', '✗', 'Alamat tidak bisa dijangkau sama sekali. Periksa koneksi internet dan ejaan alamat.'); return; }
      var t0 = Date.now(), res;
      try {
        res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ fn: 'ping', args: [] }), redirect: 'follow', credentials: 'omit', cache: 'no-store' });
      } catch (e) {
        add('bad', '✗', 'Alamat terjangkau, tetapi browser <b>tidak boleh membaca jawabannya</b>. Penyebab paling umum: akses deploy bukan <b>Anyone</b>. Di Apps Script: Deploy → Manage deployments → pensil → <i>Who has access: Anyone</i> → Version: <i>New version</i> → Deploy. Lalu coba lagi.');
        return;
      }
      add('ok', '✓', 'Jawaban terbaca (HTTP ' + res.status + ', ' + (Date.now() - t0) + ' ms).');
      var text = await res.text(), j = null;
      try { j = JSON.parse(text); } catch (e) {}
      if (!j) { add('bad', '✗', 'Jawaban bukan data yang dikenal (<code>' + esc(text.slice(0, 120).replace(/\\s+/g, ' ')) + '</code>). Biasanya deploy belum memakai versi terbaru yang memuat <code>Api.gs</code>. Deploy → Manage deployments → pensil → Version: <i>New version</i> → Deploy.'); return; }
      if (j.ok && j.data && j.data.pong) { add('ok', '✓', '<b>Berhasil.</b> Apps Script menjawab. Login seharusnya sudah bisa dipakai.'); return; }
      add('bad', '✗', 'Apps Script menjawab galat: <code>' + esc(JSON.stringify(j)) + '</code>. ' + (j.error === 'unknown_function' ? 'Versi <code>Api.gs</code> di Apps Script berbeda dengan situs ini; perbarui Api.gs lalu deploy versi baru.' : ''));
    } finally { go.disabled = false; }
  });
})();
</script></main></body></html>`;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'index.html'), assemble('index.html'));
fs.writeFileSync(path.join(OUT, 'tabel.html'), assemble('History.html'));
fs.writeFileSync(path.join(OUT, 'tes.html'), DIAG_HTML);

fs.writeFileSync(path.join(OUT, 'config.js'),
'/* Pengaturan situs — DIBUAT OTOMATIS oleh runPublishToGithub() (Api.gs). Jangan diedit di sini; perubahan akan tertimpa.\n' +
' * execUrl: alamat web app Apps Script (/exec), dipertahankan dari nilai sebelumnya (atau Script Property EXEC_URL).\n' +
' * Daftar sheet diambil dari SHEETS di Main.gs. */\n' +
'window.APP_CONFIG = {\n  execUrl: ' + JSON.stringify(EXEC) + '\n};\n' +
'window.SHEETS_CFG = ' + JSON.stringify(sheetOptions()) + ';\n');

fs.readdirSync(path.join(SRC, 'favicon')).forEach(f => fs.copyFileSync(path.join(SRC, 'favicon', f), path.join(OUT, f)));

fs.writeFileSync(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: 'MOBILE DATA CAPTURE', short_name: 'DATA CAPTURE', start_url: 'index.html', scope: './',
  display: 'standalone', orientation: 'portrait', background_color: '#F3F7F5', theme_color: '#0F6E51',
  icons: [
    { src: 'favicon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: 'favicon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
  ]
}, null, 2));

// Netlify: izinkan kamera untuk situs ini, jangan menyimpan HTML/konfigurasi lama di cache
fs.writeFileSync(path.join(OUT, '_headers'),
`/*
  Permissions-Policy: camera=(self)
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer

/*.html
  Cache-Control: no-cache

/config.js
  Cache-Control: no-cache
`);

const kb = (f) => (fs.statSync(path.join(OUT, f)).size / 1024).toFixed(0) + ' KB';
console.log('Situs dibuat di ' + OUT);
['index.html', 'tabel.html', 'tes.html', 'config.js'].forEach(f => console.log('  ' + f + '  ' + kb(f)));
if (EXEC.indexOf('GANTI') === 0) console.log('\nPERHATIAN: execUrl belum diisi. Ubah di config.js atau jalankan dengan --exec-url=...');
