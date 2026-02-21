import React, { useRef, useState } from 'react';
import { dbService } from '../services/dbService';
import { Download, Trash2, AlertOctagon, Upload, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

type PopupTone = 'info' | 'success' | 'error';

interface PopupState {
  title: string;
  message: string;
  tone: PopupTone;
}

const Settings: React.FC = () => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isNukeModalOpen, setIsNukeModalOpen] = useState(false);
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false);
  const [nukeConfirmText, setNukeConfirmText] = useState('');
  const [pendingImportRaw, setPendingImportRaw] = useState<string | null>(null);
  const [popup, setPopup] = useState<PopupState | null>(null);

  const handleExport = async () => {
    try {
      const data = await dbService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `securekey-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('데이터베이스 백업 파일이 생성되었습니다.', 'success');
    } catch {
      showToast('백업 생성에 실패했습니다.', 'error');
    }
  };

  const runImport = async (content: string) => {
    try {
      await dbService.importData(content);
      setPopup({
        title: '복원 완료',
        message: '데이터를 성공적으로 가져왔습니다. 확인을 누르면 앱을 새로고침합니다.',
        tone: 'success',
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'UnsupportedBackupFormat') {
        setPopup({
          title: '지원되지 않는 형식입니다.',
          message: '1.0.1 백업은 더 이상 앱 내 변환을 지원하지 않습니다. 1.0.2 백업(JSON)만 불러올 수 있습니다.',
          tone: 'error',
        });
        return;
      }

      setPopup({
        title: '복원 실패',
        message: '잘못된 파일 형식이거나 손상된 파일입니다.',
        tone: 'info',
      });
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setPendingImportRaw(content);
      setIsImportConfirmOpen(true);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleNukeClick = () => {
    setNukeConfirmText('');
    setIsNukeModalOpen(true);
  };

  const confirmNuke = async () => {
    if (nukeConfirmText !== '삭제') return;

    await dbService.clearDatabase();
    setIsNukeModalOpen(false);
    showToast('모든 데이터가 삭제되었습니다.', 'info');
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">설정</h2>
        <p className="text-gray-500 mt-1">데이터 관리 및 초기화</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Download className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">데이터 백업 (내보내기)</h3>
              <p className="text-gray-500 text-sm mt-1">
                암호화된 데이터베이스를 JSON 파일로 다운로드하여 안전하게 보관하세요.
              </p>
              <button
                onClick={handleExport}
                className="mt-4 px-4 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" /> 백업 파일 다운로드
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-50 rounded-lg">
              <Upload className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800">데이터 복구 (가져오기)</h3>
              <div className="mt-1 p-3 bg-orange-50 rounded-lg border border-orange-100 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-orange-800 text-sm">
                  주의: 복구를 진행하면 <strong>현재 저장된 모든 데이터가 삭제</strong>되고 백업 파일의 내용으로 덮어씌워집니다.
                </p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                className="hidden"
                accept=".json"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 bg-white border border-orange-200 hover:bg-orange-50 text-orange-700 font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Upload className="w-4 h-4" /> 백업 파일 불러오기
              </button>
            </div>
          </div>
        </div>

        <div className="bg-red-50 rounded-xl shadow-sm border border-red-100 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertOctagon className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-700">위험 구역</h3>
              <p className="text-red-600/80 text-sm mt-1">
                브라우저에 저장된 모든 데이터(자격증명, 설정 등)를 영구적으로 삭제하고 초기화합니다.
              </p>
              <button
                onClick={handleNukeClick}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
              >
                <Trash2 className="w-4 h-4" /> 모든 데이터 삭제
              </button>
            </div>
          </div>
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
              현재 데이터가 모두 삭제되고 선택한 백업으로 교체됩니다. 계속 진행할까요?
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
        isOpen={isNukeModalOpen}
        onClose={() => setIsNukeModalOpen(false)}
        title="데이터 영구 삭제 확인"
      >
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-lg border border-red-100 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800">
              <p className="font-bold mb-1">정말 삭제하시겠습니까?</p>
              <p>이 작업은 되돌릴 수 없습니다. 모든 자격증명 데이터가 영구적으로 사라집니다.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              확인을 위해 아래 입력창에 <strong>삭제</strong> 라고 입력하세요.
            </label>
            <input
              type="text"
              value={nukeConfirmText}
              onChange={(e) => setNukeConfirmText(e.target.value)}
              placeholder="삭제"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setIsNukeModalOpen(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
            >
              취소
            </button>
            <button
              onClick={confirmNuke}
              disabled={nukeConfirmText !== '삭제'}
              className={`px-4 py-2 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2 ${nukeConfirmText === '삭제'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
            >
              <Trash2 className="w-4 h-4" />
              삭제 실행
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!popup}
        onClose={() => {
          const shouldReload = popup?.tone === 'success';
          setPopup(null);
          if (shouldReload) {
            setTimeout(() => window.location.reload(), 200);
          }
        }}
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
              onClick={() => {
                const shouldReload = popup?.tone === 'success';
                setPopup(null);
                if (shouldReload) {
                  setTimeout(() => window.location.reload(), 200);
                }
              }}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              확인
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
