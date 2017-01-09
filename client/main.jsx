import React from 'react';
import { Meteor } from 'meteor/meteor';
import { render } from 'react-dom';

import MapApp from '../imports/ui/MapApp.jsx';

Meteor.startup(() => {
  render(<MapApp />, document.getElementById('render-target'));
});
