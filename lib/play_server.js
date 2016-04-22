/*
 * Created by 罗娟 on 2016/4/9.
 */
var socketio = require('socket.io');
var io;
var room = "BlackJack";
var roomers = [];//同间房间的人
var guestNumber = 0;//当前连接数
var nickNames = {};//连接的名字
var namesUsed = [];//已经使用的名字
var roleused = [];//角色
var arrRole = {};//已有角色
var start = false;
var firststart = false;
var dPoker =[],pPoker = [];
var dsum = 0;//dealer点数，stand比较时更新
var psum = 0;//plaer点数，stand比较时更新
var pbet = 0;//player购买赌金
exports.listen = function (server){
    io = socketio.listen(server);
    io.set('log level',1);
    //连接事件
    io.sockets.on('connection',function (socket){
        //在用户连接上来赋予其一个访问名
        guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);
        //让用户加入到游戏房间
        joinRoom(socket,room);

        //用户点击开始
        socket.on('start',function(data) {
            if(data.bet){
                pbet = data.bet;
            }
            if (roomers.indexOf(socket.id) >= 0) {
                arrRole[socket.id] = data;
            }
            if (arrRole[roomers[0]] && arrRole[roomers[1]]) {//两个角色都有
                if (arrRole[roomers[0]] !== arrRole[roomers[1]]) {
                    start = true;
                    //广播通知可以开始
                    socket.broadcast.to(room).emit('start', {playerBet:pbet});
                    socket.emit("canstart", {playerBet:pbet});
                } else {
                    socket.emit('start', false);//有人没按start
                }
            }else{
                socket.emit('start', false);//有人没按start
            }
        });

        /*玩家赌金*/
        socket.on("BuyBet",function(data){
            pbet = data;
            socket.broadcast.to(room).emit("updateBet",pbet);
        });

        //记录牌的数据
        socket.on("PlayerPoker",function(data){
            pPoker = data.concat();
            psum = data.sum;
            socket.broadcast.emit("addvenPoker",{pokers:pPoker,sum:psum});
        });
        socket.on("DealerPoker",function(data){
            dPoker = data.pokers.concat();
            dsum = data.sum;
            socket.broadcast.emit("addvenPoker",{pokers:dPoker,sum:dsum});
        });
        /*爆掉*/
        socket.on("bust",function(data){
            if(data.dealer === 'bust'){
                dsum = data.sum;
                socket.emit("standResultown",{winner:"player",player:psum,dealer: dsum,pokers:pPoker});
                socket.broadcast.to(room).emit("standResult",{winner:"player",player:psum,dealer:dsum,pokers:dPoker});
            }else if(data.player === 'bust'){
                psum = data.sum;
                socket.emit("standResultown",{winner:"dealer",player:psum,dealer: dsum,pokers:dPoker});
                socket.broadcast.to(room).emit("standResult",{winner:"dealer",player:psum,dealer:dsum,pokers:pPoker});
            }
        });

        /*玩家有blackJack*/
        socket.on("playerBJack",function(data){
            pPoker = data;
            var newarr = dPoker.filter(function(item,index,array){
                return Math.ceil(item/4) == 10;
            });
            if(dsum == 21 && newarr.length>0){//庄家有黑杰克,

                socket.emit("blackJack",{hasBjack:true,winner:"push",dealer:dsum,player:psum,pokers:dPoker});
                socket.broadcast.to(room).emit("blackJack",{hasBjack:true,winner:"push",dealer:dsum,player:psum,pokers:pPoker});
            }else {//庄家没有 ,输掉
                socket.emit("blackJack",{hasBjack:false,winner:"player",dealer:dsum,player:psum,pokers:dPoker});
                socket.broadcast.to(room).emit("blackJack",{hasBjack:false,winner:"player",dealer:dsum,player:psum,pokers:pPoker});
            }
        });

        /*玩家买了保险*/
        socket.on("BlackJack",function(data){
            pbet = data.bet;
            if(dsum==21&& dPoker.indexOf(10)>-1){//庄家是黑杰克
                socket.emit("BJackReasult",{winner:"player",player:psum,dealer:dsum,pokers:dPoker,playerBet:pbet });
                socket.broadcast.to(room).emit("BJackReasult",{winner:"player",player:psum,dealer:dsum,pokers:pPoker,playerBet:pbet});
            }else{
                socket.emit("BJackReasult",{winner:"dealer",pokers:dPoker,player:psum,dealer:dsum,playerBet:pbet});
                socket.broadcast.to(room).emit("BJackReasult",{winner:"dealer",pokers:pPoker,player:psum,dealer:dsum,playerBet:pbet});
            }

        });

        //玩家要牌
        socket.on('deal',function(data){
            if(data.player){
                socket.broadcast.to(room).emit("askPoker","player");
            }
        });

        //玩家不要牌！
        socket.on('stand',function(data){
            psum = data.sum;
            socket.broadcast.to(room).emit('playerStand',true);
        });

        /*庄家为玩家发牌了*/
        socket.on("canDeal",function(data){
            if(data) {
                socket.broadcast.to(room).emit("playergetPoker", true);
            }
        });

        /*庄家不要牌了,判断输赢*/
        socket.on("dealerStand",function(data){
            /*服务器端判断输赢*/
            dsum = data.sum;
            if(data.role==='dealer'){
                if(psum >dsum){
                    //    player wins
                    socket.emit("standResultown",{winner:"player",player:psum,dealer: dsum,pokers:pPoker});
                    socket.broadcast.to(room).emit("standResult",{winner:"player",player:psum,dealer: dsum,pokers:dPoker});
                }else if(psum< dsum){
                    //dealer wins
                    socket.emit("standResultown",{winner:"dealer",player:psum,dealer: dsum,pokers:pPoker});
                    socket.broadcast.to(room).emit("standResult",{winner:"dealer",player:psum,dealer: dsum,pokers:dPoker});
                }else {
                    //push  打平
                    socket.emit("standResultown",{winner:"push",player:psum,dealer: dsum,pokers:pPoker});
                    socket.broadcast.to(room).emit("standResult",{winner:"push",player:psum,dealer: dsum,pokers:dPoker});
                }
            }
        });

        /*用户断开连接，清除记录*/
        socket.on('disconnect',function(data){
            socket.broadcast.to(room).emit('userleft',{user:socket.id})//user left,game over
            /*if any player left ,rooms is null */
            var index = roomers.indexOf(socket.id) ;
            if(index>=0){
                guestNumber = 0;
                nickNames = {};
                namesUsed = [];
                roleused = [];
                arrRole = {};
                start = false;
                firststart = false;
                dPoker =[];
                pPoker = [];
                roomers =[];
            };
        });
    });

}

//分配用户昵称
function assignGuestName(socket,guestNumber,nickNames,namesUsed){
    var name = 'Guest' + guestNumber;//生成新昵称
    nickNames[socket.id] = name;//用户昵称跟客户端连接ID关联
    namesUsed.push(name);
    //增加用来生成昵称的计数器
    return guestNumber+1;
}

//加入游戏，若有两个人以上对战，不能加入,加入后选择角色
function joinRoom(socket,room){
    socket.on('join',function(data){
        var roomerLen = roomers.length;//房间里的人数
        if(roomerLen<2){
            roomers.push(socket.id);
            socket.join(room);//让用户进入房间
            socket.emit("canjoin",{ownId:socket.id,room:room});
            socket.broadcast.emit('addvensaryId',socket.id);
        }else{
            socket.emit('notjoin',{message:false});
        }
    });

    //监听选择角色事件
    socket.on('sendRole',function(data){//用户选择的角色是否可用,data 是角色名字
        var id = socket.id;
        var len = roleused.length;
        if(len >=2 ){
            socket.emit('chooseRole',{role:"null",num:2});//发送给客户端，已有两人对战,
        }else if(len === 1){
            if(data !== roleused[0]["role"]){
                var dataId ={};
                dataId["role"] = data;
                dataId['id'] = id;
                roleused.push(dataId);
                socket.emit('chooseRole',{role:data,num:0});//发送给客户端，可以选择该角色
            }else if(data === roleused[0]["role"]){
                socket.emit('chooseRole',{role:"null",num:1});//发送给客户端，已有人选择的角色
            }
        }else {
            var dataId ={};
            dataId["role"] = data;
            dataId['id'] = id;
            roleused.push(dataId);
            socket.emit('chooseRole',{role:data,num:0});//发送给客户端，可以选择该角色
        }
    });

}