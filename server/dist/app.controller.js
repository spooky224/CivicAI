var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Body, Controller, HttpException, Post, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import PDFDocument from 'pdfkit';
import { normalizeReport } from './normalize.js';
const clean = (s) => String(s ?? '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
let AppController = class AppController {
    async analyze(files, body) {
        let text = String(body.incident_text || '').trim();
        let transcript = null;
        const audio = files?.audio?.[0];
        if (audio) {
            const fd = new FormData();
            fd.append('file', new Blob([audio.buffer], { type: audio.mimetype }), audio.originalname || 'audio.webm');
            fd.append('model', 'whisper-large-v3-turbo');
            const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
                method: 'POST',
                headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
                body: fd,
            });
            if (!r.ok)
                throw new HttpException('Transcription failed: ' + (await r.text()).slice(0, 200), 502);
            transcript = (await r.json()).text;
            text = (text + ' ' + transcript).trim();
        }
        const fd = new FormData();
        fd.append('incident_text', text);
        fd.append('output_language', body.output_language || 'en');
        const img = files?.image?.[0];
        if (img)
            fd.append('image', new Blob([img.buffer], { type: img.mimetype }), img.originalname || 'image.jpg');
        const r = await fetch(process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/incident', { method: 'POST', body: fd });
        const data = await r.json().catch(() => null);
        if (!data)
            throw new HttpException('n8n returned an invalid response (is the workflow active?)', 502);
        const out = Array.isArray(data) ? data[0] : data;
        if (out.report)
            out.report = await normalizeReport(out.report, body.output_language === 'fr' ? 'fr' : 'en');
        return { ...out, transcript };
    }
    pdf(body, res) {
        const r = body.report;
        if (!r)
            throw new HttpException('No report', 400);
        const doc = new PDFDocument({ margin: 50 });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="incident-report.pdf"');
        doc.pipe(res);
        const h = (t) => doc.moveDown(0.8).font('Helvetica-Bold').fontSize(13).text(clean(t)).moveDown(0.2);
        const p = (t) => doc.font('Helvetica').fontSize(10.5).text(clean(t));
        const list = (arr, f) => arr?.length ? arr.forEach((x) => p('- ' + f(x))) : p('- None');
        doc.font('Helvetica-Bold').fontSize(20).text('Preliminary incident assessment');
        doc.font('Helvetica').fontSize(10).fillColor('#555')
            .text(clean(`Type: ${body.incident_type}  |  Severity: ${r.severity}  |  Location: ${r.location || 'Not stated'}`))
            .text(clean(`Generated: ${new Date().toISOString()}`)).fillColor('#000');
        h('Summary');
        p(r.summary);
        h('1. What was reported');
        list(r.reported, (x) => x.text);
        h('2. What was observed in the image');
        r.observed?.length ? list(r.observed, (x) => `${x.text} [${x.confidence}]`) : p('No image was analysed.');
        h('3. Guidance from the knowledge base');
        list(r.knowledge?.guidance, (x) => `${x.text} [${x.entry_id}]`);
        if (r.knowledge?.no_guidance_statement) {
            doc.moveDown(0.3);
            p(r.knowledge.no_guidance_statement);
        }
        h('4. System assessment');
        p('Risks:');
        list(r.assessment?.risks, (x) => x.text);
        p('Possibly affected:');
        list(r.assessment?.possibly_affected, (x) => x.text);
        p('Conflicts:');
        list(r.assessment?.conflicts, (x) => x);
        h('5. Missing information and uncertainties');
        list([...(r.uncertainties || []), ...(r.information_needed || [])], (x) => x);
        h('About this report');
        doc.font('Helvetica-Oblique').fontSize(9).text(clean(r.disclaimer));
        doc.end();
    }
};
__decorate([
    Post('analyze'),
    UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }])),
    __param(0, UploadedFiles()),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AppController.prototype, "analyze", null);
__decorate([
    Post('report/pdf'),
    __param(0, Body()),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AppController.prototype, "pdf", null);
AppController = __decorate([
    Controller('api')
], AppController);
export { AppController };
//# sourceMappingURL=app.controller.js.map