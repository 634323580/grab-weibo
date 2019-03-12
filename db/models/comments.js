var mongoose = require('mongoose');
let commentschema = new mongoose.Schema({
  mid: String,
  avator: String,
  name: String,
  content: String
})
module.exports = mongoose.model('comments', commentschema)