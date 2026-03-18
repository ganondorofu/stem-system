/**
 * 連携アプリ一覧
 */

'use client';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Trash2 } from 'lucide-react';

interface Consent {
  id: string;
  scope: string;
  granted_at: string;
  application: {
    id: string;
    name: string;
  };
}

interface Props {
  consents: Consent[];
}

export function ConnectedAppsList({ consents }: Props) {
  const { toast } = useToast();

  async function handleRevoke(consentId: string, appName: string) {
    if (!confirm(`${appName}との連携を解除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/user/oauth/consents/${consentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke consent');
      }

      toast({
        title: '連携解除完了',
        description: `${appName}との連携を解除しました`,
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: 'エラー',
        description: '連携解除に失敗しました',
        variant: 'destructive',
      });
    }
  }

  if (consents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        連携しているアプリはありません
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {consents.map((consent) => (
        <div
          key={consent.id}
          className="flex items-center justify-between p-4 border rounded-lg"
        >
          <div>
            <h3 className="font-medium">{consent.application.name}</h3>
            <p className="text-sm text-muted-foreground">
              連携開始: {format(new Date(consent.granted_at), 'yyyy/MM/dd HH:mm')}
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleRevoke(consent.id, consent.application.name)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            連携解除
          </Button>
        </div>
      ))}
    </div>
  );
}
