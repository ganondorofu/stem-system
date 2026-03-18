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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Copy, AlertTriangle } from 'lucide-react';

export function OAuthClientForm() {
  const [name, setName] = useState('');
  const [redirectUris, setRedirectUris] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    client_id: string;
    client_secret: string;
    name: string;
  } | null>(null);
  const { toast } = useToast();

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast({
      title: 'コピーしました',
      description: `${label}をクリップボードにコピーしました`,
    });
  }

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

      // クレデンシャルをダイアログで表示（コピー可能）
      setCreatedCredentials({
        client_id: data.client_id,
        client_secret: data.client_secret,
        name: data.name,
      });

      // フォームをリセット
      setName('');
      setRedirectUris('');
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

  function handleCloseCredentials() {
    setCreatedCredentials(null);
    window.location.reload();
  }

  return (
    <>
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

      {createdCredentials && (
        <Dialog open={!!createdCredentials} onOpenChange={handleCloseCredentials}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>🎉 クライアント「{createdCredentials.name}」を作成しました</DialogTitle>
              <DialogDescription>
                以下のクレデンシャルを安全な場所に保存してください
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive font-medium">
                  Client Secret はこの画面でのみ表示されます。閉じると二度と確認できません。必ずコピーしてください。
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Client ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    readOnly
                    value={createdCredentials.client_id}
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(createdCredentials.client_id, 'Client ID')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Client Secret</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    readOnly
                    value={createdCredentials.client_secret}
                    className="font-mono text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(createdCredentials.client_secret, 'Client Secret')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button onClick={handleCloseCredentials} className="w-full">
                コピーしました。閉じる
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
