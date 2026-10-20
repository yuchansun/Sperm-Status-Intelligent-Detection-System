export const IMAGE_LIMIT = 10 * 1024 * 1024
export const VIDEO_LIMIT = 50_000_000 // Decimal MB; stays below the Free plan file-size ceiling.
const imageExtensions = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }
const videoExtensions = { mp4: 'video/mp4', m4v: 'video/x-m4v', mov: 'video/quicktime', webm: 'video/webm', avi: 'video/x-msvideo', mkv: 'video/x-matroska', mpg: 'video/mpeg', mpeg: 'video/mpeg', '3gp': 'video/3gpp', '3g2': 'video/3gpp2', ts: 'video/mp2t', mts: 'video/mp2t', m2ts: 'video/mp2t', ogv: 'video/ogg', wmv: 'video/x-ms-wmv', flv: 'video/x-flv' }
export const MEDIA_ACCEPT = 'image/jpeg,image/png,image/webp,video/*,' + Object.keys(videoExtensions).map(ext => `.${ext}`).join(',')
export function describeMedia(file) {
  if (!file) return null
  const extension = file.name?.split('.').at(-1)?.toLowerCase()
  // Some OSes identify AVI/MKV as application/*, or omit MIME entirely.
  const mime = file.type?.toLowerCase().split(';')[0].trim()
  const inferred = imageExtensions[extension] || videoExtensions[extension]
  const mimeType = (!mime || mime === 'application/octet-stream' || (videoExtensions[extension] && mime.startsWith('application/'))) ? inferred : mime
  const kind = mimeType?.startsWith('video/') ? 'video' : 'image'
  if (!mimeType || (kind === 'image' && !Object.values(imageExtensions).includes(mimeType))) {
    throw new Error('照片支援 JPEG、PNG、WebP；影片支援 video 類型與常見影片副檔名。無法辨識的檔案請先轉成 MP4。')
  }
  const limit = kind === 'video' ? VIDEO_LIMIT : IMAGE_LIMIT
  if (!Number.isFinite(file.size) || file.size <= 0 || file.size > limit) throw new Error(`${kind === 'video' ? '影片' : '照片'}須大於 0 且不超過 ${kind === 'video' ? 50 : 10} MB。`)
  const safeExtension = kind === 'video'
    ? extension && /^[a-z0-9]{1,8}$/.test(extension) ? extension : 'video'
    : { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mimeType]
  return { kind, mimeType, extension: safeExtension, bucket: kind === 'video' ? 'exam-videos' : 'exam-images', size: file.size }
}
