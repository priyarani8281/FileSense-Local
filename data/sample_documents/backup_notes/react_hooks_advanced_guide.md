# Comprehensive Guide to React Hooks & Modern Patterns

## 1. Core State & Lifecycle Hooks
React hooks revolutionized state management by allowing function components to preserve local state between renders without class syntax.

### useState
- The `useState` hook returns a stateful value and a updater function: `const [state, setState] = useState(initialState)`.
- Batching: React batches multiple state updates inside event handlers into a single re-render.
- Lazy initial state: If the initial state requires heavy computation, pass a function: `useState(() => computeExpensiveValue())`.

### useEffect & Side Effects
- `useEffect` manages data fetching, subscriptions, DOM manipulation, and timers.
- Dependency array rules:
  1. No array: runs on every single render.
  2. Empty array `[]`: runs once after the initial mount.
  3. `[depA, depB]`: runs whenever either dependency changes by reference (`Object.is`).
- Cleanup functions prevent memory leaks:
```javascript
useEffect(() => {
  const handler = (e) => setCoords({ x: e.clientX, y: e.clientY });
  window.addEventListener('mousemove', handler);
  return () => window.removeEventListener('mousemove', handler);
}, []);
```

## 2. Performance Optimization Hooks
### useMemo & useCallback
- `useMemo` caches the calculated result of an expensive function across re-renders: `const cached = useMemo(() => computeHeavy(data), [data])`.
- `useCallback` caches a function definition itself to prevent unnecessary child re-renders when passing callbacks down component trees.

## 3. Storing Mutable References
### useRef
- Preserves a mutable `.current` property that persists across renders without triggering a new render when changed.
- Essential for accessing DOM nodes directly (focus, scroll position) or storing interval IDs.

## 4. Custom Hooks Design
Extract reusable logic cleanly:
```javascript
function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}
```
