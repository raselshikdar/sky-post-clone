import { useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Returns props for a back button that triggers navigation on pointerdown
 * (instead of waiting for the full click), giving an instant feel.
 * Keyboard activation (Enter/Space → click) still works via onClick.
 * Deduped so pointerdown + click only navigates once.
 */
export function useInstantBack(fallback?: () => void) {
  const navigate = useNavigate();
  const firedRef = useRef(false);

  const go = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    if (fallback) fallback();
    else navigate(-1);
  }, [navigate, fallback]);

  return {
    onPointerDown: go,
    onClick: go,
  };
}
