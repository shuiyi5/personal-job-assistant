import { useState, useEffect, useCallback } from 'react'
import { Save, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react'
import api from '../services/api'

// ── 提供商定义 ──────────────────────────────────────
interface ProviderDef {
  id: string
  label: string
  description: string
  fields: { key: string; label: string; type: 'apikey' | 'url' | 'model' | 'select'; options?: string[] }[]
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'claude', label: 'Anthropic Claude', description: 'Claude 系列模型',
    fields: [{ key: 'ANTHROPIC_API_KEY', label: 'API Key', type: 'apikey' }],
  },
  {
    id: 'openai', label: 'OpenAI', description: 'GPT 系列模型',
    fields: [{ key: 'OPENAI_API_KEY', label: 'API Key', type: 'apikey' }],
  },
  {
    id: 'ollama', label: 'Ollama', description: '本地模型',
    fields: [{ key: 'OLLAMA_BASE_URL', label: 'Base URL', type: 'url' }],
  },
  {
    id: 'deepseek', label: 'DeepSeek', description: 'DeepSeek 深度求索',
    fields: [
      { key: 'DEEPSEEK_API_KEY', label: 'API Key', type: 'apikey' },
      { key: 'DEEPSEEK_BASE_URL', label: 'Base URL', type: 'url' },
      { key: 'DEEPSEEK_MODEL', label: '模型名称', type: 'model' },
    ],
  },
  {
    id: 'zhipu', label: '智谱 GLM', description: '智谱清言 GLM 系列',
    fields: [
      { key: 'ZHIPU_API_KEY', label: 'API Key', type: 'apikey' },
      { key: 'ZHIPU_BASE_URL', label: 'Base URL', type: 'url' },
      { key: 'ZHIPU_MODEL', label: '模型名称', type: 'model' },
    ],
  },
  {
    id: 'moonshot', label: '月之暗面 Kimi', description: 'Moonshot Kimi 系列',
    fields: [
      { key: 'MOONSHOT_API_KEY', label: 'API Key', type: 'apikey' },
      { key: 'MOONSHOT_BASE_URL', label: 'Base URL', type: 'url' },
      { key: 'MOONSHOT_MODEL', label: '模型名称', type: 'model' },
    ],
  },
  {
    id: 'dashscope', label: '通义千问', description: '阿里云 DashScope',
    fields: [
      { key: 'DASHSCOPE_API_KEY', label: 'API Key', type: 'apikey' },
      { key: 'DASHSCOPE_BASE_URL', label: 'Base URL', type: 'url' },
      { key: 'DASHSCOPE_MODEL', label: '模型名称', type: 'model' },
    ],
  },
  {
    id: 'yi', label: '零一万物 Yi', description: 'Yi 系列大模型',
    fields: [
      { key: 'YI_API_KEY', label: 'API Key', type: 'apikey' },
      { key: 'YI_BASE_URL', label: 'Base URL', type: 'url' },
      { key: 'YI_MODEL', label: '模型名称', type: 'model' },
    ],
  },
  {
    id: 'siliconflow', label: '硅基流动', description: 'SiliconFlow 聚合平台',
    fields: [
      { key: 'SILICONFLOW_API_KEY', label: 'API Key', type: 'apikey' },
      { key: 'SILICONFLOW_BASE_URL', label: 'Base URL', type: 'url' },
      { key: 'SILICONFLOW_MODEL', label: '模型名称', type: 'model' },
    ],
  },
  {
    id: 'custom', label: '自定义提供商', description: '接入任意 OpenAI/Claude 兼容 API',
    fields: [
      { key: 'CUSTOM_API_FORMAT', label: 'API 格式', type: 'select', options: ['openai', 'claude'] },
      { key: 'CUSTOM_BASE_URL', label: 'Base URL', type: 'url' },
      { key: 'CUSTOM_API_KEY', label: 'API Key', type: 'apikey' },
      { key: 'CUSTOM_MODEL', label: '模型名称', type: 'model' },
    ],
  },
]

// ── 组件 ────────────────────────────────────────────

function KeyField({ value, onChange, placeholder }: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'sk-...'}
        className="w-full border rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
      />
      <button
        type="button"
        onClick={() => setShow(s => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const [provider, setProvider] = useState('claude')
  const [model, setModel] = useState('')
  const [envVars, setEnvVars] = useState<Record<string, string>>({})
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null)

  // Load settings from backend
  const loadSettings = useCallback(async () => {
    try {
      setLoading(true)
      const res = await api.get('/settings')
      const data = res.data
      setProvider(data.llm_provider)
      setModel(data.llm_model)
      // Flatten all provider fields into envVars
      const vars: Record<string, string> = {}
      for (const [, fields] of Object.entries(data.providers as Record<string, Record<string, string>>)) {
        for (const [k, v] of Object.entries(fields)) {
          vars[k] = v
        }
      }
      setEnvVars(vars)
      setExpandedProvider(data.llm_provider)
    } catch {
      // fail silently on load
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  const updateEnvVar = (key: string, value: string) => {
    setEnvVars(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveStatus('idle')
    try {
      await api.put('/settings', {
        llm_provider: provider,
        llm_model: model,
        env_vars: envVars,
      })
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch {
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-gray-400" size={24} />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-1">设置</h1>
        <p className="text-sm text-gray-500 mb-6">配置 LLM 提供商和 API Key，修改后立即生效。</p>

        {/* Active provider selector */}
        <section className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            当前 LLM 提供商
          </label>
          <select
            value={provider}
            onChange={e => {
              setProvider(e.target.value)
              setExpandedProvider(e.target.value)
            }}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            {PROVIDERS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </section>

        {/* Model name */}
        <section className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            模型名称
          </label>
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="例: claude-sonnet-4-20250514"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <p className="text-xs text-gray-400 mt-1">留空则使用提供商默认模型</p>
        </section>

        {/* Provider configs */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-gray-700 mb-3">提供商配置</h2>
          <div className="border rounded-lg divide-y">
            {PROVIDERS.map(prov => {
              const isActive = provider === prov.id
              const isExpanded = expandedProvider === prov.id
              return (
                <div key={prov.id}>
                  <button
                    onClick={() => setExpandedProvider(isExpanded ? null : prov.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition ${
                      isActive ? 'bg-blue-50' : ''
                    }`}
                  >
                    {isExpanded ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400" />}
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-700">{prov.label}</span>
                      <span className="text-xs text-gray-400 ml-2">{prov.description}</span>
                    </div>
                    {isActive && (
                      <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full">
                        当前使用
                      </span>
                    )}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 space-y-3 bg-gray-50/50">
                      {prov.fields.map(field => (
                        <div key={field.key}>
                          <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                          {field.type === 'apikey' ? (
                            <KeyField
                              value={envVars[field.key] || ''}
                              onChange={v => updateEnvVar(field.key, v)}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={envVars[field.key] || field.options?.[0] || ''}
                              onChange={e => updateEnvVar(field.key, e.target.value)}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                            >
                              {field.options?.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={envVars[field.key] || ''}
                              onChange={e => updateEnvVar(field.key, e.target.value)}
                              placeholder={field.type === 'url' ? 'https://...' : '模型名称'}
                              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Save button */}
        <div className="sticky bottom-0 bg-white border-t -mx-6 px-6 py-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            保存设置
          </button>
          {saveStatus === 'success' && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircle size={14} /> 已保存，设置立即生效
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-sm text-red-600 flex items-center gap-1">
              <AlertCircle size={14} /> 保存失败，请重试
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
