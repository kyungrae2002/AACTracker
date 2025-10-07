import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// OpenAI 인스턴스 생성 (서버 사이드에서만 사용)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { subject, predicate, category, originalSentence } = await request.json();

    // API 키 확인 및 디버깅
    const apiKey = process.env.OPENAI_API_KEY;
    console.log('API 키 존재 여부:', !!apiKey);
    console.log('API 키 앞 10자:', apiKey?.substring(0, 10) + '...');

    if (!apiKey) {
      console.error('❌ OpenAI API 키가 설정되지 않았습니다!');
      return NextResponse.json(
        { error: 'OpenAI API key not configured', sentence: originalSentence + ' [NO_API_KEY]' },
        { status: 200 }
      );
    }

    const prompt = `다음은 AAC(보완대체의사소통) 시스템에서 생성된 문장입니다.
주어: ${subject}
서술어: ${predicate}
카테고리: ${category}
생성된 기본 문장: ${originalSentence}

이 문장에 적절한 한국어 보조사(은/는, 이/가, 을/를 등)를 붙여서 자연스럽고 완전한 문장으로 만들어주세요.

요구사항:
1. 한국어 문법에 맞는 적절한 보조사를 추가하세요
2. 주어와 서술어 사이에 필요한 조사를 붙여주세요
3. 실제 대화에서 쓰는 자연스러운 표현으로 만들어주세요
4. 상황에 맞는 적절한 어미와 존댓말/반말을 사용하세요
5. 이모티콘이나 특수문자는 사용하지 마세요

예시:
- "나 배고파" → "나는 배고파요" 또는 "저는 배가 고파요"
- "우리 아파" → "우리는 아파요" 또는 "우리가 아파요"
- "너 기뻐" → "너는 기뻐?" 또는 "너 기쁘구나"
- "나 물 필요해" → "나는 물이 필요해" 또는 "저는 물이 필요해요"

다듬어진 문장만 출력하고, 문장 끝에 [GPT]를 붙여서 GPT가 생성했다는 것을 표시하세요.
예: "우리는 아파요 [GPT]"`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: '당신은 AAC 시스템 사용자를 도와 자연스러운 대화를 할 수 있게 돕는 전문가입니다. 실제 사람들이 일상에서 쓰는 자연스러운 구어체로 문장을 다듬어주세요. 친근하고 편안한 톤으로 작성하되, 상황에 맞는 적절한 존댓말이나 반말을 사용하세요.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 100,
    });

    const enhancedSentence = response.choices[0]?.message?.content?.trim() || originalSentence;

    // GPT 응답 로깅
    console.log('=== GPT 문장 생성 결과 ===');
    console.log('원본 문장:', originalSentence);
    console.log('GPT 생성 문장:', enhancedSentence);
    console.log('주어:', subject, '| 서술어:', predicate, '| 카테고리:', category);
    console.log('========================');

    return NextResponse.json({ sentence: enhancedSentence });
  } catch (error: any) {
    console.error('❌ Error enhancing sentence:', error);

    // 오류 상세 정보 로깅
    if (error?.response) {
      console.error('OpenAI API 에러 응답:', error.response.status, error.response.data);
    } else if (error instanceof Error) {
      console.error('에러 메시지:', error.message);
    }

    // 에러 발생 시 원본에 에러 태그 추가
    try {
      const { originalSentence } = await request.json();
      return NextResponse.json(
        { error: 'Failed to enhance sentence', sentence: originalSentence + ' [API_ERROR]' },
        { status: 200 }
      );
    } catch {
      return NextResponse.json(
        { error: 'Failed to enhance sentence', sentence: '[ERROR]' },
        { status: 200 }
      );
    }
  }
}