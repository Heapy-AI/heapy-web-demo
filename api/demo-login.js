/* global AbortSignal */
// 작성자: 김진우 — 가상 인물 계정만 공개 체험에 사용하며 비밀번호는 서버 환경변수로 보관한다.
module.exports = async function demoLogin(request, response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('CDN-Cache-Control', 'no-store');
  response.setHeader('Vercel-CDN-Cache-Control', 'no-store');
  const fail = (status, message) =>
    response.status(status).json({ code: 'DEMO-LOGIN', message });

  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return fail(405, '로그인 버튼으로 체험을 시작해 주세요.');
  }
  const password = process.env.HEAPY_DEMO_PASSWORD;
  if (!password) {
    return fail(503, '체험 로그인을 준비 중이에요. 잠시 후 다시 시도해 주세요.');
  }

  try {
    // 작성자: 김진우 — 요청 본문의 이메일·주소는 사용하지 않아 다른 계정이나 서버로 변경할 수 없다.
    const upstream = await fetch('https://13.125.12.94/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@gmail.com', password }),
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    if (!upstream.ok) {
      return fail(
        upstream.status === 429 ? 429 : 503,
        '체험 계정에 로그인하지 못했어요. 잠시 후 다시 시도해 주세요.',
      );
    }
    const payload = await upstream.json();
    const session = payload.data;
    if (
      session?.user?.userId !== 'e115c6ec-bc2d-46eb-af18-8cc3be723d8f' ||
      session.user.email !== 'test@gmail.com' ||
      !session.accessToken ||
      !session.refreshToken
    ) {
      return fail(502, '체험 계정 정보를 확인하지 못했어요.');
    }
    return response.status(200).json({
      success: true,
      data: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        tokenType: session.tokenType,
        expiresAt: session.expiresAt,
        expiresIn: session.expiresIn,
        nextStep: session.nextStep,
        onboardingStep: session.onboardingStep,
        user: {
          userId: session.user.userId,
          email: session.user.email,
          emailVerified: session.user.emailVerified,
        },
      },
    });
  } catch {
    return fail(503, '체험 로그인 서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.');
  }
};
