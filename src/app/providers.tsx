'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { LazyMotion } from 'framer-motion';
import { trpc } from '@/lib/trpc-client';
import { useState } from 'react';
import { useAuthMigration } from '@/hooks/use-auth-migration';

const loadMotionFeatures = () =>
  import('framer-motion').then((mod) => mod.domAnimation);

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

function MigrationRunner() {
  useAuthMigration();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <LazyMotion features={loadMotionFeatures} strict>
          <MigrationRunner />
          {children}
        </LazyMotion>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
