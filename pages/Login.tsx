import React, { useState, useEffect } from 'react';
import { Shield, Unlock, KeyRound, AlertCircle } from 'lucide-react';
import { dbService } from '../services/dbService';
import { verifyPassword, deriveKey } from '../services/cryptoService';

interface LoginProps {
  onLogin: (derivedKey: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSetup, setIsSetup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  useEffect(() => {
    setIsSetup(!dbService.hasDatabase());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSetup) {
      if (password.length < 4) {
        setError('비밀번호가 너무 짧습니다.');
        return;
      }
      if (password !== confirmPassword) {
        setError('비밀번호가 일치하지 않습니다.');
        return;
      }
      // Initialize DB
      dbService.initDatabase(password);
      // initDatabase already sets the key in dbService, but App needs to know too
      const info = dbService.getDatabaseInfo();
      if (info) {
        const derivedKey = deriveKey(password, info.salt);
        onLogin(derivedKey);
      }
    } else {
      const dbInfo = dbService.getDatabaseInfo();
      if (dbInfo && verifyPassword(password, dbInfo.salt, dbInfo.verificationHash)) {
        const derivedKey = deriveKey(password, dbInfo.salt);
        onLogin(derivedKey);
      } else {
        setError('비밀번호가 올바르지 않습니다.');
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // If database exists, warn user about overwriting
    if (!isSetup) {
      if (!window.confirm("경고: 백업 파일을 불러오면 현재 기기에 저장된 모든 데이터가 삭제되고 덮어씌워집니다.\n\n계속하시겠습니까?")) {
        // Reset input value so change event can fire again if same file selected
        e.target.value = '';
        return;
      }
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Basic validation
        const parsed = JSON.parse(content);
        if (!parsed.verificationHash || !parsed.salt) {
          throw new Error('Invalid database format');
        }
        localStorage.setItem('secure_key_vault_db_v1', content);
        alert('복원되었습니다. 마스터 비밀번호로 로그인해주세요.');
        window.location.reload();
      } catch (err) {
        alert('잘못된 백업 파일입니다.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className={`bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl w-full max-w-md ${shake ? 'animate-shake' : ''}`}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-blue-500/30">
            {isSetup ? <KeyRound className="w-8 h-8 text-white" /> : <Shield className="w-8 h-8 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {isSetup ? '마스터 비밀번호 설정' : '볼트 잠금 해제'}
          </h1>
          <p className="text-slate-400 text-center mt-2 text-sm">
            {isSetup
              ? '이 비밀번호는 데이터를 로컬에서 암호화합니다. 분실 시 데이터를 복구할 수 없습니다.'
              : '자격증명을 복호화하려면 마스터 비밀번호를 입력하세요.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ... input fields removed for brevity in diff, but assumed to be here or handled by context ... */}
          <div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="마스터 비밀번호"
                className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 transition-all"
                autoFocus
              />
            </div>
          </div>

          {isSetup && (
            <div>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 확인"
                  className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 transition-all"
                />
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-2 text-red-400 bg-red-400/10 p-3 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 flex justify-center items-center space-x-2"
          >
            {isSetup ? <span>볼트 생성</span> : <><Unlock className="w-4 h-4" /> <span>잠금 해제</span></>}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-700 text-center">
          <p className="text-slate-400 text-xs mb-3">
            {isSetup ? '또는 기존 백업 파일에서 복원' : '비밀번호를 분실했거나 복구가 필요한 경우'}
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            className="hidden"
            accept=".json"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors flex items-center justify-center gap-2 w-full py-2 hover:bg-slate-700/50 rounded-lg"
          >
            📂 백업 파일 불러오기 (.json)
          </button>

          {!isSetup && (
            <button
              onClick={() => {
                if (window.confirm("모든 데이터가 삭제됩니다. 정말로 초기화하시겠습니까?")) {
                  dbService.clearDatabase();
                  window.location.reload();
                }
              }}
              className="mt-2 text-xs text-slate-500 hover:text-red-400 transition-colors w-full py-2"
            >
              데이터 초기화 (삭제)
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
          20%, 40%, 60%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

export default Login;