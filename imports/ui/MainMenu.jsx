import React, { Component, PropTypes } from 'react';
import ReactDOM from 'react-dom';
import { createContainer } from 'meteor/react-meteor-data';
import { Session } from 'meteor/session';

import {Snapshots, Categories, Features} from '../api/shapes.js';

import Select from 'react-select';
import 'react-select/dist/react-select.css';

import CategoryList from "./CategoryList.jsx";

class MainMenu extends Component {
  constructor(props) {
    super(props);

    //Define starting state here
    this.state = {
      isShowingCategoryForm : false,                  //Is the new Category form showing?
      isShowingSnapshotForm : false,
      listView      : "Categories",
      categories    : this.props.categories,  //Although props is the actual representation of category
                                              //in the DB, the state categories are used to perform drag and drops
                                              //This state array is used for drawing, but reset to the DB fetch result if
                                              //props update (see componentWillReceiveProps())
      features      : this.props.features,    //Same for features
    };
  }

  componentWillReceiveProps(nextProps) {
    //This is the entry feature for what defines a "selected layer"

     //Match the visual representation of categories (state variables) with updated DB vars
      this.setState( {categories: nextProps.categories} );
      this.setState( {features: nextProps.features} );
  }

  changeListView(newListView) {
    this.setState({
      listView: newListView,
    });
  }

  toggleShowCategoryForm() {
    this.setState({isShowingCategoryForm: !this.state.isShowingCategoryForm});
  }

  showCategoryForm() {
    if (this.state.isShowingCategoryForm) {
      return (
        <div className="newCategoryFormWrapper">
          <form className="newCategoryForm" onSubmit={this.addNewCategory.bind(this)} >
            <input type="text"   ref={(ref) => this.categoryNameCtrl = ref} defaultValue="New Category"/>
            <input type="color"  ref={(ref) => this.categoryColourCtrl = ref}/>
            <input type="submit" ref={(ref) => this.categorySubmitButton = ref} />
          </form>
        </div>
      );
    } else {
      return null;
    }
  }

  toggleShowSnapshotForm() {
    this.setState( {isShowingSnapshotForm : !this.state.isShowingSnapshotForm} );
  }

  showSnapshotForm() {
    if (this.state.isShowingSnapshotForm) {
      return (
        <div className="newCategoryFormWrapper">
          <form className="newSnapshotForm" onSubmit={this.changeSnapshotName.bind(this)} >
            <input type="text" ref={(ref) => this.snapshotNameCtrl = ref} defaultValue={this.props.snapshot.name}/>
            <input type="submit" ref={(ref) => this.snapshotSubmitButton = ref} />
          </form>
        </div>
      );
    } else {
      return null;
    }
  }

  //Create a new Category and push to DB
  addNewCategory(event) {
    event.preventDefault();

    // Find the text field via the React ref
    const name = this.categoryNameCtrl.value.trim();
    const colour = this.categoryColourCtrl.value;

    if (name == "") {
      console.error("The name for a new Category cannot be empty");
      return;
    }

    Meteor.call("Category_Create", this.props.snapshot, name, colour);

    // Clear form
    this.categoryNameCtrl.value = '';
    this.toggleShowCategoryForm();
    this.props.updateCategoryCallback();
  }

  changeSnapshotName(event) {
    event.preventDefault();

    // Find the text field via the React ref
    var tempSnapshot = this.props.snapshot;
    if (!tempSnapshot) {
      return;
    }
    tempSnapshot.name = this.snapshotNameCtrl.value.trim();

    if (tempSnapshot.name == "") {
      console.error("The name for a Snapshot cannot be empty");
      return;
    }

    Meteor.call("Snapshot_Update", tempSnapshot);

    // Clear form
    this.snapshotNameCtrl.value = '';
    this.toggleShowSnapshotForm();
  }

  //Adds a CategoryList drag/droppable element for each Category in the DB
  showCategories() {
    let categories = this.state.categories;
    return categories.map((category) => (
      <CategoryList
        key={category._id}  //Unique ID
        features={this.props.features}
        category={category} //JSON object rep'ing the category
        selectedCategory={this.props.category}  //Category object that is selected. May be null
        selectedFeature={this.props.feature}
        updateCategoryCallback={this.props.updateCategoryCallback}  //Update for name change, colour and visible bool
        updateFeatureCallback={this.props.updateFeatureCallback}  //Update for name change, colour and visible bool
        moveCard={this.moveCard.bind(this)}   //Drag and drop visual moving callback
        modifyTemporaryFeature={this.modifyTemporaryFeature.bind(this)}
      />
    ));
  }

  //Swaps two cards positions in the state representation of the categories. When a drop is called, the masterdata represented
  //by props.categories is overwritten, triggering another update of state in componentWillReceiveProps()
  //For display; a state representation of the categories is modified
  moveCard(dragCategory, hoverCategory) {
    let categories = this.state.categories;
    const dragIndex = categories.findIndex( (cat) => cat._id == dragCategory._id );
    const hoverIndex = categories.findIndex( (cat) => cat._id == hoverCategory._id );

    if (dragIndex == -1 || hoverIndex == -1) {
      return;
    }

    //Swap the two categories in the state rep
    let tempSwap = categories[hoverIndex];
    categories[hoverIndex] = categories[dragIndex];
    categories[dragIndex] = tempSwap;

    //Can probably be done more efficiently
    this.setState({
      categories: categories
    });
  }

  //Swaps two cards positions in the state representation of the categories. When a drop is called, the masterdata represented
  //by props.categories is overwritten, triggering another update of state in componentWillReceiveProps()
  //For display; a state representation of the categories is modified
  modifyTemporaryFeature(category, feature) {
    if (feature.properties.categoryID == category._id) {
      return;
    }

    let index = this.state.features.findIndex( (feat) => feat._id == feature._id );

    if (index >= 0) {
      let features = this.state.features;
      features[index].properties.categoryID = category._id;

      this.setState({
        features: features
      });
    }
  }

  addSnapshots() {
    return this.props.snapshots.map( (snapshot) => (
      <option key={snapshot._id}> {snapshot.name} </option>
    ));
  }

  cloneSnapshot() {
    if (this.props.snapshot) {
      Meteor.call('Snapshot_Clone', this.props.snapshot);
    }
  }

  commitSnapshot() {
    if (this.props.snapshot) {
      if (confirm("This will overwrite all data in the **Master** snapshot..\n\
              Do you wish to commit this snapshot to Master?"))
      {
          Meteor.call('Snapshot_MasterCommit', this.props.snapshot, this.props.updateSnapshotCallback);
      }
    }
  }

  deleteSnapshot() {
    if (this.props.snapshot) {
      if (confirm("Deleting this snapshot will delete all categories and features associated with it.\n\
              Do you wish to delete this snapshot?"))
      {
          Meteor.call('Snapshot_Delete', this.props.snapshot);
      }
    }
  }

  updateSelectedSnapshot(option) {
    var newSnapshot = this.props.snapshots.find( (snap) => snap._id == option.value );
    if (newSnapshot) {
      this.props.updateSnapshotCallback(newSnapshot);
      this.snapshotSelect.setValue(option.value);
    }
  }

  //With Snapshots; we need to ensure that Category editing tools
  // are not available if the Snapshots are not yet available
  showCategoryMenuItems() {
    if (this.props.snapshot != null) {
      return (
        <div>
          <div className="topMenuButton">
            <button onClick={this.toggleShowCategoryForm.bind(this)}>
              Add Category
            </button>
          </div>
          {this.showCategoryForm()}

          <ul>
            {this.showCategories()}
          </ul>
        </div>
      );
    } else {
      return null;
    }
  }

  render() {
    var snapshotMap = this.props.snapshots.map( (snapshot) => {
      return (
      {
        value: snapshot._id,
        label: snapshot.name,
      });
    });

    var selectValue = Session.get("currentSnapshotID");

    //The snapshot buttons are shown conditionally. The master should never be deleted
    var buttonDeleteSnapshot = null;
    var buttonRenameSnapshot = null;
    var buttonCommitSnapshot = null;
    var buttonCloneSnapshot = null;
    if (this.props.snapshot) {
      buttonCloneSnapshot = <button onClick={this.cloneSnapshot.bind(this)}>Clone</button>
      if (this.props.snapshot._id != "1") {
        buttonRenameSnapshot = <button onClick={this.toggleShowSnapshotForm.bind(this)}>Rename</button>
        buttonCommitSnapshot = <button onClick={this.commitSnapshot.bind(this)}>Overwrite Master</button>
        buttonDeleteSnapshot = <button onClick={this.deleteSnapshot.bind(this)}>Delete</button>
      }
    }

    return (
      <div className="mainMenu">

        <Select
          name="form-field-name"
          options={snapshotMap}
          onChange={this.updateSelectedSnapshot.bind(this)}
          value={selectValue}
          ref={(ref) => this.snapshotSelect = ref}
        />

        <div className="snapshotBox">
          {buttonRenameSnapshot}
          {buttonCloneSnapshot}
          {buttonDeleteSnapshot}
          {buttonCommitSnapshot}
        </div>

        {this.showSnapshotForm()}

        {this.showCategoryMenuItems()}

      </div>
    );
  }
}

export default createContainer(() => {
  Meteor.subscribe('snapshots');
  Meteor.subscribe('categories');
  Meteor.subscribe('features');

  return {
    snapshots: Snapshots.find({}).fetch(),
    categories: Categories.find({snapshotID: Session.get("currentSnapshotID")}, { sort: { priority: 1 } }).fetch(),
    features: Features.find({'properties.snapshotID': Session.get("currentSnapshotID")}).fetch(),
  };
}, MainMenu);
