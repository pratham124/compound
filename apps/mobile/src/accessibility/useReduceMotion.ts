import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Follows iOS Reduce Motion live, including a change made while the app is open. */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let current = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (current) {
        setReduced(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);

    return () => {
      current = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
