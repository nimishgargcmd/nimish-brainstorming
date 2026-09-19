import React, { createContext, useContext } from "react";

/** Reserved above the immersive panel, excluding the device-dependent top inset: strip (48) + handle (10). */
export const IMMERSIVE_OFFSET_PX = 58;

interface ImmersiveSplitView {
  /** Whether the panel is maximized. */
  isImmersive: boolean;
  /** Live panel height (px) while the divider is being dragged; null when settled. */
  dragHeight: number | null;
  /** True while a drag is in progress (disables the height transition). */
  isDragging: boolean;
}

const ImmersiveSplitContext = createContext<ImmersiveSplitView | null>(null);

/**
 * Provides immersive (drag-to-maximize) split state to every MultitaskingPanel
 * in the subtree — including nested L2 views — so the detent behavior is a shared
 * component concern. The grip itself lives on the divider in the layout (MeetingPage).
 */
export function ImmersiveSplitProvider({ value, children }: { value: ImmersiveSplitView; children: React.ReactNode }) {
  return <ImmersiveSplitContext.Provider value={value}>{children}</ImmersiveSplitContext.Provider>;
}

/** Returns the immersive-split view state, or null when used outside a provider. */
export function useImmersiveSplit() {
  return useContext(ImmersiveSplitContext);
}
