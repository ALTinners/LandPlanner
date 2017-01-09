import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { createContainer } from 'meteor/react-meteor-data';
import { Session } from 'meteor/session';

//Drag and drop requirements
import { DragSource, DropTarget } from 'react-dnd';
import ItemTypes from './dragDropConstants.js';
import HTML5Backend from 'react-dnd-html5-backend';

//Treeview and Inline things
import TreeView from 'react-treeview';
import InlineEdit from 'react-edit-inline';

import _ from 'lodash';

import {Categories, Features} from '../api/shapes.js';
import FeatureList from './FeatureList.jsx'

const categorySource = {
  beginDrag(props) {
    return {
      category: props.category,
    };
  }
};

const categoryTarget = {
  hover(props, monitor, component) {
    if (monitor.getItemType() == "category") {
      const dragCategory = monitor.getItem().category;
      const hoverCategory = props.category;

      // Don't replace items with themselves
      if (dragCategory == null || hoverCategory == null || dragCategory._id === hoverCategory._id) {
        return;
      }

      // Determine rectangle on screen
      const hoverBoundingRect = ReactDOM.findDOMNode(component).getBoundingClientRect();

      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;

      // Determine mouse position
      const clientOffset = monitor.getClientOffset();

      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%

      // // Dragging downwards
      // if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      //   return;
      // }
      //
      // // Dragging upwards
      // if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      //   return;
      // }

      // Time to actually perform the action
      props.moveCard(dragCategory, hoverCategory);

    } else if (monitor.getItemType() == "feature") {
      //We draw the features based on the state
      props.modifyTemporaryFeature(component.props.category, monitor.getItem().feature);

    }
  },

  drop(props, monitor, component) {
    if (monitor.getItemType() == "category") {
      const dragID = monitor.getItem().category._id;
      const hoverID = props.category._id;

      // Don't replace items with themselves
      if (dragID === hoverID) {
        return;
      }

      Meteor.call("Category_Swap", dragID, hoverID);

    } else if (monitor.getItemType() == "feature") {
      var feature = monitor.getItem().feature;
      const hoverID = props.category._id;

      Meteor.call('Feature_SwapCategory', feature._id, hoverID);
    }
  },
};

class CategoryList extends Component {
  constructor(props) {
    super(props);

    //Define starting state here
    this.state = {
      isEditing: false,
      features: this.props.features,  //Although props is the actual representation of features
                                      //in the DB, the state features are used to perform drag and drops
                                      //This state array is used for drawing, but reset to the DB fetch result if
                                      //props update (see componentWillReceiveProps())
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({features: nextProps.features});
  }

  addFeatureToState(feature) {
    if (!this.state.features.find( (feat) => feat._id == feature._id )) {
      var tempFeatures = this.state.features;
      tempFeatures.push(feature);
      this.setState( {features: tempFeatures} );
    }
  }

  showDeleteButton() {
    if (this.props.isEditingOrDeletingFeatures) {
      return null;
    } else {
      return (
        <button className="categoryList_button" onClick={this.deleteCategory.bind(this)}>
          &times;
        </button>
      );
    }
  }

  toggleShown() {
    Meteor.call('Category_ShowHide', this.props.category._id, !this.props.category.isShown);
  }

  updateName(event) {
    if (event.message != "") {
      var tempCategory = this.props.category;
      tempCategory.name = event.message;
      Meteor.call('Category_Update', tempCategory)
    }
  }

  updateColour(event) {
    var tempCategory = this.props.category;
    tempCategory.colour = this.colourCtrl.value;
    Meteor.call('Category_Update', tempCategory)
  }

  deleteCategory() {
    if (!confirm("Deleting this category will delete all features associated with it.\n\
            Do you wish to delete this category?")) {
      return;
    }

    //Category_Delete should remove all Features as part of the API call.
    Meteor.call("Category_Delete", this.props.category);
  }

  toggleEditing() { this.setState({isEditing: !this.state.isEditing}); }

  showCategoryItems() {
    //Only show features for the specific category
    var featuresForCategory = this.props.features.filter(
        (feature) => feature.properties.categoryID == this.props.category._id );

    if (featuresForCategory.length > 0) {
      return ( featuresForCategory.map((feature) =>
        ( <FeatureList
            key={feature._id}
            feature={feature}
            category={this.props.category}
            selectedFeature={this.props.selectedFeature}
            selectedCategory={this.props.selectedCategory}  //Category object that is selected. May be null
            updateFeatureCallback={this.props.updateFeatureCallback}  //Update for name change, colour and visible bool
            updateCategoryCallback={this.props.updateCategoryCallback}  //Update for name change, colour and visible bool
          />
        )) );
    } else {
      return ( <li>No Items</li> );
    }
  }

  setCategoryFocus() {
    this.props.updateCategoryCallback(this.props.category);
  }

  customValidateText() { return true; }

  //
  render() {
    const { connectDragSource, connectDropTarget, connectDragPreview } = this.props;

    //Special markup for selected category
    var isSelected = false;
    if (this.props.selectedCategory != null &&
        this.props.selectedCategory._id == this.props.category._id) {
      isSelected = true;
    }

    var colour = this.props.category.colour;
    var pixelWidth = (_.isEqual(this.props.category, this.props.selectedCategory) ? "8" : "4");
    var style = {
      borderLeft: colour + " solid " + pixelWidth + "px",
    };

    return (
      connectDragPreview( connectDropTarget(
        <li className={isSelected ? 'categoryList_selected' : 'categoryList'}
          style={style}
          onClick={this.setCategoryFocus.bind(this)}>
          <div className="catergoryList_header">
            {connectDragSource(
              <span className="categoryList_dragHandle"><strong>&#9776;</strong></span>
            )}
            <div className="catergoryList-checkbox-container">
              <input
                className="catergoryList-checkbox"
                type="checkbox"
                readOnly
                defaultChecked={this.props.category.isShown}
                onClick={this.toggleShown.bind(this)}
              />
            </div>

            <InlineEdit
              title="Click to edit"
              validate={this.customValidateText}
              className="categoryList_nameCtrl"
              activeClassName="categoryList_nameCtrl_active"
              text={this.props.category.name}
              paramName="message"
              change={this.updateName.bind(this)}
            />

            <div className="catergoryList_buttonHolder">
              <input
                type="color"
                ref={(ref) => this.colourCtrl = ref}
                className="colourCtrl"
                defaultValue={this.props.category.colour}
                onChange={this.updateColour.bind(this)}
              />

              {this.showDeleteButton()}
            </div>
          </div>
          <div className="catergoryList_body">
            <ul>
              {this.showCategoryItems()}
            </ul>
          </div>
        </li>
      ))
    );
  }
}

CategoryList = DropTarget([ItemTypes.FEATURE, ItemTypes.CATEGORY], categoryTarget, connect => ({
  connectDropTarget: connect.dropTarget()
}))(CategoryList);

CategoryList = DragSource(ItemTypes.CATEGORY, categorySource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging()
}))(CategoryList);

export default createContainer(() => {
  Meteor.subscribe('features');

  return {};
}, CategoryList);
