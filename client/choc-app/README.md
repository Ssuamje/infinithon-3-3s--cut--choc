# 🍫 초콜릿 깜빡임 게임

눈 깜빡임을 감지하여 게임을 진행하는 애플리케이션입니다.

## 🚀 실행 방법

### Electron 앱으로 실행 (권장)

```bash
npm run dev:electron
```

### 브라우저에서 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

## 🔧 주요 기능

- **실시간 눈 깜빡임 감지**: MediaPipe FaceMesh를 사용한 정확한 감지
- **게임 로직**: 깜빡임 횟수에 따른 점수 시스템
- **트레이 앱**: macOS/Windows 트레이에서 백그라운드 실행
- **반응형 UI**: 다양한 화면 크기에 최적화

## 🌐 브라우저 vs Electron 환경 차이점

### Electron에서 잘 작동하는 이유

- ✅ **카메라 권한**: 시스템 레벨에서 명시적 권한 요청
- ✅ **보안 컨텍스트**: 로컬 파일 시스템 실행으로 HTTPS 제약 없음
- ✅ **MediaPipe 모델**: CDN 로딩 시 CORS 문제 없음
- ✅ **안정성**: 네이티브 앱 수준의 안정적인 카메라 접근

### 브라우저에서 문제가 발생하는 이유

- ⚠️ **HTTPS 요구사항**: MediaDevices API는 HTTPS 환경에서만 작동
- ⚠️ **CORS 정책**: MediaPipe 모델 로딩 시 CORS 문제 발생 가능
- ⚠️ **카메라 권한**: 브라우저 자동 권한 요청의 불안정성
- ⚠️ **브라우저 정책**: autoplay, 권한 등에 대한 엄격한 제약

## 🛠️ 브라우저 문제 해결 방법

### 1. HTTPS 환경 확인

```bash
# 개발 환경에서 HTTPS 사용
npm install -g local-ssl-proxy
local-ssl-proxy --source 3001 --target 5173
```

### 2. 카메라 권한 수동 허용

- 브라우저 주소창의 카메라 아이콘 클릭
- "허용" 선택
- 페이지 새로고침

### 3. 브라우저 설정 확인

- **Chrome**: `chrome://settings/content/camera`
- **Firefox**: `about:preferences#privacy` → 권한
- **Safari**: 환경설정 → 웹사이트 → 카메라

### 4. 개발자 도구에서 확인

```javascript
// 콘솔에서 실행하여 상태 확인
navigator.mediaDevices
  .getUserMedia({ video: true })
  .then((stream) => console.log("카메라 접근 성공:", stream))
  .catch((err) => console.error("카메라 접근 실패:", err));
```

## 📱 지원 환경

- **Electron**: macOS, Windows, Linux
- **브라우저**: Chrome 60+, Firefox 55+, Safari 11+
- **카메라**: 웹캠 지원 (내장/외장)

## 🎮 게임 규칙

1. **생존**: 눈을 뜨고 있어야 생존
2. **점수**: 깜빡임마다 점수 획득
3. **콤보**: 연속 깜빡임으로 콤보 배율 증가
4. **부활**: 사망 후 일정 횟수 깜빡임으로 부활

## 🔍 디버깅

### ControlPanel 정보

- **환경**: Electron/Browser, HTTPS 상태, 카메라 지원 여부
- **카메라 상태**: idle/loading/ready/error
- **깜빡임 상태**: UNKNOWN/OPEN/CLOSING/CLOSED/OPENING
- **EAR 비율**: 좌안/우안 눈 열림 비율

### 콘솔 로그

- FaceMesh 초기화 과정
- 카메라 스트림 상태
- 프레임 처리 과정
- 에러 발생 시 상세 정보

## 📦 의존성

- **@mediapipe/face_mesh**: 얼굴 랜드마크 감지
- **@mediapipe/camera_utils**: 카메라 프레임 처리
- **React 19**: UI 프레임워크
- **Electron**: 데스크톱 앱 런타임

## 🚨 알려진 이슈

1. **브라우저에서 첫 실행 시 지연**: MediaPipe 모델 로딩 시간
2. **일부 브라우저에서 권한 요청 실패**: 수동 권한 허용 필요
3. **HTTPS 환경에서만 작동**: 개발 시 localhost 또는 HTTPS 서버 필요

## 💡 최적화 팁

- **해상도**: 1280x720 권장 (성능과 정확도 균형)
- **프레임레이트**: 30fps 이상 권장
- **조명**: 밝고 균일한 조명에서 최적 성능
- **거리**: 카메라에서 30-60cm 거리 유지
