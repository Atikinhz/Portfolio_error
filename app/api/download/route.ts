import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export const dynamic = 'force-dynamic';

function getOrGenerateZip(): string {
  const tmpPath = '/tmp/portfolio-website.zip';
  const publicPath = path.join(process.cwd(), 'public', 'website.zip');
  const rootPath = path.join(process.cwd(), 'website.zip');

  for (const candidate of [publicPath, tmpPath, rootPath]) {
    try {
      if (fs.existsSync(candidate)) {
        const stat = fs.statSync(candidate);
        if (stat.size > 10 * 1024 * 1024) {
          return candidate;
        }
      }
    } catch {}
  }

  // Generate on demand
  const scriptPath = path.join(process.cwd(), 'scripts', 'create_site_zip.py');
  execSync(`python3 "${scriptPath}" "${tmpPath}"`, {
    cwd: process.cwd(),
    timeout: 60000,
  });

  return tmpPath;
}

export async function GET(req: NextRequest) {
  try {
    const zipPath = getOrGenerateZip();
    const stat = fs.statSync(zipPath);
    const fileStream = fs.createReadStream(zipPath);

    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        fileStream.on('end', () => {
          controller.close();
        });
        fileStream.on('error', (err) => {
          controller.error(err);
        });
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="portfolio-website.zip"',
        'Content-Length': stat.size.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    console.error('Download error:', err);
    return NextResponse.json(
      { error: 'Failed to generate archive', message: err?.message || String(err) },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  try {
    const zipPath = getOrGenerateZip();
    const stat = fs.statSync(zipPath);
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="portfolio-website.zip"',
        'Content-Length': stat.size.toString(),
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
