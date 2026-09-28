import { Suspense } from 'react';
import { AuthPage } from '@/components/public';
export default function Page() {
  return (
    <Suspense fallback={<p>Memuat…</p>}>
      <AuthPage />
    </Suspense>
  );
}
