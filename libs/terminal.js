
var os = require('os');
var pty = require('node-pty');

var shell = os.platform() === 'win32' ? 'cmd.exe' : 'bash';

 
var ptyProcess = pty.spawn(shell, [], {
  name: 'xterm-color',
  cols: 80,
  rows: 30,
  cwd: process.env.HOME,
  env: process.env,
  handleFlowControl: true
});

ptyProcess.on('exit', function(exitCode, signal) {
  process.pid;
});
ptyProcess.kill();



ptyProcess.on('data', function(data) {
  process.stdout.write(data);
  console.log(data)
});
/*
ptyProcess.on('exit', function(exitCode, signal) {
  process.stdout.write('exit');
});



ptyProcess.resize(100, 40);
const PAUSE = '\x13';   // XOFF
const RESUME = '\x11';  // XON
 

 
// flow control in action
ptyProcess.write('ls\r'); 
*/

// ptyProcess.write(PAUSE);  // pty will block and pause the slave program
// ptyProcess.write('echo exit');
// ptyProcess.write(RESUME); //
/*
setTimeout(function() {
  ptyProcess.write('ls\r'); 
}, 8000);
*/
