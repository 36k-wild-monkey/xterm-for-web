const Router = require('koa-Router');

var route = new Router();


route.get('/term', async function (ctx) {
  await ctx.render('term');
})

module.exports = route;