import { createContext, useContext } from 'react';

export type BlockViewerContext = 'lesson' | 'song';

export const BlockContext = createContext<BlockViewerContext>('lesson');

export function useBlockContext(): BlockViewerContext {
  return useContext(BlockContext);
}
