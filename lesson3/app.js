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

  // 创建菜单
  async createMenu(menu) {
    const { accessToken } = await this.ensureAccessToken()
    let url = this.prefix + 'menu/create?access_token=' + accessToken
    const response = await axios.post(url, menu)
    return response.data
  }
}

const api = new API(config.wechat.appid, config.wechat.appsecret)

const menu = {
  "button": [
    {
      "type": "click",
      "name": "今日歌曲",
      "key": "V1001_TODAY_MUSIC"
    },
    {
      "name": "菜单",
      "sub_button": [
        {
          "type": "view",
          "name": "搜索",
          "url": "http://www.soso.com/"
        },
        {
          "type": "click",
          "name": "赞一下我们",
          "key": "V1001_GOOD"
        }]
    }]
}


app.use(async (ctx) => {
  // TODO
  const result = await api.createMenu(menu)
  console.log(result)
})

app.listen(7001)
