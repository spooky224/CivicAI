import { useEffect, useRef, useState } from 'react';

const P = {
  logo: 'M12 2.5s6 6.2 6 11a6 6 0 0 1-12 0c0-4.8 6-11 6-11zM9 14a3 3 0 0 0 3 3',
  mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM19 11a7 7 0 0 1-14 0M12 18v3',
  image: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9.5h.01',
  down: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  alert: 'M12 3l10 18H2L12 3zM12 10v5M12 18h.01',
  check: 'M5 12l5 5 9-9',
  shield: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z',
  moon: 'M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5L19 19M5 19l1.5-1.5M17.5 6.5L19 5',
  copy: 'M9 9h11v11H9zM5 15V4h11',
  x: 'M6 6l12 12M18 6L6 18',
  stop: 'M7 7h10v10H7z',
  send: 'M4 12l16-8-6 16-3-7-7-1z',
  book: 'M4 5a2 2 0 0 1 2-2h6v17H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-6v17h6a2 2 0 0 1 2 2z',
  users: 'M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 20a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M17 14a6 6 0 0 1 4 6',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 11v5M12 8h.01',
  print: 'M7 9V3h10v6M7 17H4v-6h16v6h-3M7 14h10v7H7z',
  plus: 'M12 5v14M5 12h14',
};
const Ic = ({ n, s = 18 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={P[n]} /></svg>
);

const SEV = { low: 1, moderate: 2, high: 3, critical: 4, undetermined: 0 };
const SEV_LABEL = {
  en: { low: 'Low', moderate: 'Moderate', high: 'High', critical: 'Critical', undetermined: 'Undetermined' },
  fr: { low: 'Faible', moderate: 'Modérée', high: 'Élevée', critical: 'Critique', undetermined: 'Indéterminée' },
};
const TYPE_LABEL = {
  en: { flood: 'Flood', forest_fire: 'Wildfire', structural_emergency: 'Structural emergency', other: 'Other', unclear: 'Unclear' },
  fr: { flood: 'Inondation', forest_fire: 'Feu de forêt', structural_emergency: 'Urgence structurelle', other: 'Autre', unclear: 'Indéterminé' },
};

const T = {
  en: {
    tag: 'AI decision support for disaster response', describe: 'Describe the incident', ph: 'What is happening? Where? Who is at risk?',
    examples: 'Try an example', image: 'Add a photo', audio: 'Add audio', drop: 'Drop or click', record: 'Record voice', stop: 'Stop recording',
    generate: 'Generate report', working: 'Analysing…', recent: 'Recent reports', summary: 'Summary', reported: 'What was reported',
    observed: 'What the image shows', guidance: 'Guidance from the knowledge base', assess: 'System assessment', risks: 'Main risks',
    affected: 'Possibly affected', conflicts: 'Conflicts between sources', missing: 'Missing information', none: 'None',
    noImage: 'No image was analysed.', evidence: 'Evidence submitted', transcript: 'Voice transcript', pdf: 'Download PDF', copy: 'Copy', copied: 'Copied',
    print: 'Print', tech: 'Pipeline details', validation: 'Automatic validation', passed: 'Checks passed', flagged: 'Needs review',
    coverage: 'Knowledge coverage', model: 'Model', step: 'Step', time: 'Time', type: 'Type', severity: 'Severity',
    emptyT: 'Ready when you are', emptyP: 'Describe an incident by text, photo or voice. DisasterAI returns a sourced, structured preliminary report in seconds.',
    h1: 'Understand', h1p: 'The incident is classified and key facts are extracted.', h2: 'Retrieve', h2p: 'Relevant emergency guidance is searched in a curated knowledge base.',
    h3: 'Assess & verify', h3p: 'Risks are assessed, the report is written and automatically validated.',
    needMore: 'More information needed', needMoreP: 'The report was too vague to assess. Please add details:',
    stages: ['Understanding the incident', 'Analysing the image', 'Searching the knowledge base', 'Assessing risks', 'Writing the report', 'Validating the report'],
    mic_err: 'Microphone unavailable. Check browser permissions.', sec: 'Sources are cited. This tool supports, and never replaces, emergency services.',
    ex: ['Flood near a river', 'Wildfire close to homes', 'Collapsed building'],
    exTxt: [
      'Severe flooding is affecting homes near a river. Water is entering houses and several families are still inside.',
      'A forest fire is spreading quickly toward a residential area. Thick smoke and strong wind, residents are starting to leave.',
      'A residential building partially collapsed after an explosion. People may be trapped under the rubble.',
    ],
  },
  fr: {
    tag: "Aide à la décision par IA pour la gestion de crise", describe: "Décrivez l'incident", ph: "Que se passe-t-il ? Où ? Qui est en danger ?",
    examples: 'Essayer un exemple', image: 'Ajouter une photo', audio: 'Ajouter un audio', drop: 'Déposer ou cliquer', record: 'Enregistrer la voix', stop: "Arrêter l'enregistrement",
    generate: 'Générer le rapport', working: 'Analyse en cours…', recent: 'Rapports récents', summary: 'Résumé', reported: 'Ce qui a été signalé',
    observed: "Ce que montre l'image", guidance: 'Consignes de la base de connaissances', assess: 'Évaluation du système', risks: 'Risques principaux',
    affected: 'Éléments possiblement touchés', conflicts: 'Conflits entre sources', missing: 'Informations manquantes', none: 'Aucun',
    noImage: "Aucune image n'a été analysée.", evidence: 'Éléments fournis', transcript: 'Transcription vocale', pdf: 'Télécharger le PDF', copy: 'Copier', copied: 'Copié',
    print: 'Imprimer', tech: 'Détails du pipeline', validation: 'Validation automatique', passed: 'Contrôles réussis', flagged: 'À vérifier',
    coverage: 'Couverture des connaissances', model: 'Modèle', step: 'Étape', time: 'Durée', type: 'Type', severity: 'Gravité',
    emptyT: 'Prêt quand vous l’êtes', emptyP: "Décrivez un incident par texte, photo ou voix. DisasterAI produit un rapport préliminaire structuré et sourcé en quelques secondes.",
    h1: 'Comprendre', h1p: "L'incident est classé et les faits clés sont extraits.", h2: 'Rechercher', h2p: "Les consignes pertinentes sont recherchées dans une base de connaissances validée.",
    h3: 'Évaluer et vérifier', h3p: 'Les risques sont évalués, le rapport est rédigé puis validé automatiquement.',
    needMore: "Plus d'informations nécessaires", needMoreP: "Le signalement est trop vague pour être évalué. Merci d'ajouter des détails :",
    stages: ["Compréhension de l'incident", "Analyse de l'image", 'Recherche dans la base de connaissances', 'Évaluation des risques', 'Rédaction du rapport', 'Validation du rapport'],
    mic_err: "Micro indisponible. Vérifiez les autorisations du navigateur.", sec: "Les sources sont citées. Cet outil assiste, sans jamais remplacer, les services d'urgence.",
    ex: ['Inondation près du fleuve', 'Feu près des habitations', 'Effondrement'],
    exTxt: [
      "Une inondation sévère touche des maisons près d'une rivière. L'eau entre dans les maisons et plusieurs familles sont encore à l'intérieur.",
      "Un feu de forêt se propage rapidement vers un quartier résidentiel. Fumée épaisse et vent fort, les habitants commencent à partir.",
      "Un immeuble résidentiel s'est partiellement effondré après une explosion. Des personnes pourraient être piégées sous les décombres.",
    ],
  },
};

const sevColor = (s) => `var(--${SEV[s] !== undefined ? s : 'undetermined'})`;

function Dropzone({ icon, label, accept, file, onFile, preview, t }) {
  const ref = useRef();
  const [over, setOver] = useState(false);
  return (
    <div
      className={`drop ${over ? 'over' : ''} ${file ? 'filled' : ''}`}
      onClick={() => ref.current.click()}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]); }}
    >
      <input ref={ref} type="file" accept={accept} onChange={(e) => e.target.files[0] && onFile(e.target.files[0])} />
      {file ? (
        <div>
          {preview && <img src={preview} alt="" />}
          {!preview && <Ic n={icon} s={26} />}
          <div className="fname">{file.name}</div>
          <button type="button" className="x" onClick={(e) => { e.stopPropagation(); onFile(null); ref.current.value = ''; }}><Ic n="x" s={12} /></button>
        </div>
      ) : (
        <div><Ic n={icon} s={24} /><div style={{ fontWeight: 600, marginTop: 4 }}>{label}</div><div style={{ fontSize: 11 }}>{t.drop}</div></div>
      )}
    </div>
  );
}

const Bullets = ({ items, f = (x) => x.text, mk = 'check', cls = '', empty }) =>
  items?.length ? (
    <ul className={`list ${cls}`}>
      {items.map((x, i) => <li key={i}><span className="mk"><Ic n={mk} s={16} /></span><span>{f(x)}</span>{x.entry_id && <span className="eid">{x.entry_id.split(':')[0]}</span>}{x.confidence && <span className={`conf ${x.confidence}`}>{x.confidence}</span>}</li>)}
    </ul>
  ) : <p className="muted">{empty}</p>;

export default function App() {
  const [showAll, setShowAll] = useState(false);
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('theme') || 'light'; } catch { return 'light'; } });
  const [lang, setLang] = useState('en');
  const [text, setText] = useState('');
  const [image, setImage] = useState(null);
  const [audio, setAudio] = useState(null);
  const [imgUrl, setImgUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [secs, setSecs] = useState(0);
  const [res, setRes] = useState(null);
  const [sent, setSent] = useState({ hasImage: false, imgUrl: null });
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [hist, setHist] = useState(() => { try { return JSON.parse(localStorage.getItem('hist') || '[]'); } catch { return []; } });
  const mediaRef = useRef(null);
  const t = T[lang];

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); try { localStorage.setItem('theme', theme); } catch {} }, [theme]);
  useEffect(() => { if (!image) return setImgUrl(null); const u = URL.createObjectURL(image); setImgUrl(u); return () => URL.revokeObjectURL(u); }, [image]);
  useEffect(() => {
    if (!loading) return;
    setStage(0); setSecs(0);
    const a = setInterval(() => setStage((s) => Math.min(s + 1, 5)), 5000);
    const b = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => { clearInterval(a); clearInterval(b); };
  }, [loading]);

  async function toggleRec() {
    if (recording) { mediaRef.current?.stop(); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const type = rec.mimeType || 'audio/webm';
        const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm';
        setAudio(new File([new Blob(chunks, { type })], `recording.${ext}`, { type }));
        setRecording(false);
      };
      mediaRef.current = rec; rec.start(); setRecording(true);
    } catch { setError(t.mic_err); }
  }

  async function submit(e) {
    e.preventDefault();
    setLoading(true); setError(''); setRes(null); setShowAll(false);
    setSent({ hasImage: !!image, imgUrl });
    const fd = new FormData();
    fd.append('incident_text', text);
    fd.append('output_language', lang);
    if (image) fd.append('image', image);
    if (audio) fd.append('audio', audio);
    try {
      const r = await fetch('/api/analyze', { method: 'POST', body: fd });
      const raw = await r.text();
      let data; try { data = JSON.parse(raw); } catch { throw new Error('Server said: ' + raw.slice(0, 200)); }
      if (!r.ok) throw new Error(data.message || 'Request failed');
      setRes(data);
      if (data.report) {
        const item = { id: Date.now(), at: new Date().toLocaleTimeString(), text: (text || data.transcript || '').slice(0, 90), sev: data.severity, res: { ...data } };
        const next = [item, ...hist].slice(0, 5);
        setHist(next);
        try { localStorage.setItem('hist', JSON.stringify(next)); } catch {}
      }
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  async function downloadPdf() {
    setPdfBusy(true);
    try {
      const r = await fetch('/api/report/pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ report: res.report, incident_type: res.incident_type }) });
      const url = URL.createObjectURL(await r.blob());
      Object.assign(document.createElement('a'), { href: url, download: 'incident-report.pdf' }).click();
    } catch { setError('PDF failed'); }
    setPdfBusy(false);
  }

  function copy() {
    navigator.clipboard.writeText(res.report_markdown || '').then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  }

  const rep = res?.report;
  const stages = t.stages.map((label, i) => ({ label, i })).filter((s) => s.i !== 1 || image);
  const activeIdx = Math.min(stage, stages.length - 1);
  const sev = rep?.severity || res?.severity || 'undetermined';
  const valid = res?.validation?.status === 'pass';

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <div className="logo"><Ic n="logo" s={22} /></div>
          <div className="brand"><h1>DisasterAI</h1><p>{t.tag}</p></div>
          <div className="spacer" />
          <div className="seg">
            <button className={lang === 'en' ? 'on' : ''} onClick={() => setLang('en')}>EN</button>
            <button className={lang === 'fr' ? 'on' : ''} onClick={() => setLang('fr')}>FR</button>
          </div>
          <button className="icon-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="theme"><Ic n={theme === 'light' ? 'moon' : 'sun'} /></button>
        </div>
      </header>

      <main className="layout">
        <aside className="side">
          <form className="card" onSubmit={submit}>
            <h2><span className="num">1</span>{t.describe}</h2>
            <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t.ph} />
            <div className="chips">
              <span className="muted" style={{ fontSize: 12, alignSelf: 'center' }}>{t.examples}:</span>
              {t.ex.map((l, i) => <button type="button" key={i} className="chip" onClick={() => setText(t.exTxt[i])}>{l}</button>)}
            </div>
            <div className="drops">
              <Dropzone icon="image" label={t.image} accept="image/*" file={image} onFile={setImage} preview={imgUrl} t={t} />
              <Dropzone icon="mic" label={t.audio} accept="audio/*" file={audio} onFile={setAudio} t={t} />
            </div>
            <div className="rec">
              <button type="button" className={`btn ${recording ? 'rec-on' : ''}`} onClick={toggleRec}>
                {recording ? <><span className="dot" />{t.stop}</> : <><Ic n="mic" s={16} />{t.record}</>}
              </button>
            </div>
            <button className="btn primary" disabled={loading || recording || (!text.trim() && !audio)}>
              <Ic n="send" s={18} />{loading ? `${t.working} ${secs}s` : t.generate}
            </button>
          </form>

          {hist.length > 0 && (
            <div className="card">
              <p className="label">{t.recent}</p>
              <div className="hist">
                {hist.map((h) => (
                  <button key={h.id} onClick={() => { setRes(h.res); setError(''); }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: sevColor(h.sev), flex: 'none' }} />
                    <span className="t">{h.text || '—'}</span><small>{h.at}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="stack">
          {error && <div className="card err fade"><Ic n="alert" /><div>{error}</div></div>}

          {loading && (
            <div className="card fade">
              <h2><span className="num"><Ic n="shield" s={14} /></span>{t.working} <span className="muted">· {secs}s</span></h2>
              <div className="pipe">
                {stages.map((s, idx) => (
                  <div key={s.i} className={`pipe-row ${idx < activeIdx ? 'done' : idx === activeIdx ? 'active' : ''}`}>
                    <span className="pipe-ic">{idx < activeIdx && <Ic n="check" s={13} />}</span>{s.label}
                  </div>
                ))}
              </div>
              <div className="skeleton" style={{ width: '90%', marginTop: 20 }} /><div className="skeleton" style={{ width: '70%' }} /><div className="skeleton" style={{ width: '80%' }} />
            </div>
          )}

          {!loading && !res && !error && (
            <div className="card empty fade">
              <div className="big"><Ic n="shield" s={34} /></div>
              <h2 style={{ justifyContent: 'center', fontSize: 22, margin: '0 0 8px' }}>{t.emptyT}</h2>
              <p className="muted" style={{ maxWidth: 520, margin: '0 auto' }}>{t.emptyP}</p>
              <div className="steps3">
                <div><b>1. {t.h1}</b>{t.h1p}</div><div><b>2. {t.h2}</b>{t.h2p}</div><div><b>3. {t.h3}</b>{t.h3p}</div>
              </div>
            </div>
          )}

          {!loading && res && !rep && (
            <div className="card fade">
              <h2><Ic n="info" />{t.needMore}</h2>
              <p className="muted">{t.needMoreP}</p>
              <Bullets items={res.missing_information} f={(x) => x} mk="plus" cls="warnl" empty={t.none} />
            </div>
          )}

          {!loading && rep && (
            <>
              <div className="card hero fade" style={{ '--sev': sevColor(sev) }}>
                <div className="hero-top">
                  <span className="sev">{t.severity}: {SEV_LABEL[lang][sev]}</span>
                  <span className="pill">{TYPE_LABEL[lang][res.incident_type] || res.incident_type}</span>
                  <span className={`pill ${valid ? 'ok' : 'warn'}`}><Ic n={valid ? 'check' : 'alert'} s={14} />{valid ? t.passed : t.flagged}</span>
                  {rep.location && <span className="pill">{rep.location}</span>}
                </div>
                <div className="gauge">{[1, 2, 3, 4].map((n) => <i key={n} className={n <= SEV[sev] ? 'on' : ''} />)}</div>
                <p className="sum">{rep.summary}</p>
                <div className="actions">
                  <button className="btn solid" onClick={downloadPdf} disabled={pdfBusy}><Ic n="down" s={16} />{pdfBusy ? '…' : t.pdf}</button>
                  <button className="btn" onClick={copy}><Ic n="copy" s={16} />{copied ? t.copied : t.copy}</button>
                  <button className="btn" onClick={() => window.print()}><Ic n="print" s={16} />{t.print}</button>
                </div>
              </div>

              {(res.transcript || sent.hasImage) && (
                <div className="card evidence fade">
                  <h3><span className="num"><Ic n="info" s={14} /></span>{t.evidence}</h3>
                  {sent.hasImage && sent.imgUrl && <img src={sent.imgUrl} alt="" />}
                  {res.transcript && (<><p className="label">{t.transcript}</p><div className="quote">{res.transcript}</div></>)}
                </div>
              )}

              <div className="grid2 fade">
                <div className="card"><h3><span className="num">1</span>{t.reported}</h3><Bullets items={rep.reported} mk="users" empty={t.none} /></div>
                <div className="card"><h3><span className="num">2</span>{t.observed}</h3><Bullets items={rep.observed} mk="image" empty={t.noImage} /></div>
              </div>

              <div className="card fade">
                <h3><span className="num">3</span>{t.guidance}</h3>
                <Bullets items={showAll ? rep.knowledge?.guidance : rep.knowledge?.guidance?.slice(0, 5)} mk="book" empty={rep.knowledge?.no_guidance_statement || t.none} />
                {rep.knowledge?.guidance?.length > 5 && (
                  <button type="button" className="btn" style={{ marginTop: 10 }} onClick={() => setShowAll(!showAll)}>
                    {showAll ? '−' : `+${rep.knowledge.guidance.length - 5}`}
                  </button>
                )}
                {rep.knowledge?.no_guidance_statement && rep.knowledge?.guidance?.length > 0 && <p className="muted" style={{ marginTop: 10 }}>{rep.knowledge.no_guidance_statement}</p>}
              </div>

              <div className="card fade">
                <h3><span className="num">4</span>{t.assess}</h3>
                <div className="grid2">
                  <div><p className="label">{t.risks}</p><Bullets items={rep.assessment?.risks} mk="alert" cls="risk" empty={t.none} /></div>
                  <div><p className="label">{t.affected}</p><Bullets items={rep.assessment?.possibly_affected} mk="users" empty={t.none} /></div>
                </div>
                <p className="label" style={{ marginTop: 16 }}>{t.conflicts}</p>
                <Bullets items={rep.assessment?.conflicts} f={(x) => x} mk="alert" cls="warnl" empty={t.none} />
                {rep.assessment?.unverified?.length > 0 && (<>
                  <p className="label" style={{ marginTop: 16 }}>{lang === 'fr' ? "Non vérifiable avec l'image" : 'Not verifiable from the image'}</p>
                  <Bullets items={rep.assessment.unverified} f={(x) => x} mk="info" empty="" />
                </>)} 
              </div>

              <div className="card fade">
                <h3><span className="num">5</span>{t.missing}</h3>
                <Bullets items={[...(rep.uncertainties || []), ...(rep.information_needed || [])]} f={(x) => x} mk="plus" cls="warnl" empty={t.none} />
                {rep.image_limits?.length > 0 && <p className="muted" style={{ marginTop: 10 }}>{lang === 'fr' ? "L'image ne permet pas de déterminer : " : 'The image cannot tell: '}{rep.image_limits.join(' · ')}</p>}
              </div>

              <div className="card fade">
                <details className="tech">
                  <summary><span className="num"><Ic n="shield" s={14} /></span>{t.tech}</summary>
                  <p className="muted" style={{ marginTop: 12 }}>
                    {t.validation}: <b>{res.validation?.status}</b>{res.validation?.repaired ? ' (auto-repaired)' : ''} · {t.coverage}: <b>{res.knowledge_coverage}</b>
                  </p>
                  <table className="mt">
                    <thead><tr><th>{t.step}</th><th>{t.model}</th><th>{t.time}</th></tr></thead>
                    <tbody>{(res.models_used || []).map((m, i) => <tr key={i}><td>{m.step}</td><td>{m.model}</td><td>{m.seconds}s</td></tr>)}</tbody>
                  </table>
                </details>
              </div>

              <p className="disc">{rep.disclaimer}<br />{t.sec}</p>
            </>
          )}
        </section>
      </main>
    </>
  );
}