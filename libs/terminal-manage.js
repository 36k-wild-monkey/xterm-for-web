var pty = require('node-pty');

var terminalList = {};

function hasAuth(termSessionId) {
    if (!terminalList[termSessionId]) {
        terminalList[termSessionId] = {};
    }
    return terminalList[termSessionId].auth;
}

function setAuthStatus(termSessionId) {
    if (!terminalList[termSessionId]) {
        terminalList[termSessionId] = {};
    }
    terminalList[termSessionId].auth = true;
}

function newTerminal(termSessionId, shell, args = undefined, option = undefined) {
    if (!terminalList[termSessionId] || !terminalList[termSessionId].auth) {
        return null;
    }
    args = args ? args : [];
    option = option ? option : {
        name: 'xterm-256color',
        cols: 80,
        rows: 30,
        cwd: process.env.HOME,
        env: process.env,
        handleFlowControl: true
    };
    try {
        var ptyProcess = pty.spawn(shell, args, option);
        terminalList[termSessionId][ptyProcess.pid] = ptyProcess;
        return ptyProcess;
    } catch (err) {
        return null;
    }
}

function killTerminal(termSessionId, terminalPid) {
    if (terminalList[termSessionId]) {
        if (terminalList[termSessionId][terminalPid]) {
            terminalList[termSessionId][terminalPid].kill();
            delete terminalList[termSessionId][terminalPid];
            if (!terminalList[termSessionId] && terminalList[termSessionId] !== undefined) {
                delete terminalList[termSessionId];
            }
            return true;
        }
    }
    return false;
}

function killAllTerminal(termSessionId) {
    if (terminalList[termSessionId]) {
        for (var terminalPid in terminalList[termSessionId]) {
            try {
                terminalList[termSessionId][terminalPid].kill();
                delete terminalList[termSessionId][terminalPid];
                if (!terminalList[termSessionId] && terminalList[termSessionId] !== undefined) {
                    delete terminalList[termSessionId];
                }
            } catch (err) {

            }

        }
    }
}

function getTerminal(termSessionId, terminalPid) {
    if (terminalList[termSessionId] && terminalList[termSessionId][terminalPid]) {
        return terminalList[termSessionId][terminalPid];
    }
    return null;
}

module.exports = {
    newTerminal,
    killTerminal,
    killAllTerminal,
    getTerminal,
    hasAuth,
    setAuthStatus
}
