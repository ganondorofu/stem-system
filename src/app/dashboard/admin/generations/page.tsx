import { createClient } from '@/lib/supabase/server';
import { GenerationManagementClient } from '@/components/dashboard/admin/GenerationManagementClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

async function getGenerationsData() {
    const supabase = createClient();
    const { data, error } = await supabase.from('generation_roles').select('*').order('generation', { ascending: false });

    if (error) {
        console.error('Error fetching generation roles:', error);
        return [];
    }
    return data;
}

export default async function GenerationManagementPage() {
    const generationRoles = await getGenerationsData();

    return (
        <Card>
            <CardHeader>
                <CardTitle>期別ロール管理</CardTitle>
                <CardDescription>
                    各期とDiscordロールIDを紐付けます。これはロールの自動割り当てに使用されます。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <GenerationManagementClient initialRoles={generationRoles} />
            </CardContent>
        </Card>
    );
}
