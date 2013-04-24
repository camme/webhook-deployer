webhook-deployer
================

Deployer server app triggered by (github) webhooks

## Install

### Windows
You need, naturally, nodejs to run this. Just run the installer from [http://nodejs.org/](http://nodejs.org/).
To use it, you need to create a deploys.json in the app folder. 

Here are the basic steps to install it:

    git clone https://github.com/24hr-malmo/webhook-deployer
    cd webhook-deployer
    npm install
    npm run-script install-windows-service
  
When the windows service is installed, go inte Administrator tools/Services and change the user for the service to Network Service (no password). Also make sure the Network Service has rights to modify the folder that your command needs to access.
You also need to set up ssh keys for the Network Service user, if your repo is private at least.

Follow gits guide on how you do it in windows [here](https://help.github.com/articles/generating-ssh-keys#platform-windows).

After that, make sure the .ssh folder for the Network Service user has the keys and has the known_hosts file, so no problem might come when you interact with the git hub repo. 
In Windows 2008 R2, the Network Service home folder is at C:\Windows\ServiceProfiles\NetworkService. Make sure the .ssh folder is there with the ssh keys etc.
  
Now that the service is running, create a deploys.json that contains info about what the deployer will accept.

### Ubuntu/OSX

Here are the basic steps to install it:

    git clone https://github.com/24hr-malmo/webhook-deployer
    cd webhook-deployer
    npm install
    npm install -g forever
    forever start index.js

Now that the service is running, create a deploys.json that contains info about what the deployer will accept. 
    
## Config
Create a deploys.json (there is an deploys.json.example to look at) inside the folder where you cloned webhook-deployer. 
Config it with the following format:

    {
        "deploys": [{
            "name": "Your deploy name",
            "type": "github",
            "repo": "[the repo url in https format, example https://github.com/24hr-malmo/webhook-deployer]",
            "basepath": "[path to where the deploy command will run]",
            "command": "[the command to run]",
            "branch": "[what branch to react to]"
        }]
    }
  
So an actual example might look like this:

    {
        "deploys": [{
            "name": "Deploy webhook deploy",
            "type": "github",
            "repo": "https://github.com/24hr-malmo/webhook-deployer",
            "basepath": "/var/node/webhook-deployer",
            "command": "git pull",
            "branch": "master"
        }]
    }

You also need to add the webhook to your github repo. The call should be made to http://your.cool.server:8080/incoming/yourcoolprojectname

The above example would run "git pull" whenever a push to the master branch for https://github.com/24hr-malmo/webhook-deployer is made.

  
