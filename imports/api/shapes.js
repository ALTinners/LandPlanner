import { Mongo } from 'meteor/mongo';
import { Session } from 'meteor/session';

// - Snapshots are a top level for a group of categories
// - Categories; which define groups of features
// - Features, which are the actual JSON objects
// - All 3 bits are kept sepearate as the updates get too big
const Snapshots = new Mongo.Collection('snapshots');
const Categories = new Mongo.Collection('categories');
const Features = new Mongo.Collection('features');

if (Meteor.isServer) {
  // This code only runs on the server
  Meteor.publish('snapshots', function snapshotsPublication() {
    return Snapshots.find();
  });
  Meteor.publish('categories', function categoriesPublication() {
    return Categories.find();
  });
  Meteor.publish('features', function featuresPublication() {
    return Features.find();
  });

  //Insert a Master with an ID of 1 if the DB is empty
  if (Snapshots.find({}).fetch().length == 0) {
    Snapshots.insert({
      _id : "1",
      name: "**Master**",
      createdDate: new Date(),
    });
  }
}

Meteor.methods({
  'Snapshot_Create'(name) {
    if (name && name != "Master") {
      return Snapshots.insert({
        name: name,
        createdDate: new Date(),
      });
    }
  },

  'Snapshot_Update'(snapshot) {
    if (snapshot.name) {
      Snapshots.update(snapshot._id, {
        $set: {
          name : snapshot.name,
        },
      });
    }
  },

  'Snapshot_Delete'(snapshot) {
    if (snapshot == null) {
      //Exception?
      return;
    } else if (snapshot._id == "1") {
      return;
    }

    Snapshots.remove(snapshot._id);

    Categories.find({"snapshotID": snapshot._id }).map(
      (cloneCategory) => {
        Meteor.call('Category_Delete', cloneCategory);
      }
    );
  },

  'Snapshot_Clone'(snapshot, updateSnapshotCallback) {
    //When cloning, we create a new snapshot
    if (snapshot == null) {
      //Exception?
      return;
    }

    let newSnapshotID = Meteor.call('Snapshot_Create', "Clone of " + snapshot.name);
    var newSnapshot = Snapshots.findOne( {_id: newSnapshotID} );

    //Then clone all the categories that match the original snapshot
    Categories.find({"snapshotID": snapshot._id }).map(
      (cloneCategory) => {
        let newCategoryID = Meteor.call('Category_Create', newSnapshotID, cloneCategory.name, cloneCategory.colour);
        Features.find({"properties.categoryID" :cloneCategory._id }).map(
          (cloneFeature) => {
            delete cloneFeature._id;
            Meteor.call('Feature_Create', newSnapshotID, newCategoryID, cloneFeature);
          }
        );
      }
    );

    return newSnapshot;
  },

  'Snapshot_MasterCommit'(snapshot, updateSnapshotCallback) {
    var masterSnapshot = Snapshots.findOne( {_id: "1'"} );

    Categories.remove( {snapshotID : snapshot._id} );
    Features.remove( {"properties.snapshotID" : snapshot._id} );

    Categories.update( {snapshotID : snapshot._id}, {
      $set: {
        snapshotID : "1",
      },
    });
    Features.update(  {"properties.snapshotID" : snapshot._id}, {
      $set: {
        "properties.snapshotID" : "1",
      },
    });

    Meteor.call('Snapshot_Delete', snapshot);

    updateSnapshotCallback(newSnapshot);

  },

  'Category_Create'(snapshot, name, colour) {
    if (snapshot && name && colour && name != "") {
      let count = Categories.find( {snapshotID : snapshot._id} ).fetch().length;
      let snapshotID = (typeof snapshot == 'object' ? snapshot._id : snapshot);

      return Categories.insert({
        snapshotID: snapshotID,
        name: name,
        colour: colour,
        isShown: true,
        priority: count,
      });
    } else {
      console.error("Did not create Category");
    }
  },

  'Category_Find'(categoryID) {
    return Categories.findOne({"_id": { $eq: categoryID }});
  },

  'Category_Update'(category) {
    if (category.name && category.colour) {
      Categories.update(category._id, {
        $set: {
          name : category.name,
          colour : category.colour,
        },
      });
    }
  },

  'Category_Delete'(category) {
    let snapshotID = category.snapshotID;
    Categories.remove(category._id);
    //Delete all sub categories
    Features.remove({"properties.categoryID" : {$eq: category._id}});

    var index = 0;
    Categories.find({"snapshotID": snapshotID }).map(
      (cat) => {
        Categories.update(cat._id, {
          $set: {
            priority : index,
          },
        });
        index++;
      }
    );
  },

  'Category_ShowHide'(categoryID, isShown) {
    Categories.update(categoryID, {
      $set: { isShown : isShown },
    });

    //Features should all mirror their parent category's status
    Features.update(
      { "properties.categoryID" : categoryID },
      { $set: { "properties.isShown" : isShown } },
      { multi: true }
    );
  },

  'Category_Swap'(origID, destID) {
    let origCategory = Categories.findOne({ _id: origID});
    let destCategory = Categories.findOne({ _id: destID});
    if (origCategory && destCategory) {
      let origPriority = origCategory.priority;
      let destPriority = destCategory.priority;
      Categories.update(origCategory._id, {
        $set: { priority : destPriority },
      });
      Categories.update(destCategory._id, {
        $set: { priority : origPriority },
      });
    }
  },

  'Feature_Create'(snapshot, category, newJSON) {
    if (snapshot != null && category != null && newJSON != null) {
      let snapshotID = (typeof snapshot == 'object' ? snapshot._id : snapshot);
      let categoryID = (typeof category == 'object' ? category._id : category);

      newJSON.properties.snapshotID = snapshotID;
      newJSON.properties.categoryID = categoryID;
      //As we can pass either the string ID or the object; we need to check both ways
      if (typeof category == 'object') {
        newJSON.properties.isShown = category.isShown;
      } else {
        newJSON.properties.isShown = Categories.findOne( {_id: categoryID} ).isShown;
      }
      Features.insert(
        newJSON,
      );
    }
  },

  'Features_FindForCategory'(categoryID) {
    return Features.find({"properties.categoryID": { $eq: categoryID }}).fetch();
  },

  'Feature_UpdateGeometry'(feature) {
    Features.update(feature._id, {
      $set: { geometry : feature.geometry },
    });
  },

  'Feature_UpdateProperties'(feature) {
    Features.update(feature._id, {
      $set: { properties : feature.properties },
    });
  },

  'Feature_Delete'(feature) {
    Features.remove(feature._id);
  },

  'Feature_SwapCategory'(featureID, newCategoryID) {
    let feature = Features.findOne( { _id: featureID} );
    let destCategory = Categories.findOne( { _id: newCategoryID} );
    if (feature && destCategory) {
      let properties = feature.properties;
      properties.categoryID = destCategory._id;

      //Cannot update anything beyond the first tier of a JSON structure
      Features.update(feature._id, {
        $set: { properties : properties },
      });
    }
  }
});

export {
  Snapshots,
  Categories,
  Features,
};
