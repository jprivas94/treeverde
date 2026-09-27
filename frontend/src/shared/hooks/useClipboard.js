import { useState, useCallback } from 'react';

// Copia texto al portapapeles y expone `copied` durante 2s (feedback "✓ Copiado").
export default function useClipboard() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async (text) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // portapapeles bloqueado: noop
    }
  }, []);

  return { copied, copy };
}
