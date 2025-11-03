import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// API Route를 dynamic으로 설정하여 빌드 시 실행 방지
export const dynamic = 'force-dynamic';

// OpenAI 인스턴스 생성 (lazy initialization)
let openai: OpenAI | null = null;

const getOpenAI = () => {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
};

// 프롬프트 템플릿
const PROMPT_TEMPLATES = {
  base: (subject: string, predicate: string, category: string, originalSentence: string) => `
너는 말 못하는 사람들이 자연스럽게 대화할 수 있도록 도와주는 전문가야.
기계 같은 문장이 아니라, 실제로 사람들이 일상에서 쓰는 말투로 바꿔줘.

입력된 정보:
- 주어: ${subject}
- 서술어: ${predicate}
- 카테고리: ${category}
- 만들어진 문장: ${originalSentence}

어떻게 바꿔줘:
1. 딱딱한 표현은 부드럽게 풀어서 말해줘
   예) "나 물 필요해"
   예) "되게 기분 좋아 보여"

2. 존댓말 골라줘
   - 부탁할 때는 부드럽게 ("~줄래?", "~해줄 수 있어?")
   - 감정 표현은 솔직하게 ("진짜 화나", "너무 좋아")

3. 주어는 자연스러우면 빼도 돼
   예) "나 배고파" → "배고파", "배고픈데"

4. 실제 대화하듯이 짧고 간결하게

5. 최대한 짧고 간결하게

중요: '자연스럽게', '다시' 같은 단어 뒤에 붙이지 마!`,

  question: (subject: string, predicate: string, category: string, originalSentence: string) => `
말 못하는 사람이 질문할 때 자연스럽게 들리도록 도와줘.
사람들이 실제로 쓰는 질문 말투로 바꿔줘.

입력된 정보:
- 주어: ${subject}
- 서술어: ${predicate}
- 카테고리: ${category}
- 만들어진 문장: ${originalSentence}
- 형식: 질문

어떻게 바꿔줘:
1. 짧고 간결한 질문으로
   예) "너 기뻐?" → "기뻐?", "기분 좋아?"
   예) "나 배고파?" → "배고파?", "뭐 먹을까?"

2. 상황별로 자연스럽게
   - 감정 물어볼 때: "괜찮아?", "어때?", "힘들어?"
   - 상태 확인할 때: "피곤해?", "아파?", "졸려?"
   - 무언가 필요할 때: "물 줄래?", "이거 필요해?"

3. 주어는 빼도 돼
   예) "너 물 필요해?" → "물 필요해?", "물 마실래?"

4. 실제 대화처럼 짧게

중요: '자연스럽게', '다시' 같은 단어 붙이지 마!`
};

const SYSTEM_MESSAGE = `너는 말하기 어려운 사람들이 일상 대화를 자연스럽게 할 수 있도록 돕는 전문가야.
기계 같은 딱딱한 문장이 아니라, 실제 사람들이 친구나 가족과 대화할 때 쓰는 편한 말투로 바꿔줘.
짧고 간결하게, 그리고 상황에 맞게 존댓말이나 반말을 적절히 섞어서 써줘.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      subject = '',
      predicate = '',
      category = '',
      originalSentence = '',
      isQuestion = false
    } = body;

    // API 키 확인
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured', sentence: originalSentence },
        { status: 200 }
      );
    }

    // 필수 필드 검증
    if (!originalSentence) {
      return NextResponse.json(
        { error: 'Original sentence is required', sentence: '' },
        { status: 400 }
      );
    }

    // 프롬프트 선택
    const prompt = isQuestion
      ? PROMPT_TEMPLATES.question(subject, predicate, category, originalSentence)
      : PROMPT_TEMPLATES.base(subject, predicate, category, originalSentence);

    // OpenAI API 호출
    const client = getOpenAI();
    if (!client) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured', sentence: originalSentence },
        { status: 200 }
      );
    }

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_MESSAGE },
        { role: 'user', content: prompt }
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    const enhancedSentence = response.choices[0]?.message?.content?.trim() || originalSentence;

    return NextResponse.json({ sentence: enhancedSentence });
  } catch (error) {
    console.error('Error enhancing sentence:', error);

    // 에러 발생 시에도 원본 문장 반환 시도
    try {
      const body = await request.json().catch(() => ({}));
      const originalSentence = body.originalSentence || '';
      return NextResponse.json(
        { error: 'Failed to enhance sentence', sentence: originalSentence },
        { status: 200 }
      );
    } catch {
      return NextResponse.json(
        { error: 'Failed to enhance sentence', sentence: '' },
        { status: 200 }
      );
    }
  }
}