'use strict'

const Koa = require('koa')
const app = new Koa()
const wechat = require('./wechat/wechat')
const config = require('./config')

app.use(wechat(config, async (message, ctx) => {
  // TODO

  // examples
  if (message.MsgType === 'event' && message.Event === 'subscribe') {
    return '感谢您关注JavaScript之禅'
  } else if (message.Content === '音乐') {
    return {
      type: 'music',
      content: {
        title: 'Lemon Tree',
        description: 'Lemon Tree',
        musicUrl: 'http://mp3.com/xx.mp3',
      },
    }
  } else if (message.MsgType === 'text') {
    return message.Content
  } else if (message.MsgType === 'image') {
    return {
      type: 'image',
      content: {
        mediaId: message.MediaId
      },
    }
  } else if (message.MsgType === 'voice') {
    return {
      type: 'voice',
      content: {
        mediaId: message.MediaId
      },
    }
  } else {
    return'JavaScript之禅'
  }
}))

app.listen(7001)
