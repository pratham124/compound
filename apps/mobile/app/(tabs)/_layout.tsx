import { NativeTabs } from "expo-router/native-tabs";

import { TAB_NAMES, TABS } from "../../src/navigation/tabs.ts";
import { useAppearance } from "../../src/theme/useAppearance.ts";

export default function TabsLayout() {
  const { palette } = useAppearance();

  return (
    <NativeTabs
      tintColor={palette.accent}
      unstable_nativeProps={{
        nativeContainerStyle: { backgroundColor: palette.bg },
      }}
    >
      {TAB_NAMES.map((name) => (
        <NativeTabs.Trigger key={name} name={TABS[name].route}>
          <NativeTabs.Trigger.Label>
            {TABS[name].label}
          </NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={TABS[name].sfSymbol} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
