import { NextRequest } from 'next/server';
export const runtime = 'nodejs';
async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!['GET', 'HEAD'].includes(request.method)) {
    const origin = request.headers.get('origin');
    // Next's internal URL can normalize 127.0.0.1 to localhost; the browser's
    // Host header preserves the actual same-origin address used by the visitor.
    const expectedOrigin =
      process.env.APP_ORIGIN || `${request.nextUrl.protocol}//${request.headers.get('host')}`;
    if (origin && origin !== expectedOrigin)
      return Response.json({ message: 'Origin tidak diizinkan' }, { status: 403 });
  }
  const headers = new Headers();
  for (const name of ['content-type', 'cookie']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const result = await fetch(
      `${process.env.API_URL || 'http://127.0.0.1:4000'}/api/v1/${path.map(encodeURIComponent).join('/')}${request.nextUrl.search}`,
      {
        method: request.method,
        headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
        redirect: 'manual',
        cache: 'no-store',
        signal: AbortSignal.timeout(90000),
      },
    );
    const out = new Headers();
    for (const name of ['content-type', 'set-cookie', 'content-disposition', 'location']) {
      const value = result.headers.get(name);
      if (value) out.set(name, value);
    }
    out.set('Cache-Control', 'no-store');
    return new Response(result.body, { status: result.status, headers: out });
  } catch {
    return Response.json(
      { message: 'Server belum siap. Tunggu sebentar lalu coba lagi.' },
      { status: 503 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE };
