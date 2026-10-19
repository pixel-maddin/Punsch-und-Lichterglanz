// Saison-Autopilot 8 (19.10.): saison7 + Karte des Standes (5 aus 10).
//   karte alt   = alles Besessene auf der Karte (wie vor dem 19.10.)
//   karte auto  = nichts umstellen (Neues kommt nur, solange Platz ist)
//   karte teuer = nach jedem Kauf die fünf teuersten anbieten
// Saison-Autopilot 7 (17.10.): saison6 + Tagesprotokoll + zwei Spielweisen.
//   art 'band'     = bedient JEDEN Gast selbst (wie saison6, goldene zuerst)
//   art 'aufsicht' = bedient nur goldene, besondere Gäste und Großbestellungen,
//                    den Rest machen die Wichtel (Spielweise ab dem Aufsicht-Umbau)
// Nach web/_saison7.js kopieren, auf localhost:8060 mit `await import('/_saison7.js')`
// laden, danach die Kopie löschen. Eine Saison dauert einige Sekunden.
// __saison7({ min, sitz, mini, art, luxusFaktor, sparen })
// Ergebnis wie saison6, dazu `tage`: je Tag verdient, Käufe, Einnahmen/Min, ♥, Ruf.
window.__saison8 = async function (o) {
  const { min: minTag, sitz: sitzungen = [8, 13, 18], mini = null, art = 'band', luxusFaktor = 1, sparen = false, karte = 'auto' } = o;
  const S = __spiel.S, C = __spiel.C, Z = __spiel.Z;
  const V = document.querySelector('script[src*="main.js"]').src.split('?')[1].replace('v=', '');
  const A = await import('./src/auftraege.js?v=' + V); const E = await import('./src/erfolge.js?v=' + V); const ZL = await import('./src/ziele.js?v=' + V);
  const LUX = window.__luxBasis || (window.__luxBasis = Object.fromEntries(C.ARTIKEL.filter((a) => a.luxus || a.luxusAb).map((a) => [a.id, JSON.parse(JSON.stringify(a.kosten))])));
  for (const a of C.ARTIKEL) { if (!(a.id in LUX)) continue; const b = LUX[a.id]; a.kosten = Array.isArray(b) ? b.map((x, i) => (i === b.length - 1 ? Math.round(x * luxusFaktor) : x)) : Math.round(b * luxusFaktor); }
  S.allesLoeschen(); S.st.intro = true; S.st.lernen = 99; S.st.modus = 'eigen'; S.st.tipps = {}; S.hooks.toast = () => {}; S.hooks.ton = () => {}; S.hooks.ruf = () => {};
  Z.setzeZeit(new Date(2026, 10, 24, 8, 0), 1); S.setzeStartTag();
  const dt = 0.05; let alleNormal = null, alleVar = null; const proSitz = minTag / sitzungen.length;
  const luxWann = {}; let stimmung20 = null, jury = null;
  const istLux = (a) => a.luxus || (a.luxusAb && S.stufe(a.id) >= a.luxusAb - 1);
  // Wen nimmt der Bot? Goldene und besondere zuerst; bei „aufsicht" NUR die.
  const meins = (g) => g.gold || g.gross || g.ansturm || (C.GAESTE[g.typ] && C.GAESTE[g.typ].spezial);
  let tipps = 0;
  function bedienen() {
    const L = S.lauf;
    if (L.schlitten && L.schlitten.gefangen == null && L.schlitten.t > 1) S.fangeSchlitten();
    const offen = L.gaeste.filter((x) => x.am && !x.bedient && !x.gehen);
    let g = offen.find(meins) || null;
    // Vor der Aufsicht-Stufe gibt es keine goldenen Gäste - dann bedient auch „aufsicht" alle
    if (!g && (art === 'band' || !(S.aufsicht && S.aufsicht()))) g = offen[0] || null;
    if (!S.stufe('nachfuell')) { for (const p of S.produkteFrei()) if (p.art !== 'platte' && (S.st.toepfe[p.id] || 0) <= 0 && (!g || g.wunsch === p.id)) { tipps++; S.tippeZelle(C.PRODUKTE.indexOf(p)); return; } }
    if (!g) return;
    tipps++;
    const p = C.PRODUKT[g.wunsch]; const i = C.PRODUKTE.indexOf(p);
    if (p.art === 'platte') { const hi = L.hand.findIndex((h) => h.art === 'voll' && h.id === 'crepe'); if (hi >= 0) { S.tippeGast(g.platz); return; } if (L.hand.length >= S.handMax()) { S.tippeAusguss(); return; } S.tippeZelle(i); return; }
    if (S.hat('servier')) { S.tippeGast(g.platz); return; }
    const hi = L.hand.findIndex((h) => h.art === 'voll' && h.id === g.wunsch && !(h.rest > 0)); if (hi >= 0) { S.tippeGast(g.platz); return; }
    if (L.hand.some((h) => h.art === 'voll' && h.id === g.wunsch)) return;
    if (p.art === 'topf' && !L.hand.some((h) => h.art === 'glas')) { if (L.hand.length >= S.handMax()) S.tippeAusguss(); else S.tippeGlaeser(); return; }
    S.tippeZelle(i);
  }
  function karteSetzen() {
    const bes = S.produkteBesessen();
    if (karte === 'alt') S.st.angebot = bes.map((p) => p.id);
    else if (karte === 'teuer') S.st.angebot = bes.slice().sort((a, b) => S.produktPreis(b) - S.produktPreis(a)).slice(0, C.ANGEBOT_MAX).map((p) => p.id);
  }
  let kaeufeHeute = 0;
  function kaufen(datum) {
    for (let k = 0; k < 40; k++) {
      let best = null, bk = Infinity, luxOffen = false;
      for (const a of C.ARTIKEL) { const s = S.status(a); if (s.versteckt || s.fertig || s.grund) continue; if (istLux(a)) luxOffen = true; if (!s.leisten) continue; if (s.kosten < bk) { bk = s.kosten; best = ['a', a.id, istLux(a)]; } }
      if (!best && !(sparen && luxOffen)) for (const pl of Object.keys(C.VARIANTEN)) { if (!S.hat(pl)) continue; for (let i = 1; i < 3; i++) { const vs = S.varianteStatus(pl, i); if (vs.hat || vs.versteckt || !vs.leisten) continue; if (vs.kosten < bk) { bk = vs.kosten; best = ['v', pl, i]; } } }
      if (!best) break;
      const ok = best[0] === 'a' ? S.kaufe(best[1]) : S.kaufeVariante(best[1], best[2]);
      if (!ok) break;
      kaeufeHeute++; karteSetzen();
      if (best[0] === 'a' && best[2]) luxWann[best[1] + (best[1] === 'stand' ? '3' : '')] = datum;
    }
  }
  const varFehlt = () => { let n = 0; for (const pl of Object.keys(C.VARIANTEN)) for (let i = 1; i < 3; i++) if (!S.hatVariante(pl, i)) n++; return n; };
  const tage = [];
  let zuletztStd = null;
  for (let tag = 0; tag < 31; tag++) {
    const datum = (24 + tag > 30 ? (24 + tag - 30) + '.12.' : (24 + tag) + '.11.');
    const gesamtVorher = S.st.gesamt; kaeufeHeute = 0; tipps = 0;
    for (const std of sitzungen) {
      Z.setzeZeit(new Date(2026, 10, 24 + tag, std, 0), 1);
      if (zuletztStd != null) { const weg = ((tag * 24 + std) - zuletztStd) * 3600 - proSitz * 60; S.st.zuletzt = Date.now() - weg * 1000; S.offlineAbrechnen(); S.oeffneKiste(); }
      for (let n = 1; n <= 24; n++) if (S.tuerBereit(n)) S.oeffneTuer(n);
      if (std === sitzungen[0]) {
        S.baueSchneemann();
        if (Z.dezemberTag() === 20 && stimmung20 == null) stimmung20 = S.stimmung();
        if (S.wettbewerbFaellig()) jury = S.wettbewerbAuswerten();
        if (mini) for (const [name, pkt] of Object.entries(mini.punkte)) { if (!S.miniOffen(name)) continue; for (let k = 0; k < mini.runden; k++) { S.miniErgebnis(name, pkt); if (name === 'back') S.fuelleDose(Array(13).fill('zimtstern')); } }
      }
      S.lauf.lernen = false; S.lauf.chefT = 0; S.st.tipps.karte_mehr = true; S.st.tipps.chef = true; S.briefPruefen(); if (S.st.briefe && S.st.briefe.aktiv && S.st.briefe.aktiv.dank) S.briefDank();
      let takt = 0, t5 = 0;
      for (let t = 0; t < proSitz * 60; t += dt) { S.update(dt); S.lauf.chefT = 0; takt += dt; t5 += dt; if (takt >= 0.35) { takt = 0; bedienen(); } if (t5 >= 5) { t5 = 0; S.pruefeFreischaltungen(); ZL.pruefe(); E.pruefe(); A.heute().forEach((a, i) => { if (A.fertig(a) && !a.abgeholt) A.abholen(i); }); kaufen(datum); } }
      kaufen(datum); zuletztStd = tag * 24 + std;
    }
    tage.push({ datum, verdient: Math.round(S.st.gesamt - gesamtVorher), kaeufe: kaeufeHeute, proMin: Math.round(S.einnahmenProMinute()),
      herz: S.stimmung(), ruf: S.ruf ? S.ruf().stufe : null, tippsJeMin: Math.round(tipps / minTag) });
    const fehlt = S.zumZiel().filter((a) => !S.fertigOhneLuxus(a));
    if (fehlt.length === 0 && alleNormal == null) alleNormal = datum;
    if (fehlt.length === 0 && varFehlt() === 0 && alleVar == null) alleVar = datum;
    if (datum === '24.12.') break;
  }
  const varGesamt = Object.keys(C.VARIANTEN).length * 2;
  return { min: minTag, art, karte, angebot: S.produkteFrei().map((p) => p.id).join('+'), sparen, luxusFaktor, normalFertig: alleNormal, variantenFertig: alleVar,
    normalFehlt: S.zumZiel().filter((a) => !S.fertigOhneLuxus(a)).length, varianten: varGesamt - varFehlt() + '/' + varGesamt,
    luxus: luxWann, stimmung20, jury: jury && jury.stimmung, geldEnde: S.st.geld, verdient: S.st.gesamt, tage };
};
