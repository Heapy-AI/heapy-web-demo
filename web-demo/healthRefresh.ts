// 작성자: 김진우 — 웹에서는 SDK 동기화만 생략하며 실제 서버 조회·분석은 유지한다.
export async function refreshSamsungConnection(
  onProgress?: (text: string) => void,
) {
  const message =
    '삼성헬스 동기화는 모바일 앱에서 지원해요. 웹에서는 서버에 저장된 건강 기록을 조회합니다.';
  onProgress?.(message);
  return { connected: false, message, receivedCount: 0 };
}
