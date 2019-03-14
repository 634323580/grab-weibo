const axios = require('axios-https-proxy-fix'),
  $ = require('cheerio'),
  mysql = require('mysql2/promise');


(async () => {
  // 创建数据库连接
  const connection = await mysql.createConnection({
    host: '192.168.31.223',
    port: '6610',
    user: 'qph_b2c',
    password: 'zhaoyl(1181*%P)',
    database: 'zhipeng',
    charset: 'utf8',
  });
  // 设置代理ip
  let proxy = {
    host: '',
    port: '',
  }
  let length = 0
  const [rows, fields] = await connection.execute('select * from list');
  // 抓取的微博数据
  grabKeyData = rows;
  for (let i = 0; i < grabKeyData.length; i++) {
    await start(grabKeyData[i].mid)
    console.log('当前进度' + ((i + 1 ) / grabKeyData.length * 100).toFixed(2) + '%')
  }
  connection.end();
  /**
   * @description 开始抓取
   * @param uid 微博id
   */
  async function start(mid) {
    let url = 'https://weibo.com/aj/v6/comment/big?ajwvr=6&id=' + mid + '&from=singleWeiBo&__rnd=1551851364327'
    async function cb(url) {
      // 抓取评论
      let _html = await getComments(url)
      let {actionData, list} = analysisHtml(_html)
      list.forEach(async item => {
        // 将数据插入数据库
        await connection.query('insert into comments set ?', {
          mid: mid,
          comment_id: item.comment_id,
          avator: item.avator,
          name: item.name,
          content: item.content
        })
        length++
      })
      console.log('已插入' + length + '条数据')
      if (actionData) {
        await cb('https://weibo.com/aj/v6/comment/big?ajwvr=6&' + actionData + '&from=singleWeiBo&__rnd=1551851364327')
      }
    }
    await cb(url)
  }
  /**
   * @description 解析html
   * @param html html字符串
   * @return {String} actionData=>获取下一页所需参数，如果为空则没有下一页
   * @return {Array} list=>评论数据
   */
  function analysisHtml(html){
    let list = []
    // 当前页的一级评论
    let commentDom = $(html).children('.list_ul').children('.list_li.S_line1')
    // 获取下一页评论需要的参数
    let actionData = $(html).find('div[node-type="comment_loading"]').attr('action-data') || $(html).find('a[action-type="click_more_comment"]').attr('action-data')
    commentDom.each(async (index, commentItem) => {
      commentItem = $(commentItem)
      // 评论内容
      let content = $.load(commentItem.find('.list_con>.WB_text').html(), {
        decodeEntities: false
      })
      // 删除a标签
      content('body a').remove()
      content = content('body').html().trim()
      list.push({
        comment_id: commentDom.attr('comment_id'),
        avator: commentItem.find('.WB_face').find('img').attr('src'),
        name: commentItem.find('.list_con>.WB_text>a').eq(0).text(),
        content: content.substr(1)
      })
    })
    return {
      actionData,
      list
    }
  }
  /**
   * @description 获取评论，自动切换代理
   * @param url 接口地址
   */
  async function getComments(url) {
    let _option = {
      headers: {
        Cookie: 'Ugrow-G0=9642b0b34b4c0d569ed7a372f8823a8e; login_sid_t=43ae95196399c13bdcee8acb979a8186; cross_origin_proto=SSL; YF-V5-G0=9717632f62066ddd544bf04f733ad50a; WBStorage=39aa940fb6ef309a|undefined; _s_tentry=passport.weibo.com; wb_view_log=1920*10801; Apache=8956404726944.105.1552529497257; SINAGLOBAL=8956404726944.105.1552529497257; ULV=1552529497271:1:1:1:8956404726944.105.1552529497257:; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WF4I43carcJRI5MKE2C1Hu45JpX5K2hUgL.Foep1heEeh-fShB2dJLoIEqLxKnLBoMLB-qLxK-L1-eLBKnLxKnL1hBL1-2LxKBLBonL12zEentt; SSOLoginState=1552529505; ALF=1584065571; SCF=Asn_RkWnRnTkS95UEL78CR-Zogi1iLt_gUNJLPlnd1J6oSi1Bq75aoUhqWq4wLE7EpV_NPch0eaQOZCqsT1lFQs.; SUB=_2A25xjcgsDeRhGeVP41ET8CvJzziIHXVS-r7krDV8PUNbmtBeLXHCkW9NTMLHgkdErknRtkNhleOikTfuGo0C9xb0; SUHB=02MvVc-iLM6pO6; un=18320326435; wvr=6; YF-Page-G0=c704b1074605efc315869695a91e5996; wb_view_log_3183205544=1920*10801; webim_unReadCount=%7B%22time%22%3A1552529555784%2C%22dm_pub_total%22%3A5%2C%22chat_group_pc%22%3A0%2C%22allcountNum%22%3A40%2C%22msgbox%22%3A0%7D'
      },
      // 设置超时
      timeout: 30000
    }
    // 是否设置了代理
    if (proxy.host) {
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

      if (_proxy.data.code === 0) {
        proxy = {
          host: _proxy.data.data[0].ip,
          port: _proxy.data.data[0].port
        }
        console.log('切换ip成功, host:' + proxy.host + ';-port:' + proxy.port)
      }
      return await getComments(url)
    }
  }
})()