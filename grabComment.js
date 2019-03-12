const fs = require('fs'), //文件模块
  path = require('path'), //系统路径模块
  qs = require('querystringify'),
  puppeteer = require('puppeteer'),
  axios = require('axios-https-proxy-fix'),
  $ = require('cheerio'),
  mongoose = require('mongoose'),
  dbConfig = require('./db/config'),
  commentsModels = require('./db/models/comments');

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
    // 抓取的微博数据
    grabKeyData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data/grabKeyList.json'), 'utf8'));
    // 上次保存长度
    let lastSaveLength = 0
    // 评论列表
    let commentsList = []

    for(let i=0; i<grabKeyData.length; i++) {
      await start(grabKeyData[i].mid)
      console.log('当前进度' + (i+1 / grabKeyData.length * 100).toFixed(2) + '%')
    }
    let tips = await saveFile(commentsList, 'data/grabCommentsList.json')
    console.log('全部抓完了')
    console.log(tips);
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
          //  添加
          commentsList.push({
            mid: mid,
            avator: _avator,
            name: _name,
            content: _content
          })

          // 将数据插入数据库
          const db = new commentsModels({
            mid: mid,
            avator: _avator,
            name: _name,
            content: _content
          })
          await db.save()
        })
        console.log('已抓取' + commentsList.length + '条')
        // 每抓100条保存一下
        if((commentsList.length - lastSaveLength) >= 100) {
          let _tips = await saveFile(commentsList, 'data/grabCommentsList.json')
          console.log(_tips);
          lastSaveLength = commentsList.length
        }
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
          Cookie: 'Ugrow-G0=5b31332af1361e117ff29bb32e4d8439; login_sid_t=e0fbd7e0d2c3bd37cf34e72b098d11c6; cross_origin_proto=SSL; YF-V5-G0=b8115b96b42d4782ab3a2201c5eba25d; WBStorage=39aa940fb6ef309a|undefined; _s_tentry=passport.weibo.com; wb_view_log=1920*10801; Apache=9491144929457.854.1552276347002; SINAGLOBAL=9491144929457.854.1552276347002; ULV=1552276347009:1:1:1:9491144929457.854.1552276347002:; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WF4I43carcJRI5MKE2C1Hu45JpX5K2hUgL.Foep1heEeh-fShB2dJLoIEqLxKnLBoMLB-qLxK-L1-eLBKnLxKnL1hBL1-2LxKBLBonL12zEentt; SSOLoginState=1552276357; ALF=1583812371; SCF=AkJq-dSc7LTnenu6grVS99Di_EU1kpjiypI1_xLHeMS_77JEVJtiZ-HnvJy-RdOsoqn5Y68CWq4NmJY7-7w-1ak.; SUB=_2A25xgavEDeRhGeVP41ET8CvJzziIHXVS9poMrDV8PUNbmtBeLW_CkW9NTMLHggJXvKb0NZgClmqLENMWYdMHBhEw; SUHB=0sqBPo7LWLkU2p; un=18320326435; wvr=6; YF-Page-G0=ae24d9a5389d566d388790f1c25a266b; wb_view_log_3183205544=1920*10801; webim_unReadCount=%7B%22time%22%3A1552276368725%2C%22dm_pub_total%22%3A5%2C%22chat_group_pc%22%3A0%2C%22allcountNum%22%3A25%2C%22msgbox%22%3A0%7D'
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
      /**
     * @description 保存文件
     * @param data 内容， json数组
     * @param paths 路径
     */
    function saveFile(data, paths) {
      return new Promise((resolve, reject) => {
        console.log('一共保存' + data.length + '条')
        let content = JSON.stringify(data);
        //指定创建目录及文件名称，__dirname为执行当前js文件的目录
        let file = path.join(__dirname, paths);

        //写入文件
        fs.writeFile(file, content, function(err) {
            if (err) {
              reject(err)
            }
            resolve('文件创建成功，地址：' + file)
        });
      })

    }
  }


