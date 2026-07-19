export function shouldShowPreviewTitle({ title, titleAppliedByAi }) {
  return Boolean(String(title || '').trim() && !titleAppliedByAi);
}
