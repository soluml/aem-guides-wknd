/* prettier-ignore */
/* eslint-disable */

/*! modernizr 3.6.0 (Custom Build) | MIT *
 * https://modernizr.com/download/?-promises-urlsearchparams !*/
!function(n,e,o){function s(n,e){return typeof n===e}function i(){var n,e,o,i,a,f,u;for(var l in t)if(t.hasOwnProperty(l)){if(n=[],e=t[l],e.name&&(n.push(e.name.toLowerCase()),e.options&&e.options.aliases&&e.options.aliases.length))for(o=0;o<e.options.aliases.length;o++)n.push(e.options.aliases[o].toLowerCase());for(i=s(e.fn,"function")?e.fn():e.fn,a=0;a<n.length;a++)f=n[a],u=f.split("."),1===u.length?Modernizr[u[0]]=i:(!Modernizr[u[0]]||Modernizr[u[0]]instanceof Boolean||(Modernizr[u[0]]=new Boolean(Modernizr[u[0]])),Modernizr[u[0]][u[1]]=i),r.push((i?"":"no-")+u.join("-"))}}var t=[],a={_version:"3.6.0",_config:{classPrefix:"",enableClasses:!0,enableJSClass:!0,usePrefixes:!0},_q:[],on:function(n,e){var o=this;setTimeout(function(){e(o[n])},0)},addTest:function(n,e,o){t.push({name:n,fn:e,options:o})},addAsyncTest:function(n){t.push({name:null,fn:n})}},Modernizr=function(){};Modernizr.prototype=a,Modernizr=new Modernizr,Modernizr.addTest("promises",function(){return"Promise"in n&&"resolve"in n.Promise&&"reject"in n.Promise&&"all"in n.Promise&&"race"in n.Promise&&function(){var e;return new n.Promise(function(n){e=n}),"function"==typeof e}()}),Modernizr.addTest("urlsearchparams","URLSearchParams"in n);var r=[];i(),delete a.addTest,delete a.addAsyncTest;for(var f=0;f<Modernizr._q.length;f++)Modernizr._q[f]();n.Modernizr=Modernizr}(window,document);
