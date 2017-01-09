import React, { Component, PropTypes } from 'react';
import { createContainer } from 'meteor/react-meteor-data';

//Variable title for JIRA related tables
export default class JiraTitle extends Component {
  constructJiraHTML() {
    if (this.isValidJira()) {
      return (<a href={this.generateJiraLink()} target="_blank">{this.generateJiraTitle()}</a>);
    } else {
      return (<span />);
    }
  }

  extractNameAndTicket(parseText) {
    //Pulls a Jira Board title from the text. Not case sensitive
    var title = /(CSD|MR|SP)/i.exec(parseText);
    var pulledText = parseText.replace(/(CSD|MR|SP)/i, "");

    //Pulls numerical figures from the text
    var numbers = /\d+/g.exec(pulledText);
    pulledText = pulledText.replace(/\d+/g, "");

    //Can this be an object? Better to check for existence of vars
    var array = [title, numbers];

    //Test for remnants in the string. Only allows space or -
    //If failed, return null arrays
    if ( /^[\s-]+$/.test(pulledText) == false ) {
      array = [null, null];
    }

    return array;
  }

  //Parses the title and returns true if good
  isValidJira() {
    var results = this.extractNameAndTicket(this.props.task.text);
    return (results[0] != null && results[1] != null);
  }
  //Generates a link to Smartrak Atlassian page
  generateJiraLink() {
    var results = this.extractNameAndTicket(this.props.task.text);
    if (results[0] != null && results[1] != null) {
      return "https://smartrak.atlassian.net/browse/" + results[0][0] + "-" + results[1][0];
    } else {
      return "https://smartrak.atlassian.net";
    }
  }
  //Generates standard text for a Jira Ticket
  generateJiraTitle() {
    var results = this.extractNameAndTicket(this.props.task.text);
    if (results[0] != null && results[1] != null) {
      return results[0][0].toUpperCase() + "-" + results[1][0];
    } else {
      return this.props.task.text;
    }
  }

  render() {
    return ( this.constructJiraHTML() );
  }
}
