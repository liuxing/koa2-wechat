'use strict'

const Koa = require('koa')
const app = new Koa()
const crypto = require('crypto')
const config = require('./config')

app.use(async ctx => {
    const { signature, timestamp, nonce, echostr } = ctx.query  
    const TOKEN = config.wechat.token
    let hash = crypto.createHash('sha1')
    const arr = [TOKEN, timestamp, nonce].sort()
    hash.update(arr.join(''))
    const shasum = hash.digest('hex')
    if(shasum === signature){
      return ctx.body = echostr
    }
    ctx.status = 401      
    ctx.body = 'Invalid signature'
});

app.listen(7001);
