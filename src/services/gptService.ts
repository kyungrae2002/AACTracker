// GPT API 서비스 - 서버 API 라우트 사용

export async function getEnhancedSentence(
  originalSentence: string,
  isQuestion?: boolean,
  politeness: 'casual' | 'formal' = 'casual'
): Promise<string> {
  try {
    console.log('🔄 GPT API 호출 시작');
    console.log('  - 원본 문장:', originalSentence);
    console.log('  - 질문 여부:', isQuestion);
    console.log('  - 말투:', politeness);

    const response = await fetch('/api/enhance-sentence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        originalSentence,
        isQuestion: isQuestion || false,
        politeness,
      }),
    });

    if (!response.ok) {
      throw new Error(`API 요청 실패: ${response.status}`);
    }

    const data = await response.json();

    // API 키가 설정되지 않은 경우 경고
    if (data.error) {
      console.warn('⚠️ GPT API 오류:', data.error);
      if (data.error.includes('API key')) {
        console.warn('📌 해결 방법:');
        console.warn('1. https://platform.openai.com/api-keys 에서 API 키를 생성하세요');
        console.warn('2. .env.local 파일에 OPENAI_API_KEY=실제키값 을 추가하세요');
        console.warn('3. 서버를 재시작하세요');
      }
    }

    const enhancedSentence = data.sentence || originalSentence;

    if (enhancedSentence === originalSentence) {
      console.log('⚠️ GPT 개선 없음 - 원본 문장 사용');
    } else {
      console.log('✅ GPT 문장 생성 완료:', enhancedSentence);
    }

    return enhancedSentence;
  } catch (error) {
    console.error('❌ GPT API 오류:', error);
    console.warn('원본 문장을 그대로 사용합니다.');
    return originalSentence;
  }
}