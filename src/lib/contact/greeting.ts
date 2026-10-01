/**
 * The chat's fixed opening line. The page shows it as the first bubble and the e-mailed
 * log starts with it; it is never sent to the model. Kept apart from the system prompt so
 * the browser bundle carries only this string.
 */
export const GREETING =
  'こんにちは。ご相談の内容を一緒に整理します。まず、いま困っていることや実現したいことを、ひとことで教えてください。'
