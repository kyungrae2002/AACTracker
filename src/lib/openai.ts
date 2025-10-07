import OpenAI from 'openai';

// OpenAI API 키 설정 (환경 변수 사용 권장)
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
  dangerouslyAllowBrowser: true // 클라이언트 사이드에서 사용 시 필요
});

// 문장을 자연스럽게 다듬는 함수
export async function enhanceSentence(
  subject: string,
  predicate: string,
  category: string,
  originalSentence: string
): Promise<string> {
  try {
    // API 키가 설정되지 않은 경우 원본 문장 반환
    if (!process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
      console.warn('OpenAI API key not found. Using original sentence.');
      return originalSentence;
    }

    const prompt = `다음은 AAC(보완대체의사소통) 시스템에서 생성된 문장입니다.
주어: ${subject}
서술어: ${predicate}
카테고리: ${category}
생성된 기본 문장: ${originalSentence}

이 문장을 한국어로 자연스럽고 대화체로 다듬어주세요.
요구사항:
1. 의미는 유지하되 더 자연스러운 한국어 표현으로 만들어주세요
2. 대화할 때 실제로 쓸 법한 문장으로 만들어주세요
3. 너무 격식을 차리지 말고 친근한 느낌으로
4. 문장은 짧고 간결하게 유지해주세요
5. 이모티콘이나 특수문자는 사용하지 마세요

다듬어진 문장만 출력하세요:`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '당신은 AAC 시스템의 문장을 자연스럽게 다듬는 도우미입니다. 간결하고 자연스러운 한국어 대화체로 문장을 만들어주세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const enhancedSentence = response.choices[0]?.message?.content?.trim();

    // GPT 응답이 유효한 경우 반환, 아니면 원본 반환
    return enhancedSentence || originalSentence;
  } catch (error) {
    console.error('Error enhancing sentence with GPT:', error);
    // 에러 발생 시 원본 문장 반환
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