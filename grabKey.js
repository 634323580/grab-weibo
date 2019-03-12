const fs = require('fs'), //文件模块
  path = require('path'), //系统路径模块
  qs = require('querystringify'),
  puppeteer = require('puppeteer'),
  mysql = require('mysql2');

  // 创建数据库连接
  const connection = mysql.createConnection({
    host: '192.168.31.223',
    port: '6610',
    user: 'qph_b2c',
    password:'zhaoyl(1181*%P)',
    database: 'zhipeng',
    charset:'utf8',
  });
  connection.connect();

(async function(){
  /**
   * @description 创建新页面
   * @param url 页面地址
   */
  async function newPage(url) {
    const page = (await browser.pages())[0];
    await page.setViewport({
        width:1360,
        height:768
    })
    await page.goto(url, {
        timeout: 0
    });
    await page.addScriptTag({
        url: "https://cdn.bootcss.com/jquery/3.3.1/jquery.min.js"
    });
    return page
  }
  /**
   * @description 模拟登录
   * @param user 账号
   * @param password 密码
   */
  async function automaticLogin(user, password) {
    console.log('开始登陆..')
    let login = await newPage('https://www.weibo.com')
    // 等待浏览器加载完毕
    await login.waitForNavigation({
        waitUntil: ["load"],
        timeout: 0
    });

    // 模拟输入用户名
    await login.waitForSelector("#loginname");
    await login.focus("#loginname");
    await login.keyboard.type(user, {
        delay: 10
    });

    // 模拟输入密码
    console.log("输入密码...");
    // 等待浏览器中出现元素`input[name=password]`
    await login.waitForSelector("input[name=password]");
    // 鼠标聚焦元素`input[name=password]`
    await login.focus("input[name=password]");
    // 键盘输入密码，每次按键间隔10ms
    await login.keyboard.type(password, {
        delay: 10
    });
    // 模拟点击登录
    console.log("登录中...");
    await login.click("a[action-type=btn_submit]", {
        delay: 500
    });
    await login.waitForNavigation({
        waitUntil: ["load"],
        timeout: 0
    });
    console.log("登录成功\n\n");
  }

  /**
   * @description 通过搜索抓取关键字微博
   * @param keyword 关键字
   */
  async function geabKey(keyword) {
    let page = await newPage("https://s.weibo.com/weibo?q="+keyword+"&Refer=index"),
    // 总页数
    totalPage,
    // 当前页数
    currentPage = 1
    // 获取总页数
    totalPage = await page.evaluate(() => {
        return new Promise(resolve => {
          resolve($('.s-scroll>li:last-child>a').attr('href').split('?')[1])
        })
    });
    totalPage = qs.parse(totalPage).page
    let start = async function() {
      console.log('正在抓取第'+currentPage+'页')
      let pageList = await page.evaluate(async () => {
        let _list = $('#pl_feedlist_index .card-wrap')
        let _keyList = []
        _list.each((index, item) => {
          // 去除转发的微博
          $(item).find('.card-comment').length && $(item).find('.card-comment').remove()
          let _content = $(item).find('p[node-type="feed_list_content_full"]').length?$(item).find('p[node-type="feed_list_content_full"]'):$(item).find('p[node-type="feed_list_content"]')
          _content.find('a').length && _content.find('a').remove()
          _content = String(_content.html()).replace(/<(?!img).*?>/g, '').trim()
          let _picList = []
          let _picListDom = $(item).find('.media-piclist li')
          _picListDom.each((index, item) => {
            _picList.push($(item).find('img').attr('src'))
          })
          // 存在此元素，判断为微博
          if($(item).find('.card-act').find('a[action-type=feed_list_comment]')[0]) {
            _keyList.push({
              mid: $(item).attr('mid'),
              // 用户名
              name: $(item).find('.card-feed a.name').text(),
              // 头像
              avator: $(item).find('.avator').find('img').attr('src'),
              // 内容, 存在查看全文则取查看全文后的内容
              content: _content,
              // 图片
              piclist: _picList.join(','),
            })
          }
        })
        return new Promise(resolve => {
          resolve(_keyList)
        })
      })
      //把对象的转成纯数组
      let values = [];
      pageList.forEach(function(n, i){
          var _arr = [];
          for(var m in n){
              _arr.push(n[m]);
          }
          values.push(_arr);
      })
      // 保存
      connection.query('INSERT INTO list(`mid`,`name`,`avator`,`content`,`piclist`) VALUES ?', [values], function(err, result) {
          if (err) throw err;
          console.log('插入'+pageList.length+'条数据')
      });
      currentPage++
      if(currentPage <= totalPage) {
        // 跳转到下一页
        await page.goto("https://s.weibo.com/weibo?q="+keyword+"&Refer=index&page="+currentPage , {
          timeout: 0
        });
        // 插入jq
        await page.addScriptTag({
          url: "https://cdn.bootcss.com/jquery/3.3.1/jquery.min.js"
        });
        // 再次抓取
        await start(keyword)
      }
    }
    await start()
  }

  const browser = await puppeteer.launch({
    devtools: true,
    // 关闭headless模式, 不会打开浏览器
    headless: true
  });
  // 自动登录
  await automaticLogin('18320326435', 'KOFOX520')
  // 开始抓取关键字微博
  await geabKey('面膜')

  browser.close()
  connection.end();
})()