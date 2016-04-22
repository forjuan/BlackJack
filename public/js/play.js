/*
* Created by 罗娟 on 2016/4/8.
 */
var socket = io.connect("http://localhost:3000/");//创建socket连接，ip地址根据自己的电脑服务器的
var startState=false;
var dealer = null;
var player = null;
var callDeal = false;//庄家能发发牌
var addVensary;//记录对方的Id

/*开始画面*/
var container = document.getElementsByClassName("container")[0];
var oCan = document.getElementById('begin');
var oCont = oCan.getContext("2d");
var buttons = [{/*play和help*/
    width:0,
    height:0,
    x:0,
    y:0,
    message:'play'
},{width:0,
    height:0,
    x:0,
    y:0,
    message:'help'
}];


/*加载完成*/
window.onload = function (){
    if(!localStorage.getItem('coin')){
        localStorage.setItem('coin',5000);
    }
    music();
    beginPaint();
    receive();
}

function beginUI(){
    var title = "Blackjack";
    setButton(buttons,200,50,200);
    oCont.font = "60px serif";
    showText(title,100);
    showButton(buttons);
}

/*居中的位置X*/
function centerWidth(canvas,conWidth){
    return (canvas.width-conWidth)/2;
}
/*设置button的基本信息*/
function setButton(buttons,width,height,y){
    for(var i = 0;i<buttons.length;i++){
        buttons[i].width = width;
        buttons[i].height = height;
        buttons[i].x = centerWidth(oCan,buttons[i].width);
        if(i>0){
            buttons[i].y = buttons[i-1].y+buttons[i].height + 10;
        }else {
            buttons[i].y = y;
        }

    }
}
/*显示游戏名字*/
function showText(message,y,x){
    if(arguments.length<5) {
        var textWidth = oCont.measureText(message).width;
        var x = (oCan.width - textWidth) / 2;
    }
    oCont.fillText(message,x,y);
}
/*显示按钮*/
function showButton(buttons){
    var buttonImg = new Image();
    buttonImg.src = '../imgs/button.png';
    buttonImg.addEventListener('load',eventShowButton,false);
    function eventShowButton(){
        for(var i = 0;i<buttons.length;i++){
            oCont.drawImage(buttonImg,buttons[i].x,buttons[i].y,buttons[i].width,buttons[i].height);
            oCont.font = "30px Calibri";
            messageY = buttons[i].y+(buttons[i].height+18)/2;/*字体垂直居中的*/
            showText(buttons[i].message,messageY);
        }
    }
}


// 音乐会自动播放
function music(){
    var audio = document.getElementById("GameMusic");
    var music = document.getElementById("music");
    music.onclick = function(){
        if(audio.paused){
            audio.play();
            music.style.backgroundPosition = 'right bottom';
        }else{
            audio.pause();
            music.style.backgroundPosition = 'right -1500px';
            timer = null;
        }
    }
    //循环播放
    timer = setTimeout(function(){
        audio.play();
        music.style.backgroundPosition = 'right bottom';
        timer = setTimeout(arguments.callee,50000);
    },50000);
}

function beginPaint(){
    beginUI();/*开始画面*/
    document.onclick = handleclick;
    addVensaryState();
}

//接收服务器端的消息
function receive(){
    /*如果可以加入*/
    socket.on('canjoin',function(data){
        alert('你进入了'+data.room+"房间");
        playGame();
        document.removeEventListener('click',handleclick);//点击了play按钮后，清除document事件
    });

    //如果不可以加入房间
    socket.on('notjoin',function(data){
        if(!data.message){
            alert("已有两人对战！请等待！");
        }
    });

    /*开始*/
    socket.on('start',function(data){
        if(data){
            startState = true;
            if(player){
                player.inGame();
            }else if(dealer){
                dealer.inGame();
                dealer.currentCoin = data.playerBet;
                dealer.betEle.innerHTML = data.playerBet;
            }
        }else {
            alert("对方还未开始！");
        }
    });
    socket.on('canstart',function(data){
        if(data){
            startState = true;
           if(player){
               player.inGame();
           }else if(dealer){
               dealer.inGame();
               dealer.currentCoin = data.playerBet;
               dealer.betEle.innerHTML = data.playerBet;
           }

        }else {
            alert("对方还未开始！");
        }
    });

    /*玩家赌金*/
    socket.on("updateBet",function(data){
        if(dealer){
            dealer.currentCoin = data;
            dealer.betEle.innerHTML = dealer.currentCoin;
        }
    });

    //选择角色
    socket.on('chooseRole',function(data){
        switch(data.num){
            case 0:{
                choose.style.display = 'none';
                if(data.role == 'player'){
                    playerGame();
                }else {
                    dealerGame();
                }
                break;
            }
            case 1:alert("该角色已被创建，请重选角色");break;
            case 2:alert("已有两人对战，请等待比赛结束");break;
        }
    });

    /*开始时对方发牌咯*/
    socket.on('addvenPoker',function (data){
        if(player){
            player.dPoker(data.pokers);
        }else if(dealer){
            dealer.pPoker(data.pokers);
        }
    });

    /*玩家有黑杰克！*/
    socket.on("blackJack",function(data){
        showAddallpokers(data);
        console.log(data.pokers,data.dealer,true);
        if(data.hasBjack){
            if(player){
                player.coinleft +=player.currentCoin;
                localStorage.setItem("coin",player.coinleft);
                alert("庄家有黑杰克！又打平！");
            }else{
                alert("都有黑杰克！打平！");
            }
        }else {
            if(player){
                player.coinleft += player.currentCoin*2;
                player.pot.innerHTML = player.coinleft;
                localStorage.setItem("coin",player.coinleft);
                alert("BlackJack!你获胜了！！");
            }else{
                dealer.coinleft -= dealer.currentCoin*2;
                dealer.pot.innerHTML = dealer.coinleft;
                localStorage.setItem("coin",dealer.coinleft);
                alert("玩家有BlackJack!你输了！！别灰心，再来一局！");
            }
        }
        replay();
    });

    /*玩家买了保险 摊牌*/
    socket.on("BJackReasult",function(data){
        if(data.winner === "player"){
            if(player){
                alert("对方是黑杰克，恭喜你胜利了耶！");
                player.finalBet(data.winner);
            }else{
                dealer.currentCoin = data.playerBet;
                dealer.betEle.innerHTML = dealer.currentCoin;
                alert("BlackJack！玩家猜中了，你输啦！");
                dealer.finalBet(data.winner);
            }
        }else if(data.winner === 'dealer'){
            if(player){
                alert("对方不是黑杰克，下次再战咯！");
                player.finalBet(data.winner);
            }else{
                dealer.currentCoin = data.playerBet;
                dealer.betEle.innerHTML = dealer.currentCoin;
                alert("BlackJack!!6666!you win!");
                dealer.finalBet(data.winner);
            }
        }
        showAddallpokers(data);
    });

    //买保险后摊牌
    socket.on("BJackReasult",function(data){
        showAddallpokers(data);
        if(data.black){
            if(player){
                alert("players wins!猜中啦！");
                player.coinleft +=player.currentCoin;
                localStorage.setItem("coin",player.coinleft);
            }
        }else{//没有黑杰克
            if(player){
                alert("你猜错了，庄家没有黑杰克！");
                localStorage.setItem("coin",player.coinleft);
            }else{
                alert("庄家腻害哟！你赢了！")
                dealer.coinleft += dealer.currentCoin;
                localStorage.setItem("coin",dealer.coinleft);
            }
        }
        replay();
    });

    /*玩家要牌*/
    socket.on('askPoker',function(data){
        callDeal = true;
        warnElement("warnDeal");
    });

    /*收到庄家为玩家发牌通知，为玩家发牌*/
    socket.on('playergetPoker',function(data){
        if(player){
            player.hitButton();
            warnElement();
        }else if(dealer){
            dealer.hitButton();
        }
    });

    /*有一方爆掉*/
    socket.on('bust',function(data){
        showAddallpokers(data.pokers,data.sum,true);
        replay();
    });


    /*玩家不再要牌，庄家决定是否再要牌*/
    socket.on("playerStand",function (data){
        warnElement("isHit");
        //显示hit按钮，和stand按钮
        if(dealer){
            dealer.hit.style.display = "inline-block";
            dealer.stand.style.display = 'inline-block';
            dealer.stand.style.left = '120px';
        }
    });

    /*stand比较事件*/
    socket.on("standResult",function(data){
        showAddallpokers(data);
        warnElement();
        /*显示所有的牌*/
        if(data.winner === 'player'){
            if(dealer){
                dealer.finalBet("player");
                dealer.pot.innerHTML = localStorage.getItem("coin");
            }else{
                player.finalBet("player");
                player.pot.innerHTML = localStorage.getItem("coin");
            }
            alert("player wins! player:"+data.player+ " dealer: "+data.dealer);
        }else if(data.winner === 'dealer'){

            if(dealer){
                dealer.finalBet("dealer");
                dealer.pot.innerHTML = localStorage.getItem("coin");
            }else{
                player.finalBet("dealer");
                player.pot.innerHTML = localStorage.getItem("coin");
            }
            alert("dealer wins! player:"+data.player+ " dealer: "+data.dealer);
        }else if(data.winner === 'push'){
            if(dealer){
                dealer.finalBet("push");
                dealer.pot.innerHTML = localStorage.getItem("coin");
            }else{
                player.finalBet("push");
                player.pot.innerHTML = localStorage.getItem("coin");
            }
            alert('打平！下次又来');
        }

        /*重新开始*/
        replay();
    });
    socket.on("standResultown",function(data){
        /*显示所有的牌*/
        showAddallpokers(data);
        warnElement();
        if(data.winner === 'player'){
            if(dealer){
                dealer.finalBet("player");
                dealer.pot.innerHTML = localStorage.getItem("coin");
            }else{
                player.finalBet("player");
                player.pot.innerHTML = localStorage.getItem("coin");
            }
            alert("player wins! player:"+data.player+ " dealer: "+data.dealer);
            /*保存数据*/
        }else if(data.winner === 'dealer'){
            if(dealer){
                dealer.finalBet("dealer");
                dealer.pot.innerHTML = localStorage.getItem("coin");
            }else{
                player.finalBet("dealer");
                player.pot.innerHTML = localStorage.getItem("coin");
            }
            alert("dealer wins! player:"+data.player+ " dealer: "+data.dealer);
        }else if(data.winner === 'push'){
            if(dealer){
                dealer.finalBet("push");
                dealer.pot.innerHTML = localStorage.getItem("coin");
            }else{
                player.finalBet("push");
                player.pot.innerHTML = localStorage.getItem("coin");
            }
            alert('打平！下次又来');
        }


        /*重新开始*/
        replay();
    });

    /*如果用户离开了房间，游戏重新开始*/
    socket.on('userleft',function(data){
        if(addVensary==data.user){
            alert("你的对手已经离开");
            replay();
        }
    });
}

/*显示对方的牌*/
function showAddallpokers(data){
    /*显示所有的牌*/
    if(player){
        player.dPoker(data.pokers,data.dealer,true);//显示庄家所有牌
    }else {
        dealer.pPoker(data.pokers,data.player,true);//显示玩家所有牌
    }
}

/*重新开始*/
function replay(){
    /*其他按钮消失*/
    var btns = document.getElementsByClassName('buttonStyle');
    var btnlen = btns.length;
    if(btnlen>0){
        for(var i = 0;i<btnlen;i++){
            btns[i].style.display = 'none';
        }
    }
    var replay = document.getElementById('replay');
    replay.style.display = "inline-block";
    replay.style.right = '0px';
    replay.onclick = function(){
        gameover();
    };
}

/*提示信息*/
function warnElement(str){
    var playStart = document.getElementById("playStart");
    var head = document.getElementById("head");
    var warns= document.getElementsByClassName("warn");
    var warnsLen = warns.length;
    var warn = document.createElement('p');
    /*if 警告框重复 删除之前的警告*/
    if(warnsLen != 0){
        for(var i = 0;i<warnsLen;i++){
            head.removeChild(warns[i]);
        }
    }

    if(str && str === 'warnDeal'){
        if(warns.length ==0){
            deal.className = "buttonStyle";
            deal.id = "deal";
            deal.style.display = 'inline-block';
            deal.innerHTML = 'deal';
            playStart.appendChild(deal);

            /*提示庄家为玩家发牌*/
            warn.style.display = 'inline-block';
            warn.className = 'warn';
            warn.innerHTML = "请为玩家发牌哟！";
            head.appendChild(warn);

            /*发完牌后取消warn,发完牌后点击无效，只有当玩家叫发牌时有效*/
            deal.onclick = function(){
                if(callDeal){
                    socket.emit("canDeal",true);
                    warn.style.display = 'none';
                }
                callDeal = false;
            }

        }
    }

    //提示庄家是否再要牌
    if(str && str === 'isHit'){
        /*提示是否要牌*/
        warn.style.display = 'inline-block';
        warn.className = 'warn';
        warn.innerHTML = "玩家不要牌！你还要牌吗？";
        head.appendChild(warn);
        /*隐藏deal按钮*/
        this.deal.style.display = 'none';
    }

    //提示玩家正在发牌
    if(str && str === 'deal'){
        warn.style.display = 'inline-block';
        warn.className = 'warn';
        warn.innerHTML = "发牌中。。。。";
        head.appendChild(warn);
    }
    /*提示庄家正在决定是否要牌*/
    if(str && str === 'stand'){
        warn.style.display = 'inline-block';
        warn.className = 'warn';
        warn.innerHTML = "庄家要牌中。。。";
        head.appendChild(warn);
    }
}

//结束游戏
function gameover() {
    document.getElementById('replay').style.display = 'none';
    addVensary = null;
    socket.disconnect();
    socket.socket.reconnect();
    player = null;
    dealer = null;
    init();
}

//游戏结束回到初始状态
function init(){
    var choose = document.getElementById("choose");
    var play = document.getElementById("play");
    var oCan = document.getElementById("begin");
    var pot = document.getElementById("pot");
    var bet = document.getElementById("bet");
    var deaSco = document.getElementById("dealerSco");
    var plaSco = document.getElementById("playerSco");
    var showPokers = document.getElementsByClassName("showPuke");
    var buttons = document.getElementsByClassName("buttonStyle");
    var start = document.getElementById("start");
    var player = document.getElementById("player");
    var dealer = document.getElementById("dealer");
    player.style.position = 'relative';
    player.style.top = 0;
    dealer.style.position = 'relative';
    dealer.style.top = 0;
    for(var i = 0;i<buttons.length;i++){
        buttons[i].style.display = 'none';
    }
    start.style.display="inline-block";
    showPokers[0].innerHTML ="";
    showPokers[1].innerHTML = "";
    plaSco.innerHTML ='';
    deaSco.innerHTML = "";
    bet.innerHTML = '0';

    /*显示数据*/
    pot.innerHTML = localStorage.getItem("coin");
    oCan.style.display = 'block';
    oCan.className = 'begin';
    choose.style.display = 'none';
    play.style.display = 'none';
    warnElement();
    beginPaint();
}

//click play ||help
function handleclick(e){
    var ev = e || window.event;
    var l = container.offsetLeft;
    var t = container.offsetTop;
    var cX = ev.clientX-l;
    var cY = ev.clientY - t;

    if(! (cX < buttons[0].x || cX > buttons[0].x + buttons[0].width || cY < buttons[0].y || cY > buttons[0].y + buttons[0].height))
    {
        /*点击了一个按钮play*/
        socket.emit('join',{join:true});
    }else if(!(cX < buttons[1].x || cX > buttons[1].x + buttons[1].width || cY < buttons[1].y || cY > buttons[1].y + buttons[1].height))
    {
        //点击了help 按钮
        alert("请上360百科搜索Blackjack,了解规则，(*^__^*) 嘻嘻……");
    }
}

//对手id，当有用户离开时，判断是否是自己的对手
function addVensaryState() {
    socket.on('addvensaryId',function(data){
        addVensary = data;
    });
}

//开始游戏
function playGame(){
    //清除之前的画布
    oCont.clearRect(0,0,oCan.width,oCan.height);
    oCan.className = '';
    oCan.style.display = 'none';

    /*显示角色选择的画面*/
    var choose = document.getElementById('choose');
    var cDeal = document.getElementById('chDealer');
    var cPlay = document.getElementById('chPlayer');
    choose.style.display = 'block';

    /*点击角色与服务器通信，验证角色的合法性*/
    cDeal.onclick = function (event){
        cancelBubble(event);
        socket.emit('sendRole',"dealer");
    };

   cPlay.onclick = function (event){
       cancelBubble(event);
       socket.emit('sendRole',"player");
   };
}

//角色是dealer
function dealerGame(){
    if(!dealer){
        dealer = new Dealer();
        dealer.init();
    }else {
        dealer =null;
        dealer= new Dealer();
        dealer.init();
    }
}

//角色是player
function playerGame(){
    if(!player){
        player = new Player();
        player.init();
    }else{
        player = null;
        player = new Player();
        player.init();
    }
}


/*创建player构造函数*/
function Player(){
    Gamer.call(this);
    this.porker = [];
    this.play = document.getElementById('play');
    this.coinUl = document.getElementsByClassName('coin')[0];
    this.sumEle = document.getElementById("playerSco");
}

//组合式继承自Gamer类
Player.prototype = new Gamer();

//初始化
Player.prototype.init = function(){
    var That = this;
    this.pot.innerHTML = this.coinleft;
    this.play.style.display = 'block';
    this.coinUl.style.display = 'block';
    this.bet();//是否买赌金
    this.startFn();
}

/*购买赌金*/
Player.prototype.bet = function (){
    var That = this;
    this.coinUl.onclick = function(event){
        cancelBubble(event);
        var target = event.target;
        var number = parseInt(target.innerHTML);
        if(number!==number){//number 为NaN,即clear
            That.currentCoin = 0;//清为0
            That.currentBet.innerHTML = That.currentCoin;
            return false;
        }else if(That.currentCoin<5 && number <5){
            That.currentCoin = 0;//资金太小不能买
            alert("赌金在$5-$500");
            return false;
        }else{
            That.currentCoin += number;
        }
        if(That.currentCoin < 5 || That.currentCoin > 500){
            alert("赌金在$5-$500");
            return false;
        }else if (That.currentCoin>That.coinleft){
            alert("你的资产余额不足！");
            return false;
        }else {
            That.currentBet.innerHTML = That.currentCoin;
            That.betstate = true;
            That.coinleft -= That.currentCoin;
            return true;
        }
    };
};

/*能否开始游戏*/
Player.prototype.startFn = function (){
    var That = this;
    this.start.onclick = function(event){
      cancelBubble(event);
        /*发送开始*/
        if(!That.betstate){
            alert("请先购买赌金！");
        }else{
            socket.emit('start',{role:'player',start:true,bet:this.currentCoin});//该客户端已经点击了start
        }
    };

}

/*游戏进行*/
Player.prototype.inGame = function(){
    var That = this;
    if(startState){
        this.PldealPoker();//发牌
        this.getSum();
        this.showPorker();//显示牌
        this.sendPorker(); /*通知服务器数据更新*/
        this.showButtons();//显示可以点击的按钮
        this.updateBet();//更新硬币
        this.isBalckJack();//玩家有没有黑杰克
    }
}

/*玩家有没有黑杰克*/
Player.prototype.isBalckJack = function(){
    var newarr = this.porker.filter(function(item,index,array){
        return Math.ceil(item/4) == 10;
    });
    if(this.sum  == 21 && newarr.length>0){//通知庄家玩家有blackJack
        socket.emit("playerBJack",this.porker);
    }
}

/*发牌*/
Player.prototype.PldealPoker = function(){
    this.dealPorker.call(this);
}


/*在页面显示牌*/
Player.prototype.showPorker = function(){
    //显示player的牌，全部显示出来
    var len = this.porker.length;
    if(!this.poksLen){//
        this.poksLen = 0;
    }else{//将之前的牌清空
        this.showPuke[1].innerHTML = '';
    }
    for(var i = 0;i<len;i++){
        var posi = this.bgPosition(this.porker[i]);
        var span  = document.createElement('span');
        span.id = "brightP"+(i+1);
        span.className = 'poker';
        span.style.backgroundPosition = posi.right + "px "+ posi.top +"px";
        span.style.left = posi.left + 20*i + "px";
        span.style.zIndex = this.poksLen;
        this.showPuke[1].appendChild(span);
        this.poksLen++;
    }
    this.showPuke[1].style.display = 'block';
}

/*扑克牌背景位置*/
Player.prototype.bgPosition = function(i){
    return this.babgPosition.call(this,i);
}

//player 可以点击的Buttons
Player.prototype.showButtons = function(){
    this.hit = document.getElementById('hit');
    this.insure = document.getElementById('insure');
    this.skip = document.getElementById('skip');
    /*买保险*/
    var isInsure = this.isbuyInsurence();
    if(isInsure){
        return true;
    }
    this.showHitStandButtons();

}

//发牌
Player.prototype.hitButton= function (){
    this.PldealPoker();//发牌
    this.showPorker();
    /*通知服务器数据更新*/
    this.sendPorker();
    /*如果牌点数超过21  bust，dealer wins*/
    this.isBust();

}

/*player有没有爆掉*/
Player.prototype.isBust = function (){
    if(this.sum>21){
        alert("Bust! you lose！dealer wins");
        socket.emit('bust',{player:"bust",sum:this.sum});//player 爆掉
    }
}

//player 买保险否
Player.prototype.isbuyInsurence = function(){
        var That = this;
        //隐藏之前的按钮
        this.hit.style.display = 'none';
        this.stand.style.display = 'none';
        if (this.dpok==11) {//第一张牌是A
            this.insure.style.display = 'inline-block';
            this.insure.style.left= '20px';
            this.skip.style.display = 'inline-block';
            this.skip.style.left="120px";
            this.start.style.display = 'none';
            this.skip.onclick = function(event){
                cancelBubble(event);
                That.showHitStandButtons();
            };
            this.insure.onclick = function(event){//
                cancelBubble(event);
                //如果买保险，赌金是一半，庄家摊牌，如果是21,如果不是21，玩家输掉游戏
                var a =That.currentCoin;
                That.currentCoin += a/2;//改变当前赌金
                That.coinleft -=a/2;//改变当前剩余值
                That.updateBet();
                /*通知庄家摊牌*/
                socket.emit("BlackJack",{bet:That.currentCoin});
            };
            return true;
        }
        return false;
}

//显示hit,stand按钮，隐藏其他按钮
Player.prototype.showHitStandButtons = function(){
    var That = this;
    this.hit.style.display = 'inline-block';
    this.hit.style.left= '20px';
    this.stand.style.display = 'inline-block';
    this.stand.style.left= '120px';
    this.start.style.display = 'none';
    this.skip.style.display = 'none';
    this.insure.style.display = 'none';
    //隐藏赌金部分
    this.coinUl.style.display = 'none';
    //hit,stand添加事件
    this.hit.onclick = function(event){
        cancelBubble(event);
        //通知庄家发牌
        socket.emit("deal",{player:true});
        warnElement("deal");
    };
    this.stand.onclick = function(event){
        cancelBubble(event);
        warnElement("stand");
        That.standResult();
    }
}

/*更新赌金状态*/
Player.prototype.updateBet = function(){
    /*通知庄家 我赌金变了*/
    socket.emit("BuyBet",this.currentCoin);
    this.currentBet.innerHTML = this.currentCoin;
    this.pot.innerHTML = this.coinleft;
}

//将多张扑克牌居中的左边起始位置
Player.prototype.center = function(n){
     return this.centerLeft.call(this,n);
}


/*监听dealer的牌，并显示在玩家屏幕上，第1张是暗牌其余是名牌*/
Player.prototype.dPoker = function(data,sum){
    var show = document.getElementsByClassName('showPuke')[0];
    var black = document.getElementById("black");
    this.dpok = 0;
    show.style.display = 'block';
    /*清除之前的牌*/
    clearChild(show,"bright",["black"]);
    if(!arguments[2]){
        /*显示第一张暗牌*/;
        var copy = data.concat();
        copy.shift();
        var len = copy.length;
        var left = this.centerLeft(len+1);
        black = document.createElement('span');
        black.className = 'poker';
        black.id = 'black';
        black.style.backgroundPosition = "left bottom";
        black.style.left = left+"px";
        show.appendChild(black);
        /*data 是dealer的牌数，shift 掉第一个数据,剩下牌的点数总和*/

    }else{//显示所有牌
        var copy = data.concat();
        var len = copy.length;
        var left = this.centerLeft(len);
    }

    if(!sum){
        for(var i = 0;i<len;i++){
            this.dpok +=this.toPoint(copy[i],copy);
        }
        if(this.dpok == 1){
            this.dpok =11;
        }
        var b = 1;
    }else{
        if(sum == 1)
        {
            sum =11;
        }
        this.dpok = sum;
        var b = 0;
    }
        /*显示明牌*/
        for( i  = 0;i<len;i++){
            var bright = document.createElement('span');
            var dposition = this.bgPosition(copy[i]);
            bright.className = 'poker bright';
            bright.style.backgroundPosition = dposition.right + 'px '+dposition.top +'px';
            bright.style.left = left+20*(i+b)+"px";
            show.appendChild(bright);
        }
        //显示dealer的点数
        var dPoint = document.getElementById("dealerSco");
        dPoint.innerHTML = this.dpok;
}

//向服务器端发送数据牌的更新数据
Player.prototype.sendPorker = function(){
    socket.emit('PlayerPoker',this.porker,this.sum);
}

/*stand 不再要牌*/
Player.prototype.standResult = function(){//发送比较数据
    socket.emit("stand",{role:"player",sum:this.sum});
}


/*创建Dealer*/
function Dealer(){
    Gamer.call(this);
    this.porker = [];
    this.dpok = 0;
    this.play = document.getElementById('play');
    this.showPuke = document.getElementsByClassName('showPuke');
    this.deal =document.getElementById("deal");
    this.sumEle = document.getElementById('dealerSco');
    this.playerEle = document.getElementById('player');
    this.dealerEle = document.getElementById('dealer');

}

Dealer.prototype = Gamer.prototype;

//初始化数据
Dealer.prototype.init = function(){
    var That = this;
    this.play = document.getElementById('play');
    this.play.style.display = 'block';
    this.pot.innerHTML = localStorage.getItem("coin");
    this.startFn();//是否开始
    this.changePlay();//改变player 和dealer的位置
}

//是否开始游戏
Dealer.prototype.startFn = function(){
    var That = this;
    this.start.onclick = function(event){
        /*取消事件冒泡*/
        cancelBubble(event);
        /*发送开始*/
        socket.emit('start',{role:'dealer',start:true});//该客户端已经点击了start
    };
}

//游戏正式开始
Dealer.prototype.inGame = function(){
    var That = this;
    this.currentBet.innerHTML = this.currentCoin;
    if(startState){
        this.dealPok();//发牌
        this.showPorker();//显示牌
        this.showButtons();//为显示的按钮添加监听
    }
}

//显示按钮
Dealer.prototype.showButtons = function(){
    this.start.style.display = 'none';
    var That = this;
    this.hit.onclick = function(event){
        cancelBubble(event);
        That.hitButton();
    };
    this.stand.onclick = function(event){
        warnElement();
        socket.emit("dealerStand",{role:"dealer",sum:That.sum});
    };
}

/*显示hit*/
Dealer.prototype.hitButton = function(){
    warnElement();
    this.dealPok();//发牌
    this.showPorker();
    this.sendPorker();//通知服务器数据更新
    this.isBust(); //如果牌点数超过21  bust，dealer wins
}

//发牌
Dealer.prototype.dealPok = function(){
    this.dealPorker.call(this);
    socket.emit('DealerPoker',{pokers:this.porker,sum:this.sum});//发牌后手动触发服务器更新
}
Dealer.prototype.dealPok = function(){
    this.dealPorker.call(this);
    socket.emit('DealerPoker',{pokers:this.porker,sum:this.sum});//发牌后手动触发服务器更新
}


//dealer显示在下面，player在上边
Dealer.prototype.changePlay = function(){
    this.dealerEle.style.position = 'absolute';
    this.dealerEle.style.position = 'absolute';
    this.dealerEle.style.top = '150px';
    this.playerEle.style.top = '0px';
}

//是否爆掉
Dealer.prototype.isBust = function (){
    if(this.sum>21){
        alert("Bust! you lose！Player wins");
        socket.emit('bust',{dealer:"bust",sum:this.sum});//dealer爆掉
    }
}

//通知服务器更新数据
Dealer.prototype.sendPorker = function(){
    socket.emit('DealerPoker',{pokers:this.porker,sum:this.sum});
}

//素材背景位置
Dealer.prototype.bgPosition = function(i,len){
    return this.babgPosition.call(this,i,len);
}

//显示牌
Dealer.prototype.showPorker = function(){
    var len = this.porker.length;
    if(!this.poksLen){
        this.poksLen = 0;
    }else{//将之前的牌清空
        this.showPuke[0].innerHTML = '';
    }
    for(var i = 0;i<len;i++){
        var posi = this.bgPosition(this.porker[i]);
        var span  = document.createElement('span');
        span.id = "brightP"+(i+1);
        span.className = 'poker';
        span.style.backgroundPosition = posi.right + "px "+ posi.top +"px";
        span.style.left = posi.left + 20*i + "px";
        span.style.zIndex = this.poksLen;
        this.showPuke[0].appendChild(span);
        this.poksLen++;
    }
    this.showPuke[0].style.display = 'block';
}

//显示对手的牌,发了牌后显示,如果有第三个参数是显示所有的牌
Dealer.prototype.pPoker = function(data,sum){
    var show = document.getElementsByClassName('showPuke')[1];
    show.style.display = 'block';
    var black = document.getElementById("black");
    this.dpok = 0;
    var copy = data.concat();
    /*清除之前的牌*/
    clearChild(show,"bright",["black"]);
    if(!arguments[2]){
        /*data 是dealer的牌数，shift 掉第一个数据,剩下牌的点数总和*/
        copy.shift();
        var len = copy.length;
        var left = this.centerLeft(len+1);
        black = document.createElement('span');
        black.style.display = 'inline-block';
        black.className = 'poker';
        black.id = 'black';
        black.style.backgroundPosition = "left bottom";
        black.style.left = left+"px";
        show.appendChild(black);
    }else{//显示所有牌
        var len = copy.length;
        var left = this.centerLeft(len);
    }
    if(!sum){//发牌的时候没有第二个参数
        for(var i = 0;i<len;i++){
            this.dpok += this.toPoint(copy[i]);
        }
        if(this.dpok == 1){
            this.dpok =11;
        }
        var b =1;
    }else {
        this.dpok = sum;
        var  b = 0;
    }

    /*显示明牌*/
    for( i  = 0;i<copy.length;i++){
        var bright = document.createElement('span');
        var dposition = this.bgPosition(copy[i]);
        bright.className = 'poker  bright';
        bright.style.backgroundPosition = dposition.right + 'px '+dposition.top +'px';
        bright.style.left = left+20*(i+b)+"px";
        show.appendChild(bright);
    }
    //显示player的点数
    var dPoint = document.getElementById("playerSco");
    dPoint.innerHTML = this.dpok;
}

//将多张扑克牌居中的左边起始位置
Dealer.prototype.center = function(n){
    return this.centerLeft.call(this,n);
}



function cancelBubble(event){
    var event = event || window.event;
    /*取消事件冒泡*/
    if (event.bubbles) {
        event.stopPropagation();
    } else if (!event.cancelable) {
        event.cancelable = true;
    }
}
/*移除节点*/
function clearChild(parent,className,ids){
    if(ids){
        var idlen = ids.length;
    }
    for(var i = 0;i<idlen;i++){
        //clearId
        var id = document.getElementById(ids[i]);
        if(id){
            parent.removeChild(id);
        }
    }
    var classs = document.getElementsByClassName(className);
    var classLen = classs.length;
    for(var i = 0;i<classLen;i++){
        if(classs[i]){
            parent.removeChild(classs[i]);
        }
    }
}


/*
 * Created by 罗娟 on 2016/4/9.
 */
/*通用类Gamer*/
function Gamer(){
    this.start  = document.getElementById('start');
    this.hit = document.getElementById("hit");
    this.showPuke = document.getElementsByClassName("showPuke");
    this.betEle = document.getElementById("bet");
    this.pot = document.getElementById("pot");//余额
    this.currentBet = document.getElementById('bet');//赌金
    this.stand = document.getElementById('stand');
    this.sum = 0;//点数和
    var  a = localStorage.getItem("coin");//总资产5000
    this.coinleft = parseInt(a);
    this.currentCoin = 0;//>5的时候才能比赛
    this.betstate = false;//购买赌金状态
    this.pork = {
        width:70,
        height:105,
        bottom:7,
        right:6
    }
}

//开始随机得到牌的数 1-52，对应一副扑克牌
Gamer.prototype.randPorker = function (pokers){
    /*在52张牌中随机发牌，发过的牌不能再发*/
    var rands = Math.ceil(Math.random()*52);
    for(var i = 0;i<pokers/length;i++){
        if(rands === pokers[i]){
            this.randPorker(pokers);
        }
    }
    return rands;
}

//点击hit后发牌
Gamer.prototype.hitPorker = function (porker){
    var p = this.randPorker();
    porker.push(p);
    for(var i = 0;i<porker.length;i++){
        var sum = 0;
        sum += (porker[i]/4+1);//点数和
    }
}

/*发牌*/
Gamer.prototype.dealPorker = function(){
    var len = this.porker.length;
    var p1=0,p2=0;
    if(len == 0){//刚开始发牌时发两张牌，第二张为暗牌
        p1 = this.randPorker();
        p2 = this.randPorker();
        this.porker.push(p1);
        this.porker.push(p2);
    }else {
        p1 = this.randPorker();
        this.porker.push(p1);
    }
    this.getSum();//发了牌计算总的点数
}

//将1-52的记录张数，转为对应的点数
Gamer.prototype.toPoint = function (p){
    if(p<=40 && p>0){
        return  Math.ceil(p/4);
    }else if( p<= 52 && p>40){//当p是JQK时
        return 10;
    }else return 0;
}

//所有牌的总数
Gamer.prototype.getSum = function(){
    var arr = [];
    var acount ={};
    acount.n = new Array();
    for(var i = 0;i<this.porker.length;i++){
        var cp = this.toPoint(this.porker[i]);
        arr.push(cp);

        if(cp==1) {
            acount.n.push(i);
        }
    }
    if(acount.n &&acount.n.length==0){

        this.sum = arr.reduce(function(prev,cur,index,array){
            return prev+cur;
        });
    }else if(acount.n&& acount.n.length>=1){
    //    第一1为11 和是否大于21
        arr[acount["n"][0]] =11;
        var sum  = arr.reduce(function(prev,cur,index,array){
            return prev+cur;
        });
        if(sum>21){//大于21则为1
            arr[acount["n"][0]] = 1;
            sum  = arr.reduce(function(prev,cur,index,array){
                return prev+cur;
            });
        }
        this.sum = sum;
    }
    this.sumEle.innerHTML = this.sum;
}

/*背景位置*/
Gamer.prototype.babgPosition = function(i,len){
    var top,right;
    if(!len){
        var left = this.centerLeft(this.porker.length);
    }else {
        var left = this.centerLeft(len);
    }
    var x = i%4;
    var y = Math.ceil(i/4);
    if(x == 0) {
        x = 4;
    }
    right = -((x-1)*this.pork.width + (x-1)*this.pork.right+ 1);
    if(y == 1){
        top = -(3*this.pork.height + 3*this.pork.bottom);
    }else if(y>1 && y<=10){
        top =-((4+10-y)*this.pork.height + (4+10-y)*this.pork.bottom);
    }else if(y>10 && y<=13){
        top = (y-13)*this.pork.height +(y-13)*this.pork.bottom-1;
    }
    return {top:top,right:right,left:left};
}

//让牌的左边居中
Gamer.prototype.centerLeft = function(n){
    return (oCan.width-(n-1)*20-this.pork.width)/2;
}
/*一局后算硬币*/
Gamer.prototype.finalBet = function(winner,playerBj){
    if(playerBj){
        if(player){
            if(playerBj ===  'playerjack'){
                player.coinleft += player.currentCoin*2;
            }else if(playerBj ===  'dealerjack'){
                player.coinleft +=player.currentCoin;
            }
            player.pot.innerHTML = player.coinleft;
            localStorage.setItem('coin',player.coinleft);
        }else{
            if(playerBj ===  'playerjack'){
               dealer.coinleft -= dealer.currentCoin*2;
            }
            dealer.pot.innerHTML = dealer.coinleft;
            localStorage.setItem('coin',dealer.coinleft);
        }
        return 0;
    }

    if(winner == "player"){
        if(player){
            player.coinleft += player.currentCoin*2;
            player.pot.innerHTML = player.coinleft;
            localStorage.setItem('coin',player.coinleft);
        }else{
            dealer.coinleft -= dealer.currentCoin;
            dealer.pot.innerHTML = dealer.coinleft;
            localStorage.setItem('coin',dealer.coinleft);
        }
    }else if(winner == 'dealer'){
        if(dealer){
            dealer.coinleft += dealer.currentCoin;
            localStorage.setItem('coin',dealer.coinleft);
        }else{
            localStorage.setItem('coin',player.coinleft);
        }
    }else if(winner === 'push'){
        if(dealer){
            localStorage.setItem('coin',dealer.coinleft);
        }else{
            player.coinleft += player.currentCoin;
            player.pot.innerHTML = player.coinleft;
            localStorage.setItem('coin',player.coinleft);
        }
    }
}

