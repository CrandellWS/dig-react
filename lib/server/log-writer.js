'use strict';
var fs       = require('fs');
var urlParse = require('url').parse;

class LogWriter {
  constructor (prefix,dir) {
    this.logdate   = 0;
    this.stream    = null;
    this.queue     = [];
    this.writeOK   = true;
    this.dir       = (dir || 'logs').replace(/\/$/,'');
    this.prefix    = prefix || '';
    this.makeStream();
  }

  makeStream () {

    if( !this.boundDrainQueue ) {
        this.boundDrainQueue = this.drainQueue.bind(this);
    }

    if( this.stream ) {
      this.stream.removeListener('drain', this.boundDrainQueue);
      this.stream.end();
    }

    if( !fs.existsSync(this.dir) ) {
      fs.mkdirSync(this.dir);
    }

    this.logdate = this.formatNowForName();
    var logname  = `${this.dir}/${this.logdate}-${this.prefix}-log.json`;
    this.stream  = fs.createWriteStream( logname, {  flags: 'a',
                                                  defaultEncoding: 'utf8',
                                                  fd: null,
                                                  mode: 0o666 
                                                });  
    this.stream.on( 'drain', this.boundDrainQueue );
    this.write( 'opened log' );
  }

  drainQueue () {
    if( this.queue.length > 0 && this.stream ) {
      var str = this.queue.join('');
      this.queue = [];
      this.writeOK = this._writeString(str);
    }
  }

  logRequest (req,res,exception) {
    var ip = req.ip;
    
    var currdate = this.formatNowForName();
    if( currdate !== this.logdate ) {
      this.makeStream();
    }
    var date    = new Date() + '';
    var ua      = req.headers['user-agent'];
    var status  = res.statusCode;
    var url     = urlParse(req.url,true);
    
    url = { path: url.pathname, q: url.query };

    var entry = { ip, status, url, ua, date };

    if( 'referer' in req.headers ) {
      entry.ref = req.headers['referer'];
    }

    if( exception ) {
      entry.exception = exception + '';
      entry.stack     = exception.stack || 'no stack available';
    }
    
    this.write( entry );
  }

  write (obj) {
    if( typeof obj === 'string' ) {
      obj = { msg: obj };
    }
    if( !('ua' in obj ) ) {
      obj.ua = 'server';
    }
    if( !('date' in obj) ) {
      obj.date = new Date() + '';
    }
    var json = JSON.stringify(obj);
    this.writeString( json + ',\n' );
  }

  _writeString (str) {
    if( this.stream ) {
      return this.stream.write(str.replace( /[^\x00-\x7F]/g, ' '));
    }
    return false;
  }

  writeString (str) {
    if( this.writeOK ) {
      this.writeOK = this._writeString(str);
    } else {
      this.queue.push(str);
    }  
  }

  formatNowForName () {
    function two(s) {
      const t = { ten: 10 };
      if( Number(s) < t.ten) {
        return '0' + s;
      }
      return s;
    }

    var d = new Date();
    var curr_date = two(d.getDate());
    var curr_month = two(d.getMonth() + 1); //Months are zero based
    var curr_year = d.getFullYear();
    return ( curr_year + '-' + curr_month + '-' + curr_date );
  }

  end () {
    this.drainQueue();
    if( this.stream ) {
      this.stream.end();
    }
  }

}

module.exports = LogWriter;
