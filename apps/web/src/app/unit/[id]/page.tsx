import { UnitDetail } from '@/components/public';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <UnitDetail id={(await params).id} />;
}
