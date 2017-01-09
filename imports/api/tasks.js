import { Mongo } from 'meteor/mongo';

const Tasks = new Mongo.Collection('tasks');

function Tasks_Increment(task) {
  console.log(task);
  var upperTask = Tasks.findOne({ priority: task.priority + 1});
  if (upperTask) {
    Tasks.update(upperTask._id, {
      $set: { priority : task.priority },
    });
    Tasks.update(task._id, {
      $set: { priority : task.priority + 1 },
    });
    console.log("Incremented to " + (task.priority + 1));
  } else {
    console.log("At max priority " + task.priority);
  }
}

function Tasks_Decrement(task) {
  var lowerTask = Tasks.findOne({ priority: task.priority - 1});
  if (lowerTask) {
    Tasks.update(lowerTask._id, {
      $set: { priority : task.priority },
    });
    Tasks.update(task._id, {
      $set: { priority : task.priority - 1 },
    });
    console.log("Decremented to " + (task.priority - 1));
  } else {
    console.log("At least priority" + task.priority);
  }
}

function Tasks_Swap(origID, destID) {
  let origTask = Tasks.findOne({ _id: origID});
  let destTask = Tasks.findOne({ _id: destID});
  if (origTask && destTask) {
    let origPriority = origTask.priority;
    let destPriority = destTask.priority;
    Tasks.update(origTask._id, {
      $set: { priority : destPriority },
    });
    Tasks.update(destTask._id, {
      $set: { priority : origPriority },
    });
  } else {
    console.log("Swap Failed");
  }
};

export {Tasks, Tasks_Increment, Tasks_Decrement, Tasks_Swap};
