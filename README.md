<h1 align="center">
	<img width="128" src="https://github.com/denyzhirkov/store3/raw/__image__/3.png" alt="Chalk">
	<br>
</h1>

# Store3

Simple, light-weight, and powerful state management library.

## Installation

Install Store3 with npm

```bash
  npm install store3
```
    
## Running Tests

To run tests, run the following command

```bash
  npm run test
```


## Usage

### Basic Usage

```javascript
import Store3 from 'store3';

// Initialize with default values
const store = new Store3({
    a: "Some value",
    b: 128 * 14
});

// Insert additional value (dynamic keys)
store.set('new_key', { other: 'value' });

store.get('a'); // "Some value"
store.get('b'); // 1792
store.get('new_key'); // { other: "value" }
```

### Using Getters (Proxy)

You can access values directly via `store.$`:

```javascript
import Store3 from 'store3';

const store = new Store3();

store.set('some_key', 'some value');

console.log(store.$.some_key); // "some value"
```

### Subscriptions

Subscribe to changes on specific keys:

```javascript
import Store3 from 'store3';

const store = new Store3();

store.set('a', 'value');

const unsubscribe = store.subscribe('a', (value, prevValue, $) => {
    console.log(`'a' changed from ${prevValue} to ${value}`);
    console.log('Current state:', $);
});

store.set('a', 'newVal');
// Logs:
// 'a' changed from value to newVal
// Current state: { a: "newVal" }

unsubscribe();
```

### Batch Updates

Group multiple updates to trigger subscribers only once per key:

```javascript
store.batch(() => {
    store.set('a', 1);
    store.set('b', 2);
    store.set('a', 3); // Subscribers to 'a' will only see the transition to 3
});
```

### Computed Values

Create values that automatically update when their dependencies change:

```javascript
const store = new Store3({ price: 10, quantity: 2 });

// 'total' will automatically track 'price' and 'quantity'
store.computed('total', $ => $.price * $.quantity);

console.log(store.get('total')); // 20

store.set('price', 20);
console.log(store.get('total')); // 40
```

### Global Subscribe

Listen to all changes in the store:

```javascript
store.subscribeAll((key, value, prevValue, $) => {
    console.log(`Key '${key}' changed to`, value);
});
```

### Advanced Options

#### Cloning
Prevent external mutation of store state by cloning values on set:

```javascript
const obj = { count: 1 };
store.set('data', obj, { clone: true });

obj.count = 2; // Does not affect store
console.log(store.get('data').count); // 1
```

#### Silent Updates
Update values without triggering subscribers:

```javascript
store.set('secret', 'hidden', { silent: true });
```

#### Builder Pattern
Chain methods for cleaner initialization:

```javascript
const store = new Store3({ a: 1 })
    .set('b', 2)
    .computed('sum', $ => $.a + $.b);
```