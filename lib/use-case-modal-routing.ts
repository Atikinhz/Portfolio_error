'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { SCENE_CONFIGS, TOTAL_SCENES, evaluateSurface } from '@/lib/cylinder-manifold';

interface UseCaseModalRoutingOptions {
  getCurrentU: () => number;
  onScrollToMilestone: (milestone: number) => void;
}

export function useCaseModalRouting({
  getCurrentU,
  onScrollToMilestone,
}: UseCaseModalRoutingOptions) {
  const [isVrakCaseOpen, setIsVrakCaseOpen] = useState(false);
  const [vrakDockBounce, setVrakDockBounce] = useState(false);
  const [isMorfCaseOpen, setIsMorfCaseOpen] = useState(false);
  const [morfDockBounce, setMorfDockBounce] = useState(false);

  const onScrollToMilestoneRef = useRef(onScrollToMilestone);
  useEffect(() => {
    onScrollToMilestoneRef.current = onScrollToMilestone;
  }, [onScrollToMilestone]);

  const getCurrentURef = useRef(getCurrentU);
  useEffect(() => {
    getCurrentURef.current = getCurrentU;
  }, [getCurrentU]);

  // VRAK controls
  const handleOpenVrakCase = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsVrakCaseOpen(true);
    try {
      window.history.pushState({ case: 'vrak' }, '', '/work/vrak');
    } catch {}
  }, []);

  const handleCloseVrakCase = useCallback(() => {
    setIsVrakCaseOpen(false);
    setVrakDockBounce(true);
    setTimeout(() => setVrakDockBounce(false), 900);

    try {
      window.history.pushState(null, '', '/');
    } catch {}

    const currentMilestone = evaluateSurface(getCurrentURef.current()).activeMilestone;
    const vrakIndex = SCENE_CONFIGS.findIndex((s) => s.id === 'vrak');
    const nearestVrak = Math.round((currentMilestone - vrakIndex) / TOTAL_SCENES) * TOTAL_SCENES + vrakIndex;
    onScrollToMilestoneRef.current(nearestVrak);
  }, []);

  // MORF controls
  const handleOpenMorfCase = useCallback((e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    setIsMorfCaseOpen(true);
    try {
      window.history.pushState({ case: 'morf' }, '', '/work/morf');
    } catch {}
  }, []);

  const handleCloseMorfCase = useCallback(() => {
    setIsMorfCaseOpen(false);
    setMorfDockBounce(true);
    setTimeout(() => setMorfDockBounce(false), 900);

    try {
      window.history.pushState(null, '', '/');
    } catch {}

    const currentMilestone = evaluateSurface(getCurrentURef.current()).activeMilestone;
    const morfIndex = SCENE_CONFIGS.findIndex((s) => s.id === 'morf');
    const nearestMorf = Math.round((currentMilestone - morfIndex) / TOTAL_SCENES) * TOTAL_SCENES + morfIndex;
    onScrollToMilestoneRef.current(nearestMorf);
  }, []);

  // Sync with browser deep links
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const vrakIdx = SCENE_CONFIGS.findIndex((s) => s.id === 'vrak');
    const morfIdx = SCENE_CONFIGS.findIndex((s) => s.id === 'morf');

    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      if (params.get('scene') === 'vrak' || params.get('case') === 'vrak' || window.location.pathname === '/work/vrak') {
        onScrollToMilestoneRef.current(vrakIdx >= 0 ? vrakIdx : 4);
        if (params.get('case') === 'vrak' || window.location.pathname === '/work/vrak') {
          setIsVrakCaseOpen(true);
        }
      } else if (params.get('scene') === 'morf' || params.get('case') === 'morf' || window.location.pathname === '/work/morf') {
        onScrollToMilestoneRef.current(morfIdx >= 0 ? morfIdx : 3);
        if (params.get('case') === 'morf' || window.location.pathname === '/work/morf') {
          setIsMorfCaseOpen(true);
        }
      }
    }, 0);

    const onPopState = () => {
      if (window.location.pathname === '/work/vrak') {
        onScrollToMilestoneRef.current(vrakIdx >= 0 ? vrakIdx : 4);
        setIsVrakCaseOpen(true);
        setIsMorfCaseOpen(false);
      } else if (window.location.pathname === '/work/morf') {
        onScrollToMilestoneRef.current(morfIdx >= 0 ? morfIdx : 3);
        setIsMorfCaseOpen(true);
        setIsVrakCaseOpen(false);
      } else {
        setIsVrakCaseOpen(false);
        setIsMorfCaseOpen(false);
        setVrakDockBounce(true);
        setTimeout(() => setVrakDockBounce(false), 900);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  return {
    isVrakCaseOpen,
    vrakDockBounce,
    isMorfCaseOpen,
    morfDockBounce,
    isAnyCaseOpen: isVrakCaseOpen || isMorfCaseOpen,
    handleOpenVrakCase,
    handleCloseVrakCase,
    handleOpenMorfCase,
    handleCloseMorfCase,
  };
}
