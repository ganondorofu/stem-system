import { verifyAccessToken, type JWTPayload } from '@/lib/oauth';

export function requireBearerAuth(request: Request): JWTPayload | Response {
  const auth = request.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'unauthorized', error_description: 'Missing Bearer token' }),
      { status: 401, headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer' } }
    );
  }

  const payload = verifyAccessToken(auth.slice(7));
  if (!payload) {
    return new Response(
      JSON.stringify({ error: 'invalid_token', error_description: 'Invalid or expired token' }),
      { status: 401, headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer error="invalid_token"' } }
    );
  }

  return payload;
}
