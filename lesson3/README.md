# Koa2微信公众号开发(三) 获取access_token打开新世界的大门

## 一、简介

之前的教程中，我们搭建好了开发环境，验证接入了微信公众号，并实现了自动回复功能。之前打算在这一节中讲讲消息加密，客服消息的，但是测试号貌似没有加密这个功能，客服消息有涉及到客服帐号管理。所以这节就先不说了，留着后面再说。这节我们来获取access_token，打开新世界的大门，微信开发中很多借口都需要用到access_token。

##  二、封装消息回复模块

上节中，我们把所有消息处理的代码都写在了一起，这样代码有点混乱。这节开始之前我们先开优化下我们的代码把消息回复模块给封装好。

> 好代码都是改出来的

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

到此，我们只需要在`// TODO`这儿处理我们自己的各种业务逻辑即可，`wechat.js`只用来处理与微信的交互，代码立马变得整洁干净了

[查看代码](https://github.com/ogilhinn/koa2-wechat/tree/master/lesson2)

## 三、获取access_token

### 3.1 access_token概览

> access_token是公众号的全局唯一接口调用凭据，公众号调用各接口时都需使用access_token。开发者需要进行妥善保存。access_token的存储至少要保留512个字符空间。access_token的有效期目前为2个小时*(**7200秒**)*，需定时刷新，重复获取将导致上次获取的access_token失效。

公众号可以使用AppID和AppSecret调用本接口来获取access_token，重点看下面这两条

- 有效期为2小时（7200s），过期自动失效，需要重新获取
- 只要更新了access_token，之前的access_token自动失效

从这儿我们可以发现我们所需要解决的问题是：每两个小时去获取access_token，并把它存在一个唯一的地方方便我们的使用。

接口调用地址为：

```javascript
/*
https请求方式: GET
https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=APPID&secret=APPSECRET


grant_type	是	获取access_token填写client_credential
appid	是	第三方用户唯一凭证
secret	是	第三方用户唯一凭证密钥，即appsecret
*/
```

正常情况下，微信会返回下述JSON数据包给公众号：

```javascript
{"access_token":"ACCESS_TOKEN","expires_in":7200}

/*
access_token	获取到的凭证
expires_in	凭证有效时间，单位：秒
*/
```

官方文档介绍可见：[https://mp.weixin.qq.com/wiki](https://mp.weixin.qq.com/wiki?t=resource/res_main&id=mp1421140183)

### 3.2 获取并保存access_token

现在开始编码实现我们之前所讲的获取access_token的流程，我们使用了es6的类，如果不了解es6可以去看看阮老师的[ECMAScript 6 入门](http://es6.ruanyifeng.com/)

这儿我们用到[axios](https://github.com/axios/axios) 这个网络请求的库，随着Vue社区对他的强烈推荐，看着它从几千star到了几万star。我们也赶赶时髦在这儿使用它来发送我们的所有请求。

```bash
npm install axios --save
```

建一个API 类，在这我们需要做的是发起网络请求获取access_token，将它保存在`access_token.txt`文件中，从文件中获取`access_token` 并验证有效性，如果失效就请求新的。

**通过axios获取access_token**


```javascript
class API {
  constructor(appid, appsecret) {
    this.appid = appid
    this.appsecret = appsecret
    this.prefix = 'https://api.weixin.qq.com/cgi-bin/'
  }

  async getAccessToken() {
    const response = await axios.get(`${this.prefix}token?grant_type=client_credential&appid=${this.appid}&secret=${this.appsecret}`)
    console.log(response.data)
  }
}

const api = new API(appid, appsecret)
api.getAccessToken()
// {"access_token":"ACCESS_TOKEN","expires_in":7200}
```

**储存access_token到文件中**

前面我们获取回来了access_token但是每次都去请求太浪费资源了。而且每天有请求次数限制(**2000次/天**)，所以我们需要存在文件中两小时获取一次新的，这儿我们将用到[fs-extra](https://github.com/jprichardson/node-fs-extra)这个文件操作模块方便我们使用Async/Await

```bash
npm install fs-extra --save
```

引入`fs-extra`，实现文件保存功能，我们需要保存access_token以及过期的时间。

```javascript
class API {
  constructor(appid, appsecret) {
    this.appid = appid
    this.appsecret = appsecret
    this.prefix = 'https://api.weixin.qq.com/cgi-bin/'
    // 保存access_token
    this.saveToken = async function (token) {
      await fs.writeFile('access_token.txt', JSON.stringify(token))
    }
  }

  // 从https接口获取access_token
  async getAccessToken() {
    let token = {}
    const response = await axios.get(`${this.prefix}token?grant_type=client_credential&appid=${this.appid}&secret=${this.appsecret}`)

    // 过期时间，因网络延迟等，将实际过期时间提前20秒，以防止临界点
    const expireTime = Date.now() + (data.data.expires_in - 20) * 1000
    token.accessToken = response.data.access_token
    token.expireTime = expireTime
    await this.saveToken(token)
    return token
  }
}

const api = new API(appid, appsecret)
api.getAccessToken()
```

看看你的目录下有没有多出一个access_token.txt文件，如果有并且里面已经写入数据，那么恭喜你这步没有出错。*(实际开发中你可能会犯各种小错误：敲错字母等)*。既然存进去了，我们当然还需要从文件中读出来

```javascript
class API {
  constructor(appid, appsecret) {
    this.appid = appid
    this.appsecret = appsecret
    this.prefix = 'https://api.weixin.qq.com/cgi-bin/'
    // 保存access_token到文件
    this.saveToken = async function (token) {
      await fs.writeFile('access_token.txt', JSON.stringify(token))
    }
    // 从文件获取读取数据
    this.getToken = async function () {
      const txt = await fs.readFile('access_token.txt', 'utf8')
      return JSON.parse(txt)
    }
  }

  // 从https接口获取access_token
  async getAccessToken() {
    ...
  }
}
```

到此我们已经解决了一大半的问题了，我们只需要再来写个验证access_token是否过期的方法，同时实现一个输出access_token的方法，方便我们在写其他功能时获取到这个全局唯一的access_token

```javascript
class API {
  constructor(appid, appsecret) {
    this.appid = appid
    this.appsecret = appsecret
    this.prefix = 'https://api.weixin.qq.com/cgi-bin/'
    // 保存access_token到文件
    this.saveToken = async function (token) {
      await fs.writeFile('access_token.txt', JSON.stringify(token))
    }
    // 从文件获取读取数据
    this.getToken = async function () {
      const txt = await fs.readFile('access_token.txt', 'utf8')
      return JSON.parse(txt)
    }
  }

  // 从https接口获取access_token
  async getAccessToken() {
    ...
  }

  // 读取文件获取token，读取失败重新请求接口
  async ensureAccessToken() {
    let token = {}
    try {
      token = await this.getToken()
    } catch (e) {
      token = await this.getAccessToken()
    }
    if(token && (this.isValid(token.accessToken, token.expireTime))) {
      return token
    }
    return this.getAccessToken()
  }

  // 验证access_token是否过期
  isValid(accessToken, expireTime) {
    return !!accessToken && Date.now() < expireTime
  }
}
```

现在本篇教程的重点获取access_token就讲完了。最后我们来调用下自定义菜单接口验证下之前所写的代码

## 四、创建自定义菜单创建接口

自定义菜单能够帮助公众号丰富界面，让用户更好更快地理解公众号的功能。由于这儿只是为了验证之前所写的获取access_token的代码能不能用。关于菜单接口下一篇会详细讲解。这儿我们只大致实现下创建菜单。

在API类中新加一个`createMenu`方法

```javascript
class API {
  ...

  // 创建菜单
  async createMenu(menu) {
    const { accessToken } = await this.ensureAccessToken()
    let url = this.prefix + 'menu/create?access_token=' + accessToken
    const response = await axios.post(url, menu)
    return response.data
  }
}
```

接着我们就可以调用这个方法试试了

```javascript
const api = new API(config.wechat.appid, config.wechat.appsecret)

const menu = {
  "button":[
  {
       "type":"click",
       "name":"今日歌曲",
       "key":"V1001_TODAY_MUSIC"
   },
   {
        "name":"菜单",
        "sub_button":[
        {
            "type":"view",
            "name":"搜索",
            "url":"http://www.soso.com/"
         },
         {
            "type":"click",
            "name":"赞一下我们",
            "key":"V1001_GOOD"
         }]
    }]
}


app.use(async (ctx) => {
  // TODO
  const result = await api.createMenu(menu)
  console.log(result)
})

app.listen(7001)
```

运行app.js，命令行将打印出如下信息。恭喜。

```javascript
{ errcode: 0, errmsg: 'ok' }
```

如果，你很不幸的得到了错误信息，那就慢慢找错吧，哈哈哈



明天我们接着讲自定义菜单接口的开发

## 参考链接

- ECMAScript 6 入门：[http://es6.ruanyifeng.com/](http://es6.ruanyifeng.com/)
- axios: [https://github.com/axios/axios](https://github.com/axios/axios)
- fs-extra: [https://github.com/jprichardson/node-fs-extra](https://github.com/jprichardson/node-fs-extra)

**左手代码右手砖，抛砖引玉**

![JavaScript之禅](https://user-gold-cdn.xitu.io/2017/12/2/16014b551df70a85)
