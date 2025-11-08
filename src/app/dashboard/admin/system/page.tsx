import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SystemTasksClient } from '@/components/dashboard/admin/SystemTasksClient';

export default function SystemTasksPage() {
    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>システムタスク</CardTitle>
                    <CardDescription>
                        データベース全体に影響を及ぼす、または複数のメンバーに一括で変更を加えるタスクを実行します。
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <SystemTasksClient />
                </CardContent>
            </Card>
        </div>
    );
}
