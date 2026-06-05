'use client';

import { Suspense } from 'react';
import AuthModern from '@/components/auth/AuthModern';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <AuthModern initialMode="login" />
    </Suspense>
  );
}
