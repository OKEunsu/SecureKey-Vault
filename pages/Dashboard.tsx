import React, { useMemo, useState } from 'react';
import { CredentialItem } from '../types';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, LabelList } from 'recharts';
import { AlertTriangle, CheckCircle, Database, Shield, Plus, ArrowRight, Lock, Save, Clock, Activity, ChevronDown, ChevronUp, AlertCircle, ExternalLink, ArrowRightCircle } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import Modal from '../components/Modal';

interface DashboardProps {
  items: CredentialItem[];
}

const SecurityReportRow: React.FC<{
  icon: React.ReactNode,
  label: string,
  count: number,
  onClick: () => void
}> = ({ icon, label, count, onClick }) => {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden transition-all duration-300">
      <button
        onClick={onClick}
        disabled={count === 0}
        className={`w-full flex items-center justify-between p-4 transition-colors group ${count > 0 ? 'hover:bg-gray-50' : 'opacity-60 cursor-default'}`}
      >
        <div className="flex items-center space-x-3">
          <div className={`${count > 0 ? 'text-gray-400 group-hover:text-gray-600' : 'text-gray-300'}`}>
            {icon}
          </div>
          <span className="text-sm font-semibold text-gray-700">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${count > 0 ? 'text-red-500' : 'text-gray-400'}`}>
            {count > 0 ? `${count}건 발견` : '발견된 위험 없음'}
          </span>
          {count > 0 && <ArrowRightCircle className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />}
        </div>
      </button>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ items }) => {
  const navigate = useNavigate();
  const [selectedReport, setSelectedReport] = useState<{ title: string, details: { name: string, id: string }[] } | null>(null);

  const stats = useMemo(() => {
    const today = new Date();
    let expiringCount = 0;
    let expiredCount = 0;

    // Security Details Collections
    const reusedDetails: { name: string, id: string }[] = [];
    const weakDetails: { name: string, id: string }[] = [];
    const staleDetails: { name: string, id: string }[] = [];

    const valueMap = new Map<string, string[]>(); // Value -> IDs map for reuse check
    const serviceCounts: Record<string, number> = {};

    // 1. First pass: Map values to identify reuse
    items.forEach(item => {
      Object.values(item.credentials).forEach(val => {
        if (typeof val === 'string' && val && val.length > 5) {
          if (!valueMap.has(val)) valueMap.set(val, []);
          valueMap.get(val)?.push(item.id);
        }
      });
    });

    // 2. Second pass: Detailed Analysis
    items.forEach(item => {
      // Service Count
      serviceCounts[item.serviceName] = (serviceCounts[item.serviceName] || 0) + 1;

      // Expiry Check
      if (item.expiry) {
        const expDate = new Date(item.expiry);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) expiredCount++;
        else if (diffDays <= 30) expiringCount++;
      } else {
        const lastModified = item.updatedAt ? new Date(item.updatedAt) : (item.createdAt ? new Date(item.createdAt) : null);
        if (lastModified) {
          const ageDays = (today.getTime() - lastModified.getTime()) / (1000 * 3600 * 24);
          if (ageDays > 365) {
            staleDetails.push({ name: `${item.serviceName} (${item.accountName || '기본'})`, id: item.id });
          }
        }
      }

      // Security Checks
      let isWeak = false;
      let isReused = false;

      Object.values(item.credentials).forEach(val => {
        if (typeof val === 'string') {
          if (val && val.length > 5 && (valueMap.get(val)?.length || 0) > 1) {
            isReused = true;
          }
          if (val && val.length < 8) {
            isWeak = true;
          }
        }
      });

      if (isWeak) weakDetails.push({ name: `${item.serviceName} (${item.accountName || '기본'})`, id: item.id });
      if (isReused) reusedDetails.push({ name: `${item.serviceName} (${item.accountName || '기본'})`, id: item.id });
    });

    let score = 100;
    if (expiredCount > 0) score -= 30;
    score -= (reusedDetails.length * 5);
    score -= (weakDetails.length * 3);
    if (expiringCount > 0) score -= 10;
    score -= (staleDetails.length * 2);

    score = Math.max(0, score);

    const topServices = Object.entries(serviceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total: items.length,
      expiringCount,
      expiredCount,
      topServices,
      reusedDetails,
      weakDetails,
      staleDetails,
      score
    };
  }, [items]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // Empty State / Onboarding View
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-4xl mx-auto text-center space-y-8 animate-fade-in-up">
        <div className="bg-blue-50 p-6 rounded-full ring-8 ring-blue-50/50">
          <Shield className="w-16 h-16 text-blue-600" />
        </div>

        <div className="space-y-4">
          <h2 className="text-3xl font-bold text-gray-800">Onyx에 오신 것을 환영합니다</h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            브라우저 기반의 API 키 비밀 금고입니다.
            데이터는 마스터 비밀번호로 로컬에서 암호화되며 외부로 전송되지 않습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left mt-8">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="bg-blue-100 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
              <Plus className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">1. 자격증명 추가</h3>
            <p className="text-sm text-gray-500">'추가하기'를 클릭하여 API 키, 토큰, 비밀번호 등을 저장하세요.</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="bg-green-100 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">2. 안전한 저장</h3>
            <p className="text-sm text-gray-500">모든 데이터는 마스터 비밀번호를 사용하여 AES-256으로 암호화됩니다.</p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="bg-purple-100 w-10 h-10 rounded-lg flex items-center justify-center mb-4">
              <Save className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">3. 안전한 백업</h3>
            <p className="text-sm text-gray-500">설정 메뉴에서 암호화된 볼트를 JSON 파일로 내보낼 수 있습니다.</p>
          </div>
        </div>

        <Link
          to="/add"
          className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/30 group"
        >
          첫 번째 키 추가하기
          <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    );
  }

  // Determine Security Level Color
  const getSecurityColor = (score: number) => {
    if (score >= 90) return 'text-green-600 border-green-200 bg-green-50';
    if (score >= 70) return 'text-blue-600 border-blue-200 bg-blue-50';
    if (score >= 50) return 'text-yellow-600 border-yellow-200 bg-yellow-50';
    return 'text-red-600 border-red-200 bg-red-50';
  }

  const secColor = getSecurityColor(stats.score);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">관리 대시보드</h2>
          <p className="text-sm text-gray-500 mt-1">자격증명 현황 및 보안 상태 요약</p>
        </div>
        <span className="text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
          업데이트: {new Date().toLocaleTimeString()}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="총 자격증명"
          value={stats.total}
          icon={Database}
          variant="blue"
        />
        <StatCard
          title="보안 점수"
          value={`${stats.score}점`}
          icon={Shield}
          variant={stats.score >= 80 ? 'green' : stats.score >= 50 ? 'orange' : 'red'}
          description={stats.reusedDetails.length > 0 ? "재사용 발견" : "보안 등급"}
        />
        <StatCard
          title="만료 임박"
          value={stats.expiringCount}
          icon={AlertTriangle}
          variant="orange"
          description="30일 이내 만료"
        />
        <StatCard
          title="만료됨"
          value={stats.expiredCount}
          icon={AlertTriangle}
          variant={stats.expiredCount > 0 ? 'red' : 'green'}
          description="갱신 필요"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Chart 1: Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[24rem] h-auto flex flex-col">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-800">주요 서비스 분포</h3>
              <p className="text-sm text-gray-500">가장 많이 저장된 서비스 상위 5개</p>
            </div>
          </div>

          <div className="flex-1 w-full min-h-[250px]">
            {stats.topServices.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topServices} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fill: '#475569', fontSize: 13, fontWeight: 500 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="count" name="자격증명 수" radius={[0, 4, 4, 0]} barSize={24}>
                    {stats.topServices.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList dataKey="count" position="right" fill="#64748b" fontSize={12} formatter={(val: number) => `${val}개`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">데이터가 없습니다</div>
            )}
          </div>
        </div>

        {/* Security Health Panel */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[24rem] h-auto flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-1">보안 검사 리포트</h3>
          <p className="text-sm text-gray-500 mb-6">다중 사용 및 복잡도 정밀 진단</p>

          <div className="flex-1 flex flex-col items-center justify-between gap-6">
            {/* Score Circle */}
            <div className={`w-32 h-32 rounded-full border-[8px] flex flex-col items-center justify-center relative transition-all duration-500 flex-shrink-0
              ${stats.score >= 90 ? 'border-green-100 text-green-600' :
                stats.score >= 50 ? 'border-yellow-100 text-yellow-600' : 'border-red-100 text-red-600'}`}>

              <div className="text-3xl font-bold">{stats.score}</div>
              <div className="text-xs font-semibold opacity-70 mt-1">보안 점수</div>

              <div className={`absolute -bottom-3 px-3 py-1 rounded-full border shadow-sm text-xs font-bold bg-white whitespace-nowrap
                  ${stats.score >= 90 ? 'text-green-600 border-green-200' :
                  stats.score >= 50 ? 'text-yellow-600 border-yellow-200' : 'text-red-600 border-red-200'}`}>
                {stats.score >= 90 ? '매우 안전' : stats.score >= 50 ? '주의 필요' : '매우 위험'}
              </div>
            </div>

            {/* Detail List with Popup Trigger */}
            <div className="w-full space-y-3">
              <SecurityReportRow
                icon={<Shield className="w-4 h-4" />}
                label="암호 재사용"
                count={stats.reusedDetails.length}
                onClick={() => setSelectedReport({ title: '암호 재사용 계정', details: stats.reusedDetails })}
              />
              <SecurityReportRow
                icon={<Lock className="w-4 h-4" />}
                label="취약한 암호(짧음)"
                count={stats.weakDetails.length}
                onClick={() => setSelectedReport({ title: '취약한 암호 계정', details: stats.weakDetails })}
              />
              <SecurityReportRow
                icon={<Clock className="w-4 h-4" />}
                label="장기 미변경(1년+)"
                count={stats.staleDetails.length}
                onClick={() => setSelectedReport({ title: '장기 미변경 계정', details: stats.staleDetails })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Security Details Modal */}
      <Modal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        title={selectedReport?.title || ''}
      >
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
          {selectedReport?.details.map((detail, idx) => (
            <button
              key={idx}
              onClick={() => {
                const item = items.find(i => i.id === detail.id);
                if (item) navigate('/add', { state: { editItem: item } });
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-blue-400 hover:bg-blue-50/30 transition-all text-left group/item"
            >
              <div className="flex items-center gap-3 truncate pr-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-sm font-bold text-gray-800 truncate">{detail.name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 opacity-0 group-hover/item:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                <span>암호 변경하러 가기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </button>
          ))}
          {selectedReport?.details.length === 0 && (
            <div className="text-center py-10">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-20" />
              <p className="text-gray-400 font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">발견된 위험 계정이 없습니다.</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

// Improved StatCard Component
interface StatCardProps {
  title: string;
  value: number | string;
  icon: any;
  variant: 'blue' | 'green' | 'red' | 'orange';
  description?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, variant, description }) => {
  const isZero = value === 0 || value === '0';

  const variants = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100', border: 'border-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100', border: 'border-green-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100', border: 'border-red-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100', border: 'border-orange-200' },
  };

  const theme = variants[variant];

  const containerClasses = isZero
    ? "bg-white border-gray-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100"
    : `bg-white ${theme.border}`;

  return (
    <div className={`p-5 rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md ${containerClasses}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-2.5 rounded-lg ${isZero ? 'bg-gray-100' : theme.iconBg}`}>
          <Icon className={`w-6 h-6 ${isZero ? 'text-gray-400' : theme.text}`} />
        </div>
        {!isZero && (variant === 'red' || variant === 'orange') && (
          <span className="flex h-3 w-3 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${variant === 'red' ? 'bg-red-400' : 'bg-orange-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-3 w-3 ${variant === 'red' ? 'bg-red-500' : 'bg-orange-500'}`}></span>
          </span>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className="flex items-end gap-2 mt-1">
          <h4 className={`text-2xl font-bold ${isZero ? 'text-gray-400' : 'text-gray-800'}`}>
            {value}
          </h4>
          {description && !isZero && (
            <span className={`text-xs font-medium mb-1 px-1.5 py-0.5 rounded ${theme.bg} ${theme.text}`}>
              {description}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;