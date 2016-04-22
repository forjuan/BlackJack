/*������̬�ļ�������*/
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

/*���ļ��������ڴ��У���һ������ʱ��Ӳ���ж�ȡ*/
function serverStatic(response,cache,absPath){
    if(cache[absPath]){/*����ļ����ڴ��У����ڴ��з����ļ�*/
        sendFile(response,absPath,cache[absPath]);
    }else {
        fs.exists(absPath,function (exists){/*����ļ��Ƿ����*/
            if(exists){/*���ڵĻ�����Ӳ���ж�ȡ�ļ�*/
                fs.readFile(absPath,function (err,data){
                    if(err){
                        send404(response);
                    }else {
                        cache[absPath] = data;
                        sendFile(response,absPath,data);
                    }
                });
            } else {/*�����ڣ�����404*/
                send404(response);
            }
        });
    }
}

/*����http������*/
var server = http.createServer(function (request,response){
    var filePath = false;
    if(request.url == '/'){
        filePath = 'public/index.html';
    }else {/*��url·��תΪ���·��*/
        filePath = 'public' + request.url;
    }
    var absPath = './' + filePath;
    serverStatic(response,cache,absPath);
});

/*����http������*/
server.listen(3000,function (){
    console.log("server listening on port 3000");
});

/*����Socket.IO������*/
var playServer = require("./lib/play_server");
    playServer.listen(server);

