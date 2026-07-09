import fs from 'node:fs/promises';
import path from 'node:path';
import type express from 'express';
import type { Request, Response } from 'express';
import type { AppConfig } from '../config.js';
import { listOutputs } from './outputs.js';
import { relativeOutputPath, resolveExistingOutputFile } from './outputPath.js';

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
    const abs = await resolveExistingOutputFile(params.config.outputDir, rel);
    if (!TEXT_EXT.has(path.extname(abs).toLowerCase())) {
      res.status(415).json({ error: 'Binary file; use download endpoint.' });
      return;
    }
    const content = await fs.readFile(abs, 'utf8');
    res.json({ path: rel, content, encoding: 'utf-8' });
  }));

  app.get('/api/outputs/download', asyncHandler(async (req, res) => {
    const rel = String(req.query.path ?? '');
    const abs = await resolveExistingOutputFile(params.config.outputDir, rel);
    const data = await fs.readFile(abs);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(path.basename(abs))}`);
    res.send(data);
  }));
}

function asyncHandler(fn: (req: Request, res: Response) => Promise<void>): (req: Request, res: Response) => void {
  return (req, res) => void fn(req, res).catch((error) => {
    const status = isMissingFileError(error) ? 404 : 400;
    res.status(status).json({ error: error instanceof Error ? error.message : String(error) });
  });
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
