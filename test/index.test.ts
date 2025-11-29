import Store3 from '../src/index';

describe('Store3', () => {
  describe('Simple usage', () => {
    test('should create a store', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });

      expect(store.get('a')).toBe(1);
      expect(store.get('b')).toBe(2);
    });
    test('should change a value', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });

      expect(store.get('a')).toBe(1);
      store.set('a', 2);
      expect(store.get('a')).toBe(2);
    });
    test('should set a value using set', () => {
      const store = new Store3({
        a: null,
      });
      store.set('a', 1);

      expect(store.get('a')).toBe(1);
    });
    test('should unset a value using unset', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });

      expect(store.get('a')).toBe(1);
      store.unset('a');
      expect(store.get('a')).toBeUndefined();
    });
  });

  describe('Getter usage', () => {
    test('should create getters for all keys', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });

      expect(store.$.a).toBe(1);
      expect(store.$.b).toBe(2);
    });
    test('should remove getters for unset keys', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });
      store.unset('a');

      expect(store.$.a).toBeUndefined();
      expect(store.$.b).toBe(2);
    });
    test('should create getters for keys created using set', () => {
      const store = new Store3({
        a: null as null | number,
      });
      store.set('a', 1);

      expect((store.$ as { a: number }).a).toBe(1);
    });
  });

  describe('Subscribe callback usage', () => {
    test('should call a callback for a changed key', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });
      let called = false;

      store.subscribe('a', () => {
        called = true;
      });

      store.set('a', 2);

      expect(called).toBe(true);
    });
    test('should call all callbacks for a changed key', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });
      let called1 = false;
      let called2 = false;

      store.subscribe('a', () => {
        called1 = true;
      });
      store.subscribe('a', () => {
        called2 = true;
      });

      store.set('a', 2);

      expect(called1).toBe(true);
      expect(called2).toBe(true);
    });
    test('should call a callback with full arguments for a changed key', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });
      let called = false;

      store.subscribe('a', (value, prevValue, $) => {
        expect(value).toBe(2);
        expect(prevValue).toBe(1);
        expect(typeof $).toBe('object');
        expect({ ...$ }).toStrictEqual({ a: 2, b: 2 });
        called = true;
      });

      store.set('a', 2);

      expect(called).toBe(true);
    });
    test('should not call a callback for a changed key if it was unsubscribed', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });
      let called = false;

      const unsubscribe = store.subscribe('a', () => {
        called = true;
      });
      unsubscribe();

      store.set('a', 2);

      expect(called).toBe(false);
    });
    test('should decrement the number of subscribers for a changed key after unsubscribe', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });
      let called = 0;

      const unsubscribe = store.subscribe('a', () => {
        called++;
      });
      store.subscribe('a', () => {
        called++;
      });
      unsubscribe();

      store.set('a', 2);

      expect(called).toBe(1);
    });
  });

  describe('Bind usage', () => {
    test('should bind a calculated value to a key', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });

      store.bind('c', $ => {
        return $.a! + $.b!;
      });

      expect((store.$ as { a: number; b: number; c: number }).c).toBe(3);
    });
    test('should bind a calculated value to a key and update it when a dependency changes', () => {
      const store = new Store3({
        a: 1,
        b: 2,
      });

      store.bind('c', $ => {
        return $.a! + $.b!;
      });

      expect((store.$ as { a: number; b: number; c: number }).c).toBe(3);

      store.set('a', 2);

      expect((store.$ as { a: number; b: number; c: number }).c).toBe(4);
    });
  });
  describe('Advanced usage', () => {
    test('should allow adding new keys dynamically (Builder pattern)', () => {
      const store = new Store3({ a: 1 }).set('b', 2);
      expect(store.get('b')).toBe(2);
      expect(store.$.b).toBe(2);
    });

    test('should allow adding new keys dynamically (Loose typing)', () => {
      const store = new Store3<Record<string, any>>({ a: 1 });
      store.set('b', 2);
      expect(store.get('b')).toBe(2);
      expect(store.$.b).toBe(2);
    });

    test('should clone values when clone option is true', () => {
      const original = { nested: { count: 1 } };
      const store = new Store3({ data: original });

      // Update with clone: true
      const newData = { nested: { count: 2 } };
      store.set('data', newData, { clone: true });

      // Modify newData, store should not change
      newData.nested.count = 3;
      expect(store.get('data')?.nested.count).toBe(2);
    });

    test('should not trigger callbacks when silent option is true', () => {
      const store = new Store3({ a: 1 });
      let called = false;
      store.subscribe('a', () => {
        called = true;
      });

      store.set('a', 2, { silent: true });
      expect(called).toBe(false);
      expect(store.get('a')).toBe(2);
    });

    test('should completely remove key from getter on unset', () => {
      const store = new Store3({ a: 1 });
      expect('a' in store.$).toBe(true);

      store.unset('a');
      expect('a' in store.$).toBe(false);
      expect(store.get('a')).toBeUndefined();
    });
  });
  describe('Batch updates', () => {
    test('should batch updates and call subscribers only once', () => {
      const store = new Store3({ a: 1 });
      let callCount = 0;
      let lastValue: number | undefined;
      let lastPrevValue: number | undefined;

      store.subscribe('a', (val, prev) => {
        callCount++;
        lastValue = val;
        lastPrevValue = prev;
      });

      store.batch(() => {
        store.set('a', 2);
        store.set('a', 3);
        store.set('a', 4);
      });

      expect(callCount).toBe(1);
      expect(lastValue).toBe(4);
      expect(lastPrevValue).toBe(1);
    });

    test('should handle multiple keys in batch', () => {
      const store = new Store3({ a: 1, b: 2 });
      let aCalls = 0;
      let bCalls = 0;

      store.subscribe('a', () => aCalls++);
      store.subscribe('b', () => bCalls++);

      store.batch(() => {
        store.set('a', 10);
        store.set('b', 20);
      });

      expect(aCalls).toBe(1);
      expect(bCalls).toBe(1);
      expect(store.get('a')).toBe(10);
      expect(store.get('b')).toBe(20);
    });

    test('should handle chained computed values', () => {
      const store = new Store3<Record<string, any>>({ a: 1 });
      store.computed('double', $ => $.a * 2);
      store.computed('quadruple', $ => $.double * 2);

      expect(store.get('quadruple')).toBe(4);

      store.set('a', 3);
      expect(store.get('double')).toBe(6);
      expect(store.get('quadruple')).toBe(12);
    });

    test('should handle dynamic dependencies', () => {
      const store = new Store3<Record<string, any>>({ a: 1, b: 2, useA: true });
      // If useA is true, depends on a. If false, depends on b.
      store.computed('dynamic', $ => ($.useA ? $.a : $.b));

      expect(store.get('dynamic')).toBe(1);

      // Change a, should update
      store.set('a', 10);
      expect(store.get('dynamic')).toBe(10);

      // Switch to b
      store.set('useA', false);
      expect(store.get('dynamic')).toBe(2);

      // Change a, should NOT update dynamic (because it depends on b now)
      let called = false;
      store.subscribe('dynamic', () => { called = true; });
      store.set('a', 20);
      expect(called).toBe(false);
      expect(store.get('dynamic')).toBe(2);

      // Change b, should update
      store.set('b', 30);
      expect(store.get('dynamic')).toBe(30);
    });
  });
});
