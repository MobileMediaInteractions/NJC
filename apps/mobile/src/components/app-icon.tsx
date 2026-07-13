import { Ionicons } from '@expo/vector-icons';
import { useSyncExternalStore, type ComponentProps } from 'react';
import { View, type ColorValue } from 'react-native';

type IconName = ComponentProps<typeof Ionicons>['name'];
const subscribe = () => () => undefined;
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function AppIcon({ name, size, color }: { name: IconName; size: number; color: ColorValue }) {
  const mounted = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!mounted) return <View aria-hidden style={{ width: size, height: size }} />;
  return <Ionicons name={name} size={size} color={color} />;
}
