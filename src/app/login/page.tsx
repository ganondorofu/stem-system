"use client";

import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Club } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import React, { Suspense, useState } from 'react';

const DiscordIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-discord mr-2" viewBox="0 0 16 16">
    <path d="M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.02.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612" />
  </svg>
);

function LoginPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const error = searchParams.get('error');
  const redirect = searchParams.get('redirect');

  // ユーザーID + パスワード方式（Discordを作れない中学生向け）
  // 内部的に {ID}@stem.local の合成メールとして Supabase Auth に登録する。
  // メール送信は一切行わないため、Supabase 側で "Confirm email" を OFF にすること。
  const ID_EMAIL_DOMAIN = 'stem.local';
  const idToEmail = (id: string) => `${id.trim().toLowerCase()}@${ID_EMAIL_DOMAIN}`;

  const [showIdForm, setShowIdForm] = useState(false);
  const [isSignup, setIsSignup] = useState(false);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [idError, setIdError] = useState('');
  const [loading, setLoading] = useState(false);

  const getCallbackUrl = () => {
    if (redirect) {
      let redirectPath = redirect;
      try {
        const parsed = new URL(redirect);
        redirectPath = `${parsed.pathname}${parsed.search}`;
      } catch {}
      document.cookie = `oauth_redirect_client=${encodeURIComponent(redirectPath)};path=/;max-age=600;samesite=lax`;
    }
    return `${window.location.origin}/auth/callback`;
  };

  const getRedirectPath = () => {
    if (!redirect) return '/dashboard';
    try {
      const parsed = new URL(redirect);
      return `${parsed.pathname}${parsed.search}`;
    } catch {
      return redirect.startsWith('/') ? redirect : '/dashboard';
    }
  };

  const handleDiscordLogin = async () => {
    const callbackUrl = getCallbackUrl();
    await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: callbackUrl },
    });
  };

  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = userId.trim();
    if (!id || !password) return;
    if (!/^[a-zA-Z0-9_-]{3,}$/.test(id)) {
      setIdError('IDは英数字・ハイフン・アンダースコア3文字以上で入力してください。');
      return;
    }
    if (isSignup && password.length < 6) {
      setIdError('パスワードは6文字以上にしてください。');
      return;
    }
    setLoading(true);
    setIdError('');
    const email = idToEmail(id);
    const { error } = isSignup
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      if (isSignup && /already registered/i.test(error.message)) {
        setIdError('このIDは既に使われています。');
      } else if (!isSignup && /invalid login credentials/i.test(error.message)) {
        setIdError('IDまたはパスワードが違います。');
      } else {
        setIdError(error.message);
      }
      return;
    }
    // パスワード方式はコールバック不要。直接リダイレクト先へ。
    window.location.href = getRedirectPath();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-2xl shadow-primary/10">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Club className="h-8 w-8" />
          </div>
          <CardTitle className="text-3xl font-bold font-headline">STEM研究部</CardTitle>
          <CardDescription>部活動管理システム</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {error && (
            <p className="text-destructive text-center text-sm">
              {error === 'Could not authenticate user' ? 'ユーザー認証に失敗しました。' : error}
            </p>
          )}

          {!showIdForm ? (
            <>
              <Button onClick={handleDiscordLogin} className="w-full text-lg py-6" size="lg">
                <DiscordIcon />
                Discordでログイン
              </Button>
              <button
                onClick={() => setShowIdForm(true)}
                className="text-xs text-muted-foreground hover:underline text-center mt-1"
              >
                Discordを作れない方はこちら
              </button>
            </>
          ) : (
            <form onSubmit={handleIdSubmit} className="flex flex-col gap-3">
              <p className="text-sm text-center text-muted-foreground">
                {isSignup ? 'ユーザーIDとパスワードを決めて登録します' : 'ユーザーIDでログイン'}
              </p>
              <Input
                type="text"
                placeholder="ユーザーID"
                autoComplete="username"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="パスワード"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              {idError && <p className="text-destructive text-xs text-center">{idError}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? '処理中...' : isSignup ? '新規登録' : 'ログイン'}
              </Button>
              <button
                type="button"
                onClick={() => { setIsSignup(!isSignup); setIdError(''); }}
                className="text-xs text-muted-foreground hover:underline text-center"
              >
                {isSignup ? 'すでにIDを持っている方はログイン' : 'IDを持っていない方は新規登録'}
              </button>
              <button
                type="button"
                onClick={() => { setShowIdForm(false); setIdError(''); }}
                className="text-xs text-muted-foreground hover:underline text-center"
              >
                Discordでログインに戻る
              </button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPageWrapper() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  )
}
