'use strict'

const Koa = require('koa')
const axios = require('axios')
const fs = require('fs-extra')
const app = new Koa()
const wechat = require('./wechat/wechat')
const config = require('./config')

class API {
  constructor(appid, appsecret) {
    this.appid = appid
    this.appsecret = appsecret
    this.prefix = 'https://api.weixin.qq.com/cgi-bin/'
    /**
     * 储存token到access_token.txt
     * @param {json} token
     */
    this.saveToken = async function (token) {
      await fs.writeFile('access_token.txt', JSON.stringify(token))
    }
    // 从access_token.txt中获取token
    this.getToken = async function () {
      const txt = await fs.readFile('access_token.txt', 'utf8')
      return JSON.parse(txt)
    }
  }

  /**
   * 获取AccessToken
   * @returns {object} token
   */
  async getAccessToken() {
    let token = {}
    const response = await axios.get(`${this.prefix}token?grant_type=client_credential&appid=${this.appid}&secret=${this.appsecret}`)
    // 过期时间，因网络延迟等，将实际过期时间提前20秒，以防止临界点
    const expireTime = Date.now() + (response.data.expires_in - 20) * 1000
    token.accessToken = response.data.access_token
    token.expireTime = expireTime
    await this.saveToken(token)
    return token
  }

  /**
   * 返回AccessToken
   * @returns {string} accessToken
   */
  async ensureAccessToken() {
    let token = {}
    try {
      token = await this.getToken()
    } catch (e) {
      token = await this.getAccessToken()
    }
    if (token && (this.isValid(token.accessToken, token.expireTime))) {
      return token
    }
    return this.getAccessToken()
  }

  /**
   * 检查AccessToken是否有效，检查规则为当前时间和过期时间进行对比
   * @param {string} accessToken
   * @param {number} expireTime
   */
  isValid(accessToken, expireTime) {
    return !!accessToken && Date.now() < expireTime
  }
}

// 创建菜单
API.prototype.createMenu = async function (menu) {
  const { accessToken } = await this.ensureAccessToken()
  const url = this.prefix + 'menu/create?access_token=' + accessToken
  const response = await axios.post(url, menu)
  return response.data
}

// 查询菜单
API.prototype.getMenu = async function () {
  const { accessToken } = await this.ensureAccessToken()
  const url = this.prefix + 'menu/get?access_token=' + accessToken
  const response = await axios.get(url)
  return response.data
}

// 删除菜单
API.prototype.getMenu = async function () {
  const { accessToken } = await this.ensureAccessToken()
  const url = this.prefix + 'menu/delete?access_token=' + accessToken;
  const response = await axios.get(url)
  return response.data
}

// 添加个性化菜单
API.prototype.addConditionalMenu = async function (menu) {
  const { accessToken } = await this.ensureAccessToken()
  const url = this.prefix + 'menu/addconditional?access_token=' + accessToken
  const response = await axios.post(url, menu)
  return response.data
}

// 删除个性化菜单
API.prototype.delConditionalMenu = async function (menuid) {
  const { accessToken } = await this.ensureAccessToken()
  const url = this.prefix + 'menu/delconditional?access_token=' + accessToken
  const response = await axios.post(url, { menuid })
  return response.data
}

// 测试个性化菜单
API.prototype.tryConditionalMenu = async function (user_id) {
  const { accessToken } = await this.ensureAccessToken()
  const url = this.prefix + 'menu/trymatch?access_token=' + accessToken
  const response = await axios.post(url, { user_id })
  return response.data
}

const api = new API(config.wechat.appid, config.wechat.appsecret)

const menu1 = {
  "button": [
    {
      "type": "click",
      "name": "大爷来玩",
      "key": "V1001_TODAY_MUSIC"
    }],
  "matchrule": {
    "sex": "1",
  }
}

const menu2 = {
  "button": [
    {
      "type": "click",
      "name": "姐姐来玩",
      "key": "V1001_TODAY_MUSIC"
    }],
  "matchrule": {
    "sex": "2",
  }
}


app.use(async (ctx) => {
  // TODO
  const result = await api.addConditionalMenu(menu2)
  console.log(result)
  ctx.body = result
})


app.use(wechat(config, async (message, ctx) => {
  // TODO
  console.log(message)
  if (message.MsgType === 'event' && message.EventKey === 'V1001_TODAY_MUSIC') {
    return {
      type: 'music',
      content: {
        title: 'Lemon Tree',
        description: 'Lemon Tree',
        musicUrl: 'http://mp3.com/xx.mp3',
      },
    }
  }
}))

app.listen(7001)

