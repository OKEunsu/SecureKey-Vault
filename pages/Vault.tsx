import React, { useState, useMemo } from 'react';
import { CredentialItem } from '../types';
import { AUTH_TYPES } from '../constants';
import CredentialCard from '../components/CredentialCard';
import { Search, Filter, XCircle, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VaultProps {
  items: CredentialItem[];
  onDelete: (id: string) => void;
}

const Vault: React.FC<VaultProps> = ({ items, onDelete }) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Derive unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(i => i.tags.forEach(t => tags.add(t)));
    return ['All', ...Array.from(tags)];
  }, [items]);

  // Derive auth types present in items
  const activeTypes = useMemo(() => {
    const types = new Set<string>();
    items.forEach(i => types.add(i.authTypeId));
    return ['All', ...Array.from(types)];
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch =
        item.serviceName.toLowerCase().includes(search.toLowerCase()) ||
        item.accountName.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));

      const matchesTag = selectedTag === 'All' || item.tags.includes(selectedTag);
      const matchesType = selectedType === 'All' || item.authTypeId === selectedType;

      return matchesSearch && matchesTag && matchesType;
    });
  }, [items, search, selectedTag, selectedType]);

  // Always Group items by service name
  const groupedItems = useMemo(() => {
    const groups: Record<string, CredentialItem[]> = {};
    filteredItems.forEach(item => {
      // Normalize key (case-insensitive grouping)
      const key = item.serviceName.toUpperCase();
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });

    // Sort groups alphabetically
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredItems]);

  const handleEdit = (item: CredentialItem) => {
    navigate('/add', { state: { editItem: item } });
  };

  const handleClearFilters = () => {
    setSearch('');
    setSelectedTag('All');
    setSelectedType('All');
  };

  const scrollToGroup = (key: string) => {
    const safeKey = key.replace(/\s+/g, '-');
    const element = document.getElementById(`group-${safeKey}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">자격증명</h2>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:flex-row gap-4 items-center sticky top-0 z-10">
        {/* Search Input */}
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="서비스, 계정, 태그 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400 text-sm"
          />
        </div>

        {/* Filter Group */}
        <div className="flex flex-wrap gap-2 w-full lg:w-auto flex-1 items-center">
          <div className="relative">
            <Filter className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${selectedTag !== 'All' ? 'text-blue-500' : 'text-gray-400'}`} />
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className={`w-full md:w-36 pl-9 pr-8 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer text-sm font-medium transition-all
                ${selectedTag !== 'All' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
            >
              <option value="All">모든 태그</option>
              {allTags.filter(t => t !== 'All').map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="relative">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className={`w-full md:w-36 px-4 py-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer text-sm font-medium transition-all
                ${selectedType !== 'All' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
            >
              <option value="All">모든 타입</option>
              {activeTypes.filter(t => t !== 'All').map(t => {
                const def = AUTH_TYPES.find(at => at.id === t);
                return <option key={t} value={t}>{def ? def.name : t}</option>;
              })}
            </select>
          </div>

          {(search || selectedTag !== 'All' || selectedType !== 'All') && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium flex items-center gap-1"
              title="필터 초기화"
            >
              <XCircle className="w-4 h-4" />
              <span>초기화</span>
            </button>
          )}
        </div>

        {/* Result Count Badge */}
        <div className="hidden lg:block">
          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-semibold border border-gray-200">
            {filteredItems.length}개의 자격증명
          </span>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="flex flex-col xl:flex-row gap-8 items-start relative">
        {/* Left: Cards List */}
        <div className="flex-1 min-w-0 w-full">
          {groupedItems.length > 0 ? (
            <div className="space-y-8 animate-fade-in pb-20">
              {groupedItems.map(([key, groupItems]) => {
                const safeKey = key.replace(/\s+/g, '-');
                return (
                  <div key={key} id={`group-${safeKey}`} className="space-y-4 scroll-mt-24">
                    <div className="flex items-center gap-3 px-1">
                      <h3 className="text-xl font-bold text-gray-800">{groupItems[0].serviceName}</h3>
                      <span className="px-2.5 py-0.5 bg-gray-100 text-gray-500 text-xs font-bold rounded-full border border-gray-200">
                        {groupItems.length}
                      </span>
                      <div className="h-px bg-gray-200 flex-1"></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6">
                      {groupItems.map(item => (
                        <CredentialCard
                          key={item.id}
                          item={item}
                          onEdit={handleEdit}
                          onDelete={onDelete}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border border-gray-200 border-dashed">
              <div className="text-gray-400 mb-2">자격증명을 찾을 수 없습니다</div>
              <p className="text-sm text-gray-400">검색어 또는 필터를 변경해보세요</p>
            </div>
          )}
        </div>

        {/* Right: Sticky Index Sidebar */}
        {groupedItems.length > 0 && (
          <aside className="hidden lg:block w-64 sticky top-24 shrink-0 animate-fade-in-right">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm">
                  <List className="w-4 h-4" /> 서비스 목록
                </h3>
                <span className="text-xs text-gray-400">{filteredItems.length} items</span>
              </div>
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2">
                <ul className="space-y-0.5">
                  {groupedItems.map(([key, groupItems]) => (
                    <li key={key}>
                      <button
                        onClick={() => scrollToGroup(key)}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all flex justify-between items-center group"
                      >
                        <span className="truncate font-medium">{groupItems[0].serviceName}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded ml-2 group-hover:bg-blue-100 group-hover:text-blue-600 min-w-[1.5rem] text-center">
                          {groupItems.length}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};

export default Vault;