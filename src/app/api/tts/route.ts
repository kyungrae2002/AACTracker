import { NextRequest, NextResponse } from 'next/server';

// 간단한 TTS 대체 솔루션
// 실제로는 Google Cloud TTS 또는 다른 TTS 서비스를 사용해야 합니다

export async function POST(request: NextRequest) {
  try {
    const { text, lang = 'ko-KR' } = await request.json();

    // 옵션 1: Google Translate TTS (비공식, 무료)
    // 짧은 텍스트에만 작동하며 프로덕션에서는 권장하지 않음
    const googleTTSUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text
    )}&tl=${lang.split('-')[0]}&client=tw-ob`;

    // 옵션 2: 실제 Google Cloud TTS 사용 시 (API 키 필요)
    /*
    const textToSpeech = new TextToSpeechClient();
    const request = {
      input: { text },
      voice: { languageCode: lang, ssmlGender: 'FEMALE' },
      audioConfig: { audioEncoding: 'MP3' },
    };
    const [response] = await textToSpeech.synthesizeSpeech(request);
    return new NextResponse(response.audioContent, {
      headers: { 'Content-Type': 'audio/mpeg' },
    });
    */

    // 임시: Google Translate TTS URL 반환
    return NextResponse.json({
      audioUrl: googleTTSUrl,
      message: '⚠️ 개발용 임시 솔루션입니다. 프로덕션에서는 실제 TTS API를 사용하세요.'
    });

  } catch (error) {
    console.error('TTS API 에러:', error);
    return NextResponse.json(
      { error: 'TTS 생성 실패' },
      { status: 500 }
    );
  }
}