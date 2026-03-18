/**
 * OAuth クライアント一覧表示
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Copy, Eye, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface Application {
  id: string;
  name: string;
  client_id: string;
  client_secret_hash: string;
  redirect_uris: string[];
  created_at: string;
}

interface Props {
  applications: Application[];
}

export function OAuthClientList({ applications }: Props) {
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const { toast } = useToast();

  async function handleDelete(appId: string) {
    if (!confirm('本当にこのクライアントを削除しますか？')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/oauth/clients/${appId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete client');
      }

      toast({
        title: '削除完了',
        description: 'クライアントを削除しました',
      });

      window.location.reload();
    } catch (error) {
      toast({
        title: 'エラー',
        description: '削除に失敗しました',
        variant: 'destructive',
      });
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast({
      title: 'コピーしました',
      description: `${label}をクリップボードにコピーしました`,
    });
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        登録されているクライアントはありません
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>アプリケーション名</TableHead>
            <TableHead>Client ID</TableHead>
            <TableHead>リダイレクトURI</TableHead>
            <TableHead>作成日時</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((app) => (
            <TableRow key={app.id}>
              <TableCell className="font-medium">{app.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {app.client_id.substring(0, 16)}...
                  </code>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(app.client_id, 'Client ID')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {app.redirect_uris.length}個
                </div>
              </TableCell>
              <TableCell>
                {format(new Date(app.created_at), 'yyyy/MM/dd HH:mm')}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedApp(app)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    詳細
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(app.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedApp && (
        <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedApp.name}</DialogTitle>
              <DialogDescription>
                OAuth クライアント詳細情報
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Client ID</Label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-sm bg-muted px-3 py-2 rounded">
                    {selectedApp.client_id}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(selectedApp.client_id, 'Client ID')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">リダイレクトURI</Label>
                <ul className="mt-1 space-y-1">
                  {selectedApp.redirect_uris.map((uri, i) => (
                    <li key={i} className="text-sm bg-muted px-3 py-2 rounded">
                      {uri}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>注意:</strong> Client Secretは作成時のみ表示されます。
                  紛失した場合は、クライアントを削除して再作成してください。
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}
