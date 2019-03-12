const mysql = require('mysql2');

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

var usr={mid:'123',name:'pwdzhangsan',avator:'zhangsan@gmail.com',content:'zhangsan@gmail.com',piclist:'zhangsan@gmail.com'};
connection.query('insert into list set ?', usr, function(err, result) {
    if (err) throw err;

    console.log('成功');
    console.log(result);
    console.log('\n');
});