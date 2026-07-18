import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path) => readFileSync(resolve(path), 'utf8')

describe('Home for AI product contract', () => {
  it('keeps the canonical Raven design tokens', () => {
    const css = read('src/styles/App.css').toLowerCase()
    for (const token of ['#050505', '#c8273f', '#c9ad7d', '#f4efe7']) {
      expect(css).toContain(token)
    }
    expect(css).toContain('prefers-reduced-motion')
    expect(css).not.toContain('#a78bfa')
    expect(css).not.toContain('#6d7cff')
  })

  it('keeps browser showcase mode separate from Tauri commands', () => {
    const app = read('src/App.tsx')
    expect(app).toContain("'__TAURI_INTERNALS__' in window")
    expect(app).toContain("setRuntimeStatus('showcase')")
    expect(app).toContain("setVersion('web preview')")
  })

  it('preserves the product voice and evidence boundary', () => {
    const app = read('src/App.tsx')
    expect(app).toContain('Your intelligence should live somewhere worthy of it.')
    expect(app).toContain('Evidence before authority')
    expect(app).toContain('consent gate enabled')
  })
})
