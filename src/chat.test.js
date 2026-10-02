import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyNotification, newChat, toPhone } from './chat.js'

const incoming = (overrides = {}) => ({
  typeWebhook: 'incomingMessageReceived',
  timestamp: 1763115112,
  idMessage: 'm1',
  senderData: { chatId: '10000000', chatName: 'Ivan', senderPhoneNumber: 79876543210 },
  messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'hi' } },
  ...overrides,
})

test('reply lands in the chat created by phone number', () => {
  const chats = applyNotification([newChat(toPhone('+7 (987) 654-32-10'))], incoming())
  assert.equal(chats.length, 1)
  assert.equal(chats[0].tgId, '10000000')
  assert.deepEqual(chats[0].messages.map((m) => m.text), ['hi'])
})

test('unknown sender creates a chat, duplicates and non-text are ignored', () => {
  let chats = applyNotification([], incoming())
  chats = applyNotification(chats, incoming())
  chats = applyNotification(chats, incoming({ idMessage: 'm2', messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'link' } } }))
  chats = applyNotification(chats, incoming({ idMessage: 'm3', messageData: { typeMessage: 'imageMessage' } }))
  chats = applyNotification(chats, incoming({ typeWebhook: 'stateInstanceChanged' }))
  assert.equal(chats.length, 1)
  assert.equal(chats[0].name, 'Ivan')
  assert.deepEqual(chats[0].messages.map((m) => m.text), ['hi', 'link'])
})
