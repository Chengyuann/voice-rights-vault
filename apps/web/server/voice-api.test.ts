import assert from 'node:assert/strict'
import test from 'node:test'
import { detectAudioFormat, validateAudioUpload } from './voice-api.ts'

const fixtures = {
  wav: Buffer.from('524946460000000057415645', 'hex'),
  ogg: Buffer.from('4f67675300000000', 'hex'),
  flac: Buffer.from('664c614300000000', 'hex'),
  webm: Buffer.from('1a45dfa300000000', 'hex'),
  mp4: Buffer.from('00000018667479704d344120', 'hex'),
  mp3: Buffer.from('49443304000000000000', 'hex'),
  aac: Buffer.from('fff15080000000', 'hex'),
}

test('detectAudioFormat recognizes supported container signatures', () => {
  for (const [format, bytes] of Object.entries(fixtures)) {
    assert.equal(detectAudioFormat(bytes), format)
  }
})

test('validateAudioUpload accepts browser binary uploads with a valid signature', () => {
  assert.equal(validateAudioUpload('application/octet-stream', fixtures.webm), 'webm')
  assert.equal(validateAudioUpload('audio/mpeg; charset=binary', fixtures.mp3), 'mp3')
})

test('validateAudioUpload rejects non-audio content types and invalid signatures', () => {
  assert.throws(
    () => validateAudioUpload('text/plain', fixtures.mp3),
    { message: 'Unsupported audio content type.', statusCode: 415 },
  )
  assert.throws(
    () => validateAudioUpload('application/octet-stream', Buffer.from('not audio')),
    { message: 'Unsupported or invalid audio file.', statusCode: 415 },
  )
})

test('validateAudioUpload rejects empty files', () => {
  assert.throws(
    () => validateAudioUpload('audio/mpeg', Buffer.alloc(0)),
    { message: 'No audio data received.', statusCode: 400 },
  )
})
