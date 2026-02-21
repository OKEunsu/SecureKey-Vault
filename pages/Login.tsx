import React, { useEffect, useRef, useState } from 'react';
import { Shield, Unlock, KeyRound, AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { dbService } from '../services/dbService';
import Modal from '../components/Modal';

interface LoginProps {
  onLogin: (derivedKey: string) => Promise<void>;
}

type PopupTone = 'info' | 'success' | 'error';

interface PopupState {
  title: string;
  message: string;
  tone: PopupTone;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isSetup, setIsSetup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [shake, setShake] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [pendingImportRaw, setPendingImportRaw] = useState<string | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let isMounted = true;

    const checkDatabase = async () => {
      try {
        const hasDb = await dbService.hasDatabase();
        if (isMounted) setIsSetup(!hasDb);
      } catch {
        if (isMounted) setIsSetup(true);
      }
    };

    void checkDatabase();
    return () => {
      isMounted = false;
    };
  }, []);

  const showInvalidPassword = () => {
    setNotice('');
    setError('비밀번호가 올바르지 않습니다.');
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setNotice('');

    try {
      if (isSetup) {
        if (password.length < 4) {
          setError('비밀번호가 너무 짧습니다.');
          return;
        }

        if (password !== confirmPassword) {
          setError('비밀번호가 일치하지 않습니다.');
          return;
        }

        await dbService.initDatabase(password);
      }

      const derivedKey = await dbService.unlockDatabase(password);
      if (!derivedKey) {
        showInvalidPassword();
        return;
      }

      await onLogin(derivedKey);
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'UnsupportedBackupFormat') {
        setPopup({
          title: '지원되지 않는 형식입니다.',
          message: '현재 DB는 지원되지 않는 레거시 형식입니다. 1.0.2에서 생성된 백업 파일을 사용해주세요.',
          tone: 'error',
        });
        return;
      }

      setError('로그인 처리 중 문제가 발생했습니다. 다시 시도해주세요.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  };

  const runImport = async (content: string) => {
    try {
      await dbService.importData(content);
      setIsSetup(false);
      setPassword('');
      setConfirmPassword('');
      setError('');
      setNotice('복원이 완료되었습니다. 마스터 비밀번호를 입력해 로그인하세요.');
      setTimeout(() => passwordInputRef.current?.focus(), 0);
      setPopup({
        title: '복원 완료',
        message: '백업 파일을 정상적으로 복원했습니다.',
        tone: 'success',
      });
    } catch (caught) {
      if (caught instanceof Error && caught.message === 'UnsupportedBackupFormat') {
        setPopup({
          title: '지원되지 않는 형식입니다.',
          message: '1.0.1 백업은 더 이상 앱 내 변환을 지원하지 않습니다. 1.0.2 백업(JSON)만 불러올 수 있습니다.',
          tone: 'error',
        });
        return;
      }

      setPopup({
        title: '복원 실패',
        message: '잘못된 백업 파일이거나 복원 중 오류가 발생했습니다.',
        tone: 'info',
      });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const content = event.target?.result as string;

      if (!isSetup) {
        setPendingImportRaw(content);
        setIsImportConfirmOpen(true);
      } else {
        await runImport(content);
      }

      e.target.value = '';
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
              ? '이 비밀번호로 데이터를 로컬에서 암호화합니다. 분실 시 데이터 복구가 어렵습니다.'
              : '자격증명을 보호하려면 마스터 비밀번호를 입력하세요.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="마스터 비밀번호"
                className="w-full bg-slate-900 border border-slate-600 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 transition-all"
                autoFocus
                ref={passwordInputRef}
              />
            </div>
          </div>

          {isSetup && (
            <div>
              <div className="relative">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
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

          {notice && (
            <div className="text-sm text-emerald-300 bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20">
              {notice}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95 flex justify-center items-center space-x-2"
          >
            {isSetup ? (
              <span>볼트 생성</span>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>잠금 해제</span>
              </>
            )}
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
            백업 파일 불러오기 (.json)
          </button>

          {!isSetup && (
            <button
              onClick={() => setIsResetConfirmOpen(true)}
              className="mt-2 text-xs text-slate-500 hover:text-red-400 transition-colors w-full py-2"
            >
              데이터 초기화 (전체 삭제)
            </button>
          )}
        </div>
      </div>

      <Modal
        isOpen={isImportConfirmOpen}
        onClose={() => {
          setIsImportConfirmOpen(false);
          setPendingImportRaw(null);
        }}
        title="백업 복원 확인"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <p className="text-sm leading-relaxed text-amber-900">
              복원을 진행하면 현재 저장된 모든 데이터가 삭제되고, 선택한 백업 내용으로 덮어씌워집니다.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setIsImportConfirmOpen(false);
                setPendingImportRaw(null);
              }}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={() => {
                if (!pendingImportRaw) return;
                setIsImportConfirmOpen(false);
                void runImport(pendingImportRaw);
                setPendingImportRaw(null);
              }}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              복원 진행
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        title="데이터 초기화 확인"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
            <p className="text-sm leading-relaxed text-rose-900">
              모든 데이터가 영구적으로 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsResetConfirmOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={() => {
                setIsResetConfirmOpen(false);
                void (async () => {
                  await dbService.clearDatabase();
                  window.location.reload();
                })();
              }}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
            >
              초기화
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!popup}
        onClose={() => setPopup(null)}
        title={popup?.title || ''}
      >
        <div className="space-y-4">
          <div
            className={`flex items-start gap-3 rounded-xl border p-4 ${popup?.tone === 'success'
                ? 'border-emerald-100 bg-emerald-50 text-emerald-900'
                : popup?.tone === 'error'
                  ? 'border-rose-100 bg-rose-50 text-rose-900'
                  : 'border-blue-100 bg-blue-50 text-blue-900'
              }`}
          >
            {popup?.tone === 'success' && <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />}
            {popup?.tone === 'error' && <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />}
            {popup?.tone === 'info' && <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />}
            <p className="text-sm leading-relaxed">{popup?.message}</p>
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setPopup(null)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              확인
            </button>
          </div>
        </div>
      </Modal>

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
