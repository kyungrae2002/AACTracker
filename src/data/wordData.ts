// 단어 데이터 구조
export interface WordOption {
  id: string;
  label: string;
}

// ===== 쉽게 단어 추가/제거할 수 있는 데이터 구조 =====

// 1단계: 상황(카테고리)
export const categories: WordOption[] = [
  { id: 'greeting', label: '인사' },
  { id: 'emotion', label: '감정' },
  { id: 'status', label: '상태' },
  { id: 'object', label: '사물' },
];

// 2단계: 핵심 단어 (각 상황별 세부 분류)
export const coreWords: Record<string, WordOption[]> = {
  // 인사 상황의 핵심 단어
  greeting: [
    { id: 'basic', label: '기본' },
    { id: 'wellness', label: '안부' },
    { id: 'thanks', label: '감사' },
    { id: 'farewell', label: '작별' },
  ],

  // 감정 상황의 핵심 단어
  emotion: [
    { id: 'mood', label: '기분' },
    { id: 'heart', label: '마음' },
    { id: 'worry', label: '걱정' },
    { id: 'love', label: '사랑' },
    { id: 'loneliness', label: '외로움' },
  ],

  // 상태 상황의 핵심 단어
  status: [
    { id: 'meal', label: '식사' },
    { id: 'pain', label: '통증' },
    { id: 'temperature', label: '온도' },
    { id: 'sleep', label: '수면' },
    { id: 'water', label: '물' },
    { id: 'food', label: '밥' },
    { id: 'medicine', label: '약' },
    { id: 'toilet', label: '화장실' },
  ],

  // 사물 상황의 핵심 단어
  object: [
    { id: 'tv', label: 'TV' },
    { id: 'light', label: '조명' },
    { id: 'phone', label: '휴대폰' },
    { id: 'ac', label: '냉난방기' },
  ],
};

// 3단계: 서술어 (각 핵심 단어에 맞는 동사/형용사)
export const predicates: Record<string, WordOption[]> = {
  // 인사 - 기본
  'greeting_basic': [
    { id: 'hello', label: '안녕' },
    { id: 'morning', label: '아침' },
    { id: 'lunch', label: '점심' },
    { id: 'evening', label: '저녁' },
  ],

  // 인사 - 안부
  'greeting_wellness': [
    { id: 'curious', label: '궁금' },
    { id: 'good', label: '좋음' },
    { id: 'okay', label: '괜찮음' },
    { id: 'sleep', label: '잠' },
  ],

  // 인사 - 감사
  'greeting_thanks': [
    { id: 'thankyou', label: '고마워' },
    { id: 'visit', label: '방문' },
    { id: 'help', label: '도움' },
    { id: 'kind', label: '친절' },
  ],

  // 인사 - 작별
  'greeting_farewell': [
    { id: 'goodbye', label: '잘가' },
    { id: 'goodwork', label: '수고' },
    { id: 'careful', label: '조심' },
    { id: 'nexttime', label: '다음에' },
  ],

  // 감정 - 기분
  'emotion_mood': [
    { id: 'good', label: '좋다' },
    { id: 'bad', label: '나쁘다' },
    { id: 'happy', label: '기쁘다' },
    { id: 'sad', label: '슬프다' },
    { id: 'strange', label: '묘하다' },
  ],

  // 감정 - 마음
  'emotion_heart': [
    { id: 'comfortable', label: '편안하다' },
    { id: 'anxious', label: '불안하다' },
    { id: 'stuffy', label: '답답하다' },
    { id: 'heavy', label: '무겁다' },
  ],

  // 감정 - 걱정
  'emotion_worry': [
    { id: 'is', label: '되다' },
    { id: 'much', label: '많다' },
    { id: 'big', label: '크다' },
    { id: 'none', label: '없다' },
    { id: 'ahead', label: '앞서다' },
  ],

  // 감정 - 사랑
  'emotion_love': [
    { id: 'do', label: '하다' },
    { id: 'feel', label: '느끼다' },
    { id: 'want', label: '받고싶다' },
    { id: 'big', label: '크다' },
  ],

  // 감정 - 외로움
  'emotion_loneliness': [
    { id: 'feel', label: '느끼다' },
    { id: 'big', label: '크다' },
    { id: 'severe', label: '심하다' },
    { id: 'ride', label: '타다' },
  ],

  // 상태 - 식사
  'status_meal': [
    { id: 'hungry', label: '배고프다' },
    { id: 'full', label: '배부르다' },
    { id: 'ate', label: '먹었다' },
    { id: 'didnt_eat', label: '안먹었다' },
  ],

  // 상태 - 통증
  'status_pain': [
    { id: 'have', label: '있다' },
    { id: 'none', label: '없다' },
    { id: 'severe', label: '심하다' },
    { id: 'little', label: '조금' },
    { id: 'okay', label: '괜찮다' },
  ],

  // 상태 - 온도
  'status_temperature': [
    { id: 'cold', label: '춥다' },
    { id: 'hot', label: '덥다' },
    { id: 'cool', label: '시원하다' },
    { id: 'warm', label: '따뜻하다' },
  ],

  // 상태 - 수면
  'status_sleep': [
    { id: 'sleepy', label: '졸리다' },
    { id: 'slept', label: '잤다' },
    { id: 'couldnt_sleep', label: '못잤다' },
    { id: 'tired', label: '피곤하다' },
  ],

  // 상태 - 물
  'status_water': [
    { id: 'drink', label: '마시다' },
    { id: 'give', label: '주다' },
    { id: 'cold', label: '차갑다' },
    { id: 'hot', label: '뜨겁다' },
  ],

  // 상태 - 밥
  'status_food': [
    { id: 'hungry', label: '배고프다' },
    { id: 'full', label: '배부르다' },
    { id: 'eat', label: '먹다' },
    { id: 'didnt_eat', label: '안먹었다' },
  ],

  // 상태 - 약
  'status_medicine': [
    { id: 'need', label: '필요하다' },
    { id: 'took', label: '먹었다' },
    { id: 'give', label: '주다' },
    { id: 'didnt_take', label: '안 먹었다' },
  ],

  // 상태 - 화장실
  'status_toilet': [
    { id: 'want_to_go', label: '가고싶다' },
    { id: 'urgent', label: '급하다' },
    { id: 'help', label: '도와주다' },
    { id: 'uncomfortable', label: '불편하다' },
  ],

  // 사물 - TV
  'object_tv': [
    { id: 'turn_on', label: '켜다' },
    { id: 'turn_off', label: '끄다' },
    { id: 'up', label: '올리다' },
    { id: 'down', label: '내리다' },
  ],

  // 사물 - 조명
  'object_light': [
    { id: 'turn_on', label: '켜다' },
    { id: 'turn_off', label: '끄다' },
    { id: 'bright', label: '밝게' },
    { id: 'dark', label: '어둡게' },
  ],

  // 사물 - 휴대폰
  'object_phone': [
    { id: 'give', label: '주다' },
    { id: 'need', label: '필요하다' },
    { id: 'bring', label: '가져오다' },
    { id: 'find', label: '찾다' },
  ],

  // 사물 - 냉난방기
  'object_ac': [
    { id: 'turn_on', label: '켜다' },
    { id: 'turn_off', label: '끄다' },
    { id: 'up', label: '올리다' },
    { id: 'down', label: '내리다' },
  ],
};

// 문장 생성 함수 (새로운 3단계 플로우: 상황 → 핵심 단어 → 서술어)
export function buildSentence(
  selectedCategory?: string,
  selectedCoreWord?: string,
  selectedPredicate?: string
): string {
  // 빈 값 처리
  if (!selectedCategory && !selectedCoreWord && !selectedPredicate) {
    return '';
  }

  // 핵심 단어 레이블 찾기
  const coreWordLabel = (selectedCoreWord && selectedCategory)
    ? coreWords[selectedCategory]?.find(c => c.id === selectedCoreWord)?.label || ''
    : '';

  // 서술어 레이블 찾기
  const predicateLabel = (selectedPredicate && selectedCategory && selectedCoreWord)
    ? predicates[`${selectedCategory}_${selectedCoreWord}`]?.find(p => p.id === selectedPredicate)?.label || ''
    : '';

  // 문장 조합
  if (coreWordLabel && predicateLabel) {
    // 완전한 문장: "핵심단어 서술어" (예: "기분 좋다", "물 마시다")
    return `${coreWordLabel} ${predicateLabel}`;
  } else if (coreWordLabel) {
    // 핵심 단어만 선택된 경우
    return coreWordLabel;
  }

  // 카테고리만 선택된 경우 빈 문자열 반환
  return '';
}