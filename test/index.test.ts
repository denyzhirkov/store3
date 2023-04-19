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
});
