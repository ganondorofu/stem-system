/**
 * OAuth クライアント登録フォーム
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export function OAuthClientForm() {
  const [name, setName] = useState('');
  const [redirectUris, setRedirectUris] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/oauth/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          redirect_uris: redirectUris.split('\n').filter(uri => uri.trim()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create client');
      }

      toast({
        title: 'クライアント作成完了',
        description: `Client ID: ${data.client_id}`,
      });

      // フォームをリセット
      setName('');
      setRedirectUris('');
      
      // ページをリロード
      window.location.reload();
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : '作成に失敗しました',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">アプリケーション名</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例: Kintai System"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="redirect_uris">
          リダイレクトURI（1行に1つ）
        </Label>
        <Textarea
          id="redirect_uris"
          value={redirectUris}
          onChange={(e) => setRedirectUris(e.target.value)}
          placeholder="例:&#10;http://localhost:3001/auth/oauth/callback&#10;https://kintai.example.com/auth/oauth/callback"
          rows={4}
          required
        />
        <p className="text-sm text-muted-foreground">
          OAuth認証後にリダイレクトされる先のURLを指定します
        </p>
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        クライアントを作成
      </Button>
    </form>
  );
}
