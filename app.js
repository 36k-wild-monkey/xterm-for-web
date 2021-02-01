
const path = require('path'),
    util = require('util');

const Koa = require("koa"),
    websockify = require("koa-websocket"),
    views = require('koa-views'),
    serve = require('koa-static');


const termWsRoute = require('./route/term-ws');
const webRoute = require('./route/web');


const app = websockify(new Koa());

app.use(serve(path.resolve(__dirname, 'node_modules/xterm/css')));
app.use(serve(path.resolve(__dirname, 'node_modules/xterm/lib')));

app.use(views(path.resolve(__dirname, 'views')));
app.use(serve(path.resolve(__dirname, 'public')));

app.ws.use(function (ctx, next) {
    return next(ctx);
});
app.ws.use(termWsRoute.routes());
app.use(webRoute.routes());


port = 3000;
app.listen(port, function () {
    console.log(util.format('server is run, port: %d', port));
});