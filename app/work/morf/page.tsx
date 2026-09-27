'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MorfCaseView } from '@/components/morf/morf-case-view';

export default function MorfCasePage() {
  const router = useRouter();

  const handleClose = () => {
    // Return to the main drum at scene morf
    router.push('/?scene=morf');
  };

  return (
    <div className="relative w-screen h-screen bg-[var(--bg)] text-[var(--text)] overflow-hidden">
      <MorfCaseView onClose={handleClose} />
    </div>
  );
}
