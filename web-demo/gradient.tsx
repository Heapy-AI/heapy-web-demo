// 작성자: 김진우
import React from 'react';
import { View } from 'react-native';
export default function Gradient({
  colors,
  children,
  style,
  start,
  end,
  locations,
  ...props
}: any) {
  const angle =
    start && end
      ? 90 + (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI
      : 180;
  return (
    <View
      {...props}
      style={[
        style,
        {
          backgroundImage: `linear-gradient(${angle}deg, ${colors
            .map(
              (c: string, i: number) =>
                c + (locations ? ` ${locations[i] * 100}%` : ''),
            )
            .join(',')})`,
        },
      ]}
    >
      {children}
    </View>
  );
}
