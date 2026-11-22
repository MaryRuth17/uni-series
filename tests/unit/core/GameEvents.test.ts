import { describe, expect, it } from 'vitest';
import { EventBus } from '../../../src/core/GameEvents';

describe('EventBus', () => {
  it('delivers payloads and unsubscribes', () => {
    const bus = new EventBus<{ ping: { n: number } }>();
    const got: number[] = [];
    const off = bus.on('ping', ({ n }) => got.push(n));
    bus.emit('ping', { n: 1 });
    off();
    bus.emit('ping', { n: 2 });
    expect(got).toEqual([1]);
  });

  it('lets a handler unsubscribe itself while emitting', () => {
    const bus = new EventBus<{ ping: object }>();
    let calls = 0;
    const off = bus.on('ping', () => {
      calls++;
      off();
    });
    bus.on('ping', () => calls++);
    bus.emit('ping', {});
    bus.emit('ping', {});
    expect(calls).toBe(3);
  });
});
