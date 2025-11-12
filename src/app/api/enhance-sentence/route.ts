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

const SYSTEM_MESSAGE = `너는 문장 변환 전문가다. 너의 유일한 임무는 입력된 정보를 실제 대화에서 사용하는 자연스러운 한국어 문장으로 변환하는 것이다.

## 핵심 규칙
1. **출력:** 변환된 문장 **하나만** 출력한다. 어떤 설명도, 인사도, 따옴표도 붙이지 않는다,.
2. **간결성:** 문장을 절대 길게 만들지 않는다. 불필요한 수식어, 부사(예: '매우', '정말')를 억제하고 핵심만 말한다.
3. **주어 생략:** '나', '너' 같은 주어는 문맥상 불필요하면 생략한다.
4. **말투 준수:** 아래 [말투별 변환 규칙]을 **반드시** 따른다.`;

// 프롬프트 템플릿
const PROMPT_TEMPLATES = {
  casual: (originalSentence: string, isQuestion: boolean) => `
## [말투별 변환 규칙]

### "politeness: casual" (반말 모드)
* **목표:** 친구, 가족에게 말하는 편안한 반말.
* **금지:** 절대로 '해요', '입니다', '-시-' 같은 존댓말을 쓰지 않는다 기본은 기본 상태를 지칭한다. 문장에 넣지 않는다.

**예시 (평서문):**
- 입력: { "subject": "나", "predicate": "배고프다", "politeness": "casual" }
- 출력: 배고파
- 입력: { "subject": "나", "predicate": "기쁘다", "politeness": "casual" }
- 출력: 기분 좋다

**예시 (요청):**
- 입력: { "subject": "나", "predicate": "물 필요하다", "politeness": "casual" }
- 출력: 물 좀 줘
- 입력: { "subject": "너", "predicate": "TV 켜다", "politeness": "casual" }
- 출력: TV 좀 켜줘

**예시 (질문):**
- 입력: { "subject": "너", "predicate": "기쁘다", "politeness": "casual", "type": "question" }
- 출력: 기뻐?
- 입력: { "subject": "너", "predicate": "물 필요하다", "politeness": "casual", "type": "question" }
- 출력: 물 마실래?

---

입력된 문장: "${originalSentence}"
형식: ${isQuestion ? '질문' : '평서문/요청'}

위 규칙에 따라 변환된 문장만 출력하세요.`,

  formal: (originalSentence: string, isQuestion: boolean) => `
## [말투별 변환 규칙]

### "politeness: formal" (존댓말 모드)
* **목표:** 의료진, 간병인, 처음 보는 사람에게 말하는 부드러운 존댓말 ('-요' 체).
* **금지:** '합니다', '-ㅂ니다' 같은 딱딱한 격식체를 쓰지 않는다.

**예시 (평서문):**
- 입력: { "subject": "나", "predicate": "배고프다", "politeness": "formal" }
- 출력: 배고파요
- 입력: { "subject": "나", "predicate": "기쁘다", "politeness": "formal" }
- 출력: 기분 좋아요

**예시 (요청):**
- 입력: { "subject": "나", "predicate": "물 필요하다", "politeness": "formal" }
- 출력: 물 좀 주세요
- 입력: { "subject": "너", "predicate": "TV 켜다", "politeness": "formal" }
- 출력: TV 좀 켜주실 수 있어요?

**예시 (질문):**
- 입력: { "subject": "너", "predicate": "기쁘다", "politeness": "formal", "type": "question" }
- 출력: 기분 좋으세요?
- 입력: { "subject": "너", "predicate": "물 필요하다", "politeness": "formal", "type": "question" }
- 출력: 물 필요하세요?

---

입력된 문장: "${originalSentence}"
형식: ${isQuestion ? '질문' : '평서문/요청'}

위 규칙에 따라 변환된 문장만 출력하세요.`
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      originalSentence = '',
      isQuestion = false,
      politeness = 'casual' // 'casual' 또는 'formal'
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

    // 프롬프트 선택 (말투에 따라)
    const prompt = politeness === 'formal'
      ? PROMPT_TEMPLATES.formal(originalSentence, isQuestion)
      : PROMPT_TEMPLATES.casual(originalSentence, isQuestion);

    // 디버깅: 프롬프트 로깅
    console.log('====== GPT 요청 디버깅 ======');
    console.log('입력 문장:', originalSentence);
    console.log('질문 여부:', isQuestion);
    console.log('말투:', politeness);
    console.log('생성된 프롬프트:\n', prompt);
    console.log('==========================');

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
      temperature: 0.5,
      max_tokens: 50,
    });

    const enhancedSentence = response.choices[0]?.message?.content?.trim() || originalSentence;

    // 디버깅: GPT 응답 로깅
    console.log('====== GPT 응답 디버깅 ======');
    console.log('GPT 응답:', enhancedSentence);
    console.log('원본 문장:', originalSentence);
    console.log('==========================');

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