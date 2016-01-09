'use strict';

(function() {
  var $ = require("./static/js/jquery-2.1.4.min.js");
  const ipc = require('electron').ipcRenderer;
  const crypto = require('crypto');

  function send_target() {
    const form_id = '#target';
    const text = $(form_id).val();
    $(form_id).val('');
    const sid = crypto.createHash('sha256').update(text).digest('hex');
    ipc.send('start', JSON.stringify({target: text, sid: sid}));

    const html = '<div class="session" id="sid_' + sid + '">' +
          '<div class="target"></div>' +
          '<div class="ipaddr"></div>' +
          '<div class="rtt"></div>' +
          '</div>';
    $('#sessions').append(html);
    $('#sid_' + sid + ' .target').text(text);    
  }
  
  ipc.on('res', function(arg, jdata) {
    const data = JSON.parse(jdata);
    if (data.stat === 'avail') {
      $('#sid_' + data.sid + ' .ipaddr').text('(' + data.target + ')');
      $('#sid_' + data.sid + ' .rtt').text(data.rtt);
    } else {
      console.log(data);
      $('#sid_' + data.sid + ' .rtt').text(data.msg);
    }
  });
  
  $(document).ready(function() {
    $('#target').focus();
    $('#target').keydown(function(e) {
      if (e.keyCode === 13) {
        send_target();
      }
    });

    $('button#send').click(function(e) {
      send_target();
      return true;
    });
  });
}());
