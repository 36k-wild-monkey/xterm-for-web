const os = require('os'),
    path = require('path'),
    util = require('util');
    uuid = require('uuid');

const Router = require('koa-Router');

const terminalManager = require("../libs/terminal-manage");
const authInfo = require('../auth.json');


const PAUSE = '\x13';   // XOFF
const RESUME = '\x11';  // XON

var route = new Router();

route.all("/terminal", async function (ctx) {
    var termSessionId = uuid.v4();
    /*
    {
        op: string,         
        os_type: string,       // Windows_NT
        os: string,         // win32
        arch: string        // x64
        version: string,    // 10.0.20251
    }
    */
    ctx.websocket.send(JSON.stringify({
        op: 'platform-info',
        os: os.platform(),      // win32
        type: os.type(),        // Windows_NT
        version: os.release(),  // 10.0.20251
        arch: os.arch(),        // x64
    }));
    
    var hearLastTime = new Date().getTime();
    var hearTimeout = 30 * 1000;
    var hearTimer = setInterval(function() {
        var now = new Date().getTime();
        if(now - hearLastTime > hearTimeout) {
            ctx.websocket.close();
        }
    }, hearTimeout);
    ctx.websocket.on('close', function(data, reason) {
        clearInterval(hearTimer);
        terminalManager.killAllTerminal(termSessionId);
    });
    ctx.websocket.on("message", function (message) {
        hearLastTime = new Date().getTime();
        var msg = JSON.parse(message);

        if(msg.op !== 'ping' && msg.op !== 'auth') {
            if(!terminalManager.hasAuth(termSessionId)) {
                ctx.websocket.send(JSON.stringify({
                    op: 'no-auth',
                    seq: msg.seq
                }));
                return;
            }
        } if(msg.op === 'auth') {
            /*
            {
                op: string,
                seq: number,
                username: string,
                password: string,
            }
            */
            if(msg.username === authInfo.username && msg.password === authInfo.password) {
                terminalManager.setAuthStatus(termSessionId);
                ctx.websocket.send(JSON.stringify({
                    op: 'auth',
                    seq: msg.seq,
                    result: true
                }));
            } else {
                ctx.websocket.send(JSON.stringify({
                    op: 'auth',
                    seq: msg.seq,
                    result: false
                }));
            }
            return;
        }

        switch(msg.op) {
            case 'ping':
                break;
            case 'new-terminal':
                /*
                {
                    op: string,
                    seq: number,
                    shell: string,
                    args?: Array<Any>,
                    option?: Map<Any, Any>
                }
                */
                var process = terminalManager.newTerminal(termSessionId, msg.shell, msg.args, msg.option);
                if(process) {
                    // 先发送后监听
                    /*
                    {
                        op: string,
                        seq: number,
                        result: bool,
                        pid: number
                    }
                    */
                   ctx.websocket.send(JSON.stringify({
                        op: msg.op,
                        seq: msg.seq,
                        result: true,
                        pid: process.pid
                    }));

                    /*
                        data:string
                    */
                    process.on('data', function(data) {
                        /*
                        {
                            op: string,
                            pid: number,
                            text: string
                        }
                        */
                        ctx.websocket.send(JSON.stringify({
                            op: 'terminal-event-output',
                            pid: process.pid,
                            text: data,
                        }));
                    });
                    /*
                        exitCode: number,
                        signal: number
                    */
                    process.on('exit', function(exitCode, signal) {
                        /*
                        {
                            op: string,
                            pid: number
                        }
                        */
                       ctx.websocket.send(JSON.stringify({
                            op: 'terminal-event-exit',
                            pid: process.pid
                        }));
                        return;
                    })
                } else {
                    /*
                    {
                        op: string,
                        seq: number,
                        result: bool,
                    }
                    */
                    ctx.websocket.send(JSON.stringify({
                        op: msg.op,
                        seq: msg.seq,
                        result: false,
                    }));
                }
                return;
            case 'kill-terminal':
                /*
                {
                    op: string,
                    seq: number,
                    pid: number,
                }
                */
                ctx.websocket.send(JSON.stringify({
                    op: msg.op,
                    seq: msg.seq,
                    result: terminalManager.killTerminal(termSessionId, msg.pid)
                }));
                return;
            case 'terminal-cmd':
                /*
                {
                    op: string,
                    seq: number,
                    pid: number,
                    cmd: string,
                }
                */
                var process = terminalManager.getTerminal(termSessionId, msg.pid);
                if(process) {
                    process.write(msg.cmd);
                }
                return;
            case 'terminal-resize':
                /*
                {
                    op: string,
                    seq: number,
                    pid: number,
                    cols: number,
                    rows: number
                }
                */
                var process = terminalManager.getTerminal(termSessionId, msg.pid);
                if(process) {
                    process.resize(msg.cols, msg.rows);
                }
                return;
            default:
                break;
        }
    });
  });

module.exports = route;
