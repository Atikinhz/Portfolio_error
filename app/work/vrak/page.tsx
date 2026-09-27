'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { VrakCaseView } from '@/components/vrak-case-view';

export default function VrakCasePage() {
  const router = useRouter();

  const handleClose = () => {
    // Navigate back to the main drum at scene vrak
    router.push('/?scene=vrak');
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#FBFBFB] text-[#141416]">
      <VrakCaseView onClose={handleClose} />
    </div>
  );
}
