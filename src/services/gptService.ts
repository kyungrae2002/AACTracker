// GPT API 서비스 - 서버 API 라우트 사용

export async function getEnhancedSentence(
  originalSentence: string,
  isQuestion?: boolean,
  politeness: 'casual' | 'formal' = 'casual'
): Promise<string> {
  try {
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
    const enhancedSentence = data.sentence || originalSentence;

    console.log('✅ GPT 문장 생성 완료:', enhancedSentence);
    return enhancedSentence;
  } catch (error) {
    console.error('❌ GPT API 오류:', error);
    return originalSentence;
  }
}