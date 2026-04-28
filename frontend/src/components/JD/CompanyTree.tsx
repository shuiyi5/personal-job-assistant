import { useState, useMemo } from 'react'
import { ChevronRight, ChevronDown, Plus, Search, Building2, Briefcase, Trash2, Edit2 } from 'lucide-react'
import { useJDStore, Company, Position } from '../../stores/jdStore'

interface CompanyTreeProps {
  onEditCompany?: (company: Company) => void
  onEditPosition?: (position: Position) => void
}

export default function CompanyTree({ onEditCompany, onEditPosition }: CompanyTreeProps) {
  const {
    companies,
    positions,
    selectedCompanyId,
    selectedPositionId,
    createCompany,
    createPosition,
    deleteCompany,
    deletePosition,
  } = useJDStore()

  const [search, setSearch] = useState('')
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set())
  const [showNewCompany, setShowNewCompany] = useState(false)
  const [showNewPosition, setShowNewPosition] = useState<string | null>(null)
  const [newCompanyName, setNewCompanyName] = useState('')
  const [newPositionName, setNewPositionName] = useState('')

  // 构建公司-岗位树
  const treeData = useMemo(() => {
    return companies
      .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
      .map(company => ({
        ...company,
        positions: positions.filter(p => p.company_id === company.id),
      }))
  }, [companies, positions, search])

  const toggleExpand = (companyId: string) => {
    const newSet = new Set(expandedCompanies)
    if (newSet.has(companyId)) {
      newSet.delete(companyId)
    } else {
      newSet.add(companyId)
    }
    setExpandedCompanies(newSet)
  }

  const handleCreateCompany = async () => {
    if (!newCompanyName.trim()) return
    await createCompany({ name: newCompanyName })
    setNewCompanyName('')
    setShowNewCompany(false)
  }

  const handleCreatePosition = async (companyId: string) => {
    if (!newPositionName.trim()) return
    await createPosition(companyId, newPositionName)
    setNewPositionName('')
    setShowNewPosition(null)
  }

  const handleDeleteCompany = async (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation()
    if (confirm('确定删除该公司？将同时删除所有岗位和 JD')) {
      await deleteCompany(companyId)
    }
  }

  const handleDeletePosition = async (e: React.MouseEvent, positionId: string) => {
    e.stopPropagation()
    if (confirm('确定删除该岗位？将同时删除所有 JD')) {
      await deletePosition(positionId)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* 搜索和新建 */}
      <div className="p-3 border-b space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索公司..."
            className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <button
          onClick={() => setShowNewCompany(true)}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
        >
          <Plus size={14} /> 新建公司
        </button>
      </div>

      {/* 新建公司输入 */}
      {showNewCompany && (
        <div className="p-3 border-b bg-blue-50">
          <input
            type="text"
            value={newCompanyName}
            onChange={e => setNewCompanyName(e.target.value)}
            placeholder="公司名称"
            className="w-full px-3 py-2 text-sm border rounded-lg mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateCompany}
              className="flex-1 px-3 py-1.5 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              创建
            </button>
            <button
              onClick={() => { setShowNewCompany(false); setNewCompanyName('') }}
              className="flex-1 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* 树形列表 */}
      <div className="flex-1 overflow-y-auto">
        {treeData.map(company => {
          const isExpanded = expandedCompanies.has(company.id)
          const hasJobs = company.job_count > 0

          return (
            <div key={company.id}>
              {/* 公司行 */}
              <div
                className={`flex items-center gap-1 px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                  selectedCompanyId === company.id ? 'bg-blue-50' : ''
                }`}
              >
                <button onClick={() => toggleExpand(company.id)} className="p-0.5">
                  {hasJobs ? (
                    isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                  ) : (
                    <span className="w-[14px]" />
                  )}
                </button>
                <Building2 size={14} className="text-gray-400" />
                <span className="flex-1 text-sm font-medium truncate">{company.name}</span>
                <span className="text-xs text-gray-400">{company.job_count} JD</span>
                <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full">
                  {company.resume_count}
                </span>
                <button
                  onClick={e => { e.stopPropagation(); onEditCompany?.(company) }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <Edit2 size={12} />
                </button>
                <button
                  onClick={e => handleDeleteCompany(e, company.id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* 岗位列表 */}
              {isExpanded && (
                <div className="bg-gray-50">
                  {company.positions.map(position => {
                    const isSelected = selectedPositionId === position.id
                    return (
                      <div
                        key={position.id}
                        className={`flex items-center gap-1 px-3 py-1.5 pl-8 cursor-pointer hover:bg-gray-100 ${
                          isSelected ? 'bg-blue-100' : ''
                        }`}
                      >
                        <Briefcase size={12} className="text-gray-400" />
                        <span
                          className="flex-1 text-sm truncate cursor-pointer"
                          onClick={async () => {
                            await useJDStore.getState().fetchJobs(position.id)
                            const store = useJDStore.getState()
                            const positionJobs = store.jobs.filter(j => j.position_id === position.id)
                            if (positionJobs.length > 0) {
                              store.selectJob(positionJobs[0].id)
                            }
                          }}
                        >
                          {position.name}
                        </span>
                        <span className="text-xs text-gray-400">{position.job_count} JD</span>
                        <span className="text-xs px-1 py-0.5 bg-green-100 text-green-600 rounded-full">
                          {position.resume_count}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); onEditPosition?.(position) }}
                          className="p-0.5 text-gray-400 hover:text-gray-600"
                        >
                          <Edit2 size={10} />
                        </button>
                        <button
                          onClick={e => handleDeletePosition(e, position.id)}
                          className="p-0.5 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )
                  })}

                  {/* 新建岗位 */}
                  {showNewPosition === company.id ? (
                    <div className="px-3 py-1.5 pl-8">
                      <input
                        type="text"
                        value={newPositionName}
                        onChange={e => setNewPositionName(e.target.value)}
                        placeholder="岗位名称"
                        className="w-full px-2 py-1 text-xs border rounded mb-1"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleCreatePosition(company.id)
                          if (e.key === 'Escape') setShowNewPosition(null)
                        }}
                      />
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleCreatePosition(company.id)}
                          className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          创建
                        </button>
                        <button
                          onClick={() => { setShowNewPosition(null); setNewPositionName('') }}
                          className="px-2 py-0.5 text-xs border rounded hover:bg-gray-50"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewPosition(company.id)}
                      className="flex items-center gap-1 px-3 py-1.5 pl-8 text-xs text-gray-500 hover:text-blue-600"
                    >
                      <Plus size={10} /> 添加岗位
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}