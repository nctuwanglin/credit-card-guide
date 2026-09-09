const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const file=process.env.DASHBOARD_FILE||path.join(__dirname,fs.existsSync(path.join(__dirname,'2026信用卡回饋指南.html'))?'2026信用卡回饋指南.html':'index.html');
http.createServer((req,res)=>{if(req.url!=='/'&&req.url!=='/index.html'){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(fs.readFileSync(file));}).listen(8941,'127.0.0.1');
