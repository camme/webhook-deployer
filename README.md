webhook-deployer
================

Deployer server app triggered by (github) webhooks

## Install
    
### Ubuntu/OSX

On ubuntu just run

    npm install -g webhook-deployer

And the run it like this:

    webhook-deployer -c yourconfigfile

And if you want to run it as a daemon just add the -d option:

    webhook-deployer -c yourconfigfile -d
    
Here are all other options:

    Usage: webhook-deployer [options]

    Options:

        -h, --help                     output usage information
        -V, --version                  output the version number
        -p, --port [port]              Set the port number to use. Defaults to 8080
        -c, --configfile [configfile]  Set the path to the config file to be used. Default to ./deploys.json
        -d, --daemon                   Run the webhook-deployer as a deamon
        -s, --stop                     Stop webhook-deployer that was run as a deamon
        -l, --log <log>                Where to log

(there are some more options but they dont work yet)

### Windows
You need, naturally, nodejs to run this. Just run the installer from [http://nodejs.org/](http://nodejs.org/).
To use it, you need to create a deploys.json in the app folder. 

Here are the basic steps to install it:

    git clone https://github.com/Camme/webhook-deployer
    cd webhook-deployer
    npm install
    npm run-script install-windows-service
  
When the windows service is installed, go into Administrator tools/Services and change the user for the service to Network Service (no password). Also make sure the Network Service has rights to modify the folder that your command needs to access.
You also need to set up ssh keys for the Network Service user, if your repo is private at least.

Follow gits guide on how you do it in windows [here](https://help.github.com/articles/generating-ssh-keys#platform-windows).

After that, make sure the .ssh folder for the Network Service user has the keys and has the known_hosts file, so no problem might come when you interact with the git hub repo. 
In Windows 2008 R2, the Network Service home folder is at 

    C:\Windows\ServiceProfiles\NetworkService
    
Make sure the .ssh folder is there with the ssh keys etc.
  
Now that the service is running, create a deploys.json that contains info about what the deployer will accept.

#### Trouble
If you have trouble with your keys in windows, you can always run 

    ssh -v git@github.com

If that gives you something like "bad number of files", you can add a config file to your .ssh with the following statements:

    Host github.com
    User git
    Hostname ssh.github.com
    PreferredAuthentications publickey
    IdentityFile ~/.ssh/id_rsa
    Port 443

Run the test command again, and if you dont have any errors, you are good to go. Make sure that you copy the config file (and knownhosts) to your service user folder:

    C:\Windows\ServiceProfiles\NetworkService


## Config
Create a deploys.json (there is an deploys.json.example to look at) inside the folder where you cloned webhook-deployer. 
Config it with the following format:

    {
        "deploys": [{
            "name": "Your deploy name",
            "type": "github",
            "repo": "[the repo url in https format, example https://github.com/Camme/webhook-deployer]",
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
            "repo": "https://github.com/Camme/webhook-deployer",
            "basepath": "/var/node/webhook-deployer",
            "command": "git pull",
            "branch": "master"
        }]
    }

You also need to add the webhook to your github repo. The call should be made to http://your.cool.server:8080/incoming/webhook-deployer

The above example would run "git pull" whenever a push to the master branch for https://github.com/Camme/webhook-deployer is made.

## License 

(The MIT License)

Copyright (c) 2011 Camilo Tapia &lt;camilo.tapia@gmail.com&gt;

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
