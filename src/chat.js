export const toPhone = (input) => input.replace(/\D/g, '')

export const newChat = (phone) => ({
  chatId: `${phone}@c.us`,
  phone,
  name: `+${phone}`,
  messages: [],
})

const messageText = ({ typeMessage, textMessageData, extendedTextMessageData }) =>
  typeMessage === 'textMessage' ? textMessageData?.textMessage
    : typeMessage === 'extendedTextMessage' ? extendedTextMessageData?.text
    : undefined

export function applyNotification(chats, body) {
  if (body?.typeWebhook !== 'incomingMessageReceived') return chats
  const text = messageText(body.messageData ?? {})
  if (text === undefined) return chats

  const { chatId, chatName, senderName, senderPhoneNumber } = body.senderData
  const phone = senderPhoneNumber ? String(senderPhoneNumber) : null
  const message = { id: body.idMessage, text, out: false, time: body.timestamp * 1000 }

  const index = chats.findIndex(
    (c) => c.chatId === chatId || c.tgId === chatId || (phone && c.phone === phone),
  )
  if (index === -1) {
    return [...chats, { chatId, tgId: chatId, phone, name: chatName || senderName || chatId, messages: [message] }]
  }
  const chat = chats[index]
  if (chat.messages.some((m) => m.id === message.id)) return chats
  const updated = { ...chat, tgId: chatId, messages: [...chat.messages, message] }
  return chats.map((c, i) => (i === index ? updated : c))
}
