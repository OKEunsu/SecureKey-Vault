# SecureKey Vault (v1.0.2)

SecureKey Vault는 Electron + React + TypeScript 기반의 로컬 비밀번호 보관 앱입니다.  
모든 데이터는 사용자 기기 내부에만 저장되며, 마스터 비밀번호로 암호화됩니다.

## 중요 공지

- 앱 내 복원은 `1.0.2` 백업(JSON)만 지원합니다.
- `1.0.1` 레거시 백업은 복원 시 `지원되지 않는 형식입니다.` 팝업이 표시됩니다.

## 핵심 기능

- 로컬 전용 저장소 사용 (클라우드 업로드 없음)
- AES-GCM 기반 데이터 암호화
- PBKDF2 기반 키 파생/비밀번호 검증
- 백업(.json) 내보내기/불러오기
- 세련된 앱 내 모달 팝업(복원/삭제 확인, 오류 안내)

## 보안 구조 요약

- 저장 위치: Electron `app.getPath('userData')` 아래 앱 전용 파일
- 저장 방식: Electron main process 저장소 + 가능 시 `safeStorage` 사용
- 암호화: Web Crypto API (`AES-GCM`)
- 키 파생: `PBKDF2(SHA-256)`
- 백업 호환: 1.0.2 형식 백업(JSON)만 복원 지원

## 요구 사항

- Node.js 20+
- npm
- Windows (설치 파일 빌드 기준)

## 설치 및 실행 (개발)

```bash
npm install
npm run dev
```

Electron 개발 실행:

```bash
npm run dev:electron
```

## 빌드

웹 번들 빌드:

```bash
npm run build
```

Windows 설치 파일 빌드:

```bash
npm run build:electron
```

생성 결과:

- `release/SecureKey Vault Setup 1.0.2.exe`
- `release/SecureKey Vault 1.0.2.exe` (portable 실행 파일)
- `release/win-unpacked/`

## 백업 호환 정책

- 앱 복원은 `1.0.2`에서 생성한 백업(JSON)만 지원합니다.
- `1.0.1` 레거시 백업 파일은 앱 내 복원 대상이 아닙니다.

## 트러블슈팅

- 아이콘이 바로 안 바뀌어 보이는 경우:
  - 작업표시줄 고정 해제 후 다시 고정
  - 기존 설치 제거 후 재설치
  - Windows 아이콘 캐시 갱신 후 확인
- `지원되지 않는 형식입니다` 오류:
  - 1.0.1 레거시 백업일 가능성이 큼
  - 1.0.2 앱에서 새로 생성한 백업(JSON) 파일인지 확인

## 기술 스택

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS

## 라이선스

MIT
