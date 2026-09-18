// 작성자: 김진우 — 웹에서는 모바일 알림 권한을 요청하지 않으며 모달에도 체험 안내를 유지한다.
import React from 'react';
import { Modal as WebModal, View } from 'react-native-web';
export * from 'react-native-web';
export const PermissionsAndroid = {
  PERMISSIONS: {},
  RESULTS: { GRANTED: 'granted' },
  check: async () => false,
  request: async () => 'denied',
};
export function Modal({ children, ...props }: any) {
  return React.createElement(
    WebModal,
    props,
    React.createElement(
      View,
      { style: { flex: 1, width: '100%', maxWidth: 480, alignSelf: 'center' } },
      React.createElement(
        'div',
        { className: 'demo-banner' },
        'HEAPY 웹 체험 · 가상 인물 데이터 / 실제 서비스',
      ),
      children,
    ),
  );
}

