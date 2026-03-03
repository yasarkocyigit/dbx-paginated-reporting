export interface TemplateValidationResult {
  isValid: boolean
  errors: string[]
}

const STACKABLE_MUSTACHE = new Set(['#', '^'])

function validateStyleBlocks(html: string): string[] {
  const errors: string[] = []
  const styleOpen = (html.match(/<style\b[^>]*>/gi) || []).length
  const styleClose = (html.match(/<\/style>/gi) || []).length
  if (styleOpen !== styleClose) {
    errors.push('Unbalanced <style> blocks detected.')
  }
  return errors
}

function validateMustacheBlocks(html: string): string[] {
  const errors: string[] = []
  const stack: string[] = []
  const tokenRe = /\{\{([\s\S]*?)\}\}/g
  let match: RegExpExecArray | null

  while ((match = tokenRe.exec(html)) !== null) {
    let token = match[1].trim()
    if (!token) continue

    // Triple-mustache tokens appear as { field } in this regex capture.
    if (token.startsWith('{') && token.endsWith('}')) {
      token = token.slice(1, -1).trim()
    }
    if (!token) continue

    const sigil = token[0]
    const name = token.slice(1).trim().split(/\s+/)[0]

    if (STACKABLE_MUSTACHE.has(sigil)) {
      if (!name) {
        errors.push(`Invalid Mustache block opener: {{${token}}}`)
        continue
      }
      stack.push(name)
      continue
    }

    if (sigil === '/') {
      if (!name) {
        errors.push(`Invalid Mustache block closer: {{${token}}}`)
        continue
      }
      const expected = stack.pop()
      if (!expected) {
        errors.push(`Unexpected Mustache closing tag: {{/${name}}}`)
      } else if (expected !== name) {
        errors.push(`Mustache block mismatch: expected {{/${expected}}} but found {{/${name}}}`)
      }
    }
  }

  while (stack.length) {
    const unclosed = stack.pop()
    if (unclosed) errors.push(`Unclosed Mustache block: {{#${unclosed}}}`)
  }
  return errors
}

export function validateTemplateHtml(html: string): TemplateValidationResult {
  const value = html.trim()
  const errors: string[] = []

  if (!value) {
    return { isValid: false, errors: ['Template HTML cannot be empty.'] }
  }
  if (/<script\b/i.test(value)) {
    errors.push('<script> tags are not allowed in templates.')
  }

  errors.push(...validateStyleBlocks(value))
  errors.push(...validateMustacheBlocks(value))

  return {
    isValid: errors.length === 0,
    errors,
  }
}

