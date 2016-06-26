import React from 'react';
import Glyph from './Glyph';

var DeadLink = React.createClass({

  onClick(e) {
    e.stopPropagation();
    e.preventDefault();
    this.props.onClick && this.props.onClick();
  },

  render() {
    return (<a className="deadlink" {...this.props} href="#" onClick={this.onClick} >{this.props.icon && <Glyph icon={this.props.icon} />}{this.props.text}{this.props.children}</a>);
  }
});


module.exports = DeadLink;