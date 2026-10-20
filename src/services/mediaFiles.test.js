import { describe, it, expect } from 'vitest'
import { describeMedia, IMAGE_LIMIT, VIDEO_LIMIT } from './mediaFiles.js'
describe('one-file media validation', () => {
 it('accepts a 50 MB video and retains its original MIME', () => {
   expect(describeMedia({ name: 'clip.mp4', type: 'video/mp4', size: VIDEO_LIMIT })).toMatchObject({ kind: 'video', bucket: 'exam-videos', mimeType: 'video/mp4' })
 })
 it('rejects 50 MiB because it is larger than the decimal 50 MB ceiling', () => {
   expect(() => describeMedia({ name: 'clip.mp4', type: 'video/mp4', size: 50 * 1024 * 1024 })).toThrow('50 MB')
 })
 it('rejects video beyond the limit and images beyond their smaller limit', () => {
   expect(() => describeMedia({ name: 'clip.mov', type: 'video/quicktime', size: VIDEO_LIMIT+1 })).toThrow('50 MB')
   expect(() => describeMedia({ name: 'img.png', type: 'image/png', size: IMAGE_LIMIT+1 })).toThrow('10 MB')
 })
 it('recognizes common video extensions when OS MIME is empty or application/*', () => {
   expect(describeMedia({ name: 'clip.MOV', type: '', size: 10 }).mimeType).toBe('video/quicktime')
   expect(describeMedia({ name: 'clip.mkv', type: 'application/octet-stream', size: 10 }).kind).toBe('video')
 })
 it('rejects unrelated formats and zero-sized files', () => {
   expect(() => describeMedia({ name: 'script.html', type: 'text/html', size: 100 })).toThrow()
   expect(() => describeMedia({ name: 'image.svg', type: 'image/svg+xml', size: 100 })).toThrow()
   expect(() => describeMedia({ name: 'clip.mp4', type: 'video/mp4', size: 0 })).toThrow()
 })
})
