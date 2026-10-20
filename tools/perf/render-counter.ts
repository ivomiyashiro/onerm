/**
 * Counts how many times each function component renders (#221). The JSX runtime is replaced
 * (`jest.mock('react/jsx-runtime')`) so every function component goes through a counting wrapper.
 * The wrapper is created once per component, so its identity is stable and React reconciles it
 * like the original: the counts are the app's renders, not extra ones. Components wrapped in
 * `React.memo` or `forwardRef` are objects, not functions, and are not counted.
 */
type Component = (props: unknown, ref?: unknown) => unknown;
type JsxFactory = (type: unknown, ...rest: unknown[]) => unknown;

const counts = new Map<string, number>();
const wrappers = new WeakMap<Component, Component>();

function isFunctionComponent(type: unknown): type is Component {
  return (
    typeof type === 'function' &&
    !(type as { prototype?: { isReactComponent?: unknown } }).prototype?.isReactComponent
  );
}

function counted(type: unknown): unknown {
  if (!isFunctionComponent(type)) return type;
  let wrapper = wrappers.get(type);
  if (wrapper === undefined) {
    const name = (type as { displayName?: string }).displayName || type.name || 'Anonymous';
    wrapper = (props, ref) => {
      counts.set(name, (counts.get(name) ?? 0) + 1);
      return type(props, ref);
    };
    Object.defineProperty(wrapper, 'name', { value: name });
    wrappers.set(type, wrapper);
  }
  return wrapper;
}

/** The JSX runtime with every function component counted. */
export function countingRuntime<T extends Record<string, unknown>>(runtime: T): T {
  const wrapped: Record<string, unknown> = { ...runtime };
  for (const key of ['jsx', 'jsxs', 'jsxDEV'] as const) {
    const original = runtime[key] as JsxFactory | undefined;
    if (original)
      wrapped[key] = (type: unknown, ...rest: unknown[]) => original(counted(type), ...rest);
  }
  return wrapped as T;
}

export function resetRenders(): void {
  counts.clear();
}

/** The renders since the last reset, most first. */
export function renders(): [string, number][] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function totalRenders(): number {
  return [...counts.values()].reduce((total, n) => total + n, 0);
}
