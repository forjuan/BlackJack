/*创建静态文件服务器*/
var http = require('http');
var fs  = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};

/*send wrong data and error*/
function send404(response){
    response.writeHead(404,{'Content-Type':'text/plain'});
    response.write('Error 404:resource not found.');
    response.end();
}

/*send data service,write right http head,then send content*/
function sendFile(response,filePath,fileContents){
    response.writeHead(200,
        {'Content-Type':mime.lookup(path.basename(filePath))}
    );
    response.end(fileContents);
}

/*将文件储存在内存中，第一次下载时从硬盘中读取*/
function serverStatic(response,cache,absPath){
    if(cache[absPath]){/*如果文件在内存中，从内存中返回文件*/
        sendFile(response,absPath,cache[absPath]);
    }else {
        fs.exists(absPath,function (exists){/*检查文件是否存在*/
            if(exists){/*存在的话，从硬盘中读取文件*/
                fs.readFile(absPath,function (err,data){
                    if(err){
                        send404(response);
                    }else {
                        cache[absPath] = data;
                        sendFile(response,absPath,data);
                    }
                });
            } else {/*不存在，发送404*/
                send404(response);
            }
        });
    }
}

/*创建http服务器*/
var server = http.createServer(function (request,response){
    var filePath = false;
    if(request.url == '/'){
        filePath = 'public/index.html';
    }else {/*将url路径转为相对路径*/
        filePath = 'public' + request.url;
    }
    var absPath = './' + filePath;
    serverStatic(response,cache,absPath);
});

/*启动http服务器*/
server.listen(3000,function (){
    console.log("server listening on port 3000");
});

/*设置Socket.IO服务器*/
var playServer = require("./lib/play_server");
    playServer.listen(server);

