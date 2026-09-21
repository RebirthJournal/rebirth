#!/usr/bin/env node
/**
 * Shrinks the raster images under public/img, in place, before a build.
 *
 * Source images are camera originals up to 7360x4912 / 18MB. Article figures
 * render at most 37.5em (~750px) wide, so a 1600px long edge covers 2x DPR
 * with headroom. Scaling the inputs means everything the build derives from
 * them — the public copy and the content-hashed asset copy — is already small,
 * with no separate pass over build artefacts.
 *
 * Running here rather than after the build costs nothing to the repository:
 * this only ever executes against a throwaway checkout (see "When it runs"),
 * so the full-fidelity originals in git stay the source of truth.
 *
 * Usage:
 *   node scripts/optimize-images.ts [dir...] [--dry] [--max-edge=N] [--force]
 */
import { cpus } from "node:os";
import { readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { FormatEnum, Sharp } from "sharp";

/** One encode attempt: takes a prepared pipeline and returns an encoded one. */
type Encoder = (pipeline: Sharp) => Sharp;

/** Quality candidates for a single format, best first. */
type Ladder = readonly Encoder[];

interface Options {
  /** Absolute directories to rewrite. */
  dirs: string[];
  /** Report what would change without writing. */
  dry: boolean;
  /** Longest edge, in pixels, of any emitted image. */
  maxEdge: number;
}

interface Rewrite {
  rel: string;
  from: number;
  to: number;
  dims: string;
}

/**
 * Why a candidate was left alone. Counted so a build log shows at a glance
 * what was skipped rather than leaving it to be inferred.
 */
type SkipReason = "not smaller" | "unknown format" | "unreadable";

interface Outcome {
  /** Bytes the file occupies on disk after processing. */
  after: number;
  rewrite?: Rewrite;
  skip?: SkipReason;
  failure?: { rel: string; reason: string };
}

interface Candidate {
  file: string;
  size: number;
}

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

const DEFAULT_TARGETS = ["public/img"];
const MAX_EDGE_FLAG = "--max-edge=";
const DEFAULT_MAX_EDGE = 1600;

/**
 * The one thing that decides whether a file is worth decoding.
 *
 * This is deliberately the *only* gate. A 3MB PNG at 1086x1562 is already
 * within MAX_EDGE yet badly compressed, so a dimension check would skip it —
 * those account for ~13MB across this repo. Byte weight is the honest signal:
 * everything above this floor is a candidate, everything below it is already
 * cheap to ship and is skipped without ever being decoded.
 *
 * Kept above the brand assets (largest is the 321KB horizontal logo) so that
 * identity artwork — including the favicon — is never requantized.
 */
const MIN_BYTES = 384 * 1024;

/** Extension is used only to decide whether a file is worth decoding at all. */
const IMAGE_EXTENSIONS: Readonly<Partial<Record<string, true>>> = {
  ".jpg": true,
  ".jpeg": true,
  ".png": true,
  ".webp": true,
};

const JPEG_LADDER: Ladder = [
  (p) => p.jpeg({ quality: 85, chromaSubsampling: "4:4:4", mozjpeg: true }),
  (p) => p.jpeg({ quality: 80, chromaSubsampling: "4:4:4", mozjpeg: true }),
  (p) => p.jpeg({ quality: 75, chromaSubsampling: "4:4:4", mozjpeg: true }),
];

/**
 * Encoding ladders, tried in order until one produces a file smaller than the
 * input. The first candidate is the highest quality we are willing to ship;
 * later rungs only run for images that are already tightly compressed, where
 * the earlier settings would have grown the file.
 *
 * Keyed by the format sharp detects in the file, not by its extension: at
 * least one asset (Lily Yang 午间杂谈.png) is JPEG data behind a .png name, and
 * encoding it as PNG would both inflate it and lose fidelity. The extension is
 * left alone so existing references keep resolving.
 */
const ENCODERS: Readonly<Partial<Record<keyof FormatEnum, Ladder>>> = {
  jpeg: JPEG_LADDER,
  png: [(p) => p.png({ compressionLevel: 9, effort: 10, palette: true, quality: 92 })],
  webp: [(p) => p.webp({ quality: 85 }), (p) => p.webp({ quality: 78 })],
};

/**
 * How many images to encode at once. The work is almost entirely inside
 * libvips, so overlapping a few keeps the cores busy without holding many
 * decoded bitmaps at once.
 */
const CONCURRENCY = Math.max(1, Math.min(8, cpus().length));

const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(2)}MB`;

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else if (IMAGE_EXTENSIONS[path.extname(entry.name).toLowerCase()]) out.push(full);
  }
  return out;
}

function parseArgs(argv: readonly string[]): Options {
  const maxEdgeArg = argv.find((arg) => arg.startsWith(MAX_EDGE_FLAG));
  const maxEdge = maxEdgeArg ? Number(maxEdgeArg.slice(MAX_EDGE_FLAG.length)) : DEFAULT_MAX_EDGE;
  if (!Number.isFinite(maxEdge) || maxEdge < 1) {
    throw new Error(`--max-edge must be a positive number, got ${maxEdgeArg}`);
  }

  const positional = argv.filter((arg) => !arg.startsWith("--"));
  return {
    dry: argv.includes("--dry"),
    maxEdge,
    dirs: (positional.length ? positional : DEFAULT_TARGETS).map((dir) => path.resolve(root, dir)),
  };
}

/** Runs `fn` over `items` with a bounded number of concurrent workers. */
async function mapPool<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  // Callers aggregate the results, so completion order is not meaningful and
  // the outputs are simply collected as they land.
  const results: R[] = [];
  let cursor = 0;

  const worker = async (): Promise<void> => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results.push(await fn(items[index] as T));
    }
  };

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Rewrites one image if, and only if, a re-encode produces fewer bytes than
 * the file already occupies on disk.
 *
 * The image is never loaded into a Buffer: sharp reads from the path, so
 * libvips decodes straight from disk instead of materialising an 18MB copy in
 * the JS heap on the way through.
 */
async function optimizeFile(file: string, size: number, options: Options): Promise<Outcome> {
  const meta = await sharp(file, { failOn: "none" }).metadata();

  const { width: rawWidth, height: rawHeight } = meta;
  if (!rawWidth || !rawHeight) return { after: size, skip: "unreadable" };

  const ladder = ENCODERS[meta.format];
  // Containers we do not re-encode (gif, avif, tiff, ...) ship as they are.
  if (!ladder) return { after: size, skip: "unknown format" };

  // EXIF orientations 5-8 swap the displayed axes; measure against the
  // dimensions a viewer actually sees.
  const orientation = meta.orientation ?? 1;
  const swapped = orientation >= 5 && orientation <= 8;
  const width = swapped ? rawHeight : rawWidth;
  const height = swapped ? rawWidth : rawHeight;

  const scale = Math.min(1, options.maxEdge / Math.max(width, height));
  const resizedWidth = Math.round(width * scale);
  const resizedHeight = Math.round(height * scale);

  // Fresh pipeline per attempt: a sharp instance cannot be reused across
  // encoders once toBuffer() has consumed it.
  const build = (): Sharp => {
    const pipeline = sharp(file, { failOn: "none" }).rotate();
    return scale < 1
      ? pipeline.resize({
          width: resizedWidth,
          height: resizedHeight,
          fit: "inside",
          withoutEnlargement: true,
        })
      : pipeline;
  };

  let best: Buffer | undefined;
  for (const encode of ladder) {
    const candidate = await encode(build()).toBuffer();
    if (best === undefined || candidate.length < best.length) best = candidate;
    // Stop at the first rung that beats the original, so the highest quality
    // that actually helps is the one that ships.
    if (best.length < size) break;
  }

  if (best === undefined || best.length >= size) return { after: size, skip: "not smaller" };

  if (!options.dry) await writeFile(file, best);

  return {
    after: best.length,
    rewrite: {
      rel: path.relative(root, file),
      from: size,
      to: best.length,
      dims: `${width}x${height} -> ${resizedWidth}x${resizedHeight}`,
    },
  };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);

  // Locally the working tree is the developer's source of truth, so the
  // rewrite is opt-in. On Vercel the checkout is disposable and nothing is
  // ever committed from it, which is what keeps originals authoritative in git.
  if (!process.env.VERCEL && !argv.includes("--force")) {
    console.log(
      "not running: this rewrites public/img in place and is meant for a disposable checkout.\n" +
        "  use --force (or VERCEL=1) to run it here; git holds the originals either way.",
    );
    return;
  }

  const options = parseArgs(argv);
  const started = Date.now();

  const candidates: Candidate[] = [];
  let totalBytes = 0;
  let underFloor = 0;

  for (const dir of options.dirs) {
    const dirStat = await stat(dir).catch(() => null);
    if (!dirStat?.isDirectory()) {
      console.warn(`skipping missing directory: ${path.relative(root, dir)}`);
      continue;
    }

    for (const file of (await walk(dir)).sort()) {
      // The size floor is applied here, before any decode, so files that
      // already ship fine never cost more than a stat.
      const size = await stat(file).then(
        (s) => s.size,
        () => 0,
      );
      totalBytes += size;

      if (size <= MIN_BYTES) {
        underFloor += 1;
        continue;
      }
      candidates.push({ file, size });
    }
  }

  const outcomes = await mapPool(candidates, CONCURRENCY, ({ file, size }) =>
    optimizeFile(file, size, options).catch((error): Outcome => ({
      after: size,
      failure: {
        rel: path.relative(root, file),
        reason: error instanceof Error ? error.message : String(error),
      },
    })),
  );

  const rewrites: Rewrite[] = [];
  const failures: { rel: string; reason: string }[] = [];
  const reasons = new Map<SkipReason, number>();
  let saved = 0;

  for (const outcome of outcomes) {
    if (outcome.rewrite) {
      rewrites.push(outcome.rewrite);
      saved += outcome.rewrite.from - outcome.rewrite.to;
      continue;
    }
    if (outcome.failure) failures.push(outcome.failure);
    else if (outcome.skip) reasons.set(outcome.skip, (reasons.get(outcome.skip) ?? 0) + 1);
  }

  for (const r of rewrites.sort((a, b) => b.from - a.from)) {
    console.log(`  ${mb(r.from).padStart(9)} -> ${mb(r.to).padStart(9)}  ${r.dims}  ${r.rel}`);
  }
  if (failures.length) {
    console.error(`\n${failures.length} file(s) failed:`);
    for (const f of failures) console.error(`  ${f.rel}: ${f.reason}`);
  }

  const skipped = underFloor + [...reasons.values()].reduce((a, b) => a + b, 0);
  const detail = [...reasons].map(([reason, count]) => `${reason} ${count}`).join(", ");

  console.log(
    [
      "",
      `${options.dry ? "[dry run] " : ""}scanned ${candidates.length + underFloor} image(s) in ${((Date.now() - started) / 1000).toFixed(1)}s`,
      `  decoded   : ${candidates.length} (${CONCURRENCY} at a time)`,
      `  rewritten : ${rewrites.length}`,
      `  skipped   : ${skipped} — ${underFloor} under ${(MIN_BYTES / 1024).toFixed(0)}KB never decoded${detail ? `, ${detail}` : ""}`,
      `  failed    : ${failures.length}`,
      `  total     : ${mb(totalBytes)} -> ${mb(totalBytes - saved)} (${saved > 0 ? `${(totalBytes / (totalBytes - saved)).toFixed(1)}x smaller` : "unchanged"})`,
    ].join("\n"),
  );

  if (failures.length) process.exitCode = 1;
}

await main();
