#!/usr/bin/env node
'use strict';


var KNOWN_HIT_TYPES = [
  'pageview',
  'screenview',
  'event',
  'transaction',
  'item',
  'social',
  'exception',
  'timing'
];


var jsdom = require('jsdom'),
    yaml = require('js-yaml'),
    fs = require('fs');


jsdom.env({
  url: "https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters?hl=en",
  scripts: ["http://code.jquery.com/jquery.js"],
  done: function (err, window) {
    var $ = window.$;

    var mp = collect();

    fs.writeFileSync('mp.json', JSON.stringify(mp, null, 2));
    fs.writeFileSync('mp.yaml', yaml.dump(mp));

    function collect() {
      var $categoryHeadings = $('[itemProp="articleBody"] > h2');
      var mp = [];
      $categoryHeadings.each(function () {
        var $h = $(this);
        var id = $h.attr('id');
        var name = $h.text();
        var params = collectParamsInSection($h);

        mp.push({
          id: id,
          name: name,
          params: params
        });
      });
      return mp;
    }

    function collectParamsInSection($h) {
      // Collect H3s
      var headings = [];
      var $next = $h.next();
      while($next.length && $next[0].nodeName !== 'H2') {
        if($next[0].nodeName === 'H3') headings.push($next);
        $next = $next.next();
      }

      // Extract data for each parameter
      var params = headings.map(function(h) {
        var $h = $(h);
        var id = $h.attr('id');
        var name = $h.find('a').text();

        var $info = $h.next();
        var requirements = parseRequirementText($info.find('p:nth-child(1)').text().trim());
        var description = $info.find('p:nth-child(2)').text().trim();
        var $tableCells = $info.find(':nth-child(3) tr:last-child td');
        var valueType = $($tableCells[1]).text().trim();
        var defaultValue = parseDefaultValue($($tableCells[2]).text().trim(), valueType);
        var maxLength = parseMaxLength($($tableCells[3]).text().trim());
        var supportedHitTypes = $($tableCells[4]).text().trim().split(',').map(function(hitType) {
          return hitType.trim();
        });
        if(supportedHitTypes.length === 1 && supportedHitTypes[0] === 'all') {
          supportedHitTypes = KNOWN_HIT_TYPES;
        }

        return {
          id: id,
          name: name,
          requirements: requirements,
          description: description,
          valueType: valueType,
          defaultValue: defaultValue,
          maxLength: maxLength,
          supportedHitTypes: supportedHitTypes
        };
      });

      return params;
    }

    function parseRequirementText(t) {
      if(t === 'Optional.') {
        return [];
      } else if(t === 'Required for all hit types.') {
        return KNOWN_HIT_TYPES;
      } else {
        var requirements = [];
        var p = /Required for (.+?) hit type./g;
        var m;
        while((m = p.exec(t)) !== null) {
          requirements.push(m[1]);
        }
        return requirements;
      }
    }

    function parseMaxLength(t) {
      if(t === 'None') return null;

      return +t.split(' ')[0];
    }

    function parseDefaultValue(t, valueType) {
      if(t === 'None') return null;

      if(valueType === 'text') {
        return t;
      } else if(valueType === 'boolean') {
        return t === '1';
      } else if(valueType === 'integer') {
        return +t;
      } else if(valueType === 'currency') {
        return +t;
      } else {
        throw new Error('Unknown value type: ' + valueType)
      }
    }
  }
});
