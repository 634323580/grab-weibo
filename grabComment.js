const axios = require('axios-https-proxy-fix'),
  $ = require('cheerio'),
  mongoose = require('mongoose'),
  dbConfig = require('./db/config'),
  commentsModels = require('./db/models/comments'),
  listModels = require('./db/models/list');

  /**
   * 连接
   */
  mongoose.connect(dbConfig.dbs,{useNewUrlParser: true});
  const db = mongoose.connection;//获取connection实例
  /**
    * 连接成功
    */
  mongoose.connection.on('connected', function () {
      console.log('Mongoose connection open to ' + dbConfig.dbs);
  });

  go()

  async function go() {
    // 设置代理ip
    let proxy = {
      host: '',
      port: '',
    }
    let length = 0
    // 抓取的微博数据
    grabKeyData = await listModels.find({});
    for(let i=0; i<grabKeyData.length; i++) {
      await start(grabKeyData[i].mid)
      console.log('当前进度' + (i+1 / grabKeyData.length * 100).toFixed(2) + '%')
    }
    console.log('全部抓完了')
    db.close()

    /**
     * @description 开始抓取
     * @param uid 微博id
     */
    async function start(mid) {
      let url = 'https://weibo.com/aj/v6/comment/big?ajwvr=6&id='+mid+'&from=singleWeiBo&__rnd=1551851364327'
      async function cb(url) {
        // 抓取评论
        let _html = await getComments(url)
        // 当前页的一级评论
        let _commentDom = $(_html).children('.list_ul').children('.list_li.S_line1')
        // 获取下一页评论需要的参数
        let _actionData = $(_html).find('div[node-type="comment_loading"]').attr('action-data') || $(_html).find('a[action-type="click_more_comment"]').attr('action-data')
        _commentDom.each(async (index, commentItem) => {
          commentItem = $(commentItem)
          // 头像
          let _avator = commentItem.find('.WB_face').find('img').attr('src')
          // 昵称
          let _name = commentItem.find('.list_con>.WB_text>a').eq(0).text()
            // 评论内容
          let _content = $.load(commentItem.find('.list_con>.WB_text').html(), {decodeEntities: false})
          // 删除a标签
           _content('body a').remove()
           _content = _content('body').html().trim()

          // 将数据插入数据库
          const db = new commentsModels({
            mid: mid,
            avator: _avator,
            name: _name,
            content: _content
          })
          await db.save()
          length++
        })
        console.log('已抓取' + length + '条')

        if(_actionData) {
          await cb('https://weibo.com/aj/v6/comment/big?ajwvr=6&'+_actionData+'&from=singleWeiBo&__rnd=1551851364327')
        }
      }
      await cb(url)
    }
      /**
     * @description 获取评论，自动切换代理
     * @param url 接口地址
     */
    async function getComments(url) {
      let _option = {
        headers: {
          Cookie: 'Ugrow-G0=57484c7c1ded49566c905773d5d00f82; login_sid_t=264d7a3b7802fa881aa6803a2a3ceb4e; cross_origin_proto=SSL; _s_tentry=passport.weibo.com; wb_view_log=1920*10801; Apache=7892657198804.198.1552355975421; SINAGLOBAL=7892657198804.198.1552355975421; ULV=1552355975427:1:1:1:7892657198804.198.1552355975421:; WBtopGlobal_register_version=ae9a9ec008078a68; SCF=Avt6CuTc8f5ibnk_xMIGBUniVSnlPtQvnf6VGPob_22AX9xL0OTBxfmOlnQLLqVO6BUUfFKzaiI2TdRmitgKxf8.; SUB=_2A25xg2L5DeRhGeVP41ET8CvJzziIHXVS-dMxrDV8PUNbmtBeLVnTkW9NTMLHgkLP0jMCrbXMvWawwqdkVrOWng2N; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WF4I43carcJRI5MKE2C1Hu45JpX5K2hUgL.Foep1heEeh-fShB2dJLoIEqLxKnLBoMLB-qLxK-L1-eLBKnLxKnL1hBL1-2LxKBLBonL12zEentt; SUHB=09P9Cp1w-hR9ky; ALF=1552960809; SSOLoginState=1552356009; un=18320326435; wvr=6; YF-Page-G0=b98b45d9bba85e843a07e69c0880151a; wb_view_log_3183205544=1920*10801; YF-V5-G0=a5a6106293f9aeef5e34a2e71f04fae4; webim_unReadCount=%7B%22time%22%3A1552377903301%2C%22dm_pub_total%22%3A5%2C%22chat_group_pc%22%3A0%2C%22allcountNum%22%3A32%2C%22msgbox%22%3A0%7D'
        },
        // 设置超时10秒
        timeout: 10000
      }
      // 是否设置了代理
      if(proxy.host) {
        _option['proxy'] = {
          host: proxy.host,
          port: proxy.port,
        }
      }
      try {
        let _res = await axios.get(url, _option)
        return new Promise(resolve => {
          resolve(_res.data.data.html)
        })
      } catch (error) {
        console.log('正在切换ip...')
        let _proxy = await axios.get('http://webapi.http.zhimacangku.com/getip?num=1&type=2&pro=&city=0&yys=0&port=1&time=1&ts=0&ys=0&cs=0&lb=1&sb=0&pb=4&mr=1&regions=')

        if(_proxy.data.code === 0) {
          proxy = {
            host: _proxy.data.data[0].ip,
            port: _proxy.data.data[0].port
          }
          console.log('切换ip成功, host:'+proxy.host+';-port:'+proxy.port)
        }
        return await getComments(url)
      }
    }
  }


