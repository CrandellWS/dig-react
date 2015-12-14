import React              from 'react';
import Playlists          from '../../stores/playlists';
import { PlaylistWidget } from '../../components/playlists/Browse';


import Glyph             from '../../components/Glyph';
import { ExternalLink }  from '../../components/ActionButtons';
import Link              from '../../components/Link';

function TrackHeader(props) {
  var upload  = props.store.model.upload;
  var ccmLink = upload.url; // 'http://ccmixter.org/files/' + upload.artist.id + '/' + upload.id;
  var people  = '/people/' + upload.artist.id;
  return (
    <div className="page-header">
        <h1 className="center-text">
            <small><Glyph icon="music" /> {"playlists with "}</small> {upload.name}
        </h1>
        <div className="track-headinfo center-text">
          <Link className="track-user-link" href={people} >{upload.artist.name}</Link>
          <ExternalLink href={ccmLink} className="btn btn-info" text="@ccMixter" />
        </div>
    </div>
    );
}

function track(props) {
  var store = props.store;
  return (        
    <div className="container-fluid playlist-detail-page">
      <TrackHeader store={store} />
      <PlaylistWidget store={store} />
    </div>
  );
}

track.path = '/files/:userid/:id';

track.title = 'Track';

track.store = function(params /*,queryParams */) {
  var id = { upload: params.id };
  return Playlists.storeFromQuery(id).then( store => {
    track.title = store.model.upload.name;
    return store;
  });
};

module.exports = track;

//