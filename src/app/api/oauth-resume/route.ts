import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  const cookieStore = await cookies();
  const oauthRedirect = cookieStore.get('oauth_redirect')?.value;

  if (!oauthRedirect) {
    return NextResponse.json({ url: null });
  }

  cookieStore.delete('oauth_redirect');
  return NextResponse.json({ url: oauthRedirect });
}
