import Store3 from "../src/index";

describe("Store3", () => {
	describe("Simple usage", () => {
		test("should create a store", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});

			expect(store.get("a")).toBe(1);
			expect(store.get("b")).toBe(2);
		});
		test("should change a value", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});

			expect(store.get("a")).toBe(1);
			store.set("a", 2);
			expect(store.get("a")).toBe(2);
		});
		test("should set a value using set", () => {
			const store = new Store3({
				a: null,
			});
			store.set("a", 1);

			expect(store.get("a")).toBe(1);
		});
		test("should unset a value using unset", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});

			expect(store.get("a")).toBe(1);
			store.unset("a");
			expect(store.get("a")).toBeUndefined();
		});
	});

	describe("Getter usage", () => {
		test("should create getters for all keys", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});

			expect(store.$.a).toBe(1);
			expect(store.$.b).toBe(2);
		});
		test("should remove getters for unset keys", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});
			store.unset("a");

			expect(store.$.a).toBeUndefined();
			expect(store.$.b).toBe(2);
		});
		test("should create getters for keys created using set", () => {
			const store = new Store3({
				a: null as null | number,
			});
			store.set("a", 1);

			expect((store.$ as { a: number }).a).toBe(1);
		});
	});

	describe("Subscribe callback usage", () => {
		test("should call a callback for a changed key", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});
			let called = false;

			store.subscribe("a", () => {
				called = true;
			});

			store.set("a", 2);

			expect(called).toBe(true);
		});
		test("should call all callbacks for a changed key", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});
			let called1 = false;
			let called2 = false;

			store.subscribe("a", () => {
				called1 = true;
			});
			store.subscribe("a", () => {
				called2 = true;
			});

			store.set("a", 2);

			expect(called1).toBe(true);
			expect(called2).toBe(true);
		});
		test("should call a callback with full arguments for a changed key", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});
			let called = false;

			store.subscribe("a", (value, prevValue, $) => {
				expect(value).toBe(2);
				expect(prevValue).toBe(1);
				expect(typeof $).toBe("object");
				expect({ ...$ }).toStrictEqual({ a: 2, b: 2 });
				called = true;
			});

			store.set("a", 2);

			expect(called).toBe(true);
		});
		test("should not call a callback for a changed key if it was unsubscribed", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});
			let called = false;

			const unsubscribe = store.subscribe("a", () => {
				called = true;
			});
			unsubscribe();

			store.set("a", 2);

			expect(called).toBe(false);
		});
		test("should decrement the number of subscribers for a changed key after unsubscribe", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});
			let called = 0;

			const unsubscribe = store.subscribe("a", () => {
				called++;
			});
			store.subscribe("a", () => {
				called++;
			});
			unsubscribe();

			store.set("a", 2);

			expect(called).toBe(1);
		});
	});

	describe("Bind usage", () => {
		test("should bind a calculated value to a key", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});

			store.bind("c", ($) => {
				// biome-ignore lint/style/noNonNullAssertion: Test values are known to exist
				return $.a! + $.b!;
			});

			expect((store.$ as { a: number; b: number; c: number }).c).toBe(3);
		});
		test("should bind a calculated value to a key and update it when a dependency changes", () => {
			const store = new Store3({
				a: 1,
				b: 2,
			});

			store.bind("c", ($) => {
				// biome-ignore lint/style/noNonNullAssertion: Test values are known to exist
				return $.a! + $.b!;
			});

			expect((store.$ as { a: number; b: number; c: number }).c).toBe(3);

			store.set("a", 2);

			expect((store.$ as { a: number; b: number; c: number }).c).toBe(4);
		});
	});
	describe("Advanced usage", () => {
		test("should allow adding new keys dynamically (Builder pattern)", () => {
			const store = new Store3({ a: 1 }).set("b", 2);
			expect(store.get("b")).toBe(2);
			expect(store.$.b).toBe(2);
		});

		test("should allow adding new keys dynamically (Loose typing)", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Testing loose typing
			const store = new Store3<Record<string, any>>({ a: 1 });
			store.set("b", 2);
			expect(store.get("b")).toBe(2);
			expect(store.$.b).toBe(2);
		});

		test("should clone values when clone option is true", () => {
			const original = { nested: { count: 1 } };
			const store = new Store3({ data: original });

			// Update with clone: true
			const newData = { nested: { count: 2 } };
			store.set("data", newData, { clone: true });

			// Modify newData, store should not change
			newData.nested.count = 3;
			expect(store.get("data")?.nested.count).toBe(2);
		});

		test("should not trigger callbacks when silent option is true", () => {
			const store = new Store3({ a: 1 });
			let called = false;
			store.subscribe("a", () => {
				called = true;
			});

			store.set("a", 2, { silent: true });
			expect(called).toBe(false);
			expect(store.get("a")).toBe(2);
		});

		test("should completely remove key from getter on unset", () => {
			const store = new Store3({ a: 1 });
			expect("a" in store.$).toBe(true);

			store.unset("a");
			expect("a" in store.$).toBe(false);
			expect(store.get("a")).toBeUndefined();
		});
	});
	describe("Batch updates", () => {
		test("should batch updates and call subscribers only once", () => {
			const store = new Store3({ a: 1 });
			let callCount = 0;
			let lastValue: number | undefined;
			let lastPrevValue: number | undefined;

			store.subscribe("a", (val, prev) => {
				callCount++;
				lastValue = val;
				lastPrevValue = prev;
			});

			store.batch(() => {
				store.set("a", 2);
				store.set("a", 3);
				store.set("a", 4);
			});

			expect(callCount).toBe(1);
			expect(lastValue).toBe(4);
			expect(lastPrevValue).toBe(1);
		});

		test("should handle multiple keys in batch", () => {
			const store = new Store3({ a: 1, b: 2 });
			let aCalls = 0;
			let bCalls = 0;

			store.subscribe("a", () => aCalls++);
			store.subscribe("b", () => bCalls++);

			store.batch(() => {
				store.set("a", 10);
				store.set("b", 20);
			});

			expect(aCalls).toBe(1);
			expect(bCalls).toBe(1);
			expect(store.get("a")).toBe(10);
			expect(store.get("b")).toBe(20);
		});

		test("should handle chained computed values", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Testing computed values
			const store = new Store3<Record<string, any>>({ a: 1 });
			store.computed("double", ($) => $.a * 2);
			store.computed("quadruple", ($) => $.double * 2);

			expect(store.get("quadruple")).toBe(4);

			store.set("a", 3);
			expect(store.get("double")).toBe(6);
			expect(store.get("quadruple")).toBe(12);
		});

		test("should handle dynamic dependencies", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Testing dynamic dependencies
			const store = new Store3<Record<string, any>>({ a: 1, b: 2, useA: true });
			// If useA is true, depends on a. If false, depends on b.
			store.computed("dynamic", ($) => ($.useA ? $.a : $.b));

			expect(store.get("dynamic")).toBe(1);

			// Change a, should update
			store.set("a", 10);
			expect(store.get("dynamic")).toBe(10);

			// Switch to b
			store.set("useA", false);
			expect(store.get("dynamic")).toBe(2);

			// Change a, should NOT update dynamic (because it depends on b now)
			let called = false;
			store.subscribe("dynamic", () => {
				called = true;
			});
			store.set("a", 20);
			expect(called).toBe(false);
			expect(store.get("dynamic")).toBe(2);

			// Change b, should update
			store.set("b", 30);
			expect(store.get("dynamic")).toBe(30);
		});

		test("should throw error on circular computed dependencies", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Testing circular dependencies
			const store = new Store3<Record<string, any>>({});

			// Pre-create both keys so getters exist and dependencies can be tracked
			store.set("a", 0);
			store.set("b", 0);

			// Now create circular computed: a depends on b, b depends on a
			store.computed("a", ($) => $.b + 1); // a depends on b

			// When b is created:
			// 1. recompute("b") reads $.a -> registers b -> a
			// 2. set("b", value) triggers recompute("a") because dependents["b"] contains "a"
			// 3. recompute("a") reads $.b -> set("a", value) triggers recompute("b")
			// 4. recompute("b") but "b" is already in computingStack -> CIRCULAR!
			expect(() => {
				store.computed("b", ($) => $.a + 1);
			}).toThrow(/Circular dependency detected/);
		});

		test("should not call subscribers when computed value unchanged", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Testing unchanged computed
			const store = new Store3<Record<string, any>>({ a: 5, b: 10 });
			// computed returns constant based on condition
			store.computed("isPositive", ($) => $.a > 0);

			let callCount = 0;
			store.subscribe("isPositive", () => {
				callCount++;
			});

			// Change 'a' but computed result stays true
			store.set("a", 3);
			expect(store.get("isPositive")).toBe(true);
			expect(callCount).toBe(0); // Should not be called since value didn't change

			// Change 'a' to negative - now result changes
			store.set("a", -1);
			expect(store.get("isPositive")).toBe(false);
			expect(callCount).toBe(1); // Should be called once
		});
	});

	describe("Global Subscribe", () => {
		test("should trigger global callback for any key change", () => {
			const store = new Store3({ a: 1, b: 2 });
			// biome-ignore lint/suspicious/noExplicitAny: Testing global callback
			const changes: any[] = [];

			store.subscribeAll((key, value, prevValue) => {
				changes.push({ key, value, prevValue });
			});

			store.set("a", 10);
			expect(changes.length).toBe(1);
			expect(changes[0]).toEqual({ key: "a", value: 10, prevValue: 1 });

			store.set("b", 20);
			expect(changes.length).toBe(2);
			expect(changes[1]).toEqual({ key: "b", value: 20, prevValue: 2 });
		});

		test("should trigger global callback with batching", () => {
			const store = new Store3({ a: 1, b: 2 });
			// biome-ignore lint/suspicious/noExplicitAny: Test type can be any
			const changes: { key: string; value: any; prevValue: any }[] = [];

			store.subscribeAll((key, value, prevValue) => {
				changes.push({ key, value, prevValue });
			});

			store.batch(() => {
				store.set("a", 10);
				store.set("b", 20);
				store.set("a", 30);
			});

			// Should only trigger once per key with final values
			expect(changes.length).toBe(2);

			// Order depends on map iteration, but both should be present
			const aChange = changes.find((c) => c.key === "a");
			const bChange = changes.find((c) => c.key === "b");

			expect(aChange).toEqual({ key: "a", value: 30, prevValue: 1 });
			expect(bChange).toEqual({ key: "b", value: 20, prevValue: 2 });
		});

		test("should unsubscribe from global callbacks", () => {
			const store = new Store3({ a: 1 });
			let callCount = 0;

			const unsubscribe = store.subscribeAll(() => {
				callCount++;
			});

			store.set("a", 10);
			expect(callCount).toBe(1);

			unsubscribe();
			store.set("a", 20);
			expect(callCount).toBe(1);
		});
	});

	describe("Type safety", () => {
		test("should preserve types through chained computed calls", () => {
			const store = new Store3({ price: 100 })
				// biome-ignore lint/style/noNonNullAssertion: Test values are known to exist
				.computed("withTax", ($) => $.price! * 1.2)
				.computed("formatted", ($) => `$${$.withTax}`);

			expect(store.get("price")).toBe(100);
			expect(store.get("withTax")).toBe(120);
			expect(store.get("formatted")).toBe("$120");
		});

		test("should preserve types through chained bind calls", () => {
			const store = new Store3({ x: 10, y: 20 })
				// biome-ignore lint/style/noNonNullAssertion: Test values are known to exist
				.bind("sum", ($) => $.x! + $.y!)
				.bind("label", ($) => `Sum: ${$.sum}`);

			expect(store.$.sum).toBe(30);
			expect(store.$.label).toBe("Sum: 30");
		});

		test("should handle deeply nested computed dependencies", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Testing nested deps
			const store = new Store3<Record<string, any>>({ base: 2 });

			store.computed("level1", ($) => $.base * 2);
			store.computed("level2", ($) => $.level1 * 2);
			store.computed("level3", ($) => $.level2 * 2);

			expect(store.get("level1")).toBe(4);
			expect(store.get("level2")).toBe(8);
			expect(store.get("level3")).toBe(16);

			// Update base, all levels should update
			store.set("base", 3);
			expect(store.get("level1")).toBe(6);
			expect(store.get("level2")).toBe(12);
			expect(store.get("level3")).toBe(24);
		});

		test("should handle self-referencing computed safely", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Testing self-ref
			const store = new Store3<Record<string, any>>({ count: 0 });

			// Pre-create the key so getter exists
			store.set("selfRef", 0);

			// This should throw because 'selfRef' tries to read itself during computation
			// When recompute("selfRef") runs:
			// 1. Reads $.selfRef which triggers the getter
			// 2. The getter sees currentlyComputing = "selfRef" and registers selfRef -> selfRef
			// 3. After computing, set("selfRef", value) checks dependents
			// 4. dependents["selfRef"] contains "selfRef", so recompute("selfRef") is called
			// 5. computingStack already has "selfRef" -> CIRCULAR!
			expect(() => {
				store.computed("selfRef", ($) => $.selfRef + 1);
			}).toThrow(/Circular dependency detected/);
		});
	});

	describe("Edge cases", () => {
		test("should handle undefined values correctly", () => {
			const store = new Store3<{ a: number | undefined }>({ a: undefined });

			expect(store.get("a")).toBeUndefined();
			expect(store.$.a).toBeUndefined();

			store.set("a", 42);
			expect(store.get("a")).toBe(42);

			store.set("a", undefined);
			expect(store.get("a")).toBeUndefined();
		});

		test("should handle null values correctly", () => {
			const store = new Store3<{ a: number | null }>({ a: null });

			expect(store.get("a")).toBeNull();
			store.set("a", 42);
			expect(store.get("a")).toBe(42);
		});

		test("should handle empty store initialization", () => {
			const store = new Store3();

			expect(store.get("nonexistent" as never)).toBeUndefined();
		});

		test("should handle batch with no changes", () => {
			const store = new Store3({ a: 1 });
			let callCount = 0;

			store.subscribe("a", () => {
				callCount++;
			});

			store.batch(() => {
				// No changes inside batch
			});

			expect(callCount).toBe(0);
		});

		test("should handle unset during batch", () => {
			const store = new Store3({ a: 1, b: 2 });

			store.batch(() => {
				store.set("a", 10);
				store.unset("a");
			});

			// Key was unset during batch
			expect(store.get("a")).toBeUndefined();
			expect("a" in store.$).toBe(false);
		});

		test("should handle subscribe to non-existent key", () => {
			// biome-ignore lint/suspicious/noExplicitAny: Testing dynamic subscribe
			const store = new Store3<Record<string, any>>({});
			let called = false;

			store.subscribe("future", () => {
				called = true;
			});

			store.set("future", "value");
			expect(called).toBe(true);
		});
	});
});
