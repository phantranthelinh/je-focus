'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { LazyMotion } from 'framer-motion';
import { trpc } from '@/lib/trpc-client';
import { useState } from 'react';

// Code-split the framer-motion animation engine (~30kb): only the tiny `m`
// component ships in the initial bundle; `domAnimation` (animations, gestures,
// AnimatePresence exit) loads in its own async chunk after first paint.
const loadMotionFeatures = () =>
  import('framer-motion').then((mod) => mod.domAnimation);

function getBaseUrl() {
  if (typeof window !== 'undefined') return '';
  return `http://localhost:${process.env.PORT ?? 3000}`;
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
          {children}
        </LazyMotion>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
