const FR = /\b(le|la|les|des|une|vos|votre|vous|et|ou|est|dans|pour|avec|sans|ne|pas|du|au|aux|sur|que|qui|si|il|en|ce|ces|leurs|quittez|apportez|prenez|suivez|évacuez|éteignez|déplacez)\b/gi;
const EN = /\b(the|and|or|is|are|in|for|with|without|not|to|of|on|that|which|if|it|you|your|their|these|this|should|may|from|be|have|has)\b/gi;
const ACCENT = /[àâçéèêëîïôûùüœ]/gi;
function lang(s) {
    const fr = (s.match(FR)?.length || 0) + (s.match(ACCENT)?.length || 0) * 0.7;
    const en = s.match(EN)?.length || 0;
    return fr > en ? 'fr' : 'en';
}
const cache = new Map();
async function translateBatch(texts, target) {
    const name = target === 'en' ? 'English' : 'French';
    try {
        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: process.env.TRANSLATE_MODEL || 'openai/gpt-oss-120b',
                temperature: 0,
                response_format: { type: 'json_object' },
                messages: [
                    {
                        role: 'system',
                        content: `Translate every string of the JSON array to ${name}. Keep the meaning exactly: do not add, remove, soften or strengthen any safety advice. ` +
                            `Keep ids, numbers and units unchanged. Reply with JSON only: {"t": [...]} with exactly the same number of items, in the same order.`,
                    },
                    { role: 'user', content: JSON.stringify(texts) },
                ],
            }),
        });
        if (!r.ok)
            return null;
        const j = await r.json();
        const out = JSON.parse(j.choices[0].message.content).t;
        return Array.isArray(out) && out.length === texts.length && out.every((x) => typeof x === 'string') ? out : null;
    }
    catch {
        return null;
    }
}
export async function normalizeReport(report, target) {
    if (!report)
        return report;
    const r = JSON.parse(JSON.stringify(report));
    const slots = [];
    const addObjs = (arr) => arr?.forEach((o) => slots.push({ get: () => o.text, set: (v) => (o.text = v) }));
    const addStrs = (arr) => arr?.forEach((_, i) => slots.push({ get: () => arr[i], set: (v) => (arr[i] = v) }));
    r.summary && slots.push({ get: () => r.summary, set: (v) => (r.summary = v) });
    addObjs(r.reported);
    addObjs(r.observed);
    addObjs(r.knowledge?.guidance);
    addObjs(r.recommendations);
    addObjs(r.assessment?.basis);
    addObjs(r.assessment?.risks);
    addObjs(r.assessment?.possibly_affected);
    addStrs(r.assessment?.conflicts);
    addStrs(r.uncertainties);
    addStrs(r.information_needed);
    const wrong = slots.filter((s) => s.get() && lang(s.get()) !== target);
    const todo = wrong.filter((s) => !cache.has(target + '|' + s.get()));
    if (todo.length) {
        const out = await translateBatch(todo.map((s) => s.get()), target);
        if (out)
            todo.forEach((s, i) => cache.set(target + '|' + s.get(), out[i]));
    }
    wrong.forEach((s) => {
        const t = cache.get(target + '|' + s.get());
        if (t)
            s.set(t);
    });
    const STOP = new Set(['that', 'this', 'with', 'from', 'unknown', 'exact', 'whether', 'number', 'status', 'dans', 'pour', 'avec', 'inconnu', 'nombre']);
    const tok = (s) => new Set(s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z ]/g, ' ').split(' ').filter((w) => w.length > 3 && !STOP.has(w)));
    const similar = (a, b) => {
        const A = tok(a), B = tok(b);
        if (!A.size || !B.size)
            return false;
        let n = 0;
        A.forEach((w) => B.has(w) && n++);
        return n / Math.min(A.size, B.size) >= 0.6;
    };
    const dedupe = (arr) => arr.reduce((acc, s) => (acc.some((k) => similar(k, s)) ? acc : [...acc, s]), []);
    const NOT_VERIFIABLE = /not determinable|cannot be (determined|evaluated|established|seen|verified)|not visible|no [^.]{0,40}visible|non déterminable|ne peut pas être|pas visible|aucun[^.]{0,30}visible/i;
    if (r.knowledge?.guidance?.length) {
        r.knowledge.no_guidance_statement = null;
        const URGENT = /evacuat|leave|quitt|évacu|shelter|abri|do not enter|n'entrez|turn off|couper|éteign|immediately|immédiatement/i;
        r.knowledge.guidance = [
            ...r.knowledge.guidance.filter((g) => URGENT.test(g.text)),
            ...r.knowledge.guidance.filter((g) => !URGENT.test(g.text)),
        ];
    }
    const allC = r.assessment?.conflicts || [];
    r.assessment.conflicts = allC.filter((c) => !NOT_VERIFIABLE.test(c));
    r.assessment.unverified = allC.filter((c) => NOT_VERIFIABLE.test(c));
    const all = dedupe([...(r.uncertainties || []), ...(r.information_needed || [])]);
    r.image_limits = all.filter((s) => NOT_VERIFIABLE.test(s)).slice(0, 3);
    let needed = all.filter((s) => !NOT_VERIFIABLE.test(s)).slice(0, 6);
    if (!needed.length) {
        needed =
            target === 'fr'
                ? ['Localisation exacte', 'Nombre de personnes touchées', "État de l'évacuation"]
                : ['Exact location', 'Number of people affected', 'Evacuation status'];
    }
    r.uncertainties = needed;
    r.information_needed = [];
    if (r.assessment?.risks)
        r.assessment.risks = r.assessment.risks.slice(0, 5);
    if (r.assessment?.possibly_affected)
        r.assessment.possibly_affected = r.assessment.possibly_affected.slice(0, 4);
    return r;
}
//# sourceMappingURL=normalize.js.map