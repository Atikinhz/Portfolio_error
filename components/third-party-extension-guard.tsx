'use client';

import { useEffect } from 'react';

/**
 * Global guard component that suppresses unhandled promise rejections and errors
 * caused by third-party browser extensions (e.g. MetaMask, Phantom, Coinbase Wallet)
 * attempting to inject window.ethereum or connect web3 providers inside iframe sandboxes.
 */
export function ThirdPartyExtensionGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === 'string'
          ? reason
          : reason?.message || reason?.toString?.() || '';

      // Check if error originated from wallet extensions like MetaMask
      if (
        message.includes('MetaMask') ||
        message.includes('ethereum') ||
        message.includes('wallet') ||
        message.includes('chrome-extension://') ||
        message.includes('moz-extension://') ||
        message.includes('safari-extension://') ||
        message.includes('Failed to connect')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    };

    const handleError = (event: ErrorEvent) => {
      const message = event.message || '';
      const filename = event.filename || '';

      if (
        message.includes('MetaMask') ||
        message.includes('ethereum') ||
        filename.includes('extension') ||
        filename.includes('metamask') ||
        filename.includes('contentscript')
      ) {
        event.preventDefault();
        event.stopImmediatePropagation?.();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);
    window.addEventListener('error', handleError, true);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
      window.removeEventListener('error', handleError, true);
    };
  }, []);

  return null;
}
