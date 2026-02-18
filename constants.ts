import { AuthTypeDefinition } from './types';

export const AUTH_TYPES: AuthTypeDefinition[] = [
  {
    id: 'api_key',
    name: 'API 키',
    fields: [
      { key: 'api_key', label: 'API 키', type: 'password' }
    ],
    example: 'sk-...',
    description: '가장 일반적인 인증 방식입니다. 서비스에서 발급받은 단일 API 키를 저장합니다.'
  },
  {
    id: 'basic_auth',
    name: '기본 인증 (ID/PW)',
    fields: [
      { key: 'username', label: '사용자명', type: 'text' },
      { key: 'password', label: '비밀번호', type: 'password' }
    ],
    example: 'user:pass',
    description: '전통적인 HTTP Basic Auth 방식입니다. 사용자 이름과 비밀번호 쌍을 저장합니다.'
  },
  {
    id: 'bearer_token',
    name: 'Bearer 토큰',
    fields: [
      { key: 'token', label: '토큰', type: 'password' }
    ],
    example: 'eyJhbGciOiJIUz...',
    description: 'JWT 등 HTTP Authorization 헤더에 Bearer 토큰으로 사용되는 값을 저장합니다.'
  },
  {
    id: 'oauth2',
    name: 'OAuth 2.0 클라이언트',
    fields: [
      { key: 'client_id', label: '클라이언트 ID', type: 'text' },
      { key: 'client_secret', label: '클라이언트 시크릿', type: 'password' }
    ],
    description: 'OAuth 애플리케이션 연동을 위한 Client ID와 Secret Key 쌍을 저장합니다.'
  },
  {
    id: 'aws_creds',
    name: 'AWS 자격증명',
    fields: [
      { key: 'access_key_id', label: '액세스 키 ID', type: 'text' },
      { key: 'secret_access_key', label: '시크릿 액세스 키', type: 'password' },
      { key: 'region', label: '리전', type: 'text' }
    ],
    description: 'AWS 리소스 접근을 위한 IAM 사용자 자격증명과 리전 정보를 저장합니다.'
  },
  {
    id: 'database',
    name: '데이터베이스 연결',
    fields: [
      { key: 'host', label: '호스트', type: 'text' },
      { key: 'port', label: '포트', type: 'text' },
      { key: 'username', label: '사용자명', type: 'text' },
      { key: 'password', label: '비밀번호', type: 'password' },
      { key: 'database', label: '데이터베이스명', type: 'text' }
    ],
    description: 'DB 접속에 필요한 호스트, 포트, 계정 정보를 한곳에 모아 저장합니다.'
  },
  {
    id: 'custom',
    name: '커스텀 (JSON)',
    fields: [
      { key: 'custom_json', label: 'JSON 데이터', type: 'textarea' }
    ],
    description: '정형화되지 않은 데이터를 JSON 형식으로 자유롭게 구성하여 저장합니다.'
  }
];

export const DB_KEY = 'secure_key_vault_db_v1';