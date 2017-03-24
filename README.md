LandPlanner
=========================

Built in Meteor with an optional seperate MongoDB instance for home server use. 

Download Meteor 1.4 here https://www.meteor.com/

Optionally, download the latest MongoDB version https://www.mongodb.com/download-center

In the root directory
```
meteor create --bare .
meteor add session
meteor add react-meteor-data
meteor npm install 
```

If using inbuilt Mongo (Meteor 1.4 is mostly up to date now) then run meteor in the console to build and boot

```
meteor
```

Else, if using BYO Mongo, set up the correct paths for your DB in startMongo.bat and then run. Then update startMeteor.bat to a valid Mongo database URL. Bat files are only for Windows.

