import { Suspense } from 'react';
import { Workspace } from '@/components/workspace';
export default async function Page({ params }: { params: Promise<{ segments?: string[] }> }) {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <Workspace role="TENANT" segments={(await params).segments} />
    </Suspense>
  );
}
