export interface ExtractedTemplateStyles {
  html: string
  css: string
}

export function extractTemplateStyles(html: string): ExtractedTemplateStyles {
  const cssBlocks: string[] = []
  const strippedHtml = html.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_full, css) => {
    cssBlocks.push(css ?? '')
    return ''
  })

  return {
    html: strippedHtml.trim(),
    css: cssBlocks.join('\n').trim(),
  }
}

export function prependStyleBlock(html: string, css: string): string {
  if (!css.trim()) return html
  return `<style>${css}</style>\n${html}`
}

