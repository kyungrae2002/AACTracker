// 단어 데이터 구조
export interface WordOption {
  id: string;
  label: string;
}

// ===== 쉽게 단어 추가/제거할 수 있는 데이터 구조 =====

// 1단계: 카테고리 (여기에 카테고리를 추가/제거하세요)
export const categories: WordOption[] = [
  { id: 'emotion', label: '감정' },
  { id: 'greeting', label: '인사' },
  { id: 'status', label: '상태' },
  { id: 'object', label: '사물' },
  { id: 'action', label: '행동' },  // 새 카테고리 예시
  { id: 'place', label: '장소' },   // 새 카테고리 예시
];

// 2단계: 주어 (여기에 주어를 추가/제거하세요)
export const subjects: WordOption[] = [
  { id: 'me', label: '나' },
  { id: 'you', label: '너' },
  { id: 'we', label: '우리' },
  { id: 'you_plural', label: '너희' },
];

// 3단계: 카테고리별 서술어 (각 카테고리에 맞는 동사/형용사를 추가/제거하세요)
export const predicates: Record<string, WordOption[]> = {
  // 감정 관련 서술어
  emotion: [
    { id: 'happy', label: '기뻐' },
    { id: 'sad', label: '슬퍼' },
    { id: 'angry', label: '화나' },
    { id: 'tired', label: '피곤해' },
    { id: 'excited', label: '신나' },
    { id: 'bored', label: '심심해' },
    { id: 'scared', label: '무서워' },
    { id: 'lonely', label: '외로워' },
  ],

  // 인사 관련 서술어
  greeting: [
    { id: 'hello', label: '안녕' },
    { id: 'goodbye', label: '잘가' },
    { id: 'thanks', label: '고마워' },
    { id: 'sorry', label: '미안해' },
    { id: 'welcome', label: '환영해' },
    { id: 'congrats', label: '축하해' },
  ],

  // 상태 관련 서술어
  status: [
    { id: 'hungry', label: '배고파' },
    { id: 'thirsty', label: '목말라' },
    { id: 'sleepy', label: '졸려' },
    { id: 'sick', label: '아파' },
    { id: 'hot', label: '더워' },
    { id: 'cold', label: '추워' },
    { id: 'tired_physical', label: '지쳐' },
    { id: 'energetic', label: '힘나' },
  ],

  // 사물 관련 서술어
  object: [
    { id: 'water', label: '물' },
    { id: 'food', label: '밥' },
    { id: 'medicine', label: '약' },
    { id: 'toilet', label: '화장실' },
    { id: 'phone', label: '전화' },
    { id: 'bed', label: '침대' },
    { id: 'clothes', label: '옷' },
    { id: 'glasses', label: '안경' },
  ],

  // 행동 관련 서술어 (새 카테고리)
  action: [
    { id: 'go', label: '가자' },
    { id: 'come', label: '와' },
    { id: 'eat', label: '먹자' },
    { id: 'sleep', label: '자자' },
    { id: 'play', label: '놀자' },
    { id: 'study', label: '공부하자' },
    { id: 'rest', label: '쉬자' },
    { id: 'help', label: '도와줘' },
  ],

  // 장소 관련 서술어 (새 카테고리)
  place: [
    { id: 'home', label: '집' },
    { id: 'hospital', label: '병원' },
    { id: 'school', label: '학교' },
    { id: 'park', label: '공원' },
    { id: 'outside', label: '밖' },
    { id: 'room', label: '방' },
  ],
};

// 문장 생성 규칙 (카테고리별 문장 패턴 정의)
const sentencePatterns: Record<string, (subject: string, predicate: string) => string> = {
  emotion: (subject, predicate) => `${subject} ${predicate}`,
  greeting: (subject, predicate) => `${subject} ${predicate}`,
  status: (subject, predicate) => `${subject} ${predicate}`,
  object: (subject, predicate) => `${subject} ${predicate} 필요해`,
  action: (subject, predicate) => `${subject} ${predicate}`,
  place: (subject, predicate) => `${subject} ${predicate} 가고 싶어`,
};

// 문장 생성 함수 (개선된 버전)
export function buildSentence(
  selectedSubject?: string,
  selectedPredicate?: string,
  selectedCategory?: string
): string {
  // 빈 값 처리
  if (!selectedSubject && !selectedPredicate && !selectedCategory) {
    return '';
  }

  // 주어 레이블 찾기
  const subjectLabel = selectedSubject
    ? subjects.find(s => s.id === selectedSubject)?.label || ''
    : '';

  // 서술어 레이블 찾기
  const predicateLabel = (selectedPredicate && selectedCategory)
    ? predicates[selectedCategory]?.find(p => p.id === selectedPredicate)?.label || ''
    : '';

  // 문장 조합 (카테고리는 표시하지 않음)
  if (subjectLabel && predicateLabel && selectedCategory) {
    // 완전한 문장 생성 (카테고리별 패턴 적용)
    const pattern = sentencePatterns[selectedCategory];
    return pattern ? pattern(subjectLabel, predicateLabel) : `${subjectLabel} ${predicateLabel}`;
  } else if (subjectLabel) {
    // 주어만 선택된 경우
    return subjectLabel;
  }

  // 카테고리만 선택된 경우 빈 문자열 반환
  return '';
}