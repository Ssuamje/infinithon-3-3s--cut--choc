# 깜빡임 게임 프로젝트 구조

## 📁 폴더 구조

```
src/
├── components/           # UI 컴포넌트들
│   ├── Character.tsx    # 캐릭터 컴포넌트
│   ├── ControlPanel.tsx # 컨트롤 패널 컴포넌트
│   └── VideoDisplay.tsx # 비디오/캐릭터 표시 컴포넌트
├── hooks/               # 커스텀 훅들
│   ├── useCamera.ts     # 카메라 관련 로직
│   └── useDisplaySettings.ts # 화면 표시 설정 로직
├── App.tsx              # 메인 앱 컴포넌트
├── GameUI.tsx           # 게임 UI 컴포넌트
├── useBlinkDetector.ts  # 깜빡임 감지 로직
└── useGameLogic.ts      # 게임 로직
```

## 🎯 컴포넌트 설명

### 📹 VideoDisplay.tsx

- 비디오와 캐릭터를 표시하는 컴포넌트
- `showFace`와 `showCharacter` 상태에 따라 다른 내용 표시
- Props:
  - `videoRef`: 비디오 엘리먼트 참조
  - `showFace`: 얼굴 보기 토글
  - `showCharacter`: 캐릭터 보기 토글
  - `mirrored`: 미러 모드
  - `ready`: 카메라 준비 상태
  - `error`: 에러 메시지
  - `isBlinking`: 깜빡임 상태

### 🎮 Character.tsx

- 깜빡임에 반응하는 캐릭터 컴포넌트
- Props:
  - `isBlinking`: 깜빡임 상태 (boolean)

### 🎛️ ControlPanel.tsx

- 카메라 상태, 깜빡임 정보, 설정 토글들을 표시
- Props:
  - `state`: 카메라 상태
  - `blinkState`: 깜빡임 상태
  - `blinks`: 깜빡임 횟수
  - `ratioL`, `ratioR`: 좌우 눈 비율
  - `closeT`, `openT`: 임계값
  - `mirrored`, `showFace`, `showCharacter`: 설정 상태
  - 각종 콜백 함수들

## 🔧 커스텀 훅 설명

### 📷 useCamera.ts

- 카메라 관련 모든 로직을 담당
- 반환값:
  - `videoRef`: 비디오 엘리먼트 참조
  - `state`: 카메라 상태 ("idle" | "loading" | "ready" | "error")
  - `ready`: 카메라 준비 상태
  - `error`: 에러 메시지
  - `startCamera`: 카메라 시작 함수
  - `stopCamera`: 카메라 중지 함수

### ⚙️ useDisplaySettings.ts

- 화면 표시 설정 관련 상태 관리
- 반환값:
  - `mirrored`: 미러 모드 상태
  - `showFace`: 얼굴 보기 상태
  - `showCharacter`: 캐릭터 보기 상태
  - 각 상태 변경 함수들

## 🎨 스타일 가이드

- 모든 컴포넌트는 인라인 스타일 사용
- 일관된 색상 팔레트:
  - 성공: `#21c074`
  - 에러: `#ff5050`
  - 경고: `#f7b731`
  - 기본: `#999`

## 🔄 데이터 플로우

1. **App.tsx**에서 모든 훅들을 조합
2. **useCamera**에서 카메라 상태 관리
3. **useBlinkDetector**에서 깜빡임 감지
4. **useGameLogic**에서 게임 로직 처리
5. **useDisplaySettings**에서 UI 설정 관리
6. 각 컴포넌트들이 props를 통해 데이터 받아서 렌더링

## 🚀 개발 가이드

### 새 컴포넌트 추가

1. `src/components/` 폴더에 새 컴포넌트 생성
2. TypeScript 인터페이스 정의
3. Props 타입 명시
4. 인라인 스타일 사용

### 새 훅 추가

1. `src/hooks/` 폴더에 새 훅 생성
2. 반환값 인터페이스 정의
3. 관련 로직 구현
4. App.tsx에서 사용

### 스타일 수정

- 각 컴포넌트의 `styles` 객체에서 수정
- 일관된 디자인 시스템 유지
