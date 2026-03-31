import { useState } from 'react'
import { ChevronDown, ChevronUp, Check, Layout } from 'lucide-react'
import { useResumeStore } from '../../stores/resumeStore'
import { TEMPLATES, TEMPLATE_IDS } from '../../templates'
import type { TemplateId } from '../../types/resume'

export default function TemplateSelector() {
  const [expanded, setExpanded] = useState(false)
  const selectedTemplate = useResumeStore(s => s.selectedTemplate)
  const setTemplate = useResumeStore(s => s.setTemplate)

  const currentMeta = TEMPLATES[selectedTemplate].meta

  return (
    <div className="border-b bg-white">
      {/* Collapsed bar */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50 select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-sm">
          <Layout size={15} className="text-gray-400" />
          <span className="text-gray-500">模板:</span>
          <span
            className="font-medium px-2 py-0.5 rounded text-xs text-white"
            style={{ backgroundColor: currentMeta.primaryColor }}
          >
            {currentMeta.name}
          </span>
          <span className="text-gray-400 text-xs hidden sm:inline">{currentMeta.description}</span>
        </div>
        <button className="text-gray-400 hover:text-gray-600 p-1">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded template cards */}
      {expanded && (
        <div className="px-4 pb-3 flex gap-3 overflow-x-auto">
          {TEMPLATE_IDS.map(id => {
            const entry = TEMPLATES[id]
            const isSelected = id === selectedTemplate
            return (
              <button
                key={id}
                onClick={() => {
                  setTemplate(id as TemplateId)
                }}
                className={`
                  flex-shrink-0 w-[120px] rounded-lg border-2 p-2 transition-all
                  hover:shadow-md hover:scale-[1.02]
                  ${isSelected
                    ? 'border-blue-500 shadow-md bg-blue-50/50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'}
                `}
              >
                {/* Mini preview swatch */}
                <div
                  className="w-full h-[80px] rounded mb-2 relative overflow-hidden"
                  style={{ backgroundColor: id === 'tech' ? '#0f172a' : '#f8f9fa' }}
                >
                  {/* Stylized mini preview */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[20px]"
                    style={{
                      backgroundColor: entry.meta.primaryColor,
                      opacity: id === 'minimalist' ? 0 : id === 'academic' ? 0 : 1,
                    }}
                  />
                  {id === 'minimalist' && (
                    <div className="absolute top-[8px] left-0 right-0 h-[1px] bg-gray-300" />
                  )}
                  {id === 'academic' && (
                    <div className="flex flex-col items-center pt-2">
                      <div className="w-[40px] h-[3px] bg-gray-400 rounded mb-1" />
                      <div className="w-[30px] h-[2px] bg-gray-300 rounded" />
                    </div>
                  )}
                  {id === 'creative' && (
                    <div className="absolute top-0 left-0 bottom-0 w-[35%]"
                      style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                    />
                  )}
                  {/* Generic content lines */}
                  <div className={`absolute ${id === 'creative' ? 'left-[40%]' : 'left-[8px]'} right-[8px] ${id === 'minimalist' || id === 'academic' ? 'top-[22px]' : 'top-[26px]'} space-y-[4px]`}>
                    <div className="h-[2px] bg-gray-300 rounded w-[70%]" />
                    <div className="h-[2px] bg-gray-200 rounded w-full" />
                    <div className="h-[2px] bg-gray-200 rounded w-[85%]" />
                    <div className="h-[2px] bg-gray-300 rounded w-[50%] mt-[4px]" />
                    <div className="h-[2px] bg-gray-200 rounded w-full" />
                    <div className="h-[2px] bg-gray-200 rounded w-[60%]" />
                  </div>
                  {/* Selected check */}
                  {isSelected && (
                    <div className="absolute top-1 right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                </div>
                {/* Template name */}
                <div className="text-xs font-medium text-center text-gray-700">
                  {entry.meta.name}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
