// Betatest-Gerüst (11.10.). Nach web/_beta.js kopieren, auf localhost:8060
// laden mit await import('/_beta.js'), danach die Kopie WIEDER LÖSCHEN.
// Spielt wie ein Mensch: tippt, wohin der Zeiger zeigt, folgt pulsierendem
// Kartenschild und markierter Ladenzeile, drückt „Weiter", bedient Gäste,
// spart, wenn das Ziel zu teuer ist. Protokoll in __log (Einblendungen,
// Fenster, Hinweise mit Spieldatum). __besuch('2026-12-01T07:00', 150,
// { futter: true, schnee: true }) = ein Besuch. ACHTUNG: Einblendungen laufen
// in Echtzeit, das Spiel im Zeitraffer - ihre Zeitstempel kommen zu spät.
// Und NIE die Uhr außerhalb des Gerüsts verstellen: Schon ein kurzes
// setzeZeit auf den 10.12. lässt das Spiel ersten Schnee und Advente
// „sehen", der Spielstand ist dann für den Test verdorben.
const S = __spiel.S, C = __spiel.C, Z = __spiel.Z;
window.__log = [];
const jetztText = () => { const d = Z.jetzt(); return `${d.getDate()}.${d.getMonth() + 1}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const log = (art, text) => { text = (text || '').replace(/\s+/g, ' ').trim(); if (!text) return; const l = __log[__log.length - 1]; if (l && l.art === art && l.text === text) return; __log.push({ d: jetztText(), t: Math.round(S.lauf.t), art, text: text.slice(0, 160) }); };
const $ = (s) => document.querySelector(s);
new MutationObserver(() => log('toast', $('#toast').textContent)).observe($('#toast'), { childList: true, subtree: true, characterData: true });
new MutationObserver(() => { const m = $('#modal'); if (!m.classList.contains('versteckt')) log('fenster', (m.querySelector('h2')?.textContent || '') + ' | ' + (m.querySelector('.inhalt')?.textContent || '').slice(0, 110)); }).observe($('#modal'), { childList: true, attributes: true });
new MutationObserver(() => { const b = $('#tipp'); if (!b.classList.contains('versteckt')) log('hinweis', b.textContent); }).observe($('#tipp'), { childList: true, attributes: true, subtree: true });
window.addEventListener('error', (e) => log('FEHLER', e.message));

// chefT = 0 je Bild (17.10.): Der Bot tippt über S.tippeGast statt über den Bildschirm -
// ohne das galt er nach 20 s als „weg", und goldene, besondere und Stammgäste kamen nie
window.__raf = [__spiel.bildschleife]; window.requestAnimationFrame = (cb) => { __raf.push((t) => { S.lauf.chefT = 0; cb(t); }); return 1; };
let tt = performance.now();
function schritt(ms) { const l = __raf.splice(0); tt += ms; for (const cb of l) try { cb(tt); } catch (e) { log('FEHLER', 'frame ' + e.message); } }

function tippeAuf(el, x, y) {
  const o = { bubbles: true, clientX: x, clientY: y, pointerId: 1, isPrimary: true };
  el.dispatchEvent(new PointerEvent('pointerdown', o)); el.dispatchEvent(new PointerEvent('pointerup', o)); el.click && el.tagName !== 'CANVAS' && el.click();
}
/** Tippen auf einen Spielpixel (x, y) im Hauptbild. */
window.__tippeWelt = (x, y) => { const cv = $('#cv'), r = cv.getBoundingClientRect(); const cx = r.left + (x + 0.5) * r.width / cv.width, cy = r.top + (y + 0.5) * r.height / cv.height; tippeAuf(cv, cx, cy); };
function mensch() {
  const m = $('#modal');
  if (!m.classList.contains('versteckt')) {
    const inp = m.querySelector('input'); if (inp && !inp.value) inp.value = 'Tannenhof';
    if (m.querySelector('.kartenbild')) { [...m.querySelectorAll('button')].find((b) => /Schließen/.test(b.textContent))?.click(); return 'karte zu'; }
    const mod = m.querySelector('.modus[data-m="eigen"]') || m.querySelector('.modus'); if (mod) { mod.click(); return 'modus'; }
    // „Dein Angebot": Fertig drücken - sonst tippt der Bot Schalter um, und das Fenster bleibt für immer offen (24.10.)
    if (m.querySelector('h2')?.textContent === 'Dein Angebot') { [...m.querySelectorAll('button')].find((b) => b.textContent === 'Fertig')?.click(); return 'angebot'; }
    const kn = [...m.querySelectorAll('.knoepfe button, button.k')].filter((b) => !b.disabled);
    const b = kn.find((x) => !x.classList.contains('neben')) || kn[0];
    if (b) { b.click(); return 'fenster'; }
  }
  const tp = $('#tipp');
  if (!tp.classList.contains('versteckt') && /Weiter/.test(tp.textContent) && (window.__blaseT = (window.__blaseT || 0) + 1) > 4) { window.__blaseT = 0; tp.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); return 'weiter'; }
  const z = $('#zeiger');
  if (!z.classList.contains('versteckt') && !(S.lauf.t < (window.__sparBis || 0))) {
    const r = z.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    z.style.pointerEvents = 'none';
    const el = document.elementFromPoint(x, y);
    if (el) { tippeAuf(el.closest('button') || el, x, y); return 'zeiger'; }
  }
  // Karte: dem pulsierenden Schild folgen (Führung), sonst zu
  if (!$('#landkarte').classList.contains('versteckt')) {
    const s = $('#kartenOrte .ort.hervor');
    if (s && $('#blatt').classList.contains('versteckt')) { if (!window.__geht) { window.__geht = 40; s.click(); } else window.__geht--; return 'schild'; }
  }
  // Laden: die markierte Zeile kaufen
  if (!$('#blatt').classList.contains('versteckt')) {
    const z = $('#blattInhalt .zeile.fuehrung');
    const k = z && [...z.querySelectorAll('button')].find((b) => !b.disabled);
    if (k) { k.click(); return 'kaufen'; }
    if (z) { window.__sparBis = S.lauf.t + 25; log('mensch', 'muss sparen: ' + z.textContent.slice(0, 50)); $('#blattZu').click(); if (!$('#landkarte').classList.contains('versteckt')) $('#kartenZu').click(); return 'sparen'; }
  }
  // Zielleiste oben: pulsiert, wenn das Ziel bezahlbar ist - antippen
  const zl = $('#ziel');
  if (zl && !zl.classList.contains('versteckt') && zl.classList.contains('bereit') && $('#blatt').classList.contains('versteckt') && $('#landkarte').classList.contains('versteckt')) { zl.click(); return 'ziel'; }
  // Aufträge-Fenster: abholen, was geht (24.10.: sonst hing der Bot an Startziel 7)
  if (!$('#blatt').classList.contains('versteckt')) {
    const ab = [...$('#blattInhalt').querySelectorAll('button')].find((b) => b.textContent === 'Abholen' && !b.disabled);
    if (ab) { ab.click(); log('mensch', 'abgeholt'); return 'abholen'; }
  }
  // Laden offen ohne Zeiger: zu
  if (!$('#blatt').classList.contains('versteckt')) { $('#blattZu').click(); return 'blatt zu'; }
  if (!$('#landkarte').classList.contains('versteckt')) { $('#kartenZu').click(); return 'karte zu'; }
  return null;
}
function bedienen() {
  const L = S.lauf; if (L.schlitten && L.schlitten.gefangen == null && L.schlitten.t > 1) S.fangeSchlitten();
  const g = L.gaeste.find((x) => x.am && !x.bedient && !x.gehen); if (!S.stufe('nachfuell')) { for (const p of S.produkteFrei()) if (p.art !== 'platte' && (S.st.toepfe[p.id] || 0) <= 0 && (!g || g.wunsch === p.id)) { S.tippeZelle(C.PRODUKTE.indexOf(p)); return; } }
  if (!g) return; const p = C.PRODUKT[g.wunsch]; const i = C.PRODUKTE.indexOf(p);
  if (p.art === 'platte') { const hi = L.hand.findIndex((h) => h.art === 'voll' && h.id === 'crepe'); if (hi >= 0) { S.tippeGast(g.platz); return; } if (L.hand.length >= S.handMax()) { S.tippeAusguss(); return; } S.tippeZelle(i); return; }
  if (S.hat('servier')) { S.tippeGast(g.platz); return; }
  const hi = L.hand.findIndex((h) => h.art === 'voll' && h.id === g.wunsch && !(h.rest > 0)); if (hi >= 0) { S.tippeGast(g.platz); return; }
  if (L.hand.some((h) => h.art === 'voll' && h.id === g.wunsch)) return;
  if (p.art === 'topf' && !L.hand.some((h) => h.art === 'glas')) { if (L.hand.length >= S.handMax()) S.tippeAusguss(); else S.tippeGlaeser(); return; }
  S.tippeZelle(i);
}
function kaufen() {
  if (!S.startzieleFertig()) return;   // vorher führt die Einführung
  for (let k = 0; k < 10; k++) { let best = null, bk = Infinity; for (const a of C.ARTIKEL) { const s = S.status(a); if (s.versteckt || s.fertig || s.grund || !s.leisten) continue; if (s.kosten < bk) { bk = s.kosten; best = a.id; } } if (!best || !S.kaufe(best)) break; log('kauf', S.artikelName(best)); }
}
/** Eine Sitzung von `sek` Spielsekunden. */
window.__sitzung = async (sek, extra = {}) => {
  let acc = 0, a2 = 0;
  for (let t = 0; t < sek; t += 0.1) {
    schritt(100); acc += 0.1; a2 += 0.1;
    if (acc >= 0.4) { acc = 0; const was = mensch(); if (!was && S.st.lernen >= 0) bedienen(); }
    if (a2 >= 5) { a2 = 0; kaufen(); }
    if ((t * 10 | 0) % 50 === 0) await new Promise((r) => setTimeout(r, 0));   // Sekundenschleife der Seite laufen lassen
  }
};
/** Ein Besuch: Uhr stellen, ankommen lassen, spielen. */
window.__besuch = async (datum, sek, extra = {}) => {
  S.st.zuletzt = Date.now() - 3 * 3600 * 1000;
  __spiel.datum(datum);
  await new Promise((r) => setTimeout(r, 1300));   // Sekundenschleife merkt den neuen Tag -> ankommen()
  await __sitzung(4);
  // Fenster beim Ankommen (Kiste, Ereignisse) haben Animationen in Echtzeit: warten, bis alles zu ist
  for (let i = 0; i < 40 && (__spiel.UI.fensterOffen() || __spiel.UI.panelOffen()); i++) { mensch(); schritt(100); await new Promise((r) => setTimeout(r, 350)); }
  if (__spiel.UI.fensterOffen()) log('TEST', 'Fenster bleibt offen: ' + ($('#modal h2')?.textContent || ''));
  if (extra.futter && S.hat('futterhaus')) { __tippeWelt(132, __GW() - 56); log('tipp', 'Futterhaus'); }
  // Schneemann bei SCHNEEMANN_X 27 (17.10.: vorher 66)
  if (extra.schnee && Z.schnee() > 0) { __tippeWelt(27, __GW() - 8); log('tipp', 'Schneemann (Stufe jetzt ' + S.schneemannStufe() + ')'); }
  await __sitzung(sek);
};
window.__GW = () => $('#cv').height - C.LEISTE - C.STAND_H - 6;
'bereit';
