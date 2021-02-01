var sock;
var sockStatus = false;
var sockHearTimer
var sockHearTime;
var platiom;
var arch;
var termTable = {};
var seqTable = {};
var seqNumber = 0;



function getSeqNumber() {
    return ++seqNumber;
}

function newSeqObject(object) {
    var seq = getSeqNumber();
    seqTable[seq] = object;
    return seq;
}

function getSeqObject(seq) {
    if(seqTable[seq]) {
        var object = seqTable[seq];
        delSeqObject(seq);
        return object;
    }
    return null;
}

function delSeqObject(seq) {
    if(seqTable[seq]) {
        delete seqTable[seq];
    }
}

function addListenerSock(event, listener) {
    sock.addEventListener(event, listener);
}

function removeListenerSock(event, listener) {
    sock.removeEventListener(event, listener);
}

function getSockStatus() {
    return sockStatus;
}

function connectSock() {
    closeSock();
    sock = new WebSocket('ws://' + location.host + '/terminal');
    addListenerSock('open', function() {
        sockStatus = true;
        sockHearTimer = setInterval(function () {
            sock.send(JSON.stringify({
                op: 'ping'
            }));
        }, 10 * 1000);
    });
    addListenerSock('close', function() {
        if(sockHearTimer) {
            clearInterval(sockHearTimer);
            sockHearTimer = null;
        }
        closeSock();
        sockStatus = false;
    });

    addListenerSock('message', function(evt) {
        var msg = JSON.parse(evt.data);
        switch (msg.op) {
            case 'platform-info':
                /*
                {
                    op: string,         
                    type: string,       // Windows_NT
                    os: string,         // win32
                    arch: string        // x64
                    version: string,    // 10.0.20251
                }
                */
                var event = new CustomEvent('platform-info');
                event.os = msg.os;
                event.os_type = msg.type;
                event.version = msg.version;
                event.arch = msg.arch;
                sock.dispatchEvent(event);
                break;
            case 'auth':
                /*
                {
                    op: string,
                    seq: string,
                    result: bool
                }
                */
                var event = new CustomEvent('auth');
                event.auth = msg.result;
                sock.dispatchEvent(event);
                break;
            case 'no-auth':
                var event = new CustomEvent('no-auth');
                sock.dispatchEvent(event);
                break;
            case 'new-terminal':
                /*
                {
                    op: string,
                    seq: number,
                    result: bool,
                    pid: number
                }
                */
                var seqObject = getSeqObject(msg.seq);
                if (msg.result) {
                    if(seqObject) {
                        var termUI = createTermialUI(msg.pid, seqObject.element, {
                            cols: 100,
                            rows: 30
                        });
                        termTable[msg.pid] = termUI;
                        addListenerTerminalUIData(termUI, msg.pid);
                        return;
                    }
                } 
                break;
            case 'terminal-event-output':
                /*
                {
                    op: string,
                    pid: number,
                    text: string
                }
                */
                termTable[msg.pid].write(msg.text);
                break;
            case 'terminal-event-exit':
                /*
                {
                    op: string,
                    pid: number
                }
                */
                termTable[msg.pid].write('\r\nexit \x1B[1;3;31mxterm.js\x1B[0m $');
                break;
        }
    });
}

function closeSock() {
    if(sock) {
        sock.close();
    }
    sock = null;
    var termTable = {};
    var seqTable = {};
    var seqNumber = 0;
}

function newTerminal(element, shell) {
    /*
    {
        op: string,
        seq: number,
        shell: string,
        args?: Array<Any>,
        option?: Map<Any, Any>
    }
    */
    var seq = newSeqObject({
        element
    });
    sock.send(JSON.stringify({
        op: 'new-terminal',
        seq: seq,
        shell: shell,
        args: [],
        option: {
            cols: 100,
            rows: 30,
        }
    }));
}

function sendTerminalCmdText(termPid, cmdText) {
    /*
    {
        op: string,
        seq: number,
        pid: number,
        cmd: string,
    }
    */
    sock.send(JSON.stringify({
        op: 'terminal-cmd',
        seq: 0,
        pid: termPid,
        cmd: cmdText
    }));
}

function sendAuthInfo(username, password) {
    /*
    {
        op: string,
        seq: number,
        username: string,
        password: string,
    }
    */
   sock.send(JSON.stringify({
       op: 'auth',
       seq: 0,
       username: username,
       password: password
   }));
}

function createTermialUI(termPid, element, option) {
    var termUI = new Terminal(option);
    termUI._initialized = true;
    termUI.open(element);
    element.termPid = termPid;
    termUI.writeln('Welcome to xterm.js');
    termUI.writeln('This is a local terminal emulation, without a real terminal in the back-end.');
    termUI.writeln('Type some keys and commands to play around.');
    termUI.writeln('');
    return termUI;
}

function addListenerTerminalUIData(termUI, termPid) {
    termUI.onData(function (data) {
        sendTerminalCmdText(termPid, data);
    });
}
