interface $Getter {
  [key: string]: any;
}
interface Unsubscribe {
  (): void;
}

type Item = {
  value: any;
  callbacks: Array<(value: any, prevValue: any, $: $Getter) => void>;
};

export default class Store3 {
  private store: { [key: string]: Item } = {};
  $: $Getter = {};

  private createGetter(key: string) {
    if (!this.$.hasOwnProperty(key)) {
      Object.defineProperty(this.$, key, {
        get: () => (this.store[key] ? this.store[key].value : undefined),
        enumerable: true,
      });
    }
    return this;
  }

  constructor(defaultStore: any = {}) {
    Object.keys(defaultStore).forEach(key => {
      this.set(key, defaultStore[key]);
    });
  }

  get<T>(key: string): T | any | undefined {
    return this.store[key] ? this.store[key].value : undefined;
  }

  set<T>(key: string, value: T | any) {
    if (!this.store.hasOwnProperty(key)) {
      this.store[key] = {
        value,
        callbacks: [],
      } as Item;
    } else {
      const prevValue = this.store[key].value;
      this.store[key].value = value;
      this.store[key].callbacks.forEach(callback =>
        callback(value, prevValue, this.$)
      );
    }
    return this.createGetter(key);
  }

  unset(key: string) {
    delete this.store[key];
    delete this.$.key;
    return this;
  }

  subscribe(
    key: string,
    callback: (value: any, prevValue: any, $: $Getter) => void
  ): Unsubscribe {
    if (!this.store.hasOwnProperty(key)) {
      this.store[key] = {
        value: undefined,
        callbacks: [],
      } as Item;
    }
    this.store[key].callbacks.push(callback);
    return () => {
      this.store[key].callbacks = this.store[key].callbacks.filter(
        cb => cb !== callback
      );
    };
  }
}
