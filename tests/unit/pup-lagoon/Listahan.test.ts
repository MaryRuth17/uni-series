import { describe, expect, it } from 'vitest';
import { purchaseEffect } from '../../../src/minigames/pup-lagoon/logic/Catalog';
import { Listahan } from '../../../src/minigames/pup-lagoon/logic/Listahan';
import { itemLine, pangBarkada, pasabay, tag } from './helpers';

const buy = (item: string, sauce?: 'matamis' | 'maanghang' | 'suka') =>
  purchaseEffect(item, sauce, null);

describe('Listahan', () => {
  it('one item ticks every matching line', () => {
    const l = new Listahan([tag('L1', 'malamig'), tag('L2', 'matamis'), tag('L3', 'inumin')]);
    expect(l.applyPlayer(buy('gulaman')).sort()).toEqual(['L1', 'L2', 'L3']);
    expect(l.isComplete()).toBe(true);
  });

  it('the free iced tea ticks drink lines with a rice meal', () => {
    const l = new Listahan([tag('L1', 'kanin'), tag('L2', 'inumin'), tag('L3', 'malamig')]);
    expect(l.applyPlayer(buy('adobo_meal')).sort()).toEqual(['L1', 'L2', 'L3']);
  });

  it('quantity lines count items one by one', () => {
    const l = new Listahan([tag('L1', 'tusok', 2)]);
    l.applyPlayer(buy('fishball', 'suka'));
    expect(l.doneUnits('L1')).toBe(1);
    expect(l.isLineDone('L1')).toBe(false);
    l.applyPlayer(buy('kikiam', 'suka'));
    expect(l.isLineDone('L1')).toBe(true);
  });

  it('specific-item lines take only that item, which can tick tag lines too', () => {
    const l = new Listahan([itemLine('L1', 'kwekkwek'), tag('L2', 'tusok')]);
    l.applyPlayer(buy('fishball', 'suka'));
    expect(l.isLineDone('L1')).toBe(false);
    expect(l.isLineDone('L2')).toBe(true);
    l.applyPlayer(buy('kwekkwek', 'suka'));
    expect(l.isLineDone('L1')).toBe(true);
  });

  it('maanghang sawsawan adds the maanghang tag', () => {
    const l = new Listahan([tag('L1', 'maanghang')]);
    l.applyPlayer(buy('fishball', 'suka'));
    expect(l.isComplete()).toBe(false);
    l.applyPlayer(buy('fishball', 'maanghang'));
    expect(l.isComplete()).toBe(true);
  });

  it('friend-assigned items tick only the friend line; player items never tick friend lines', () => {
    const l = new Listahan([tag('L1', 'malamig'), pasabay('L2', 'migs', 'gulaman', 20)]);
    const g = buy('gulaman');
    expect(l.defaultFriendLine(g)).toBe('L2');
    expect(l.applyFriend('L2', g)).toEqual(['L2']);
    expect(l.isLineDone('L1')).toBe(false);
    expect(l.applyPlayer(g)).toEqual(['L1']);
    expect(l.defaultFriendLine(g)).toBeNull();
    expect(l.isRequiredComplete()).toBe(true);
  });

  it('Kumpleto ignores friend lines; full completion needs them', () => {
    const l = new Listahan([tag('L1', 'kanin'), pangBarkada('L2', 'malamig')]);
    l.applyPlayer(buy('bbq_rice'));
    expect(l.isRequiredComplete()).toBe(true);
    expect(l.isComplete()).toBe(false);
    for (let i = 0; i < 3; i++) l.applyFriend('L2', buy('icecandy'));
    expect(l.isComplete()).toBe(true);
  });

  it('previews an order without changing anything', () => {
    const l = new Listahan([tag('L1', 'kanin'), tag('L2', 'ihaw')]);
    expect(l.preview([{ effect: buy('bbq_rice'), forLine: null }]).sort()).toEqual(['L1', 'L2']);
    expect(l.isLineDone('L1')).toBe(false);
  });
});
