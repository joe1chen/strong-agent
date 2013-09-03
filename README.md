# strong-agent

Monitor and profile your node.js processes and clusters.

## Install

    npm install strong-agent

## Configure

An api key can be obtained by registering on the website(http://www.strongloop.com/ops) or by using the slc command:

    slc strongops

Configurations can go in your `package.json`, a `strongloop.json` config or environment variables.

### package.json

    {
      ...
      "name": <application name>,
      "strongAgentKey": <api key>,
      ...
    }

### strongloop.json

    {
      "key": <api key>,
      "appName": <application name>
    }
    
### environment

    SL_APP_NAME=<application name>
    SL_KEY=<api key>

## Profile

Then you simply need to add the following before you load up any modules you would like to instrument (db, modules, express, etc).

    require('strong-agent').profile();
    

    
    
    
    
