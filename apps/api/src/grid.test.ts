import { distanceMeters } from '@coffee-finder/shared';
import { describe, expect, it } from 'vitest';
import { CELL_DEG, CELL_PADDING_M, snapToGrid } from './grid';

describe('snapToGrid', () => {
  it('gives nearby searches in the same cell the same key', () => {
    const a = snapToGrid({ lat: 60.16901, lng: 24.93801 }, 1500);
    const b = snapToGrid({ lat: 60.16999, lng: 24.93999 }, 1500);
    expect(a.key).toBe(b.key);
    expect(snapToGrid({ lat: 60.16901, lng: 24.93801 }, 1000).key).not.toBe(a.key);
  });

  it('pads the query radius by the snapping error', () => {
    expect(snapToGrid({ lat: 0, lng: 0 }, 1500).queryRadiusM).toBe(1500 + CELL_PADDING_M);
  });

  it('keeps every origin within the padding of its cell centre', () => {
    // Corners of cells are the worst case; check them at the equator, where cells are widest.
    for (const lat of [0.0000001, CELL_DEG - 0.0000001, 45.0000001, -33.86]) {
      for (const lng of [0.0000001, CELL_DEG - 0.0000001, 151.2]) {
        const { center } = snapToGrid({ lat, lng }, 1000);
        expect(distanceMeters({ lat, lng }, center)).toBeLessThan(CELL_PADDING_M);
      }
    }
  });
});
