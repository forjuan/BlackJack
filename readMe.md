1.请先安装node,在cmd中，在文件根目录下输入命令：
npm install
用于安装依赖项

在命令行中 进入储存的根目录，输入node server.js,启用服务器，
在public/player.js中请填写本机Ip地址，端口号3000，
再在浏览器中访问。


2.所用技术
    a.用html5、css3实现页面静态文件资源。
    b.使用原生JavaScript处理客户端信息
    c.socket.io+node.js实现实时信息交互（socket.io封装了flash等处理实时通信的方法，解决了websockts在其他浏览器上不能使用的情况）

3.游戏设计思路

    客户端 处理

    游戏界面
    play游戏，
    选择角色（player|dealer）
   
    游戏开始

    Gamer:游戏者的基本共有属性、方法
    dealer:可以hit,stand,为庄家发牌
    player:可以hit,stand,如果dealer 的明牌是A ,player 可买保险，如果不买，则退回到hit,stand。
    
    计算赌金

    server端 处理

    判断游戏的输赢
    传递信息、双方的牌、赌金。


4.如果有问题请联系我，罗娟 18602338348  qq:1044110682 微信：njlclj123456




