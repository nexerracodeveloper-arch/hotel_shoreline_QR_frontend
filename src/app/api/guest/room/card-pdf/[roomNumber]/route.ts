import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { roomNumber: string } }
) {
  const roomNumber = params.roomNumber || '201';
  const fileName = `Shoreline-Vista-Room-${roomNumber}-QR-Card.pdf`;
  const defaultFileName = `Shoreline-Vista-Room-201-QR-Card.pdf`;

  const candidatePaths = [
    path.join(process.cwd(), 'public', fileName),
    path.join(process.cwd(), 'public', defaultFileName),
  ];

  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      const fileBuffer = fs.readFileSync(p);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="${fileName}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }
  }

  return NextResponse.redirect(new URL(`/${defaultFileName}`, request.url));
}
