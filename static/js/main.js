'use strict';

(function() {
  var $ = require("./static/js/jquery-2.1.4.min.js");
  const d3 = require("./static/js/d3.v3.min.js");
  const ipc = require('electron').ipcRenderer;
  const crypto = require('crypto');
  const session_map = {};

  function send_target() {
    const form_id = '#target';
    const text = $(form_id).val();
    $(form_id).val('');
    const sid = crypto.createHash('sha256').update(text).digest('hex');
    ipc.send('start', JSON.stringify({target: text, sid: sid}));
  }

  function build_chart(tgt, sid) {
    const color = '#23AC0E';
    const margin = {top: 6, right: 40, bottom: 6, left: 5},
          width = 350 - margin.right - margin.left,
          height = 60 - margin.top - margin.bottom;
    const n = 180;
    const x = d3.scale.linear().domain([0, n - 1]).range([0, width]);
    const y = d3.scale.linear().domain([0, 1]).range([height, 0]);
    const cx = d3.svg.axis().scale(x).orient("bottom");
    const line = d3.svg.line()
          .x(function(d, i) { return x(i); })
          .y(function(d, i) { return y(d); });
    const svg = d3.select(tgt).append('svg')
          .attr("width", width + margin.left + margin.right)
          .attr("height", height + margin.top + margin.bottom)
          .append("g")
          .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);
    const yal = svg.append("g")
        .attr("class", "y axis")
        .attr('font-size', '12px')
        .attr("transform", "translate(" + width + ", 0)");

    const axis = {y: y, x: x, left: yal};

    const cd = {
          color: color,
          data: Array.apply(null, {length: n}).map(function() { return 0; }),
          hist: [],
          axis: axis,
          line: line,
    };
    var path = svg.append("g")
        .attr("clip-path", "url(#clip)")
        .append("path")
        .datum(cd.data)
        .attr("class", "line")
        .attr("stroke", color)
        .attr("d", line);
    cd.path = path;

    return cd;
  }

  function update_chart(cd) {
    const cy = d3.svg.axis()
          .scale(cd.axis.y)
          .orient("right")
          .ticks(3)
          .tickFormat(function(d,i){ return d + 'ms';});
    cd.axis.y.domain([0, d3.max(cd.data)]);
    cd.axis.left.call(cy);

    cd.path
        .attr("d", cd.line)
        .attr("transform", null)
        .transition()
        .ease("linear");
        // .attr("transform", "translate(" + cd.axis.x(-1) + ",0)");    
  }
  
  ipc.on('res', function(arg, jdata) {
    const data = JSON.parse(jdata);

    if (session_map[data.sid] === undefined) {
      const html = '<div class="session cf" id="sid_' + data.sid + '">' +
            '<div class="base">' +
            '<div class="target">' +
            '<img src="static/img/phone64.png"/>' +
            '<span class="target_name"></span></div>' +
            '<div class="status"></div>' +
            '</div>' +
            '<div class="rtt">' +
            '<dl>' +
            '<dt>Latest</dt><dd class="latest">N/A</dd>' +
            '<dt>Average</dt><dd class="avg">N/A</dd>' +
            '<dt>PktLoss</dt><dd class="loss">N/A</dd>' +
            '</dl>' +
            '</div>' +
            '<div class="chart"></div>' +
            '</div>';
      $('#sessions').append(html);
      const target = data.target + ((data.addr !== data.target) ? ' (' + data.addr + ')' : '');
      $('#sid_' + data.sid + ' .target_name').text(target);

      $('#sid_' + data.sid + ' .target img').mouseover(function() {
        $(this).attr('src', 'static/img/cancel.png');
        $(this).bind('click', function() {
          // Cancel
          ipc.send('stop', JSON.stringify({sid: data.sid}));          
          delete session_map[data.sid];
          $('div#sid_' + data.sid).remove();
        });
      });
      $('#sid_' + data.sid + ' .target img').mouseout(function() {
        $(this).attr('src', 'static/img/phone64.png');
        $(this).unbind('click');
      });

      session_map[data.sid] = {
        chart: build_chart('#sid_' + data.sid + ' div.chart'),
        hist: [],
        loss: 0,
      };
    }
    
    if (data.stat === 'avail') {      
      const cd   = session_map[data.sid].chart;
      const hist = session_map[data.sid].hist;
      cd.data.push(data.rtt);
      cd.data.shift();
      hist.push(data.rtt);
      update_chart(cd);
      
      const sum = hist.reduce(function(p, c) { return p + c; });
      const avg = Math.floor((sum / hist.length) * 100) / 100;
      const loss = Math.floor((session_map[data.sid].loss / hist.length) * 100) / 100;
      $('#sid_' + data.sid + ' .ipaddr').text('(' + data.target + ')');
      $('#sid_' + data.sid + ' .latest').text(data.rtt + 'ms');
      $('#sid_' + data.sid + ' .avg').text(avg  + 'ms');
      $('#sid_' + data.sid + ' .loss').text(loss + '%');
      $('#sid_' + data.sid + ' .status').text('Good');
      $('#sid_' + data.sid + ' .status').removeClass('error');
    } else {
      session_map[data.sid].loss++;
      console.log(data);
      $('#sid_' + data.sid + ' .status').text(data.msg);
      $('#sid_' + data.sid + ' .status').addClass('error');
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
