import UploadList  from './upload-list';
import ccmixter    from '../models/ccmixter';
import serialize   from '../models/serialize';

class Playlist extends UploadList {

  constructor() {
    super(...arguments);
  }

  /* protected */

  fetch(queryParams) {
    return this.query(queryParams).then( serialize(ccmixter.Upload) );
  }
}

// performs the query but returns the store
// from the promise (which contains the result
// of the query in the .model property )
//
// very handy for routing
//
Playlist.storeFromQuery = function(params) {
  var pl = new Playlist();
  return pl.getModel(params).then( () => pl );  
};

module.exports = Playlist;
