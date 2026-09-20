// 작성자: 김진우 — 모바일 내비게이션·화면·인증·API를 그대로 사용한다.
import React, { useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '../src/navigation/RootNavigator';
import { RootRoute } from '../src/navigation/routes';
import './style.css';
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
function App() {
  const [information, setInformation] = useState(false);
  const announced = useRef(false);
  const close = useCallback(() => setInformation(false), []);
  // 작성자: 김진우 — 로그인 화면이 처음 보일 때 체험 안내를 자동으로 띄운다.
  const handleRouteChange = useCallback((route: RootRoute) => {
    if (route !== 'Login' || announced.current) return;
    announced.current = true;
    setInformation(true);
  }, []);
  return (
    <>
      <header className="demo-banner">
        <span>
          <strong>HEAPY 웹 체험</strong>
          <span className="simulation">가상 인물 데이터</span>
        </span>
        <button onClick={() => setInformation(true)}>체험 안내</button>
      </header>
      <main className="app-shell">
        <SafeAreaProvider>
          <RootNavigator onRouteChange={handleRouteChange} />
        </SafeAreaProvider>
      </main>
      {information && (
        <div className="modal-backdrop" onClick={close}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="웹 체험 안내"
            className="info-dialog"
            onClick={e => e.stopPropagation()}
          >
            <h2>HEAPY 웹 체험 안내</h2>
            <h3>HEAPY란?</h3>
            <p>
              <b>삼성헬스 데이터를 연동해 맞춤 건강 관리와 AI 분석을
              제공하는 모바일 앱 서비스</b>입니다.
            </p>
            <ul>
              <li>
                원티드 AI 챔피언십 공모전 제출 형식에 맞춰 주요 기능을 웹에서 체험할 수 있도록 제공드립니다.
              </li>
            </ul>
            <h3>체험 계정</h3>
            <ul>
              <li>
                개인정보 보호를 위해 시연용 건강 데이터를 사용하며, 
                실제 인물의 건강 데이터가 아님을 알려드립니다.
              </li>
              <li>
                모든 체험자가 동일한 테스트 계정으로 접속되며, 
                건강 조회·AI 분석·챗봇 등 주요 기능은 실제 서비스와 동일하게 체험할 수 있습니다.
              </li>
              <li>
                계정에 저장되는 사항에 한하여 다른 체험자에게도 동일하게 보일 수 있으므로, 개인정보가 포함되지 않는 이용을 권장드립니다.
              </li>
            </ul>
            <h3>미제공 기능</h3>
            <ul>
              <li>
                삼성헬스 직접 연동과 푸시 알림은 모바일 앱에서만 지원하여, 웹 체험에서 제외되었음을 안내드립니다.
              </li>
            </ul>
            <button className="primary" autoFocus onClick={close}>
              확인
            </button>
          </section>
        </div>
      )}
    </>
  );
}
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>,
);
