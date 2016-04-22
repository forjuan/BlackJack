/*
 * Created by �޾� on 2016/4/9.
 */
var socketio = require('socket.io');
var io;
var room = "BlackJack";
var roomers = [];//ͬ�䷿�����
var guestNumber = 0;//��ǰ������
var nickNames = {};//���ӵ�����
var namesUsed = [];//�Ѿ�ʹ�õ�����
var roleused = [];//��ɫ
var arrRole = {};//���н�ɫ
var start = false;
var firststart = false;
var dPoker =[],pPoker = [];
var dsum = 0;//dealer������stand�Ƚ�ʱ����
var psum = 0;//plaer������stand�Ƚ�ʱ����
var pbet = 0;//player����Ľ�
exports.listen = function (server){
    io = socketio.listen(server);
    io.set('log level',1);
    //�����¼�
    io.sockets.on('connection',function (socket){
        //���û���������������һ��������
        guestNumber = assignGuestName(socket,guestNumber,nickNames,namesUsed);
        //���û����뵽��Ϸ����
        joinRoom(socket,room);

        //�û������ʼ
        socket.on('start',function(data) {
            if(data.bet){
                pbet = data.bet;
            }
            if (roomers.indexOf(socket.id) >= 0) {
                arrRole[socket.id] = data;
            }
            if (arrRole[roomers[0]] && arrRole[roomers[1]]) {//������ɫ����
                if (arrRole[roomers[0]] !== arrRole[roomers[1]]) {
                    start = true;
                    //�㲥֪ͨ���Կ�ʼ
                    socket.broadcast.to(room).emit('start', {playerBet:pbet});
                    socket.emit("canstart", {playerBet:pbet});
                } else {
                    socket.emit('start', false);//����û��start
                }
            }else{
                socket.emit('start', false);//����û��start
            }
        });

        /*��ҶĽ�*/
        socket.on("BuyBet",function(data){
            pbet = data;
            socket.broadcast.to(room).emit("updateBet",pbet);
        });

        //��¼�Ƶ�����
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
        /*����*/
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

        /*�����blackJack*/
        socket.on("playerBJack",function(data){
            pPoker = data;
            var newarr = dPoker.filter(function(item,index,array){
                return Math.ceil(item/4) == 10;
            });
            if(dsum == 21 && newarr.length>0){//ׯ���кڽܿ�,

                socket.emit("blackJack",{hasBjack:true,winner:"push",dealer:dsum,player:psum,pokers:dPoker});
                socket.broadcast.to(room).emit("blackJack",{hasBjack:true,winner:"push",dealer:dsum,player:psum,pokers:pPoker});
            }else {//ׯ��û�� ,���
                socket.emit("blackJack",{hasBjack:false,winner:"player",dealer:dsum,player:psum,pokers:dPoker});
                socket.broadcast.to(room).emit("blackJack",{hasBjack:false,winner:"player",dealer:dsum,player:psum,pokers:pPoker});
            }
        });

        /*������˱���*/
        socket.on("BlackJack",function(data){
            pbet = data.bet;
            if(dsum==21&& dPoker.indexOf(10)>-1){//ׯ���Ǻڽܿ�
                socket.emit("BJackReasult",{winner:"player",player:psum,dealer:dsum,pokers:dPoker,playerBet:pbet });
                socket.broadcast.to(room).emit("BJackReasult",{winner:"player",player:psum,dealer:dsum,pokers:pPoker,playerBet:pbet});
            }else{
                socket.emit("BJackReasult",{winner:"dealer",pokers:dPoker,player:psum,dealer:dsum,playerBet:pbet});
                socket.broadcast.to(room).emit("BJackReasult",{winner:"dealer",pokers:pPoker,player:psum,dealer:dsum,playerBet:pbet});
            }

        });

        //���Ҫ��
        socket.on('deal',function(data){
            if(data.player){
                socket.broadcast.to(room).emit("askPoker","player");
            }
        });

        //��Ҳ�Ҫ�ƣ�
        socket.on('stand',function(data){
            psum = data.sum;
            socket.broadcast.to(room).emit('playerStand',true);
        });

        /*ׯ��Ϊ��ҷ�����*/
        socket.on("canDeal",function(data){
            if(data) {
                socket.broadcast.to(room).emit("playergetPoker", true);
            }
        });

        /*ׯ�Ҳ�Ҫ����,�ж���Ӯ*/
        socket.on("dealerStand",function(data){
            /*���������ж���Ӯ*/
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
                    //push  ��ƽ
                    socket.emit("standResultown",{winner:"push",player:psum,dealer: dsum,pokers:pPoker});
                    socket.broadcast.to(room).emit("standResult",{winner:"push",player:psum,dealer: dsum,pokers:dPoker});
                }
            }
        });

        /*�û��Ͽ����ӣ������¼*/
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

//�����û��ǳ�
function assignGuestName(socket,guestNumber,nickNames,namesUsed){
    var name = 'Guest' + guestNumber;//�������ǳ�
    nickNames[socket.id] = name;//�û��ǳƸ��ͻ�������ID����
    namesUsed.push(name);
    //�������������ǳƵļ�����
    return guestNumber+1;
}

//������Ϸ���������������϶�ս�����ܼ���,�����ѡ���ɫ
function joinRoom(socket,room){
    socket.on('join',function(data){
        var roomerLen = roomers.length;//�����������
        if(roomerLen<2){
            roomers.push(socket.id);
            socket.join(room);//���û����뷿��
            socket.emit("canjoin",{ownId:socket.id,room:room});
            socket.broadcast.emit('addvensaryId',socket.id);
        }else{
            socket.emit('notjoin',{message:false});
        }
    });

    //����ѡ���ɫ�¼�
    socket.on('sendRole',function(data){//�û�ѡ��Ľ�ɫ�Ƿ����,data �ǽ�ɫ����
        var id = socket.id;
        var len = roleused.length;
        if(len >=2 ){
            socket.emit('chooseRole',{role:"null",num:2});//���͸��ͻ��ˣ��������˶�ս,
        }else if(len === 1){
            if(data !== roleused[0]["role"]){
                var dataId ={};
                dataId["role"] = data;
                dataId['id'] = id;
                roleused.push(dataId);
                socket.emit('chooseRole',{role:data,num:0});//���͸��ͻ��ˣ�����ѡ��ý�ɫ
            }else if(data === roleused[0]["role"]){
                socket.emit('chooseRole',{role:"null",num:1});//���͸��ͻ��ˣ�������ѡ��Ľ�ɫ
            }
        }else {
            var dataId ={};
            dataId["role"] = data;
            dataId['id'] = id;
            roleused.push(dataId);
            socket.emit('chooseRole',{role:data,num:0});//���͸��ͻ��ˣ�����ѡ��ý�ɫ
        }
    });

}