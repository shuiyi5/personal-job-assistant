import { useState, useRef, useCallback, type ReactNode } from 'react'

interface Props {
  left: ReactNode
  right: ReactNode
  defaultLeftWidth?: number
  minLeft?: number
  minRight?: number
}

export default function ResizablePanel({ left, right, defaultLeftWidth = 300, minLeft = 180, minRight = 200 }: Props) {
  const [leftWidth, setLeftWidth] = useState(defaultLeftWidth)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const onMouseDown = useCallback(() => {
    dragging.current = true
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const newWidth = e.clientX - rect.left
      const maxLeft = rect.width - minRight
      setLeftWidth(Math.max(minLeft, Math.min(maxLeft, newWidth)))
    }

    const onMouseUp = () => {
      dragging.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [minLeft, minRight])

  return (
    <div ref={containerRef} className="flex h-full overflow-hidden">
      <div style={{ width: leftWidth, minWidth: minLeft }} className="flex-shrink-0 overflow-hidden">
        {left}
      </div>
      <div
        onMouseDown={onMouseDown}
        className="w-1 bg-gray-200 hover:bg-primary-400 cursor-col-resize flex-shrink-0 transition-colors"
      />
      <div className="flex-1 overflow-hidden">
        {right}
      </div>
    </div>
  )
}
