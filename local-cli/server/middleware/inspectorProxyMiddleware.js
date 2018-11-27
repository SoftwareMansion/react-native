'use strict';
const qs = require('qs');
module.exports = function (inspectorStore) {
  return function(req, res, next) {
    console.log('req', req.url);
    req.inspectorStore = inspectorStore;
    if (req.url === '/json') {
      const mapped = inspectorStore.pages.map((page) => {
        return {
          id: `reactNative-${page.id}`,
          title: `ReactNative Application (${page.app})`,
          webSocketDebuggerUrl: `ws://localhost:8081/inspector/frontend?pageId=${page.id}`,
          devtoolsFrontendUrl: `https://chrome-devtools-frontend.appspot.com/serve_file/@7d149ef5473e980f0b3babd4d0f2839cb9338e73/inspector.html?experiments=true&v8only=true&ws=localhost:8081/inspector/frontend?pageId=${page.id}`,
          faviconUrl: "https://facebook.github.io/react-native/img/favicon.png",
          type: 'device'
        }
      })
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      const body = Buffer.from(JSON.stringify(mapped), "utf-8");
      res.setHeader('Content-Length', body.length);
      res.end(body);
      inspectorStore.send.call(inspectorStore.deviceSocket, JSON.stringify({event: 'getPages'}));
    } else if(req.url === '/json/version') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      const body = Buffer.from(JSON.stringify({
        Browser: 'Android/React Native debug bridge',
        'Protocol-Version': '1.2'
      }), "utf-8");
      res.setHeader('Content-Length', body.length);
      res.end(body);
    } {
      next();
    }
  }
};
