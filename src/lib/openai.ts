// 캐시 타입 정의
interface CacheEntry {
  sentence: string;
  timestamp: number;
}

class SentenceCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 100; // 최대 캐시 크기
  private ttl = 3600000; // 1시간 TTL

  get(key: string): string | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // TTL 체크
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.sentence;
  }

  set(key: string, sentence: string): void {
    // LRU: 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, {
      sentence,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// 싱글톤 캐시 인스턴스
const sentenceCache = new SentenceCache();

// OpenAI API를 통해 문장을 개선하는 함수
export async function getEnhancedSentence(
  subject: string,
  predicate: string,
  category: string,
  originalSentence: string,
  isQuestion: boolean = false
): Promise<string> {
  const cacheKey = `${subject}-${predicate}-${category}-${isQuestion ? 'Q' : 'S'}`;

  // 캐시 확인
  const cached = sentenceCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  try {
    // API 호출
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
        isQuestion,
      }),
    });

    if (!response.ok) {
      console.error('API request failed:', response.statusText);
      return originalSentence;
    }

    const data = await response.json();
    const enhancedSentence = data.sentence || originalSentence;

    // 캐시에 저장
    sentenceCache.set(cacheKey, enhancedSentence);

    return enhancedSentence;
  } catch (error) {
    console.error('Error enhancing sentence:', error);
    return originalSentence;
  }
}

// 캐시 클리어 함수 (필요시 사용)
export function clearSentenceCache(): void {
  sentenceCache.clear();
}