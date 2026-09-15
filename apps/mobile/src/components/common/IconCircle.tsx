import React, { FC, ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

interface IconCircleProps {
  children: ReactNode;
  color?: string;
  backgroundColor?: string;
  size?: number;
  style?: ViewStyle;
}

export const IconCircle: FC<IconCircleProps> = ({
  children,
  color = '#0B4F4A',
  backgroundColor,
  size = 28,
  style,
}) => {
  const bg = backgroundColor || `${color}1A`; // ~10-12% opacity tint

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
