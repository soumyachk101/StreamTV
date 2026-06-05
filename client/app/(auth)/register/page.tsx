'use client';

import { Suspense } from 'react';
import AuthModern from '@/components/auth/AuthModern';

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <AuthModern initialMode="register" />
    </Suspense>
  );
}
