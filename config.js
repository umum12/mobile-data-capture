/* Pengaturan situs. Cukup ubah baris execUrl: tempel URL web app Apps Script (berakhiran /exec).
 * Deploy Apps Script harus: Execute as "Me" dan Who has access "Anyone".
 * Daftar sheet di bawah dihasilkan dari Main.gs (SHEETS); bila Anda mengubah SHEETS, jalankan build lagi
 * atau samakan daftar ini secara manual. */
window.APP_CONFIG = {
  execUrl: "https://script.google.com/macros/s/AKfycbw5MTl8z6yJOv9J93IymgLtPgIiY5zwZs3CZQBLXXeEurzFreK7fTdb11rerc3r7feP/exec"
};
window.SHEETS_CFG = [{"key":"utama","label":"Utama","hasId":true},{"key":"sheet2","label":"Sheet 2","hasId":false},{"key":"sheet3","label":"Sheet 3","hasId":false},{"key":"dummy","label":"Dummy","hasId":false}];
