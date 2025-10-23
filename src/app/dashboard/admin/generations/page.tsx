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
                <CardTitle>Generation Role Management</CardTitle>
                <CardDescription>
                    Map each generation to its corresponding Discord Role ID. This is used for automated role assignments.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <GenerationManagementClient initialRoles={generationRoles} />
            </CardContent>
        </Card>
    );
}
