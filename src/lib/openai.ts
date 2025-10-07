// 서버 API를 통해 문장을 개선하는 함수
export async function enhanceSentence(
  subject: string,
  predicate: string,
  category: string,
  originalSentence: string
): Promise<string> {
  try {
    const response = await fetch('/api/enhance-sentence', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subject,
        predicate,
        category,
        originalSentence,
      }),
    });

    if (!response.ok) {
      console.error('API request failed:', response.statusText);
      return originalSentence;
    }

    const data = await response.json();
    return data.sentence || originalSentence;
  } catch (error) {
    console.error('Error enhancing sentence:', error);
    return originalSentence;
  }
}

// 비동기 처리를 위한 캐시
const sentenceCache = new Map<string, string>();

// 캐시를 활용한 문장 개선 함수
export async function getEnhancedSentence(
  subject: string,
  predicate: string,
  category: string,
  originalSentence: string
): Promise<string> {
  const cacheKey = `${subject}-${predicate}-${category}`;

  // 캐시에 있으면 바로 반환
  if (sentenceCache.has(cacheKey)) {
    return sentenceCache.get(cacheKey)!;
  }

  // 캐시에 없으면 API 호출
  const enhanced = await enhanceSentence(subject, predicate, category, originalSentence);
  sentenceCache.set(cacheKey, enhanced);

  return enhanced;
}