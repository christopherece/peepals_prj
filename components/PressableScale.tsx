import * as Haptics from 'expo-haptics';
import { Platform, Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** How far the control shrinks while held. */
  pressedScale?: number;
  /** Light tap feedback on press. Off for controls pressed many times in a row. */
  haptic?: boolean;
};

/** Pressable with a springy shrink and a light haptic: the standard tap state for buttons. */
export default function PressableScale({
  style,
  pressedScale = 0.96,
  haptic = true,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  ...rest
}: Props) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        scale.set(withSpring(pressedScale, { damping: 20, stiffness: 400 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, { damping: 15, stiffness: 300 }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic && Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress?.(e);
      }}
      style={[style, animated, disabled && { opacity: 0.4 }]}
    />
  );
}
