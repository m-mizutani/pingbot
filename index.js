'use strict';

var app = require('electron').app;
var spawn = require('child_process').spawn;
var BrowserWindow = require('browser-window');
require('crash-reporter').start();

const dns = require('dns');
const ping = require('net-ping');

// main process(backend)とrenderer process(foreground)の通信用モジュール
var ipc = require("electron").ipcMain;

var mainWindow = null;

app.on('window-all-closed', function() {
  if (process.platform !== 'darwin')
    app.quit();
});

app.on('ready', function() {
  mainWindow = new BrowserWindow({width: 840, height: 600});
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  // デバッグ用、開発ツールを自動で開く
  // mainWindow.openDevTools(true);

  // renderer processからテキストの受け取り
  const interval_map = {};

  function start_session(addr, target, sid) {
    const session = ping.createSession();
    const int_id = setInterval(function() {
      session.pingHost(addr, function(err, addr, sent_ts, recv_ts) {
        if (err) {
          const ng_msg = {
            addr: addr,
                target: target,
                sid: sid,
                stat: 'error',
                msg: err.toString()
          };
          if (mainWindow !== null) {
            mainWindow.send('res', JSON.stringify(ng_msg));
          }
        } else {
          const ok_msg = {
            addr: addr,
                target: target,
                sid: sid,
                stat: 'avail',
                rtt: recv_ts - sent_ts
          };
          if (mainWindow !== null) {
            mainWindow.send('res', JSON.stringify(ok_msg));
          }
        }
      });
    }, 1000);
    interval_map[sid] = int_id;
  }
  
  ipc.on('start', function(event, raw) {
    const jdata = JSON.parse(raw);
    console.log(jdata);
    const target = jdata.target;    
    const sid = jdata.sid;

    if (interval_map[sid] !== undefined) {
      return;
    }
    
    if (target.match(/(\d{1,3}\.){3}\d{1,3}/)) {
      start_session(target, target, sid);
    } else {
      dns.resolve4(target, function(err, res) {
        if (err) {
          const ng_msg = {
            target: target,
            stat: 'error',
            sid: sid,
            msg: err.toString()
          };
          mainWindow.send('res', JSON.stringify(ng_msg));
        } else {
          console.log(res);
          start_session(res[0], target, sid);
        }
      });
    }
  });
  
  ipc.on('stop', function(event, raw) {
    const jdata = JSON.parse(raw);
    const sid = jdata.sid;
    if (interval_map[sid] !== undefined) {
      clearInterval(interval_map[sid]);
      delete interval_map[sid];
    }
  });
  
  // closedイベントをキャッチしたらBrowserWindowオブジェクトを消す
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});
