// 작성자: 김진우 — 기존 SVG 경로를 브라우저의 동일한 벡터 요소로 렌더링한다.
import React from 'react';
import { StyleSheet } from 'react-native';
const element =
  (name: string) =>
  ({ children, style, onPress, rotation, origin, ...props }: any) =>
    React.createElement(
      name,
      {
        ...props,
        transform: rotation == null ? props.transform : `${props.transform || ''} rotate(${rotation} ${String(origin || '0,0').replace(',', ' ')})`,
        style: StyleSheet.flatten(style),
        onClick: onPress,
      },
      children,
    );
export default element('svg');
export const Svg = element('svg'),
  Path = element('path'),
  Circle = element('circle'),
  Rect = element('rect'),
  G = element('g'),
  Defs = element('defs'),
  LinearGradient = element('linearGradient'),
  Stop = element('stop'),
  Line = element('line'),
  Polyline = element('polyline'),
  Polygon = element('polygon'),
  Ellipse = element('ellipse'),
  ClipPath = element('clipPath'),
  Text = element('text');
export function SvgXml({ xml, width, height }: any) {
  return (
    <img
      alt=""
      width={width}
      height={height}
      src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml)}
    />
  );
}
