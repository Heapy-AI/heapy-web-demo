// 작성자: 김진우 — 모바일 내비게이션·화면·인증·API를 그대로 사용한다.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from '../src/navigation/RootNavigator';
import './style.css';
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
function App() {
  const [information, setInformation] = useState(false);
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
          <RootNavigator />
        </SafeAreaProvider>
      </main>
      {information && (
        <div className="modal-backdrop" onClick={() => setInformation(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="웹 체험 안내"
            className="info-dialog"
            onClick={e => e.stopPropagation()}
          >
            <h2>HEAPY 웹 체험 안내</h2>
            <p>
              공모전 체험에는 가상 인물 계정을 사용합니다. 해당 계정의 건강
              데이터는 시연용 예시이며, 실제 인물의 삼성헬스 연동 결과가
              아닙니다.
            </p>
            <ul>
              <li>
                건강 조회·AI 분석·챗봇은 모바일 앱과 동일한 실제 서비스를
                이용합니다.
              </li>
              <li>
                건강검진·복약 문서는 이미지 또는 PDF 파일로 업로드할 수
                있습니다.
              </li>
              <li>
                복약 일정·미션·코인샵의 변경 사항은 로그인한 계정에 저장됩니다.
              </li>
            </ul>
            <p>
              삼성헬스 직접 연동과 휴대폰 푸시 알림은 모바일 앱에서 지원합니다.
              웹에서는 서버에 저장된 건강 기록을 조회합니다.
            </p>
            <p>
              입력한 질문과 업로드한 파일은 실제 서버로 전송됩니다. 체험에는
              개인정보가 없는 예시 문서를 사용해 주세요. 새로고침해도 저장된
              기록은 유지됩니다.
            </p>
            <button
              className="primary"
              autoFocus
              onClick={() => setInformation(false)}
            >
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
