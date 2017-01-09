import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { createContainer } from 'meteor/react-meteor-data';

//Drag and drop requirements
import { DragSource, DropTarget } from 'react-dnd';
import ItemTypes from './dragDropConstants.js';
import HTML5Backend from 'react-dnd-html5-backend';

//Treeview and Inline things
import InlineEdit from 'react-edit-inline';

import _ from 'lodash';

import {Categories, Category_Delete, Category_Swap, Features} from '../api/shapes.js';

const featureSource = {
  beginDrag(props) {
    return {
      feature: props.feature,
    };
  }
};

const featureTarget = {
  hover(props, monitor, component) {
    // const dragIndex = monitor.getItem().category.priority;
    // const hoverIndex = props.category.priority;
    //
    // // Don't replace items with themselves
    // if (dragIndex === hoverIndex) {
    //   return;
    // }
    //
    // // Determine rectangle on screen
    // const hoverBoundingRect = ReactDOM.findDOMNode(component).getBoundingClientRect();
    //
    // // Get vertical middle
    // const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
    //
    // // Determine mouse position
    // const clientOffset = monitor.getClientOffset();
    //
    // // Get pixels to the top
    // const hoverClientY = clientOffset.y - hoverBoundingRect.top;
    //
    // // Only perform the move when the mouse has crossed half of the items height
    // // When dragging downwards, only move when the cursor is below 50%
    // // When dragging upwards, only move when the cursor is above 50%
    //
    // // Dragging downwards
    // if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
    //   return;
    // }
    //
    // // Dragging upwards
    // if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
    //   return;
    // }
    //
    // // Time to actually perform the action
    // props.moveCard(dragIndex, hoverIndex);
  },

  drop(props, monitor, component) {
    const dragID = monitor.getItem().feature._id;
    const hoverID = props.feature._id;

    // Don't replace items with themselves
    if (dragID === hoverID) {
      return;
    }

    // Category_Swap(dragID, hoverID);
  },
};

class FeatureList extends Component {
  constructor(props) {
    super(props);

    //Define starting state here
    this.state = {
      isEditing: false,
    };
  }

  setFeatureFocus() {
    this.props.updateFeatureCallback(this.props.feature);
  }

  //
  render() {
    const { connectDragSource, connectDropTarget } = this.props;

    //Special markup for selected category
    var isSelected = false;
    if (this.props.selectedCategory != null &&
        this.props.selectedCategory._id == this.props.category._id) {
      isSelected = true;
    }

    return (
      connectDragSource(connectDropTarget(
        <li
          className={(_.get(this.props.selectedFeature, "_id") == this.props.feature._id ? "featureList_selected" : "featureList")}
          key={this.props.feature._id}
          onClick={this.setFeatureFocus.bind(this)} >
          {this.props.feature.properties.name}
        </li>
      ))
    );
  }
}

FeatureList = DropTarget(ItemTypes.FEATURE, featureTarget, connect => ({
  connectDropTarget: connect.dropTarget()
}))(FeatureList);

FeatureList = DragSource(ItemTypes.FEATURE, featureSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
}))(FeatureList);

export default createContainer(() => {
  return {
  };
}, FeatureList);
