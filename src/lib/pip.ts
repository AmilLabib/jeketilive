type DocumentPip = { requestWindow(options: { width: number; height: number }): Promise<Window> }

/** Chrome's Document Picture-in-Picture (a floating window that can hold any HTML), if available. */
export const documentPip = () => (window as unknown as { documentPictureInPicture?: DocumentPip }).documentPictureInPicture

/** The floating window has an empty document; give it the page's styles so Tailwind classes work. */
export function copyStyles(target: Document) {
  for (const sheet of document.styleSheets) {
    try {
      const style = target.createElement('style')
      style.textContent = Array.from(sheet.cssRules, (rule) => rule.cssText).join('\n')
      target.head.append(style)
    } catch {
      // Cross-origin sheet (Google Fonts): rules aren't readable, link it instead.
      if (!sheet.href) continue
      const link = target.createElement('link')
      link.rel = 'stylesheet'
      link.href = sheet.href
      target.head.append(link)
    }
  }
}
