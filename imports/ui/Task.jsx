import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { createContainer } from 'meteor/react-meteor-data';

//Drag and drop requirements
import { DragSource, DropTarget } from 'react-dnd';
import ItemTypes from './dragDropConstants.js';
import HTML5Backend from 'react-dnd-html5-backend';

import { Tasks, Tasks_Increment, Tasks_Decrement, Tasks_Swap } from '../api/tasks.js';
import JiraTitle from './JiraTitle.jsx';

function reverse(s) {
  var o = '';
  for (var i = s.length - 1; i >= 0; i--)
    o += s[i];
  return o;
}

const taskSource = {
  beginDrag(props) {
    return {
      task: props.task,
    };
  }
};

const taskTarget = {
  hover(props, monitor, component) {
    const dragIndex = monitor.getItem().task.priority;
    const hoverIndex = props.task.priority;

    // Don't replace items with themselves
    if (dragIndex === hoverIndex) {
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

    // Dragging downwards
    if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
      return;
    }

    // Dragging upwards
    if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
      return;
    }

    // Time to actually perform the action
    // props.moveCard(dragIndex, hoverIndex);

    // Note: we're mutating the monitor item here!
    // Generally it's better to avoid mutations,
    // but it's good here for the sake of performance
    // to avoid expensive index searches.
    // monitor.getItem().index = hoverIndex;
  },

  drop(props, monitor, component) {
    const dragID = monitor.getItem().task._id;
    const hoverID = props.task._id;

    // Don't replace items with themselves
    if (dragID === hoverID) {
      return;
    }

    Tasks_Swap(dragID, hoverID);
  },
};

class Task extends Component {
  constructor(props) {
    super(props);

    this.state = {
      isEditing: false,
    };
  }

  toggleChecked() {
    // Set the checked property to the opposite of its current value
    Tasks.update(this.props.task._id, {
      $set: { checked: !this.props.task.checked },
    });
  }

  toggleEditing(props) {
    // Set the checked property to the opposite of its current value
    this.setState({isEditing: !this.state.isEditing});
  }

  updateThisTask(event) {
    // Prevent default browser form submit
    event.preventDefault();
    // Find the text field via the React ref
    const newText = ReactDOM.findDOMNode(this.refs.editCtrl).value.trim();

    Tasks.update(this.props.task._id, {
      $set: {
        text : newText,
      },
    });

    // Clear form
    ReactDOM.findDOMNode(this.refs.editCtrl).value = '';

    this.setState({'isEditing': false});
  }

  deleteThisTask() {
    var deletedPriority = this.props.task.priority;
    console.log('Delete ' + this.props.task._id);
    Tasks.remove(this.props.task._id);

    //Decrement all priorities above this one
    Tasks.find({ priority: {$gt: deletedPriority} }).forEach( function(nextTask, index) {
      Tasks.update(nextTask._id, {
        $set: { priority : nextTask.priority - 1 },
      });
    });
  }

  incrementThisTask() {
    var upperTask = Tasks.findOne({ priority: this.props.task.priority + 1});
    if (upperTask) {
      Tasks.update(upperTask._id, {
        $set: { priority : this.props.task.priority },
      });
      Tasks.update(this.props.task._id, {
        $set: { priority : this.props.task.priority + 1 },
      });
      console.log("Incremented to " + (this.props.task.priority + 1));
    } else {
      console.log("At max priority");
    }
  }

  decrementThisTask() {
    var lowerTask = Tasks.findOne({ priority: this.props.task.priority - 1});
    if (lowerTask) {
      Tasks.update(lowerTask._id, {
        $set: { priority : this.props.task.priority },
      });
      Tasks.update(this.props.task._id, {
        $set: { priority : this.props.task.priority - 1 },
      });
      console.log("Decremented to " + (this.props.task.priority - 1));
    } else {
      console.log("At least priority");
    }
  }

  generateCheckbox() {
    return (
      <input
        type="checkbox"
        readOnly
        defaultChecked={this.props.task.checked}
        onClick={this.toggleChecked.bind(this)}
      />
    );
  }

  extractNameAndTicket(parseText) {
    //This is a reversed regex. The it will find jira tickets in a reversed string
    var jiraRegex = /\d+-[A-Z]+(?!-?[a-zA-Z]{1,10})/i;
    var pulledText = reverse(parseText);
    var title = jiraRegex.exec(pulledText);
    pulledText = pulledText.replace(jiraRegex, "");
    if (title) {
      title = reverse(title[0].toUpperCase());
    }
    if (pulledText) {
      pulledText = reverse(pulledText.trim());
    }

    //Can this be an object? Better to check for existence of vars
    var array = [title, pulledText];
    return array;
  }

  //Generates a link to Smartrak Atlassian page
  generateJiraLink(results) {
    if (results[0] != null) {
      return ("https://smartrak.atlassian.net/browse/" + results[0]);
    } else {
      return ("");
    }
  }

  generateBodyOrForm() {
    if (this.state.isEditing) {
      return (
        <form class="editForm" className="taskForm" onSubmit={this.updateThisTask.bind(this)}>
          <input type="text" ref="editCtrl" defaultValue={this.props.task.text}/>
        </form>
      );
    } else {
      var titleAndBody = this.extractNameAndTicket(this.props.task.text);
      var validLink = (titleAndBody[0] ? "link" : "");
      return (
        <div class="container" className="bodyContainer">
          <a className={validLink} href={this.generateJiraLink(titleAndBody)} target="_blank">
            {titleAndBody[0]}
          </a>
          <span className="text" onClick={this.toggleEditing.bind(this, this.props)}>
            {titleAndBody[1]}
          </span>
        </div>
      );
    }
  }

  // connectDragSource(connectDropTarget(
  render() {
    // Give tasks a different className
    // <button onClick={this.changeListView.bind(this, "Points")}>
    //   Points
    // </button>
    // <button onClick={this.changeListView.bind(this, "Lines")}>
    //   Lines
    // </button>
    // <button onClick={this.changeListView.bind(this, "Areas")}>
    //   Areas
    // </button> when they are checked off,
    // so that we can style them nicely in CSS
    const taskClassName = this.props.task.checked ? 'checked' : '';

    const { connectDragSource, connectDropTarget } = this.props;

//
    return (
      connectDragSource(connectDropTarget(
        <li className={taskClassName}>
          {this.generateCheckbox()}
          {this.generateBodyOrForm()}

          <div class="container" className="buttonContainer">
            <button className="incrementButton" onClick={Tasks_Increment.bind(undefined, this.props.task)}>
              &#8593;
            </button>

            <button className="decrementButton" onClick={this.decrementThisTask.bind(this)}>
              &#8595;
            </button>

            <button className="delete" onClick={this.deleteThisTask.bind(this)}>
              &times;
            </button>
          </div>
        </li>
      )));
  }
}

//Format is TYPE, description of a few basic events to do with draggy droppy context
//And a function which collects connect and monitor for pushing context into the

Task = DropTarget(ItemTypes.TASK, taskTarget, connect => ({
  connectDropTarget: connect.dropTarget()
}))(Task);

Task = DragSource(ItemTypes.TASK, taskSource, (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging()
}))(Task);

export default Task;
