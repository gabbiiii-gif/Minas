import { useEffect } from 'react'

type ShortcutMap = Record<string, (e: KeyboardEvent) => void>

const IGNORE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export function useKeyboardShortcut(map: ShortcutMap, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true

  useEffect(() => {
    if (!enabled) return

    function handler(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      if (target) {
        if (IGNORE_TAGS.has(target.tagName)) {
          // Permite atalhos mesmo em input se marcado com data-allow-shortcuts
          if (target.dataset.allowShortcuts !== 'true') return
        }
        if (target.dataset?.ignoreShortcuts === 'true') return
      }

      const fn = map[e.key] || map[e.code]
      if (fn) {
        e.preventDefault()
        fn(e)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled, map])
}
