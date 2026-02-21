import React, { useState } from 'react';
import { CredentialItem } from '../types';
import { AUTH_TYPES } from '../constants';
import { Copy, Eye, EyeOff, Edit2, Trash2, Calendar, ExternalLink, Hash, FileText, AlertTriangle } from 'lucide-react';
import Modal from './Modal';

import { useToast } from '../context/ToastContext';

interface CredentialCardProps {
  item: CredentialItem;
  onEdit: (item: CredentialItem) => void;
  onDelete: (id: string) => void;
}

const CredentialCard: React.FC<CredentialCardProps> = ({ item, onEdit, onDelete }) => {
  const { showToast } = useToast();
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const authType = AUTH_TYPES.find(t => t.id === item.authTypeId);

  const toggleReveal = (key: string) => {
    setRevealedKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    showToast('클립보드에 복사되었습니다.', 'success');
  };

  const isExpiringSoon = () => {
    if (!item.expiry) return false;
    const diff = new Date(item.expiry).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    return days <= 30 && days >= 0;
  };

  const isExpired = () => {
    if (!item.expiry) return false;
    return new Date(item.expiry).getTime() < new Date().getTime();
  };

  const getAuthColorClass = (typeId: string) => {
    switch (typeId) {
      case 'aws_creds': return 'border-t-orange-500';
      case 'database': return 'border-t-blue-600';
      case 'api_key': return 'border-t-emerald-500';
      case 'bearer_token': return 'border-t-purple-500';
      case 'oauth2': return 'border-t-pink-500';
      default: return 'border-t-slate-500';
    }
  };

  const borderClass = getAuthColorClass(item.authTypeId);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 h-full flex flex-col ${borderClass} border-t-[4px]`}>
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">{authType?.name || item.authTypeId}</span>
            {isExpired() && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">EXPIRED</span>}
            {isExpiringSoon() && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">SOON</span>}
          </div>
          <h3 className="font-bold text-lg text-gray-800 leading-tight">
            {item.serviceName}
          </h3>
          <p className="text-sm text-gray-500 font-medium mt-0.5">{item.accountName || '기본 계정'}</p>
        </div>

        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Actions (will be visible on card hover if parent has group, but here we keep visible or use transparency) */}
          {/* Keeping visible for better UX on touch devices, logic simplified */}
        </div>
        <div className="flex space-x-1">
          <button onClick={() => onEdit(item)} className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body: Credentials */}
      <div className="p-5 space-y-4 flex-1">
        {Object.entries(item.credentials).map(([key, val]) => {
          const value = val as string;
          return (
            <div key={key} className="group/field">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block flex justify-between">
                <span>{key.replace(/_/g, ' ')}</span>
              </label>
              <div className="flex items-center gap-2 bg-gray-50/50 p-2 rounded-lg border border-gray-100 group-hover/field:border-blue-200 transition-colors">
                <code className="flex-1 font-mono text-sm text-gray-700 overflow-hidden text-ellipsis whitespace-nowrap">
                  {key === 'custom_json'
                    ? (revealedKeys[key] ? <pre className="whitespace-pre-wrap text-xs">{value}</pre> : '••••••••••••')
                    : (revealedKeys[key] ? value : '••••••••••••••••')
                  }
                </code>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleReveal(key)}
                    className="p-1.5 text-gray-400 hover:text-gray-700 rounded transition-colors"
                    title={revealedKeys[key] ? "숨기기" : "보기"}
                  >
                    {revealedKeys[key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => copyToClipboard(value)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                    title="복사"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Area: Aggregated Tags & Meta Info */}
      {(item.tags.length > 0 || item.docUrl || item.expiry || item.memo) && (
        <div className="mt-auto px-5 py-4 bg-gray-50/80 border-t border-gray-100 rounded-b-xl space-y-3">
          {/* Tags (Primary Metadata) */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {item.tags.map(tag => (
                <span key={tag} className="text-[10px] bg-blue-100/50 text-blue-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 border border-blue-200/50">
                  <Hash className="w-2.5 h-2.5" /> {tag}
                </span>
              ))}
            </div>
          )}

          {/* Badges (Expiry & Docs) */}
          {(item.expiry || item.docUrl) && (
            <div className="flex flex-wrap items-center gap-2">
              {item.expiry && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 bg-orange-100/50 px-2 py-0.5 rounded border border-orange-200/50">
                  <Calendar className="w-3 h-3" />
                  <span>{item.expiry}</span>
                </div>
              )}
              {item.docUrl && (
                <a
                  href={item.docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline transition-all"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>문서 보기</span>
                </a>
              )}
            </div>
          )}

          {/* Note (Memo) */}
          {item.memo && (
            <div className="flex items-start gap-2 bg-white/60 p-2.5 rounded border border-gray-200/50 shadow-sm">
              <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-gray-600 leading-relaxed font-medium">
                {item.memo}
              </p>
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        title="자격증명 삭제 확인"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" />
            <p className="text-sm leading-relaxed text-rose-900">
              이 자격증명을 삭제하면 복구할 수 없습니다.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              취소
            </button>
            <button
              onClick={() => {
                setIsDeleteConfirmOpen(false);
                onDelete(item.id);
              }}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
            >
              삭제
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CredentialCard;
