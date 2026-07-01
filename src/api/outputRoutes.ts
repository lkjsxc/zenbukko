import fs from 'node:fs/promises';
import path from 'node:path';
import type express from 'express';
import type { Request, Response } from 'express';
import type { AppConfig } from '../config.js';
import { listOutputs } from './outputs.js';
import { relativeOutputPath, resolveOutputFile } from './outputPath.js';

const TEXT_EXT = new Set(['.md', '.txt', '.srt', '.vtt', '.json', '.html']);

type OutputRouteParams = { config: AppConfig };

export function registerOutputRoutes(app: express.Express, params: OutputRouteParams): void {
  app.get('/api/outputs', asyncHandler(async (_req, res) => {
    const outputs = await listOutputs(params.config.outputDir);
    res.json({
      outputs: outputs.map((o) => ({
        ...o,
        path: relativeOutputPath(params.config.outputDir, o.path),
      })),
    });
  }));

  app.get('/api/outputs/content', asyncHandler(async (req, res) => {
    const rel = String(req.query.path ?? '');
    const abs = resolveOutputFile(params.config.outputDir, rel);
    if (!TEXT_EXT.has(path.extname(abs).toLowerCase())) {
      res.status(415).json({ error: 'Binary file; use download endpoint.' });
      return;
    }
    const content = await fs.readFile(abs, 'utf8');
    res.json({ path: rel, content, encoding: 'utf-8' });
  }));

  app.get('/api/outputs/download', asyncHandler(async (req, res) => {
    const rel = String(req.query.path ?? '');
    const abs = resolveOutputFile(params.config.outputDir, rel);
    const data = await fs.readFile(abs);
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(abs)}"`);
    res.send(data);
  }));
}

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>): (req: Request, res: Response) => void {
  return (req, res) => void fn(req, res).catch((e) => {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  });
}
