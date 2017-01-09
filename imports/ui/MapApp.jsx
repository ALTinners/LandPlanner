import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { createContainer } from 'meteor/react-meteor-data';
import { Session } from 'meteor/session';

import {Snapshots, Categories, Features} from '../api/shapes.js';

import L from 'leaflet';
import MainMenu from './MainMenu.jsx';
import MainMap from './MainMap.jsx';

import _ from 'lodash';

//Drag and drop requirements
import { DragDropContext } from 'react-dnd';
import ItemTypes from './dragDropConstants.js';
import HTML5Backend from 'react-dnd-html5-backend';

// App component - represents the whole app
class MapApp extends Component {
  constructor(props) {
    super(props);

    //Reset the hacky variable for the currentSnapshotID
    Session.set("currentSnapshotID", null);

    //Define starting state here
    this.state = {
      snapshot: null,
      category: null,
    };
  }

  compnentWillMount() {
    this.selectSnapshot( this.props.snapshots.find( (snap) => snap._id == "1") );
  }

  componentWillReceiveProps(nextProps) {
    //Check if the snapshot we had selected is still here. If not, reset to no snapshot
    if (!nextProps.snapshots.find( (snap) => snap._id == _.get(this.state.snapshot, '_id' ))) {
      this.selectSnapshot( nextProps.snapshots.find( (snap) => snap._id == "1") );
    }

    //If the category changes (name, isVisible, etc) OR the snapshot changes and the cat is no longer visible
    //Then the state (which determines props for everything else) should be updated
    if (this.state.category != null) {
      var nextCat = nextProps.categories.find( (cat) => this.state.category._id == cat._id );
      if (nextCat) {
        this.selectCategory(nextCat);
      } else {
        this.selectCategory(null);
      }
    }

    //Same for features
    if (this.state.feature != null) {
      var nextFeat = nextProps.features.find( (feat) => this.state.feature._id == feat._id );
      if (nextFeat) {
        this.selectFeature(nextFeat);
      } else {
        this.selectFeature(null);
      }
    }
  }

  selectSnapshot(newSnapshot) {
    if (this.state.snapshot != newSnapshot) {
      Session.set( "currentSnapshotID", (newSnapshot != null ? newSnapshot._id : null) );
      this.setState({
          snapshot: newSnapshot,
          category: null,
          feature: null
       });
     }
  }

  selectCategory(newCategory) {
    if (  newCategory == null || !_.isEqual(this.state.category, newCategory) ) {
      console.log("Update category");
      this.setState({
        category: newCategory,
      });

      if ( newCategory == null || _.get(this.state.feature, 'properties.categoryID') != _.get(newCategory, '_id') ) {
        console.log("nullify");
        this.selectFeature(null);
      }
    }
  }

  selectFeature(newFeature) {
    if ( newFeature == null || !_.isEqual(this.state.feature, newFeature) ) {
      let newState = {
        feature: newFeature,
      };
      if (newFeature != null) {
        newState.category = (this.props.categories.find( (cat) => cat._id == _.get(newFeature, 'properties.categoryID') ));
      }
      this.setState(newState);
    }
  }

  render() {
    return (
      <div className="mainContainer">
        <div className="flexbox-item fill-area content flexbox-item-grow andrew-cont">
          <MainMenu
            snapshot={this.state.snapshot}
            updateSnapshotCallback={this.selectSnapshot.bind(this)}
            category={this.state.category}
            updateCategoryCallback={this.selectCategory.bind(this)}
            feature={this.state.feature}
            updateFeatureCallback={this.selectFeature.bind(this)}
          />
          <MainMap
            snapshot={this.state.snapshot}
            updateSnapshotCallback={this.selectSnapshot.bind(this)}
            category={this.state.category}
            updateCategoryCallback={this.selectCategory.bind(this)}
            feature={this.state.feature}
            updateFeatureCallback={this.selectFeature.bind(this)}
          />
        </div>
      </div>
    );
  }
}



// export default MapApp;
export default createContainer(() => {
  Meteor.subscribe('snapshots');
  Meteor.subscribe('categories');
  Meteor.subscribe('features');

  return {
    snapshots: Snapshots.find({}).fetch(),
    categories: Categories.find({snapshotID: Session.get("currentSnapshotID")}).fetch(),
    features: Features.find({"properties.snapshotID": Session.get("currentSnapshotID")}).fetch(),
  };
}, DragDropContext(HTML5Backend)(MapApp) );
