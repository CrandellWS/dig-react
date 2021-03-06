import QueryFilter  from '../query-filter';

class Artist extends QueryFilter
{
  constructor() {
    super(...arguments);
    this._propName    = 'user';
    this._displayName = 'Artist';
  }

  get isDirty() {
    // does not participate in 'reset'
    return false; 
  }
}

Artist.propertyName = 'artist';

module.exports = Artist;