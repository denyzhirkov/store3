<h1 align="center">
	<img width="128" src="https://github.com/denyzhirkov/store3/raw/__image__/3.png" alt="Chalk">
	<br>
</h1>

# Store3

Simple, light-weight store

A library written 80% using [Github copilot](https://copilot.github.com/)
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
```javascript
import Store3 from 'store3';

const store = new Store3();

// using default key:values
const store = new Store3({
    a: "Some value",
    b: 128 * 14
});

// insert additional value
store.set('new_key', { other: 'value' });

store.get('a'); // "Some value"
store.get('b'); // 1792
store.get('new_key'); // { other: "value" }
```
### Using getters > store.$
```javascript
import Store3 from 'store3';

const store = new Store3();

store.set('some_key', 'some value');

store.$.some_key; // "some value"
```
### Using change subscription
```javascript
import Store3 from 'store3';

const store = new Store3();

store.set('a', 'value');
store.subscribe('a', (value, prevValue, $) => {
    console.log(value, prevValue, {...a});
});
store.set('a', 'newVal');
// will log:
// newVal value {a: "newVal"}
```
```javascript
import Store3 from 'store3';

const store = new Store3();

// Also able to subscribe before define
store.subscribe('a', (value, prevValue, $) => {
    console.log(value, prevValue, {...a});
});
store.set('a', 'newVal');
// will log:
// newVal undefined {a: "newVal"}
```
```javascript
import Store3 from 'store3';

const store = new Store3();

// Also able to subscribe before define
const unsubscribe = store.subscribe('a', (value, prevValue, $) => {
    console.log(value, prevValue, {...a});
});
store.set('a', 'newVal');
// will log:
// newVal undefined {a: "newVal"}

unsubscribe();
store.set('a', 'Something'); // no log
```