import { Link, useLocation } from 'react-router-dom'
import { MessageSquare, FileText, Briefcase, Mic, FolderOpen, Settings } from 'lucide-react'

const navItems = [
  { path: '/', icon: MessageSquare, label: '智能助手' },
  { path: '/documents', icon: FolderOpen, label: '文档管理' },
  { path: '/resume', icon: FileText, label: '简历编辑' },
  { path: '/interview', icon: Briefcase, label: '面试准备' },
  { path: '/mock-interview', icon: Mic, label: '模拟面试' },
  { path: '/settings', icon: Settings, label: '设置' },
]

export default function Sidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="bg-gray-900 text-white flex flex-col h-full w-full">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">求职辅助文档库</h1>
        <p className="text-xs text-gray-400 mt-1">RAG + Agent 驱动</p>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map(({ path, icon: Icon, label }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              pathname === path
                ? 'bg-primary-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Icon size={18} />
            <span className="text-sm">{label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700 text-xs text-gray-500">
        v0.1.0 | Agent Forge
      </div>
    </aside>
  )
}
