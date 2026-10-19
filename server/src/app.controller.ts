import { Body, Controller, HttpException, Post, Res, UploadedFiles, UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import { normalizeReport } from './normalize.js';
const clean = (s: any) =>
  String(s ?? '')
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');

@Controller('api')
export class AppController {
  @Post('analyze')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]))
  async analyze(@UploadedFiles() files: any, @Body() body: any) {
    let text = String(body.incident_text || '').trim();
    let transcript: string | null = null;

    const audio = files?.audio?.[0];
    if (audio) {
      const fd = new FormData();
      fd.append('file', new Blob([audio.buffer as any], { type: audio.mimetype }), audio.originalname || 'audio.webm');
      fd.append('model', 'whisper-large-v3-turbo');
      const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: fd,
      });
      if (!r.ok) throw new HttpException('Transcription failed: ' + (await r.text()).slice(0, 200), 502);
      transcript = (await r.json()).text;
      text = (text + ' ' + transcript).trim();
    }

    const fd = new FormData();
    fd.append('incident_text', text);
    fd.append('output_language', body.output_language || 'en');
    const img = files?.image?.[0];
    if (img) fd.append('image', new Blob([img.buffer as any], { type: img.mimetype }), img.originalname || 'image.jpg');

    const r = await fetch(process.env.N8N_WEBHOOK_URL || 'http://localhost:5678/webhook/incident', { method: 'POST', body: fd });
    const data: any = await r.json().catch(() => null);
    if (!data) throw new HttpException('n8n returned an invalid response (is the workflow active?)', 502);
    const out: any = Array.isArray(data) ? data[0] : data;
    if (out.report) out.report = await normalizeReport(out.report, body.output_language === 'fr' ? 'fr' : 'en');
    return { ...out, transcript };
  }

  @Post('report/pdf')
  pdf(@Body() body: any, @Res() res: Response) {
    const r = body.report;
    if (!r) throw new HttpException('No report', 400);
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="incident-report.pdf"');
    doc.pipe(res);

    const h = (t: string) => doc.moveDown(0.8).font('Helvetica-Bold').fontSize(13).text(clean(t)).moveDown(0.2);
    const p = (t: string) => doc.font('Helvetica').fontSize(10.5).text(clean(t));
    const list = (arr: any[], f: (x: any) => string) =>
      arr?.length ? arr.forEach((x) => p('- ' + f(x))) : p('- None');

    doc.font('Helvetica-Bold').fontSize(20).text('Preliminary incident assessment');
    doc.font('Helvetica').fontSize(10).fillColor('#555')
      .text(clean(`Type: ${body.incident_type}  |  Severity: ${r.severity}  |  Location: ${r.location || 'Not stated'}`))
      .text(clean(`Generated: ${new Date().toISOString()}`)).fillColor('#000');

    h('Summary'); p(r.summary);
    h('1. What was reported'); list(r.reported, (x) => x.text);
    h('2. What was observed in the image');
    r.observed?.length ? list(r.observed, (x) => `${x.text} [${x.confidence}]`) : p('No image was analysed.');
    h('3. Guidance from the knowledge base'); list(r.knowledge?.guidance, (x) => `${x.text} [${x.entry_id}]`);
    if (r.knowledge?.no_guidance_statement) { doc.moveDown(0.3); p(r.knowledge.no_guidance_statement); }
    h('4. System assessment');
    p('Risks:'); list(r.assessment?.risks, (x) => x.text);
    p('Possibly affected:'); list(r.assessment?.possibly_affected, (x) => x.text);
    p('Conflicts:'); list(r.assessment?.conflicts, (x) => x);
    h('5. Missing information and uncertainties');
    list([...(r.uncertainties || []), ...(r.information_needed || [])], (x) => x);
    h('About this report');
    doc.font('Helvetica-Oblique').fontSize(9).text(clean(r.disclaimer));
    doc.end();
  }
}