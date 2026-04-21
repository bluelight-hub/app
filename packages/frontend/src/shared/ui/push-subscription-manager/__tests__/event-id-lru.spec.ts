import { beforeEach, describe, expect, it } from 'vitest';
import { EventIdLru, EVENT_ID_LRU_MAX_ENTRIES, eventIdLru } from '../event-id-lru';

describe('EventIdLru', () => {
  let lru: EventIdLru;

  beforeEach(() => {
    lru = new EventIdLru();
  });

  it('markiert bekannte IDs als vorhanden', () => {
    lru.add('evt-1');
    expect(lru.has('evt-1')).toBe(true);
    expect(lru.has('evt-2')).toBe(false);
  });

  it('dedupliziert Duplikate ohne Größenzuwachs', () => {
    lru.add('evt-1');
    lru.add('evt-1');
    lru.add('evt-1');
    expect(lru.size).toBe(1);
  });

  it('evictet den ältesten Eintrag bei Überlauf (Insertion-Order)', () => {
    const smallLru = new EventIdLru(3);
    smallLru.add('a');
    smallLru.add('b');
    smallLru.add('c');
    expect(smallLru.size).toBe(3);
    smallLru.add('d');
    expect(smallLru.size).toBe(3);
    expect(smallLru.has('a')).toBe(false);
    expect(smallLru.has('b')).toBe(true);
    expect(smallLru.has('c')).toBe(true);
    expect(smallLru.has('d')).toBe(true);
  });

  it('respektiert den Default-Max von 200 Einträgen', () => {
    for (let i = 0; i < EVENT_ID_LRU_MAX_ENTRIES + 1; i++) {
      lru.add(`evt-${i}`);
    }
    expect(lru.size).toBe(EVENT_ID_LRU_MAX_ENTRIES);
    expect(lru.has('evt-0')).toBe(false);
    expect(lru.has(`evt-${EVENT_ID_LRU_MAX_ENTRIES}`)).toBe(true);
  });

  it('leert den Cache via clear()', () => {
    lru.add('evt-1');
    lru.add('evt-2');
    lru.clear();
    expect(lru.size).toBe(0);
    expect(lru.has('evt-1')).toBe(false);
  });

  it('exportiert einen Page-scoped Singleton', () => {
    expect(eventIdLru).toBeInstanceOf(EventIdLru);
  });
});
