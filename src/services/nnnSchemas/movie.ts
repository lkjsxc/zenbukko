import { z } from 'zod';
import type { NormalizedMovieV2 } from './types.js';

const MovieV2Schema = z.object({
  title: z.string().optional(),
  videos: z
    .array(
      z.object({
        files: z.object({ hls: z.object({ url: z.string().url() }).optional() }).optional(),
      }),
    )
    .optional(),
  references: z.array(z.object({ content_urls: z.array(z.string().url()).optional() })).optional(),
});

export function parseMovieV2(input: unknown): NormalizedMovieV2 {
  const movie = MovieV2Schema.parse(input);
  const videoUrl = movie.videos?.[0]?.files?.hls?.url;
  if (!videoUrl) throw new Error('Could not find an HLS URL in movie response (expected videos[0].files.hls.url).');
  const referencePageUrls = (movie.references ?? [])
    .flatMap((r) => r.content_urls ?? [])
    .filter((u) => typeof u === 'string' && u.trim().length > 0);
  return {
    ...(movie.title ? { title: movie.title } : {}),
    videoUrl,
    referencePageUrls,
  };
}
