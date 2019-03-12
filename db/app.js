// const mongoose = require('mongoose');
// const dbConfig = require('./config')
// const weibo = require('./models/list')
// mongoose.connect(dbConfig.dbs, {
//   useNewUrlParser: true
// })

// // 增
// // add()
// async function add (){
//   const db = new weibo({
//     name: '陈智鹏',
//     age: 23,
//   })
//   await db.save()
//   console.log('成功')
// }

// // 查
// // read()
// async function read() {
//   const result = await weibo.find({
//     name: '陈智鹏'
//   })
//   console.log(typeof result)
// }

// // 改
// // change()
// async function change() {
//   const result = await weibo.where({
//     name: '陈智鹏'
//   }).updateMany({
//     age: 666
//   })
// }

// // 删
// remove()
// async function remove(){
//   const result = await weibo.where({
//     name: '陈智鹏'
//   }).deleteMany()
// }