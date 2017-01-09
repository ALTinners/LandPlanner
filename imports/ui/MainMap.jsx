import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { Session } from 'meteor/session';

//Leaflet Maps
import L from 'leaflet';
import { Map, GeoJSON, LayersControl, WMSTileLayer, FeatureGroup, Marker, Popup, Circle } from 'react-leaflet';
import { EditControl } from "react-leaflet-draw";
import { LeafletDraw } from "leaflet-draw";

var turf = require( "turf" );

import _ from 'lodash';

import InlineEdit from 'react-edit-inline';

import { createContainer } from 'meteor/react-meteor-data';

import {Categories, Features} from '../api/shapes.js';

class MainMap extends Component {
  constructor(props) {
    super(props);
    //Define starting state here
    this.state = {
      blockClickSelection: false,
    };
  }

  setBlockClickSelection(block) {
    this.setState( {blockClickSelection: block} );
    this.refreshEditableLayers(this.props);
  }

  componentWillReceiveProps(nextProps) {
    //This is the entry feature for what defines a "selected layer"
    //This layer is added seperately from other, unselected layers
    this.hasEditableLayers = false;
    if (this.editableLayerGroup == null) { return; }

    //Remove the selectedFeature if not found in current features
    if (this.props.feature && !nextProps.features.find( (feat) => feat._id == this.props.feature._id)) {
      this.props.updateFeatureCallback(null);
    }

    this.refreshEditableLayers(nextProps);
  }

  componentDidUpdate() {
    //This is for the initial state, where you can end up with cases where the
    //above code does not load
    if (this.hasEditableLayers == true ||   //This code is not run if componentWillReceiveProps() ran successfully
      this.editableLayerGroup == null) { return; }

    this.refreshEditableLayers(this.props);
  }

  refreshEditableLayers(propData) {
    //This is the entry point for the editable layers
    //This is separate from uneditable layers; see componentWillReceiveProps()
    this.editableLayerGroup.leafletElement.clearLayers();

    L.geoJson(propData.features, {
      onEachFeature: this.addEditableFeatures.bind(this, propData),
    });
    this.hasEditableLayers = true;
  }

  addEditableFeatures(nextProps, feature, layer) {
    //Colour the layer
    let currentCategory = nextProps.categories.find( (category) => category._id == feature.properties.categoryID );
    layer.options.color = currentCategory.colour;
    layer.options.opacity = (feature._id == _.get(nextProps.feature, '_id') ? 0.8 : 0.6);
    layer.options.fillOpacity = (feature._id == _.get(nextProps.feature, '_id') ? 0.6 : 0.4);
    layer.options.weight = (feature._id == _.get(nextProps.feature, '_id') ? 6 : 4);


    //Add below to re-enable category selection on click
    //This currently interferes with Leaflet delete
    if (!this.state.blockClickSelection) {
      layer.on('click', this.updateSelectedFeature.bind(this));
    }

    //The selected layer needs to be added to the editableLayerGroup to do editing with it
    //Not done if no layer is selected or the layer category is hidden
    if (feature.properties.isShown == true) {
      if (nextProps.category != null &&
        feature.properties.categoryID == nextProps.category._id) {
        this.editableLayerGroup.leafletElement.addLayer(layer);
      }
    }
  }

  addNewFeature(event) {
    var type = event.layerType,
        layer = event.layer;

    var newJSON = layer.toGeoJSON();
    //All JSON produced should have a geometry.type value, but its good to check
    newJSON.properties.name = "New " + (newJSON.geometry.type != null ? newJSON.geometry.type : "Feature");

    Meteor.call('Feature_Create', this.props.snapshot, this.props.category, newJSON);
  }

  editFeature(event) {
    var featureCollection = event.layers.toGeoJSON();

    featureCollection.features.map( (feature) =>
      Meteor.call('Feature_UpdateGeometry', feature)
    );
  }

  deleteFeatures(event) {
    //This function is called once with a list of removed features
    //Iterate and remove each one
    var featureCollection = event.layers.toGeoJSON();
    featureCollection.features.map( (feature) =>
      Meteor.call('Feature_Delete', feature)
    );

    //Remove the selected feature prop, if it has been deleted
    if ( this.props.feature != null ) {
      for ( feature of featureCollection.features ) {
        if (_.get(feature, "_id") == _.get(this.props.feature, "_id")) {
          this.props.updateFeatureCallback(null);
        }
      }
    }
  }

  addUneditableLayers() {
    let idVar = (this.props.category == null ? 0 : this.props.category._id);  //Check for existence of category as a property
    //We are removing shapes that have been added as editable layers
    //And features that are not visible

    //Filter editable features out, if they exist
    var potentialFeatures =  this.props.features.filter( feature => feature.properties.categoryID != idVar );

    //Editable features get a label, so filter them
    var labellableFeatures =  this.props.features.filter( feature => feature.properties.categoryID == idVar );

    //Filter the editable category, if it exists
    var plottableCategories = this.props.categories.filter( (category) => (category.isShown & category._id != idVar ) );

    //Iterate over categories, check if that category is visible and remove the non-visible ones
    //Put the data in a seperate var for easiness
    var plottableFeatures = [];
    for (category of plottableCategories) {
      for (feature of potentialFeatures) {
        if (category._id == feature.properties.categoryID) {
          plottableFeatures.push(feature);
        }
      }
    }

    var leafletObjects = plottableFeatures.map( this.generateLayerForCategory.bind(this) );
    leafletObjects.push(labellableFeatures.map( this.generateLabelForFeature.bind(this) ));
    return leafletObjects;
  }

  generateLayerForCategory(feature) {
    //Find category colour and make a style
    var category = Categories.findOne( { _id:feature.properties.categoryID } );
    var style = {
        color: category.colour,
        weight: 3,
        opacity: 0.3,
    }

    //We need a random key for Leaflet's id-ing
    var randomKey = Math.floor(Math.random() * 10000) + 1;

    return (
      <GeoJSON
        key={ 'key-' + randomKey }
        data={feature}
        style={style}
        onClick={!this.state.blockClickSelection ? this.updateSelectedFeature.bind(this) : function() {} }
      />
    );
  }

  generateLabelForFeature(feature) {
    //We need a random key for Leaflet's id-ing
    var randomKey = Math.floor(Math.random() * 10000) + 1;

    var myIcon = L.divIcon(
      {
        html: feature.properties.name,
        className: "divIcon"
      }
    );

    //Need to invert the turf result; its is lnglat, we need latlng
    return (
      <Marker
        key={ 'key-' + randomKey }
        icon={myIcon}
        position={turf.centroid(feature).geometry.coordinates.reverse()}
      />
    );
  }

  updateSelectedFeature(event) {
    //This event may come in 2 ways
    //1st from a currently selected layer. This gives event.target.feature.
    //2nd is from a non-selected layer. This gives event.layer.feature.
    //Do event.layer first, then event.target second
    var feature = null;
    if (event.layer) {
      feature = event.layer.feature;
    } else if (event.target) {
      feature = event.target.feature;
    } else {
      return;
    }

    if (feature.properties.categoryID != null &&
        this.props.updateFeatureCallback != null) {
      // var catID = feature.properties.categoryID;
      // var category = this.props.categories.find( (cat) => cat._id == catID );

      this.props.updateFeatureCallback(feature);
    }
  }

  showFeatureInformationInTitle() {
    if (this.props.feature != null) {
      var feature = this.props.feature;

      //All features should have a name
      var name = (feature.properties.name != null ?
                    feature.properties.name : "No Name");

      var className = "categoryList_nameCtrl";
      var className_active = "categoryList_nameCtrl_active";
      var measurement = "";

      //We do an area calc for a polygon
      if (feature.geometry.type == "Polygon") {
        var area = (turf.area(feature) / 10000).toFixed(2); //10000 m^2 to the ha
        var dist = (turf.lineDistance(feature)).toFixed(2);
        measurement = " - " + area + " ha - " + dist + " km perimeter";
      //And a distance for a line
      } else if (feature.geometry.type == "LineString") {
        var dist = (turf.lineDistance(feature)).toFixed(2);
        measurement = " - " + dist + " km";
      }
      return (
        <div>
          <InlineEdit
            title="Click to edit"
            className={className}
            activeClassName={className_active}
            text={name}
            paramName="message"
            change={this.updateSelectedFeatureName.bind(this)}
          />
          <span>{measurement}</span>
        </div>
      );
    } else {
      return (
        null
      );
    }
  }

  updateSelectedFeatureName(event) {
    if (event.message != "" && this.props.feature != null) {
      //To update one field we need to update the whole object
      var tempFeature = this.props.feature;
      tempFeature.properties.name = event.message;
      Meteor.call('Feature_UpdateProperties', tempFeature);
    }
  }

  render() {
    const position = [-34.953869, 149.548314];

    //Removing and re-adding the EditControl causes multiple onCreated events to figure
    //As a workaround, we pass in disabled for all drawing tools if snapshot or category are undefined
    var drawOptions = {
      circle: false,
    };
    //Adds edit controls when a category is selected
    if (!this.props.snapshot || !this.props.category) {
      drawOptions = {
        polyline: false,
        polygon: false,
        circle: false,
        rectangle: false,
        marker: false
      };
    }

    return (
      <div id="mapContainer">
        <div id="mapTitle">
          {this.showFeatureInformationInTitle()}
        </div>

        <Map center={position} zoom={14} id="myMap" class="map" ref={(ref) => this.leafletMap = ref}>
          <LayersControl position='topright'>
            <LayersControl.BaseLayer name='NSW Imagery' checked={true}>
              <WMSTileLayer
                url='http://maps.six.nsw.gov.au/arcgis/services/public/NSW_Imagery/MapServer/WMSServer?'
                layers = 'BestImageryDates'
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name='NSW Topographical'>
              <WMSTileLayer
                url='http://maps.six.nsw.gov.au/arcgis/services/public/NSW_Topo_Map/MapServer/WMSServer?'
                layers = 'TopoCurrent'
              />
            </LayersControl.BaseLayer>
          </LayersControl>

          <FeatureGroup ref={(ref) => this.editableLayerGroup = ref}>
            <EditControl
              position='topleft'
              onEdited={this.editFeature.bind(this)}
              onCreated={this.addNewFeature.bind(this)}
              onDeleted={this.deleteFeatures.bind(this)}
              onDeleteStart={this.setBlockClickSelection.bind(this, true)}
              onDeleteStop={this.setBlockClickSelection.bind(this, false)}
              ref={(ref) => this.editControl = ref}
              draw={drawOptions}
            />
          </FeatureGroup>

          {this.addUneditableLayers()}

        </Map>
      </div>
    );
  }
}

export default createContainer(() => {
  Meteor.subscribe('categories');
  Meteor.subscribe('features');

  return {
    categories: Categories.find({snapshotID: Session.get("currentSnapshotID")}).fetch(),
    features: Features.find({"properties.snapshotID": Session.get("currentSnapshotID")}).fetch(),
  };
}, MainMap);
