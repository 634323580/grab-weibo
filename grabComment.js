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
      for(let i=0;i<list.length;i++){
        // 将数据插入数据库
        await connection.query('insert into comments set ?', {
          mid: mid,
          comment_id: list[i].comment_id,
          avator: list[i].avator,
          name: list[i].name,
          content: list[i].content
        })
/*         if(list[i].childCommentActionData) {
          console.log('正在抓取评论回复')
          await getCommentsReply(list[i].childCommentActionData, mid , list[i].comment_id)
        } */
        length++
      }
      console.log('已抓取' + length + '条评论')
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
  function analysisHtml(html, reply = false){
    let list = []
    // 当前页的一级评论
    let commentDom = !reply ? $(html).children('.list_ul').children('.list_li.S_line1') : $(`<div class="list_ul">${html}</div>`).children('.list_li.S_line1')
    // 获取下一页评论需要的参数
    let actionData
    if(!reply) {
      actionData = $(html).find('div[node-type="comment_loading"]').attr('action-data') || $(html).find('a[action-type="click_more_comment"]').attr('action-data')
    } else {
      actionData = $(html).find('div[node-type="more_child_comment"] a[action-type="click_more_child_comment_big"]').attr('action-data')
    }
    let childCommentActionData
    commentDom.each(async (index, commentItem) => {
      commentItem = $(commentItem)
      // 子回复 action-data
      childCommentActionData = commentItem.find('div[node-type="more_child_comment"] a[action-type="click_more_child_comment_big"]').attr('action-data')
      // 评论内容
      let content = $.load(commentItem.find('.list_con>.WB_text').html() || '', {
        decodeEntities: false
      })
      // 删除a标签
      // content('body a').remove()
      // content = content('body').html().trim().substr(1)
      content = content('body').html().replace(/<[^>]+>/g,"").trim()
      list.push({
        comment_id: commentItem.attr('comment_id'),
        avator: commentItem.find('.WB_face').find('img').attr('src'),
        name: commentItem.find('.list_con>.WB_text>a').eq(0).text(),
        content,
        childCommentActionData
      })
    })
    return {
      actionData,
      list
    }
  }
  /**
   * @description 获取评论回复
   * @param params 接口参数
   */
  async function getCommentsReply(params, mid, rootId) {
    let url = 'https://weibo.com/aj/v6/comment/big?ajwvr=6&'+params+'&from=singleWeiBo&__rnd='+Date.now()
    let html = await getComments(url)
    let {actionData, list} = analysisHtml(html, true)
    for(let i=0;i<list.length;i++) {
      // 将数据插入数据库
      await connection.query('insert into reply set ?', {
        mid: mid,
        root_id: rootId,
        comment_id: list[i].comment_id,
        name: list[i].name,
        content: list[i].content
      })
    }
    if(actionData) {
      await getCommentsReply(actionData, mid, rootId)
    }
  }
  /**
   * @description 获取评论，自动切换代理
   * @param url 接口地址
   */
  async function getComments(url) {
    let _option = {
      headers: {
        Cookie: 'Ugrow-G0=169004153682ef91866609488943c77f; login_sid_t=ef8f45b3cd78ef67c5364936b08566d7; cross_origin_proto=SSL; YF-V5-G0=b59b0905807453afddda0b34765f9151; WBStorage=201903151105|undefined; _s_tentry=passport.weibo.com; wb_view_log=1920*10801; Apache=2071306759622.107.1552619137061; SINAGLOBAL=2071306759622.107.1552619137061; ULV=1552619137073:1:1:1:2071306759622.107.1552619137061:; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WF4I43carcJRI5MKE2C1Hu45JpX5K2hUgL.Foep1heEeh-fShB2dJLoIEqLxKnLBoMLB-qLxK-L1-eLBKnLxKnL1hBL1-2LxKBLBonL12zEentt; ALF=1584155143; SSOLoginState=1552619144; SCF=AuzIs4FYcWkD0hHgQzpW3rRuUykTtYp0w-F0vpPkeUTwUIpnfr8x1aVyh-WOFmH_KE4-5IdLk3DRvZnwvcv6ibI.; SUB=_2A25xj2bYDeRhGeVP41ET8CvJzziIHXVS_d8QrDV8PUNbmtBeLXTSkW9NTMLHgpYpqIdyWbMxb3P6N1hA1Rd3FLj-; SUHB=0WGc3EWk-Uoqvz; un=18320326435; wvr=6'
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