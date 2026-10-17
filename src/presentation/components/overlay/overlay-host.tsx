import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type ReactNode,
} from 'react';
import { Animated, BackHandler, Easing, StyleSheet, View } from 'react-native';

import { useReduceMotion } from '@/presentation/components/feedback/use-reduce-motion';

/** marca §6: «entrada» 320 ms; the exit is shorter, so the screen is back sooner. */
const ENTER_MS = 320;
const EXIT_MS = 200;

interface Host {
  show(key: string, node: ReactNode): void;
  hide(key: string): void;
}

interface Layer {
  key: string;
  node: ReactNode;
  closing: boolean;
}

const HostContext = createContext<Host | null>(null);
/** 0 → 1 while the overlay comes in, 1 → 0 while it goes; always 1 without a host. */
const ProgressContext = createContext<Animated.Value | null>(null);
const SHOWN = new Animated.Value(1);

/**
 * Where sheets, dialogs and the full rest are drawn: over the screen, in the same native view. A
 * native Modal is a separate iOS presentation: one shown while another closes is dropped, and it
 * takes no touches while it animates (#188, #193). The router gives each screen its own host, so
 * an overlay opened from a route sheet stays above that sheet.
 */
export function OverlayHost({ children }: { children: ReactNode }) {
  const [layers, setLayers] = useState<Layer[]>([]);
  const [host] = useState<Host>(() => ({
    show: (key, node) =>
      setLayers((all) =>
        all.some((layer) => layer.key === key)
          ? all.map((layer) => (layer.key === key ? { key, node, closing: false } : layer))
          : [...all, { key, node, closing: false }],
      ),
    hide: (key) =>
      setLayers((all) =>
        all.map((layer) => (layer.key === key ? { ...layer, closing: true } : layer)),
      ),
  }));
  const remove = (key: string) =>
    setLayers((all) => all.filter((layer) => layer.key !== key || !layer.closing));
  const covered = layers.some((layer) => !layer.closing);

  return (
    <HostContext.Provider value={host}>
      {/* Screen readers stay in the overlay, like they do in a Modal (RNF-18). */}
      <View
        style={styles.fill}
        importantForAccessibility={covered ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={covered}
      >
        {children}
      </View>
      {layers.map((layer) => (
        <OverlayLayer key={layer.key} closing={layer.closing} onExited={() => remove(layer.key)}>
          {layer.node}
        </OverlayLayer>
      ))}
    </HostContext.Provider>
  );
}

function OverlayLayer({
  closing,
  onExited,
  children,
}: {
  closing: boolean;
  onExited: () => void;
  children: ReactNode;
}) {
  const reduceMotion = useReduceMotion();
  const [progress] = useState(() => new Animated.Value(0));
  const exited = useEffectEvent(onExited);

  useEffect(() => {
    const to = closing ? 0 : 1;
    const animation = Animated.timing(progress, {
      toValue: to,
      // "Reducir movimiento": it appears and goes without moving (marca §6).
      duration: reduceMotion ? 0 : closing ? EXIT_MS : ENTER_MS,
      easing: closing ? Easing.in(Easing.cubic) : Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished && closing) exited();
    });
    return () => animation.stop();
  }, [closing, progress, reduceMotion]);

  return (
    <View
      style={StyleSheet.absoluteFill}
      // Closing, it no longer takes touches: the screen behind answers at once (#193).
      pointerEvents={closing ? 'none' : 'box-none'}
      importantForAccessibility={closing ? 'no-hide-descendants' : 'auto'}
      accessibilityElementsHidden={closing}
    >
      <ProgressContext.Provider value={progress}>{children}</ProgressContext.Provider>
    </View>
  );
}

interface OverlayProps {
  visible: boolean;
  /** Back on Android, like a Modal's `onRequestClose`. */
  onRequestClose?: () => void;
  children: ReactNode;
}

/** Shows `children` in the nearest host while `visible`; in place when there is none (tests). */
export function Overlay({ visible, onRequestClose, children }: OverlayProps) {
  const host = useContext(HostContext);
  const key = useId();

  useEffect(() => {
    if (host && visible) host.show(key, children);
  }, [host, key, visible, children]);
  useEffect(() => {
    if (!host || !visible) return;
    return () => host.hide(key);
  }, [host, key, visible]);

  // Registered once per opening: the last overlay opened is the first to close.
  const requestClose = useEffectEvent(() => onRequestClose?.());
  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => subscription.remove();
  }, [visible]);

  if (host || !visible) return null;
  return <View style={StyleSheet.absoluteFill}>{children}</View>;
}

/** The overlay's entry: 0 hidden, 1 shown. */
export function useOverlayProgress(): Animated.Value {
  return useContext(ProgressContext) ?? SHOWN;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
