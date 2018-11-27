'use strict';
const qs = require('qs');
const url = require('url');
const target = require("remotedebug-ios-webkit-adapter/out/protocols/target.js");
const iosProtocol = require("remotedebug-ios-webkit-adapter/out/protocols/ios/ios9.js");

function attachToServer(server, inspectorStore) {
  console.log('attachToServer');
	var WebSocketServer = require('ws').Server;
	var wss = new WebSocketServer({
		server: server
	});
	var oldHandleUpgrade = wss.handleUpgrade;
	wss.handleUpgrade = (req, socket, upgradeHead, cb) => {
		var u = url.parse(req.url);
		if (u && u.pathname.indexOf("/inspector") == -1) {
			return;
		}
		return oldHandleUpgrade.call(wss, req, socket, upgradeHead, cb);
	};
	var frontendSocket, deviceSocket;
	function send(dest, message) {
		if (!dest || !message) {
			return;
		}
		try {
			dest.send(message);
		} catch(e) {
			console.warn(e);
			// Sometimes this call throws 'not opened'
		}
	}
	inspectorStore.send = send;
	wss.on('connection', function(ws) {
		try {
			const reqUrl = ws.upgradeReq.url;
			const query = url.parse(reqUrl, true).query;
			if (reqUrl.indexOf('/inspector/frontend') > -1) {
				if (frontendSocket) {
					ws.close(1011, 'Another frontend is already connected');
					return;
				}
				if(!query.pageId) {
					ws.close(1011, 'No pageId specified');
				}
				frontendSocket = ws;
				frontendSocket.onerror =
					frontendSocket.onclose = () => {
						frontendSocket = null;
						send(deviceSocket,JSON.stringify({event: 'disconnect', payload: { pageId: query.pageId }}));
					};
				frontendSocket.onmessage = ({data}) => { 
					const parsed = JSON.parse(data)
					if(parsed.method === 'Runtime.enable') {
						send(frontendSocket, JSON.stringify({ method:'Runtime.executionContextCreated', params: { context: { id: 1, origin: 'reactNative', name: 'reactNative' } } }));
					}
					inspectorStore.target.forward(data);
				};
				send(deviceSocket, JSON.stringify({event: 'connect', payload: { pageId: query.pageId }}));
				console.log(target.Target)
				inspectorStore.target = new target.Target("device", null);
				inspectorStore.iosProtocol = new iosProtocol.IOS9Protocol(inspectorStore.target);
				inspectorStore.target.connectTo = (target) => {
					target._isConnected = true;
					target._wsTarget = true;
					target._wsTools = true;
					target.sendToTarget = (rawMessage) => {
						send(deviceSocket, JSON.stringify({ event: 'wrappedEvent', payload: { pageId: query.pageId, wrappedEvent: rawMessage }}));
					}
					target.sendToTools = (rawMessage) => {
						send(frontendSocket, rawMessage);
					}
				}
				inspectorStore.target.connectTo(inspectorStore.target);
			} else if (reqUrl.indexOf('/inspector/device') > -1) {
				if (deviceSocket) {
					deviceSocket.onerror = deviceSocket.onclose = deviceSocket.onmessage = null;
					deviceSocket.close(1011, 'Another device connected');
				}
				deviceSocket = ws;
				deviceSocket.onerror =
					deviceSocket.onclose = () => {
						deviceSocket = null;
						inspectorStore.pages = [];
					};
				deviceSocket.onmessage = ({data}) => {
					const parsed = JSON.parse(data);
					if(parsed.event === 'getPages') {
						inspectorStore.pages = parsed.payload;
					} else if(parsed.event == 'wrappedEvent') {
						inspectorStore.target.onMessageFromTarget(parsed.payload.wrappedEvent);
					}
				};
				send(deviceSocket, JSON.stringify({event: 'getPages'}));
				inspectorStore.deviceSocket = deviceSocket;

			} else {
				ws.close(1011, 'Missing role param');
			}
		} catch(err) {
			console.error(err);
		}
	});
	return {
		server: wss,
		isInspectorConnected: function() {
			return !!frontendSocket;
		}
	};
}

module.exports = {
	attachToServer: attachToServer
};
