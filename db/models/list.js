var mongoose = require('mongoose');
let listSchema = new mongoose.Schema({
  mid: String,
  name: String,
  avator: String,
  content: String,
  piclist: String
})
module.exports = mongoose.model('list', listSchema)