/**
 * The barkada (SPEC-pup-lagoon §8): who sends pasabay requests and what they ask for.
 */
import type { FriendKey } from '../logic/types';

export interface FriendDef {
  key: FriendKey;
  /** Relative chance of being the one who sends a pasabay (Migs asks most often). */
  pasabayWeight: number;
  /** Menu items they love; pasabay requests pick from these when the stall is open. */
  loves: readonly string[];
}

export const BARKADA: readonly FriendDef[] = [
  { key: 'migs', pasabayWeight: 3, loves: ['bbq', 'gulaman'] },
  { key: 'bea', pasabayWeight: 1, loves: ['turon', 'buko'] },
  { key: 'jomar', pasabayWeight: 1, loves: ['halohalo', 'icecandy', 'iskrambol', 'bananacue'] },
];
