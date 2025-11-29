declare var structuredClone: any;

export type $Getter<T> = {
  [K in keyof T]: T[K] | undefined;
};

export type Callback<T, P> = (
  value: T,
  prevValue: T | undefined,
  $: $Getter<P>
) => void;

export type ItemOptions = {
  silent?: boolean;
  clone?: boolean;
};

export type Item<T, P> = {
  value: T | undefined;
  callbacks: Array<Callback<T, P>>;
};

export type StoreType<T> = {
  [K in keyof T]: Item<T[K], T>;
};

export interface Sub<T> {
  <K extends keyof T>(key: K, callback: Callback<T[K], T>): () => void;
}

export interface StoreThree<T extends Record<string, any> = {}> {
  get<K extends keyof T>(key: K): T[K] | undefined;
  set<A extends string, B extends unknown>(
    key: A,
    value: B
  ): StoreThree<T & { [key in A]: B }> & {
    subscribe: Sub<T & { [key in A]: B }>;
  };
  unset(key: string): this;
  bind<B extends unknown>(
    key: string,
    binder: ($: $Getter<T>) => B
  ): StoreThree<T>;
  subscribe: Sub<T>;
  $: $Getter<T>;
  batch(fn: () => void): void;
  computed<K>(key: string, computer: ($: $Getter<T>) => K): StoreThree<T>;
}

const defaultItemOptions: ItemOptions = {
  silent: false,
  clone: false,
};

const cloneValue = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
};

export default class Store3<T extends Record<string, any> = {}>
  implements StoreThree<T> {
  private store: StoreType<T> = {} as StoreType<T>;

  $: $Getter<T> = {} as $Getter<T>;
  private batchDepth = 0;
  private pendingCallbacks = new Map<
    Callback<any, any>,
    [any, any, $Getter<T>]
  >();
  private currentlyComputing: string | null = null;
  private computedComputers = new Map<string, ($: $Getter<T>) => any>();
  private computedDependencies = new Map<string, Set<string>>();
  private dependents = new Map<string, Set<string>>();

  private createBinder<B extends unknown>(
    key: string,
    binder: ($: $Getter<T>) => B
  ) {
    if (this.$.hasOwnProperty(key)) {
      delete this.$[key];
    }
    Object.defineProperty(this.$, key, {
      get: () => binder!(this.$) as B,
    });
  }

  private createGetter(key: string): void {
    if (!this.$.hasOwnProperty(key)) {
      Object.defineProperty(this.$, key, {
        get: () => {
          if (this.currentlyComputing) {
            const dependent = this.currentlyComputing;
            if (!this.computedDependencies.has(dependent)) {
              this.computedDependencies.set(dependent, new Set());
            }
            this.computedDependencies.get(dependent)!.add(key);

            if (!this.dependents.has(key)) {
              this.dependents.set(key, new Set());
            }
            this.dependents.get(key)!.add(dependent);
          }
          return this.store[key as keyof T]
            ? this.store[key as keyof T].value
            : undefined;
        },
        enumerable: true,
        configurable: true,
      });
    }
  }

  constructor(defaultStore: T = {} as T) {
    Object.keys(defaultStore).forEach(key => {
      this.store[key as keyof T] = {
        value: defaultStore[key as keyof T],
        callbacks: [],
      };
      this.createGetter(key as string);
    });
  }

  get<K extends keyof T>(key: K): T[K] | undefined {
    return this.store[key] ? this.store[key].value : undefined;
  }

  set<A extends string, B>(
    key: A,
    value: B,
    options: ItemOptions = defaultItemOptions
  ): StoreThree<T & { [key in A]: B }> & {
    subscribe: Sub<T & { [key in A]: B }>;
  } {
    const prevValue = this.store[key as keyof T]?.value;
    const store = this.store as Record<string, any>;
    store[key] = store[key] || { value: undefined, callbacks: [] };
    const storeRef = store[key];
    storeRef.value = options?.clone ? cloneValue(value) : value;
    this.createGetter(key);
    this.createGetter(key);
    if (!options?.silent) {
      if (this.batchDepth > 0) {
        storeRef.callbacks.forEach((callback: any) => {
          if (this.pendingCallbacks.has(callback)) {
            const [, firstPrevValue] = this.pendingCallbacks.get(callback)!;
            this.pendingCallbacks.set(callback, [
              value,
              firstPrevValue,
              this.$,
            ]);
          } else {
            this.pendingCallbacks.set(callback, [value, prevValue, this.$]);
          }
        });
      } else {
        storeRef.callbacks.forEach((callback: any) =>
          callback(value, prevValue, this.$)
        );
      }
    }

    if (this.dependents.has(key)) {
      this.dependents.get(key)!.forEach(dependent => this.recompute(dependent));
    }

    return this as unknown as StoreThree<T & { [key in A]: B }> & {
      subscribe: Sub<T & { [key in A]: B }>;
    };
  }

  unset(key: string) {
    delete this.store[key as keyof T];
    delete this.$[key];
    return this;
  }

  bind<B extends unknown>(key: string, binder: ($: $Getter<T>) => B) {
    this.createBinder<B>(key, binder);
    return this;
  }

  subscribe<K extends keyof T>(
    key: K,
    callback: Callback<T[K], T>
  ): () => void {
    this.store[key] = this.store[key] || { value: undefined, callbacks: [] };
    this.store[key].callbacks.push(callback);
    return () => {
      this.store[key].callbacks = this.store[key].callbacks.filter(
        cb => cb !== callback
      );
    };
  }

  batch(fn: () => void) {
    this.batchDepth++;
    try {
      fn();
    } finally {
      this.batchDepth--;
    }
    if (this.batchDepth === 0) {
      this.flushCallbacks();
    }
  }

  private flushCallbacks() {
    this.pendingCallbacks.forEach(([value, prevValue, $], callback) => {
      callback(value, prevValue, $);
    });
    this.pendingCallbacks.clear();
  }

  computed<K>(key: string, computer: ($: $Getter<T>) => K) {
    this.computedComputers.set(key, computer);
    this.recompute(key);
    return this;
  }

  private recompute(key: string) {
    const computer = this.computedComputers.get(key);
    if (!computer) return;

    // Cleanup old dependencies
    if (this.computedDependencies.has(key)) {
      this.computedDependencies.get(key)!.forEach(dep => {
        if (this.dependents.has(dep)) {
          this.dependents.get(dep)!.delete(key);
        }
      });
      this.computedDependencies.get(key)!.clear();
    }

    this.currentlyComputing = key;
    try {
      const value = computer(this.$);
      // We use set to update the value and trigger downstream updates/subscriptions
      // We might want to avoid infinite loops if the value hasn't changed,
      // but for now we rely on set logic.
      // We pass silent: false so subscribers to the computed value get notified.
      this.set(key, value);
    } finally {
      this.currentlyComputing = null;
    }
  }
}
