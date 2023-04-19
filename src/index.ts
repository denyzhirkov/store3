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
}

const defaultItemOptions: ItemOptions = {
  silent: false,
  clone: false,
};

export default class Store3<T extends Record<string, any> = {}>
implements StoreThree {
  private store: StoreType<T> = {} as StoreType<T>;

  $: $Getter<T> = {} as $Getter<T>;

  private createBinder<B extends unknown>(
    key: string,
    binder: ($: $Getter<T>) => B,
  ) {
    if (this.$.hasOwnProperty(key)) {
      delete this.$[key];
    }
    Object.defineProperty(this.$, key, {
      get: () => binder!(this.$) as B,
    });
  }

  private createGetter(key: keyof T): void {
    if (!this.$.hasOwnProperty(key)) {
      Object.defineProperty(this.$, key, {
        get: () => (this.store[key] ? this.store[key].value : undefined),
        enumerable: true,
        configurable: true,
      });
    }
  }

  constructor(defaultStore: T = {} as T) {
    Object.keys(defaultStore).forEach((key) => {
      this.store[key as keyof T] = {
        value: defaultStore[key as keyof T],
        callbacks: [],
      };
      this.createGetter(key);
    });
  }

  get<K extends keyof T>(key: K): T[K] | undefined {
    return this.store[key] ? this.store[key].value : undefined;
  }

  set<A extends keyof T, B>(
    key: A,
    value: B,
    options: ItemOptions = defaultItemOptions,
  ): StoreThree<T & { [key in A]: B }> & {
    subscribe: Sub<T & { [key in A]: B }>;
  } {
    const prevValue = this.store[key]?.value;
    this.store[key] = this.store[key] || { value: undefined, callbacks: [] };
    const storeRef = this.store[key] as Item<B, T & { [key in A]: B }>;
    storeRef.value = options?.clone ? structuredClone(value) : value;
    this.createGetter(key);
    if (!options?.silent) {
      storeRef.callbacks.forEach((callback) =>
        callback(value, prevValue, this.$));
    }

    return this as StoreThree<T & { [key in A]: B }> & {
      subscribe: Sub<T & { [key in A]: B }>;
    };
  }

  unset<A extends keyof T>(key: A) {
    delete this.store[key];
    delete this.$.key;
    return this;
  }

  bind<B extends unknown>(key: string, binder: ($: $Getter<T>) => B) {
    this.createBinder<B>(key, binder);
    return this;
  }

  subscribe<K extends keyof T>(
    key: K,
    callback: Callback<T[K], T>,
  ): () => void {
    this.store[key] = this.store[key] || { value: undefined, callbacks: [] };
    this.store[key].callbacks.push(callback);
    return () => {
      this.store[key].callbacks = this.store[key].callbacks.filter(
        (cb) => cb !== callback,
      );
    };
  }
}
