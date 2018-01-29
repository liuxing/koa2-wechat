# Koa2微信公众号开发(三) 消息管理续集

## 一、简介

之前的教程中，我们搭建好了开发环境，验证接入了微信公众号。并实现了自动回复功能。之前打算在这一节中讲讲消息加密，客服消息的，但是测试号貌似没有这个功能，客服消息有涉及到客服帐号管理。所以这节就不说写了。

### 2.2 代码优化

上节中，我们把所有消息处理的代码都写在了一起，这样代码有点混乱。这节开始之前我们先开优化下我们的代码把消息回复模块给封装好。

新建一个wechat文件夹，在这个目录下建立一个`wechat.js`文件

```javascript
'use strict'

const crypto = require('crypto')
const getRawBody = require('raw-body')
const xml2js = require('xml2js')
const ejs = require('ejs')

function getSignature(timestamp, nonce, token) {
  ...
}

function parseXML(xml) {
  ...
}

const tpl = `
<xml>
  <ToUserName><![CDATA[<%-toUsername%>]]></ToUserName>
  <FromUserName><![CDATA[<%-fromUsername%>]]></FromUserName>
...
...
  <Content><![CDATA[<%-content%>]]></Content>
  <% } %>
</xml>`

// ejs编译
const compiled = ejs.compile(tpl)

function reply(content, fromUsername, toUsername) {
  ...
}

function wechat(config, handle) {
  return async (ctx) => {
    const { signature, timestamp, nonce, echostr } = ctx.query
    const TOKEN = config.wechat.token
    if (ctx.method === 'GET') {
      if (signature === getSignature(timestamp, nonce, TOKEN)) {
        return ctx.body = echostr
      }
      ctx.status = 401
      ctx.body = 'Invalid signature'
    } else if (ctx.method === 'POST') {
      if (signature !== getSignature(timestamp, nonce, TOKEN)) {
        ctx.status = 401
        return ctx.body = 'Invalid signature'
      }
      // 取原始数据
      const xml = await getRawBody(ctx.req, {
        length: ctx.request.length,
        limit: '1mb',
        encoding: ctx.request.charset || 'utf-8'
      })
      const formatted = await parseXML(xml)
      
      // 业务逻辑处理handle
      const content = await handle(formatted, ctx)
      if (!content) {
        return ctx.body = 'success'
      }
      const replyMessageXml = reply(content, formatted.ToUserName, formatted.FromUserName)
      ctx.type = 'application/xml'
      return ctx.body = replyMessageXml
    }
  }
}

module.exports = wechat
```

然后改我们的`app.js`

```javascript
'use strict'

const Koa = require('koa')
const app = new Koa()
const wechat = require('./wechat/wechat')
const config = require('./config')

app.use(wechat(config, async (message, ctx) => {
  // TODO
  return 'JavaScript之禅'
}))

app.listen(7001)
```

到此，我们只需要在`// TODO`这儿处理我们自己的各种业务逻辑即可，代码立马变得整洁干净了。

