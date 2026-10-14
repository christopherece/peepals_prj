/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */
import { Text as DefaultText, View as DefaultView } from 'react-native';

import { useColorScheme } from './useColorScheme';

import Colors, { type ColorName } from '@/constants/Colors';
import { Type, type TypeName } from '@/constants/Typography';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps &
  DefaultText['props'] & {
    /** Step on the type scale (constants/Typography.ts). Defaults to plain 14pt text. */
    type?: TypeName;
    /** Low-contrast secondary text (distances, timestamps, hints). */
    muted?: boolean;
  };
export type ViewProps = ThemeProps & DefaultView['props'];

export function useThemeColor(props: { light?: string; dark?: string }, colorName: ColorName) {
  const theme = useColorScheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, type, muted, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, muted ? 'muted' : 'text');

  return <DefaultText style={[{ color }, type && Type[type], style]} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}
