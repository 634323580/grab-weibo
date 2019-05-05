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
    if(!grabKeyData[i].grasp_comments) {
      await start(grabKeyData[i].mid)
      let modsql = 'UPDATE list SET grasp_comments = ? WHERE mid = ?'
      let modsqlparams = [true, grabKeyData[i].mid]
      await connection.query(modsql, modsqlparams)
      console.log('抓完一条')
    }
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
        Cookie: '_s_tentry=news.ifeng.com; UOR=news.ifeng.com,widget.weibo.com,news.ifeng.com; Ugrow-G0=5b31332af1361e117ff29bb32e4d8439; login_sid_t=20bb28051abf07c3b1af70911a2e3b2a; cross_origin_proto=SSL; YF-V5-G0=59104684d5296c124160a1b451efa4ac; wb_view_log=1920*10801; Apache=2942262446527.437.1553068659282; SINAGLOBAL=2942262446527.437.1553068659282; ULV=1553068659294:1:1:1:2942262446527.437.1553068659282:; SCF=Av2RP4wuuFMYeOPxqBP_GZ07Z2yOLQOFImcx7IncVRofvISqD-bFu6bs6acG88AojqIAuZYO8tI06DDA0y9E0WY.; SUB=_2A25xlYoYDeRhGeVP41ET8CvJzziIHXVS4vzQrDV8PUNbmtBeLW_fkW9NTMLHgk30p3ERx1miQDuhD53eiM9m-NNV; SUBP=0033WrSXqPxfM725Ws9jqgMF55529P9D9WF4I43carcJRI5MKE2C1Hu45JpX5K2hUgL.Foep1heEeh-fShB2dJLoIEqLxKnLBoMLB-qLxK-L1-eLBKnLxKnL1hBL1-2LxKBLBonL12zEentt; SUHB=0qj0AQEVS93o4q; ALF=1553675464; SSOLoginState=1553070664; wb_view_log_3183205544=1920*10801; wvr=6; YF-Page-G0=19f6802eb103b391998cb31325aed3bc|1553071480|1553071480; webim_unReadCount=%7B%22time%22%3A1553071482755%2C%22dm_pub_total%22%3A5%2C%22chat_group_pc%22%3A0%2C%22allcountNum%22%3A44%2C%22msgbox%22%3A0%7D'
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
      // return new Promise(resolve => {
      //   resolve(_res.data.data.html)
      // })
      return _res.data.data.html
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